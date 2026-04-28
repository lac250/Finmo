import React from 'react';
import { useFinancial } from '../contexts/FinancialContext';

const FixedExpenses: React.FC = () => {
    const { fixedExpenses } = useFinancial();
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-black">Gastos Fixos</h1>
            <div className="glass p-6 rounded-3xl space-y-4">
                {fixedExpenses.length === 0 ? (
                    <p className="text-slate-400">Nenhum gasto fixo registrado.</p>
                ) : (
                    fixedExpenses.map(f => (
                        <div key={f.id} className="flex justify-between items-center border-b border-white/5 pb-2">
                             <p className="font-medium">{f.description}</p>
                             <p className="font-bold text-red-400">{f.amount} MT</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
export default FixedExpenses;
