import { useMemo } from 'react';
import { Transaction, CategoryType, FixedExpense } from '../types';

export interface CashFlowDataPoint {
  date: string;
  saldo: number;
  despesas: number;
  reserva: number;
  despesasFixas: number;
}

export function useCashFlowData(
  transactions: Transaction[],
  baseIncome: number = 0,
  payday: number = 1,
  fixedExpenses: FixedExpense[] = []
): CashFlowDataPoint[] {
  return useMemo(() => {
    const days: { dateKey: string; dateObj: Date }[] = [];
    const daysMap: Record<string, { despesas: number; reserva: number; despesasFixas: number; income: number }> = {};

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // 1. Inicializar os últimos 30 dias (formato DD/MM)
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      days.push({ dateKey, dateObj: d });
      daysMap[dateKey] = { despesas: 0, reserva: 0, despesasFixas: 0, income: 0 };
    }

    const startDate = new Date(days[0].dateObj);
    startDate.setHours(0, 0, 0, 0);

    // 2. Determinar saldo inicial antes do período de 30 dias
    let runningBalance = baseIncome > 0 ? baseIncome : 0;

    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      if (tDate < startDate) {
        const isIncome = t.category === CategoryType.INCOME || (t as any).type === 'income';
        const isSavings = t.category === CategoryType.SAVING || (t as any).type === 'savings';
        if (isIncome) {
          runningBalance += t.amount;
        } else if (isSavings) {
          runningBalance -= t.amount;
        } else {
          runningBalance -= t.amount;
        }
      }
    });

    // 3. Processar transações e despesas fixas para cada dia dentro dos 30 dias
    return days.map(({ dateKey, dateObj }) => {
      const dayOfMonth = dateObj.getDate();
      const values = daysMap[dateKey];

      // Salário base adicionado no dia do pagamento
      if (dayOfMonth === payday && baseIncome > 0) {
        values.income += baseIncome;
      }

      // Despesas fixas recorrentes do mês alocadas no dia de vencimento
      fixedExpenses.forEach((fe) => {
        let feDay = 1;
        if (fe.dueDate) {
          const parsed = parseInt(fe.dueDate, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) feDay = parsed;
        }
        if (dayOfMonth === feDay) {
          const amt = fe.amount + (fe.interestAmount || 0);
          values.despesasFixas += amt;
        }
      });

      // Transações realizadas especificamente nesta data
      const dayTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        const tKey = `${String(tDate.getDate()).padStart(2, '0')}/${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        return tKey === dateKey;
      });

      dayTransactions.forEach((t) => {
        const isIncome = t.category === CategoryType.INCOME || (t as any).type === 'income';
        const isSavings = t.category === CategoryType.SAVING || (t as any).type === 'savings';
        const isDebt = t.category === CategoryType.DEBT_INTEREST || t.category === CategoryType.DEBT_NO_INTEREST;
        const isFixed = (t as any).isFixed || isDebt;

        if (isIncome) {
          values.income += t.amount;
        } else if (isSavings) {
          values.reserva += t.amount;
          runningBalance -= t.amount;
        } else {
          values.despesas += t.amount;
          runningBalance -= t.amount;
          if (isFixed) {
            values.despesasFixas += t.amount;
          }
        }
      });

      // Atualiza saldo progressivo do dia
      runningBalance += values.income;

      return {
        date: dateKey,
        saldo: Math.round(Math.max(0, runningBalance)),
        despesas: Math.round(values.despesas),
        reserva: Math.round(values.reserva),
        despesasFixas: Math.round(values.despesasFixas),
      };
    });
  }, [transactions, baseIncome, payday, fixedExpenses]);
}
