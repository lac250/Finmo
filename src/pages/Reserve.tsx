import React, { useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { ShieldCheckIcon, TrendingUpIcon, WalletIcon, LandmarkIcon, PlusIcon } from 'lucide-react';
import { CategoryType } from '../types';

const Reserve: React.FC = () => {
    const { stats, transactions, addTransaction } = useFinancial();
    const [isAdding, setIsAdding] = useState(false);
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [justification, setJustification] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!desc || !amount || !justification) return;
        
        await addTransaction({
            description: desc,
            amount: Number(amount),
            justification,
            category: CategoryType.SAVING,
            subcategory: 'Aporte Extra',
            date: new Date().toISOString()
        });
        
        setDesc('');
        setAmount('');
        setJustification('');
        setIsAdding(false);
    };
    
    if (!stats) return null;

    const reserveTransactions = transactions.filter(t => t.category === CategoryType.SAVING);
    const targetAmount = stats.totalIncome * 0.2;
    const progress = (stats.savings / targetAmount) * 100 || 0;

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-white">Reserva de Emergência</h1>
                    <p className="text-slate-400">Seu escudo financeiro. A meta é manter sempre 20% da sua renda investida.</p>
                </div>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-slate-950 font-black rounded-2xl hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                    <PlusIcon className="w-5 h-5" /> Novo Aporte
                </button>
            </header>

            {isAdding && (
                <div className="glass p-8 rounded-[2.5rem] border-emerald-500/20 animate-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Descrição (ex: Trabalho Extra)</label>
                            <input 
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                                placeholder="Trabalho extra, bônus..."
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
                        <div className="space-y-2 md:col-span-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">O Porquê deste aporte extra?</label>
                            <input 
                                value={justification}
                                onChange={e => setJustification(e.target.value)}
                                placeholder="Ex: Renda extra de consultoria ou Economia de gastos supérfluos"
                                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-emerald-500/50 outline-none transition-colors"
                            />
                        </div>
                        <div className="flex items-end md:col-start-3">
                            <button 
                                type="submit"
                                className="w-full bg-emerald-500 py-4 text-slate-950 font-black rounded-2xl hover:bg-emerald-400 transition-colors shadow-lg"
                            >
                                Confirmar Aporte
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass p-8 rounded-[2.5rem] border-emerald-500/20 bg-emerald-500/5 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center">
                            <ShieldCheckIcon className="w-6 h-6 text-slate-950" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Proteção Ativa</span>
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Saldo na Reserva</h2>
                        <div className="text-5xl font-black text-white">{stats.savings.toLocaleString()} MT</div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                            <span className="text-slate-500">Progresso da Meta (20%)</span>
                            <span className="text-emerald-500">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 p-0.5">
                            <div 
                                className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                                style={{ width: `${Math.min(progress, 100)}%` }} 
                            />
                        </div>
                        <p className="text-[10px] text-slate-600 font-bold text-right italic">Meta ideal deste mês: {targetAmount.toLocaleString()} MT</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="glass p-6 rounded-3xl border-white/5 flex items-center gap-6">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                            <LandmarkIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Investimento Seguro</h3>
                            <p className="text-xs text-slate-500 leading-tight">Sua reserva está alocada em ativos de liquidez diária.</p>
                        </div>
                    </div>
                    <div className="glass p-6 rounded-3xl border-white/5 flex items-center gap-6">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500">
                            <TrendingUpIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Rendimento Estimado</h3>
                            <p className="text-xs text-slate-500 leading-tight">Projeção de rendimento de 0.8% ao mês sobre o montante.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass rounded-[2.5rem] border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Histórico de Aportes</h2>
                </div>
                <div className="divide-y divide-white/5">
                    {reserveTransactions.map(t => (
                        <div key={t.id} className="p-6 flex justify-between items-center hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                                    <WalletIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{t.description}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{new Date(t.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="text-emerald-500 font-black">
                                + {t.amount.toLocaleString()} MT
                            </div>
                        </div>
                    ))}
                    {reserveTransactions.length === 0 && (
                        <div className="py-20 text-center text-slate-600 text-xs font-bold uppercase tracking-widest">Nenhum aporte registrado este mês</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reserve;
