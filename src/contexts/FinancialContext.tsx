import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType, testConnection } from '../services/firebase';
import { doc, getDoc, collection, onSnapshot, query, orderBy, addDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Transaction, FixedExpense, BudgetStats, CategoryType, WishlistItem } from '../types';

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
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider = ({ children }: { children: ReactNode }) => {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [baseIncome, setBaseIncome] = useState(0);
  const [payday, setPayday] = useState(1);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (!fbUser) return;
    const path = `users/${fbUser.uid}/transactions`;
    try {
      const docRef = collection(db, path);
      // @ts-ignore
      await addDoc(docRef, { ...t, createdAt: serverTimestamp() });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
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
      await addDoc(docRef, { ...t, createdAt: serverTimestamp() });
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
      await addDoc(docRef, { ...t, createdAt: serverTimestamp() });
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
        
        const tPath = `users/${user.uid}/transactions`;
        const tQuery = query(collection(db, tPath), orderBy('date', 'desc'));
        const unsubT = onSnapshot(tQuery, (snapshot) => {
          setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, tPath));
        
        const fPath = `users/${user.uid}/fixedExpenses`;
        onSnapshot(collection(db, fPath), (snapshot) => {
          setFixedExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedExpense)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, fPath));
        
        const wPath = `users/${user.uid}/wishlist`;
        onSnapshot(collection(db, wPath), (snapshot) => {
            setWishlist(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WishlistItem)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, wPath));
        
        setIsAuthReady(true);
      } else {
        setFbUser(null);
        setTransactions([]);
        setFixedExpenses([]);
        setWishlist([]);
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
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

    const totalNeeds = needs + fixedNeeds;
    const totalWants = wants + fixedWants;
    
    const totalSpent = totalNeeds + totalWants + savings;
    
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
        debtInterest: 0,
        debtNoInterest: 0,
        fixedDebts: 0,
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
      resetData
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
