import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { getOfflineQueue } from '../services/offlineSyncService';

interface OfflineIndicatorProps {
  isOnlineProp?: boolean;
  isSyncingProp?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnlineProp,
  isSyncingProp,
}) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      setTimeout(() => {
        setIsSyncing(false);
      }, 2500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
      setPendingCount(getOfflineQueue().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setPendingCount(getOfflineQueue().length);
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const activeOnline = isOnlineProp !== undefined ? isOnlineProp : isOnline;
  const activeSyncing = isSyncingProp !== undefined ? isSyncingProp : isSyncing;

  if (activeSyncing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs animate-pulse shadow-sm shadow-emerald-950/40">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span className="font-bold">Sincronizando dados...</span>
      </div>
    );
  }

  if (!activeOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/80 border border-amber-800 text-amber-400 text-xs shadow-sm shadow-amber-950/40">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <span className="font-bold">
          <span className="hidden sm:inline">Modo Offline - Alterações salvas localmente</span>
          <span className="sm:hidden">Modo Offline</span>
          {pendingCount > 0 && ` (${pendingCount})`}
        </span>
      </div>
    );
  }

  return null;
};

export default OfflineIndicator;
