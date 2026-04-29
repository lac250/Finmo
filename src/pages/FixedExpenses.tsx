import React, { useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { CategoryType } from '../types';
import { PlusIcon, Trash2Icon } from 'lucide-react';

const FixedExpenses: React.FC = () => {
    const { fixedExpenses, addFixedExpense, deleteFixedExpense } = useFinancial();
    const [isOpen, setIsOpen] = useState(false);
    
    // Form fields
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [interest, setInterest] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [category, setCategory] = useState<CategoryType>(CategoryType.NEED);

    const handleSubmit = async () => {
        await addFixedExpense({
            description: desc,
            amount: Number(amount),
            interestAmount: category === CategoryType.DEBT_INTEREST ? Number(interest) : undefined,
            dueDate: dueDate,
            justification: '',
            category,
        });
        setIsOpen(false);
        setDesc(''); setAmount(''); setInterest(''); setDueDate('');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black">Gastos Fixos</h1>
                <button 
                  onClick={() => setIsOpen(true)}
                  className="bg-emerald-500 text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2"
                >
                    <PlusIcon className="w-5 h-5" /> Adicionar
                </button>
            </div>
            
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 p-4 flex items-center justify-center">
                    <div className="bg-slate-900 p-6 rounded-3xl w-full max-w-sm space-y-4">
                        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição" className="w-full bg-slate-950 p-3 rounded-xl"/>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Valor (MT)" className="w-full bg-slate-950 p-3 rounded-xl"/>
                        <select value={category} onChange={e => setCategory(e.target.value as CategoryType)} className="w-full bg-slate-950 p-3 rounded-xl">
                            <option value={CategoryType.NEED}>Essencial</option>
                            <option value={CategoryType.WANT}>Desejo</option>
                            <option value={CategoryType.DEBT_INTEREST}>Dívida c/ Juros</option>
                            <option value={CategoryType.DEBT_NO_INTEREST}>Dívida s/ Juros</option>
                        </select>
                        {category === CategoryType.DEBT_INTEREST && (
                            <input type="number" value={interest} onChange={e => setInterest(e.target.value)} placeholder="Valor dos Juros (MT)" className="w-full bg-slate-950 p-3 rounded-xl"/>
                        )}
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-950 p-3 rounded-xl" />
                        <button onClick={handleSubmit} className="w-full bg-emerald-500 py-3 rounded-xl font-bold">Salvar</button>
                    </div>
                </div>
            )}

            <div className="glass p-6 rounded-3xl space-y-4">
                {fixedExpenses.length === 0 ? (
                    <p className="text-slate-400">Nenhum gasto fixo registrado.</p>
                ) : (
                    fixedExpenses.map(f => (
                        <div key={f.id} className="flex justify-between items-center border-b border-white/5 pb-2">
                             <div>
                                <p className="font-medium">{f.description}</p>
                                <p className="text-xs text-slate-500">{f.dueDate ? `Venc.: ${f.dueDate}` : ''}</p>
                             </div>
                             <div className="text-right">
                                <p className="font-bold text-red-400">{f.amount} MT</p>
                                {f.interestAmount && <p className="text-xs text-red-500">Juros: {f.interestAmount} MT</p>}
                             </div>
                             <button onClick={() => deleteFixedExpense(f.id)}><Trash2Icon className="w-4 h-4 text-slate-500"/></button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
export default FixedExpenses;
