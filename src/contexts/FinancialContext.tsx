import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType, testConnection } from '../services/firebase';
import { doc, getDoc, collection, onSnapshot, query, orderBy, addDoc, deleteDoc, serverTimestamp, getDocs, setDoc } from 'firebase/firestore';
import { Transaction, FixedExpense, BudgetStats, CategoryType, WishlistItem, DailySnapshot } from '../types';
import { 
  getOfflineQueue, 
  enqueueOfflineAction, 
  clearOfflineQueue, 
  saveCachedTransactions, 
  getCachedTransactions 
} from '../services/offlineSyncService';

interface FinancialContextType {
  fbUser: FirebaseUser | null;
  setFbUser: React.Dispatch<React.SetStateAction<FirebaseUser | null>>;
  transactions: Transaction[];
  fixedExpenses: FixedExpense[];
  wishlist: WishlistItem[];
  baseIncome: number;
  payday: number;
  stats: BudgetStats | null;
  isAuthReady: boolean;
  setBaseIncome: (val: number) => void;
  setPayday: (val: number) => void;
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addWishlistItem: (t: Omit<WishlistItem, 'id'>) => Promise<void>;
  deleteWishlistItem: (id: string) => Promise<void>;
  addFixedExpense: (t: Omit<FixedExpense, 'id'>) => Promise<void>;
  deleteFixedExpense: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  resetData: () => Promise<void>;
  dailySnapshots: DailySnapshot[];
  syncOfflineQueue: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider = ({ children }: { children: ReactNode }) => {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [dailySnapshots, setDailySnapshots] = useState<DailySnapshot[]>([]);
  const [baseIncome, setBaseIncome] = useState(0);
  const [payday, setPayday] = useState(1);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const cleanForFirestore = (obj: Record<string, any>) => {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = value;
      }
    }
    return clean;
  };

  const updateDailySnapshot = async (currentStats: BudgetStats) => {
    if (!fbUser) return;
    const today = new Date().toISOString().split('T')[0];
    const snapshot: DailySnapshot = {
        date: today,
        balance: currentStats.totalIncome - currentStats.totalSpent,
        expenses: currentStats.totalSpent,
        savings: currentStats.savings
    };
    
    // Save to Firestore
    const path = `users/${fbUser.uid}/daily_snapshots/${today}`;
    try {
        await setDoc(doc(db, path), cleanForFirestore(snapshot));
    } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  const syncOfflineQueue = async () => {
    if (!fbUser || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    for (const action of queue) {
      try {
        if (action.type === 'ADD_TRANSACTION') {
          const path = `users/${fbUser.uid}/transactions`;
          const dataToSave = cleanForFirestore({ ...action.payload, createdAt: serverTimestamp() });
          await addDoc(collection(db, path), dataToSave);
        } else if (action.type === 'COMPLETE_CHALLENGE_SLOT' || action.type === 'CREATE_CHALLENGE') {
          const path = `users/${fbUser.uid}/savings_challenge/main`;
          await setDoc(doc(db, path), {
            ...action.payload,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (e) {
        console.error('Error syncing offline action:', action, e);
      }
    }

    clearOfflineQueue();
  };

  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    // If offline, apply Optimistic UI and enqueue action
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const tempId = `offline-${Date.now()}`;
      const localT: Transaction = { id: tempId, ...t };
      const updated = [localT, ...transactions];
      setTransactions(updated);
      saveCachedTransactions(updated);
      enqueueOfflineAction('ADD_TRANSACTION', t);
      return;
    }

    if (!fbUser) return;
    const path = `users/${fbUser.uid}/transactions`;
    try {
      const docRef = collection(db, path);
      const dataToSave = cleanForFirestore({ ...t, createdAt: serverTimestamp() });
      await addDoc(docRef, dataToSave);
      if (stats) await updateDailySnapshot(stats);
    } catch (err) {
      console.warn('Firestore write failed, enqueuing offline action:', err);
      const tempId = `offline-${Date.now()}`;
      const localT: Transaction = { id: tempId, ...t };
      const updated = [localT, ...transactions];
      setTransactions(updated);
      saveCachedTransactions(updated);
      enqueueOfflineAction('ADD_TRANSACTION', t);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!fbUser) return;
    const path = `users/${fbUser.uid}/transactions/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const addWishlistItem = async (t: Omit<WishlistItem, 'id'>) => {
    if (!fbUser) return;
    const path = `users/${fbUser.uid}/wishlist`;
    try {
      const docRef = collection(db, path);
      const dataToSave = cleanForFirestore({ ...t, createdAt: serverTimestamp() });
      await addDoc(docRef, dataToSave);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const deleteWishlistItem = async (id: string) => {
    if (!fbUser) return;
    const path = `users/${fbUser.uid}/wishlist/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const addFixedExpense = async (t: Omit<FixedExpense, 'id'>) => {
    if (!fbUser) return;
    const path = `users/${fbUser.uid}/fixedExpenses`;
    try {
      const docRef = collection(db, path);
      const dataToSave = cleanForFirestore({ ...t, createdAt: serverTimestamp() });
      await addDoc(docRef, dataToSave);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const deleteFixedExpense = async (id: string) => {
    if (!fbUser) return;
    const path = `users/${fbUser.uid}/fixedExpenses/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetData = async () => {
    if (!fbUser) return;
    const collections = ['transactions', 'fixedExpenses', 'wishlist'];
    for (const col of collections) {
      const q = query(collection(db, `users/${fbUser.uid}/${col}`));
      const snapshot = await getDocs(q);
      for (const doc of snapshot.docs) {
          await deleteDoc(doc.ref);
      }
    }
  };

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFbUser(user);
        
        // Fetch user settings
        const userDocRef = doc(db, 'users', user.uid);
        try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const data = userDoc.data();
              setBaseIncome(data.baseIncome || 0);
              setPayday(data.payday || 1);
            }
        } catch (err) {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
        
        // Initialize from cache immediately for offline capability
        const cachedT = getCachedTransactions();
        if (cachedT && cachedT.length > 0) {
          setTransactions(cachedT);
        }

        const tPath = `users/${user.uid}/transactions`;
        const tQuery = query(collection(db, tPath), orderBy('date', 'desc'));
        const unsubT = onSnapshot(tQuery, (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
          setTransactions(list);
          saveCachedTransactions(list);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, tPath);
          const cached = getCachedTransactions();
          if (cached && cached.length > 0) {
            setTransactions(cached);
          }
        });
        
        const fPath = `users/${user.uid}/fixedExpenses`;
        onSnapshot(collection(db, fPath), (snapshot) => {
          setFixedExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedExpense)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, fPath));
        
        const wPath = `users/${user.uid}/wishlist`;
        onSnapshot(collection(db, wPath), (snapshot) => {
            setWishlist(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WishlistItem)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, wPath));
        
        const dsPath = `users/${user.uid}/daily_snapshots`;
        onSnapshot(query(collection(db, dsPath), orderBy('date', 'asc')), (snapshot) => {
            setDailySnapshots(snapshot.docs.map(doc => ({ ...doc.data() } as DailySnapshot)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, dsPath));
        
        setIsAuthReady(true);
      } else {
        setFbUser(null);
        setTransactions([]);
        setFixedExpenses([]);
        setWishlist([]);
        setDailySnapshots([]);
        setIsAuthReady(true);
      }
    });

    const handleOnline = () => {
      syncOfflineQueue();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const stats = useMemo(() => {
    if (!isAuthReady || !fbUser) return null;
    
    const varIncome = transactions.filter(t => t.category === CategoryType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = baseIncome + varIncome;
    
    const needs = transactions.filter(t => t.category === CategoryType.NEED).reduce((sum, t) => sum + t.amount, 0);
    const wants = transactions.filter(t => t.category === CategoryType.WANT).reduce((sum, t) => sum + t.amount, 0);
    const savings = transactions.filter(t => t.category === CategoryType.SAVING).reduce((sum, t) => sum + t.amount, 0);
    
    // Add fixed expenses
    const fixedNeeds = fixedExpenses.filter(f => f.category === CategoryType.NEED).reduce((sum, f) => sum + f.amount, 0);
    const fixedWants = fixedExpenses.filter(f => f.category === CategoryType.WANT).reduce((sum, f) => sum + f.amount, 0);
    const debtInterest = fixedExpenses.filter(f => f.category === CategoryType.DEBT_INTEREST).reduce((sum, f) => sum + (f.amount + (f.interestAmount || 0)), 0);
    const debtNoInterest = fixedExpenses.filter(f => f.category === CategoryType.DEBT_NO_INTEREST).reduce((sum, f) => sum + f.amount, 0);
    const fixedDebts = debtInterest + debtNoInterest;

    const totalNeeds = needs + fixedNeeds;
    const totalWants = wants + fixedWants;
    
    const totalSpent = totalNeeds + totalWants + savings + fixedDebts;
    
    return {
        baseIncome,
        variableIncome: varIncome,
        totalIncome,
        fixedNeeds,
        variableNeeds: needs,
        totalNeeds,
        wants: totalWants,
        fixedWants,
        savings,
        debtInterest,
        debtNoInterest,
        fixedDebts,
        totalSpent
    } as BudgetStats;
  }, [baseIncome, transactions, fixedExpenses, isAuthReady, fbUser]);

  return (
    <FinancialContext.Provider value={{ 
      fbUser, 
      setFbUser, 
      transactions, 
      fixedExpenses, 
      wishlist,
      baseIncome, 
      payday, 
      stats, 
      isAuthReady, 
      setBaseIncome, 
      setPayday,
      addTransaction,
      deleteTransaction,
      addWishlistItem,
      deleteWishlistItem,
      addFixedExpense,
      deleteFixedExpense,
      logout,
      resetData,
      dailySnapshots,
      syncOfflineQueue
    }}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};
