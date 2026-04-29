
export interface DailySnapshot {
  date: string; // AAAA-MM-DD
  balance: number;
  expenses: number;
  savings: number;
}

export enum CategoryType {
  NEED = 'NEED',      // 50%
  WANT = 'WANT',      // 30%
  SAVING = 'SAVING',  // 20%
  DEBT_INTEREST = 'DEBT_INTEREST',
  DEBT_NO_INTEREST = 'DEBT_NO_INTEREST',
  INCOME = 'INCOME'   // Variable/Extra Income
}

export enum Priority {
  URGENT = 1,
  IMPORTANT = 2,
  LONG_TERM = 3
}

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  priority: Priority;
  justification: string;
  createdAt: string;
}

export interface FixedExpense {
  id: string;
  description: string;
  amount: number;
  justification: string;
  category: CategoryType.NEED | CategoryType.WANT | CategoryType.DEBT_NO_INTEREST;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  interestAmount?: number; // New field for tracking interest costs in debts
  justification: string;
  category: CategoryType;
  subcategory: string;
  date: string;
  dueDate?: string;
}

export interface BudgetStats {
  baseIncome: number;
  variableIncome: number;
  totalIncome: number;
  fixedNeeds: number;
  variableNeeds: number;
  totalNeeds: number;
  wants: number;
  fixedWants: number;
  savings: number;
  debtInterest: number;
  debtNoInterest: number;
  fixedDebts: number;
  totalSpent: number;
}

export interface AIAdvice {
  status: 'good' | 'warning' | 'critical';
  message: string;
  recommendations: string[];
  habitsReport?: {
    triggers: {
      name: string;
      total: number;
      count: number;
      suggestion: string;
    }[];
    topBadHabit: string;
    savingsPotential: string;
  };
}
