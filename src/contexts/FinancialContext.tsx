import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType, testConnection } from '../services/firebase';
import { doc, getDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Transaction, FixedExpense } from '../types';

interface FinancialContextType {
  fbUser: FirebaseUser | null;
  setFbUser: React.Dispatch<React.SetStateAction<FirebaseUser | null>>;
  transactions: Transaction[];
  fixedExpenses: FixedExpense[];
  isAuthReady: boolean;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider = ({ children }: { children: ReactNode }) => {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFbUser(user);
        
        const tPath = `users/${user.uid}/transactions`;
        const tQuery = query(collection(db, tPath), orderBy('date', 'desc'));
        const unsubT = onSnapshot(tQuery, (snapshot) => {
          setTransactions(snapshot.docs.map(doc => doc.data() as Transaction));
        }, (err) => handleFirestoreError(err, OperationType.LIST, tPath));
        
        const fPath = `users/${user.uid}/fixedExpenses`;
        onSnapshot(collection(db, fPath), (snapshot) => {
          setFixedExpenses(snapshot.docs.map(doc => doc.data() as FixedExpense));
        }, (err) => handleFirestoreError(err, OperationType.LIST, fPath));
        
        setIsAuthReady(true);
      } else {
        setFbUser(null);
        setTransactions([]);
        setFixedExpenses([]);
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <FinancialContext.Provider value={{ fbUser, setFbUser, transactions, fixedExpenses, isAuthReady }}>
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
