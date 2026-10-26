export interface OfflineAction {
  id: string;
  type: 'ADD_TRANSACTION' | 'COMPLETE_CHALLENGE_SLOT' | 'CREATE_CHALLENGE';
  payload: any;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'finmo_offline_queue';
const CACHED_CHALLENGE_KEY = 'finmo_cached_challenge';
const CACHED_TRANSACTIONS_KEY = 'finmo_cached_transactions';

export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading offline queue:', e);
  }
  return [];
}

export function saveOfflineQueue(queue: OfflineAction[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error writing offline queue:', e);
  }
}

export function enqueueOfflineAction(
  type: OfflineAction['type'],
  payload: any
): OfflineAction {
  const newAction: OfflineAction = {
    id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload,
    timestamp: Date.now(),
  };

  const queue = getOfflineQueue();
  queue.push(newAction);
  saveOfflineQueue(queue);
  return newAction;
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (e) {
    console.error('Error clearing offline queue:', e);
  }
}

export function removeOfflineAction(id: string): void {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  saveOfflineQueue(queue);
}

// Local cache for Challenge
export function saveCachedChallenge(challenge: any): void {
  try {
    localStorage.setItem(CACHED_CHALLENGE_KEY, JSON.stringify(challenge));
  } catch (e) {
    console.error('Error saving cached challenge', e);
  }
}

export function getCachedChallenge(): any | null {
  try {
    const raw = localStorage.getItem(CACHED_CHALLENGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading cached challenge', e);
  }
  return null;
}

// Local cache for Transactions
export function saveCachedTransactions(transactions: any[]): void {
  try {
    localStorage.setItem(CACHED_TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (e) {
    console.error('Error saving cached transactions', e);
  }
}

export function getCachedTransactions(): any[] | null {
  try {
    const raw = localStorage.getItem(CACHED_TRANSACTIONS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading cached transactions', e);
  }
  return null;
}
