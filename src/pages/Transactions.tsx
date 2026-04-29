import React, { useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { CategoryType, Transaction, FixedExpense } from '../types';
import { 
  PlusIcon, 
  SearchIcon, 
  ArrowUpRightIcon, 
  ArrowDownLeftIcon, 
  Trash2Icon, 
  FilterIcon,
  TagIcon,
  CalendarIcon,
  AlertTriangleIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Transactions: React.FC = () => {
    const { transactions, addTransaction, deleteTransaction, fixedExpenses, addFixedExpense, deleteFixedExpense } = useFinancial();
    const [isAdding, setIsAdding] = useState(false);
    const [isAddingFixed, setIsAddingFixed] = useState(false);
    const [search, setSearch] = useState('');
    
    // Form States
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [interest, setInterest] = useState('');
    const [justification, setJustification] = useState('');
    const [category, setCategory] = useState<CategoryType>(CategoryType.NEED);
    const [subcategory, setSubcategory] = useState('');
    const [immediateFeedback, setImmediateFeedback] = useState<string | null>(null);

    const [fixedDesc, setFixedDesc] = useState('');
    const [fixedAmount, setFixedAmount] = useState('');
    const [fixedJustification, setFixedJustification] = useState('');
    const [fixedCategory, setFixedCategory] = useState<FixedExpense['category']>(CategoryType.NEED);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!desc || !amount || !justification) return;

        // Immediate Behavioral Insight Logic
        const keyword = "tempo";
        if (justification.toLowerCase().includes(keyword)) {
            const count = transactions.filter(t => t.justification.toLowerCase().includes(keyword)).length + 1;
            if (count >= 2) {
                setImmediateFeedback(`Atenção: Este é o seu ${count}º gasto motivado por 'falta de tempo' recentemente. Isso já soma uma quantia considerável que poderia ir para sua Reserva.`);
                setTimeout(() => setImmediateFeedback(null), 8000);
            }
        }
        
        await addTransaction({
            description: desc,
            amount: Number(amount),
            interestAmount: category === CategoryType.DEBT_INTEREST ? Number(interest) : undefined,
            justification,
            category,
            subcategory: subcategory || 'Geral',
            date: new Date().toISOString()
        });
        
        setDesc('');
        setAmount('');
        setInterest('');
        setJustification('');
        setIsAdding(false);
    };

    const handleAddFixed = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fixedDesc || !fixedAmount || !fixedJustification) return;
        
        await addFixedExpense({
            description: fixedDesc,
            amount: Number(fixedAmount),
            justification: fixedJustification,
            category: fixedCategory
        });
        
        setFixedDesc('');
        setFixedAmount('');
        setFixedJustification('');
        setIsAddingFixed(false);
    };

    const filtered = transactions.filter(t => 
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.subcategory.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-12">
            <div>
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-black text-white">Transações</h1>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-slate-950 font-black rounded-2xl hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                    <PlusIcon className="w-5 h-5" /> Novo Registro
                </button>
            </header>

            {isAdding && (
                <div className="glass p-8 rounded-[2.5rem] border-emerald-500/20 animate-in slide-in-from-top-4 duration-300">
                    {immediateFeedback && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3"
                        >
                            <AlertTriangleIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-200 font-medium leading-relaxed">{immediateFeedback}</p>
                        </motion.div>
                    )}
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Descrição</label>
                            <input 
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                                placeholder="Mercado, Aluguel, Salário..."
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-emerald-500/50 outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Valor (MT)</label>
                            <input 
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="0,00"
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-emerald-500/50 outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Regra 50/30/20</label>
                            <select 
                                value={category}
                                onChange={e => setCategory(e.target.value as CategoryType)}
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-emerald-500/50 outline-none transition-colors appearance-none"
                            >
                                <option value={CategoryType.NEED}>Essencial (50%)</option>
                                <option value={CategoryType.WANT}>Desejos (30%)</option>
                                <option value={CategoryType.SAVING}>Reserva/Invest (20%)</option>
                                <option value={CategoryType.DEBT_INTEREST}>Dívida c/ Juros</option>
                                <option value={CategoryType.DEBT_NO_INTEREST}>Dívida s/ Juros</option>
                                <option value={CategoryType.INCOME}>Entrada (Renda)</option>
                            </select>
                        </div>
                        {category === CategoryType.DEBT_INTEREST && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Valor dos Juros (MT)</label>
                            <input 
                                type="number"
                                value={interest}
                                onChange={e => setInterest(e.target.value)}
                                placeholder="0,00"
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-emerald-500/50 outline-none transition-colors"
                            />
                        </div>
                        )}
                        <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">O Porquê deste registro?</label>
                            <input 
                                value={justification}
                                onChange={e => setJustification(e.target.value)}
                                placeholder="Ex: Comi fora pois não tive tempo de cozinhar ou Ganhei bônus por meta atingida"
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-emerald-500/50 outline-none transition-colors"
                            />
                        </div>
                        <div className="flex items-end lg:col-start-4">
                            <button 
                                type="submit"
                                className="w-full bg-emerald-500 py-4 text-slate-950 font-black rounded-2xl hover:bg-emerald-400 transition-colors shadow-lg"
                            >
                                Adicionar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="glass rounded-[2.5rem] overflow-hidden border-white/5">
                <div className="p-6 border-b border-white/5 flex gap-4">
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Pesquisar movimentações..." 
                            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-slate-300 outline-none focus:border-emerald-500/30 transition-colors"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-950/30 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-4">Data</th>
                                <th className="px-8 py-4">Descrição</th>
                                <th className="px-8 py-4">Regra</th>
                                <th className="px-8 py-4 text-right">Valor</th>
                                <th className="px-8 py-4 text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.map(t => (
                                <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                                            <CalendarIcon className="w-3.5 h-3.5" />
                                            {format(new Date(t.date), "dd MMM, yyyy", { locale: ptBR })}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-white mb-0.5">{t.description}</div>
                                        <div className="flex flex-col gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                            <div className="flex items-center gap-1.5 ">
                                                <TagIcon className="w-2.5 h-2.5" />
                                                {t.subcategory}
                                            </div>
                                            {t.interestAmount && t.category === CategoryType.DEBT_INTEREST && (
                                                <div className="text-red-500">Juros: {t.interestAmount.toLocaleString()} MT</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            t.category === CategoryType.NEED ? 'bg-blue-500/10 text-blue-400' :
                                            t.category === CategoryType.WANT ? 'bg-purple-500/10 text-purple-400' :
                                            t.category === CategoryType.SAVING ? 'bg-emerald-500/10 text-emerald-400' :
                                            'bg-slate-500/10 text-slate-400'
                                        }`}>
                                            {t.category === CategoryType.NEED ? '50% Essencial' :
                                             t.category === CategoryType.WANT ? '30% Desejo' :
                                             t.category === CategoryType.SAVING ? '20% Reserva' :
                                             'Entrada'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-lg">
                                        <span className={t.category === CategoryType.INCOME ? 'text-emerald-500' : 'text-slate-200'}>
                                            {t.category === CategoryType.INCOME ? '+' : '-'} {t.amount.toLocaleString()} MT
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <button 
                                            onClick={() => deleteTransaction(t.id)}
                                            className="p-3 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2Icon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="py-20 text-center space-y-4">
                            <FilterIcon className="w-12 h-12 text-slate-800 mx-auto" />
                            <p className="text-slate-500 font-medium tracking-tight">Nenhuma movimentação encontrada.</p>
                        </div>
                    )}
                </div>
            </div>
            </div>

            {/* Fixed Expenses Section */}
            <div>
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-black text-white">Despesas Fixas</h1>
                <button 
                    onClick={() => setIsAddingFixed(!isAddingFixed)}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-black rounded-2xl hover:bg-red-400 transition-all active:scale-95 shadow-lg shadow-red-500/20"
                >
                    <PlusIcon className="w-5 h-5" /> Adicionar Fixa
                </button>
            </header>

            {isAddingFixed && (
                <div className="glass p-8 rounded-[2.5rem] border-red-500/20 animate-in slide-in-from-top-4 duration-300 mb-6">
                    <form onSubmit={handleAddFixed} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 col-span-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Descrição</label>
                            <input 
                                value={fixedDesc}
                                onChange={e => setFixedDesc(e.target.value)}
                                placeholder="Internet, Netflix..."
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-red-500/50 outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-2 col-span-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Valor (MT)</label>
                            <input 
                                type="number"
                                value={fixedAmount}
                                onChange={e => setFixedAmount(e.target.value)}
                                placeholder="0,00"
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-red-500/50 outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-2 col-span-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Regra</label>
                            <select 
                                value={fixedCategory}
                                onChange={e => setFixedCategory(e.target.value as FixedExpense['category'])}
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-red-500/50 outline-none transition-colors appearance-none"
                            >
                                <option value={CategoryType.NEED}>Essencial (50%)</option>
                                <option value={CategoryType.WANT}>Desejos (30%)</option>
                                <option value={CategoryType.DEBT_NO_INTEREST}>Dívida</option>
                            </select>
                        </div>
                        <div className="space-y-2 col-span-1 md:col-span-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">O Porquê desta despesa fixa?</label>
                            <input 
                                value={fixedJustification}
                                onChange={e => setFixedJustification(e.target.value)}
                                placeholder="Ex: Essencial para lazer em família ou Ferramenta de trabalho"
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-red-500/50 outline-none transition-colors"
                            />
                        </div>
                        <button 
                            type="submit"
                            className="w-full col-span-1 md:col-span-3 bg-red-500 py-4 text-white font-black rounded-2xl hover:bg-red-400 transition-colors shadow-lg mt-4"
                        >
                            Adicionar Gasto Fixo
                        </button>
                    </form>
                </div>
            )}
            
            <div className="glass rounded-[2.5rem] overflow-hidden border-white/5">
                {fixedExpenses.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                        <TagIcon className="w-12 h-12 text-slate-800 mx-auto" />
                        <p className="text-slate-500 font-medium tracking-tight">Nenhuma despesa fixa registrada.</p>
                    </div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-950/30 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-4">Descrição</th>
                                <th className="px-8 py-4">Regra</th>
                                <th className="px-8 py-4 text-right">Valor</th>
                                <th className="px-8 py-4 text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {fixedExpenses.map(f => (
                                <tr key={f.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-5 font-bold text-white">{f.description}</td>
                                    <td className="px-8 py-5">
                                         <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            f.category === CategoryType.NEED ? 'bg-blue-500/10 text-blue-400' :
                                            f.category === CategoryType.WANT ? 'bg-purple-500/10 text-purple-400' :
                                            'bg-slate-500/10 text-slate-400'
                                        }`}>
                                            {f.category === CategoryType.NEED ? '50% Essencial' :
                                             f.category === CategoryType.WANT ? '30% Desejo' :
                                             'Dívida'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-lg text-red-500">
                                        - {f.amount.toLocaleString()} MT
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <button 
                                            onClick={() => deleteFixedExpense(f.id)}
                                            className="p-3 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2Icon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default Transactions;
