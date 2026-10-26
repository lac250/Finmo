import { useState, useEffect, useCallback } from 'react';
import { getOfflineQueue } from '../services/offlineSyncService';

export function useNetworkStatus(onSyncQueue?: () => Promise<void> | void) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(() => getOfflineQueue().length);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(getOfflineQueue().length);
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);

      try {
        if (onSyncQueue) {
          await onSyncQueue();
        } else {
          // Give visual indicator of sync completion
          await new Promise((r) => setTimeout(r, 1800));
        }
      } catch (err) {
        console.error('Error during auto-sync:', err);
      } finally {
        refreshPendingCount();
        setIsSyncing(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also periodic or storage listener for queue changes
    const interval = setInterval(refreshPendingCount, 2500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [onSyncQueue, refreshPendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    setIsSyncing,
    refreshPendingCount,
  };
}
