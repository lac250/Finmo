
import React, { useState } from 'react';
import { 
  RepeatIcon, 
  Trash2Icon, 
  PlusIcon,
  ChevronRightIcon
} from 'lucide-react';
import { useFinancial } from '../contexts/FinancialContext';
import { CategoryType } from '../types';
import { SUBCATEGORIES, formatCurrency } from '../constants';

const FixedExpenses: React.FC = () => {
  const { fixedExpenses, addTransaction, removeFixed } = useFinancial();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryType>(CategoryType.NEED);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTransaction(description, amount, category, '', 'fixed');
    setDescription('');
    setAmount('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="glass p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/20 p-3 rounded-2xl"><RepeatIcon className="w-6 h-6 text-blue-400" /></div>
          <div>
            <h2 className="text-2xl font-bold">Custos Fixos</h2>
            <p className="text-sm text-slate-500">Despesas que ocorrem todos os meses automaticamente</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
           <div className="md:col-span-2">
              <label className="text-[10px] text-slate-500 uppercase font-black ml-1 mb-1 block">Descrição</label>
              <input type="text" placeholder="Ex: Aluguel, Internet" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
           </div>
           <div>
              <label className="text-[10px] text-slate-500 uppercase font-black ml-1 mb-1 block">Valor (MT)</label>
              <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
           </div>
           <div className="flex items-end">
              <button type="submit" className="w-full h-[50px] bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                <PlusIcon className="w-4 h-4" /> Adicionar
              </button>
           </div>
           <div className="md:col-span-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Essencial', cat: CategoryType.NEED },
                { label: 'Desejo', cat: CategoryType.WANT },
                { label: 'Dívida', cat: CategoryType.DEBT_NO_INTEREST }
              ].map((btn) => (
                <button 
                  key={btn.cat}
                  type="button" 
                  onClick={() => setCategory(btn.cat)} 
                  className={`text-[10px] py-3 rounded-lg border transition-all ${category === btn.cat ? 'bg-blue-500/20 border-blue-500 text-blue-400 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                >
                  {btn.label}
                </button>
              ))}
           </div>
        </form>

        <div className="space-y-3 pt-4">
          {fixedExpenses.length === 0 ? (
            <div className="text-center py-10 text-slate-600 italic">Nenhum custo fixo registrado.</div>
          ) : (
            fixedExpenses.map((fe) => (
              <div key={fe.id} className="flex justify-between items-center p-4 bg-slate-900/40 border border-slate-800 rounded-2xl group hover:border-slate-700 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-8 rounded-full ${fe.category === CategoryType.NEED ? 'bg-blue-500' : fe.category === CategoryType.WANT ? 'bg-purple-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="font-bold">{fe.description}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{fe.category === CategoryType.NEED ? 'Essencial' : fe.category === CategoryType.WANT ? 'Desejo' : 'Dívida'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-slate-200">{formatCurrency(fe.amount)}</span>
                  <button onClick={() => removeFixed(fe.id)} className="p-2 text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                    <Trash2Icon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-2xl flex gap-3 italic">
           <div className="mt-1"><RepeatIcon className="w-4 h-4 text-blue-400" /></div>
           <p className="text-xs text-blue-300 leading-relaxed">
             Custos fixos são descontados automaticamente do seu Saldo Projetado no Dia do Salário. Eles ajudam o Mentor a calcular seu Gasto Diário Seguro com maior precisão.
           </p>
        </div>
      </div>
    </div>
  );
};

export default FixedExpenses;
