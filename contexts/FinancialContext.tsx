
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  CategoryType, 
  Transaction, 
  BudgetStats, 
  AIAdvice, 
  FixedExpense 
} from '../types';
import { SUBCATEGORIES } from '../constants';
import { auth, db, handleFirestoreError, OperationType } from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc 
} from 'firebase/firestore';

interface FinancialContextType {
  user: any | null;
  fbUser: FirebaseUser | null;
  baseIncome: number;
  setBaseIncome: (val: number) => void;
  payday: number;
  setPayday: (val: number) => void;
  fixedExpenses: FixedExpense[];
  transactions: Transaction[];
  stats: BudgetStats;
  projectionData: any[];
  targets: Record<string, number>;
  addTransaction: (description: string, amount: string, category: CategoryType, subcategory: string, formType: 'expense' | 'income' | 'fixed', interestAmount?: string, dueDate?: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  removeFixed: (id: string) => Promise<void>;
  resetData: () => Promise<void>;
  safeToSpendDaily: number;
  daysUntilPayday: number;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [baseIncome, setBaseIncome] = useState<number>(0);
  const [payday, setPayday] = useState<number>(1);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFbUser(user);
        setUser({
          name: user.displayName || 'Usuário',
          email: user.email || '',
          picture: user.photoURL || ''
        });

        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setBaseIncome(data.baseIncome || 0);
          setPayday(data.payday || 1);
        }

        const tQuery = query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc'));
        const unsubT = onSnapshot(tQuery, (snapshot) => {
          setTransactions(snapshot.docs.map(doc => doc.data() as Transaction));
        });

        const fQuery = collection(db, 'users', user.uid, 'fixedExpenses');
        const unsubF = onSnapshot(fQuery, (snapshot) => {
          setFixedExpenses(snapshot.docs.map(doc => doc.data() as FixedExpense));
        });

        return () => {
          unsubT();
          unsubF();
        };
      } else {
        setFbUser(null);
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const stats = useMemo<BudgetStats>(() => {
    const s: BudgetStats = { 
      baseIncome, 
      variableIncome: 0, 
      totalIncome: 0,
      fixedNeeds: 0,
      variableNeeds: 0,
      totalNeeds: 0,
      wants: 0,
      fixedWants: 0,
      savings: 0, 
      debtInterest: 0, 
      debtNoInterest: 0, 
      fixedDebts: 0,
      totalSpent: 0 
    };

    fixedExpenses.forEach(fe => {
      if (fe.category === CategoryType.NEED) s.fixedNeeds += fe.amount;
      if (fe.category === CategoryType.WANT) s.fixedWants += fe.amount;
      if (fe.category === CategoryType.DEBT_NO_INTEREST) s.fixedDebts += fe.amount;
    });

    transactions.forEach(t => {
      if (t.category === CategoryType.INCOME) s.variableIncome += t.amount;
      else {
        if (t.category === CategoryType.NEED) s.variableNeeds += t.amount;
        if (t.category === CategoryType.WANT) s.wants += t.amount;
        if (t.category === CategoryType.SAVING) s.savings += t.amount;
        if (t.category === CategoryType.DEBT_INTEREST) s.debtInterest += t.amount;
        if (t.category === CategoryType.DEBT_NO_INTEREST) s.debtNoInterest += t.amount;
      }
    });

    s.totalIncome = s.baseIncome + s.variableIncome;
    s.totalNeeds = s.fixedNeeds + s.variableNeeds;
    s.totalSpent = s.totalNeeds + s.wants + s.fixedWants + s.savings + s.debtInterest + s.debtNoInterest + s.fixedDebts;
    return s;
  }, [transactions, baseIncome, fixedExpenses]);

  const projectionData = useMemo(() => {
    const days = 30;
    const data = [];
    let currentBalance = stats.totalIncome - stats.totalSpent;
    const totalFixedPerMonth = stats.fixedNeeds + stats.fixedWants + stats.fixedDebts;
    const today = new Date();
    
    for (let i = 0; i <= days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayOfMonth = date.getDate();
        if (dayOfMonth === payday && i > 0) {
            currentBalance += baseIncome;
            currentBalance -= totalFixedPerMonth;
        }
        data.push({
            day: date.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' }),
            balance: Math.max(0, currentBalance),
        });
    }
    return data;
  }, [stats, payday, baseIncome]);

  const targets = {
    [CategoryType.NEED]: stats.totalIncome * 0.5,
    [CategoryType.WANT]: stats.totalIncome * 0.3,
    [CategoryType.SAVING]: stats.totalIncome * 0.2,
  };

  const daysUntilPayday = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    if (currentDay < payday) return payday - currentDay;
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return (lastDayOfMonth - currentDay) + payday;
  }, [payday]);

  const safeToSpendDaily = useMemo(() => {
    const currentBalance = stats.totalIncome - stats.totalSpent;
    return Math.max(0, currentBalance / (daysUntilPayday || 1));
  }, [stats, daysUntilPayday]);

  const addTransaction = async (description: string, amount: string, category: CategoryType, subcategory: string, formType: 'expense' | 'income' | 'fixed', interestAmount?: string, dueDate?: string) => {
    if (!description || !amount) return;
    const val = parseFloat(amount);
    const id = Math.random().toString(36).substr(2, 9);

    if (formType === 'fixed') {
      const newFixed: FixedExpense = { id, description, amount: val, category: category as any };
      if (fbUser) {
        await setDoc(doc(db, 'users', fbUser.uid, 'fixedExpenses', id), newFixed);
      }
    } else {
      const newTransaction: Transaction = {
        id, description, amount: val, 
        interestAmount: interestAmount ? parseFloat(interestAmount) : undefined,
        category, subcategory, date: new Date().toISOString(),
        dueDate: (category === CategoryType.DEBT_INTEREST || category === CategoryType.DEBT_NO_INTEREST) ? dueDate : undefined
      };
      if (fbUser) {
        await setDoc(doc(db, 'users', fbUser.uid, 'transactions', id), newTransaction);
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    if (fbUser) {
      await deleteDoc(doc(db, 'users', fbUser.uid, 'transactions', id));
    }
  };

  const removeFixed = async (id: string) => {
    if (fbUser) {
      await deleteDoc(doc(db, 'users', fbUser.uid, 'fixedExpenses', id));
    }
  };

  const resetData = async () => {
    if (fbUser) {
      const userDocRef = doc(db, 'users', fbUser.uid);
      await setDoc(userDocRef, { baseIncome: 0, payday: 1 }, { merge: true });
    }
    setBaseIncome(0);
    setPayday(1);
    setFixedExpenses([]);
    setTransactions([]);
  };

  // Sync Settings changes
  useEffect(() => {
    if (fbUser) {
      setDoc(doc(db, 'users', fbUser.uid), { baseIncome, payday }, { merge: true });
    }
  }, [baseIncome, payday, fbUser]);

  return (
    <FinancialContext.Provider value={{
      user, fbUser, baseIncome, setBaseIncome, payday, setPayday, 
      fixedExpenses, transactions, stats, projectionData, targets,
      addTransaction, deleteTransaction, removeFixed, resetData,
      safeToSpendDaily, daysUntilPayday
    }}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (context === undefined) throw new Error('useFinancial must be used within a FinancialProvider');
  return context;
};
