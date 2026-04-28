import React, { useState, useMemo, useEffect } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  WalletIcon, 
  ZapIcon, 
  BrainCircuitIcon,
  ChevronRightIcon,
  PlusIcon
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CategoryType } from '../types';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { getFinancialAdvice } from '../services/geminiService';

const ProgressCard = ({ title, amount, percentage, color, icon: Icon, limit }: any) => {
    const isOver = percentage > (limit || 100);
    return (
        <div className="glass p-6 rounded-[2rem] border-white/5 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform`}>
                <Icon className="w-16 h-16" />
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</span>
                    <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-white">{amount.toLocaleString()} MT</h3>
                    <p className={`text-[10px] font-bold ${isOver ? 'text-red-400' : 'text-slate-500'}`}>
                        {percentage.toFixed(1)}% do orçamento
                    </p>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percentage, 100)}%` }}
                        className={`h-full ${isOver ? 'bg-red-500' : color.replace('text-', 'bg-')}`} 
                    />
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => {
    const { stats, transactions, addTransaction } = useFinancial();
    const [quickDesc, setQuickDesc] = useState('');
    const [quickAmount, setQuickAmount] = useState('');
    const [quickCat, setQuickCat] = useState<CategoryType>(CategoryType.NEED);
    const [mentorTip, setMentorTip] = useState<{ message: string } | null>(null);

    useEffect(() => {
        if (stats) {
            getFinancialAdvice(stats, transactions, stats.totalIncome).then(setMentorTip);
        }
    }, [stats, transactions]);

    if (!stats) return null;

    const handleQuickAdd = async () => {
        if (!quickDesc || !quickAmount) return;
        await addTransaction({
            description: quickDesc,
            amount: Number(quickAmount),
            category: quickCat,
            subcategory: 'Geral',
            date: new Date().toISOString()
        });
        setQuickDesc('');
        setQuickAmount('');
    };

    // Calculate chart data from transactions
    const chartData = useMemo(() => {
        const data: { date: string, saldo: number, despesas: number, reserva: number, despesasFixas: number }[] = [];
        const today = new Date();
        
        // Simple balance calculation
        const currentBalance = stats.totalIncome - stats.totalSpent;
        const totalExpenses = stats.totalNeeds + stats.wants;
        const totalSavings = stats.savings;
        const totalFixedExpenses = stats.fixedNeeds + stats.fixedWants;

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            
            data.push({
                date: dateStr,
                saldo: currentBalance,
                despesas: totalExpenses,
                reserva: totalSavings,
                despesasFixas: totalFixedExpenses
            });
        }
        return data;
    }, [transactions, stats]);

    const needPercentage = (stats.totalNeeds / stats.totalIncome) * 100 || 0;
    const wantPercentage = (stats.wants / stats.totalIncome) * 100 || 0;
    const savingPercentage = (stats.savings / stats.totalIncome) * 100 || 0;

    return (
        <div className="space-y-8 pb-20">
            {/* 50/30/20 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ProgressCard 
                    title="Essenciais (50%)" 
                    amount={stats.totalNeeds} 
                    percentage={needPercentage}
                    color="text-blue-500"
                    icon={ZapIcon}
                    limit={50}
                />
                <ProgressCard 
                    title="Desejos (30%)" 
                    amount={stats.wants} 
                    percentage={wantPercentage}
                    color="text-purple-500"
                    icon={TrendingUpIcon}
                    limit={30}
                />
                <ProgressCard 
                    title="Reserva (20%)" 
                    amount={stats.savings} 
                    percentage={savingPercentage}
                    color="text-emerald-500"
                    icon={WalletIcon}
                    limit={20}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-white/5 space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-white">Fluxo de Caixa</h2>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Projeção dos últimos 30 dias</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Saldo</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Despesas</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Reserva</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Despesas Fixas</span>
                              </div>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis 
                                        dataKey="date" 
                                        stroke="#475569" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false}
                                    />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="saldo" 
                                        stroke="#10b981" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorSaldo)" 
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="despesas" 
                                        stroke="#ef4444" 
                                        strokeWidth={3}
                                        fill="none" 
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="reserva" 
                                        stroke="#3b82f6" 
                                        strokeWidth={3}
                                        fill="none" 
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="despesasFixas" 
                                        stroke="#f97316" 
                                        strokeWidth={3}
                                        fill="none" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* AI Quick Alert */}
                    <Link to="/mentor" className="block">
                        <div className={`glass p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-white/5 flex items-center justify-between group transition-all hover:bg-white/5 ${
                            wantPercentage > 30 ? 'border-amber-500/20' : ''
                        }`}>
                            <div className="flex items-center gap-4 md:gap-6">
                                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-lg ${
                                    wantPercentage > 30 ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
                                }`}>
                                    <BrainCircuitIcon className="w-6 h-6 md:w-8 md:h-8" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-white">Mentor IA</h3>
                                    <p className="text-slate-400 text-xs md:text-sm max-w-sm md:max-w-md">
                                        {wantPercentage > 30 
                                            ? "Seus desejos ultrapassaram 30%. Clique aqui para ver como reequilibrar seu caixa."
                                            : "Seu planejamento está saudável. Clique para ver análises detalhadas."
                                        }
                                    </p>
                                </div>
                            </div>
                            <ChevronRightIcon className="w-5 h-5 md:w-6 md:h-6 text-slate-700 group-hover:text-white transition-colors" />
                        </div>
                    </Link>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    {/* Quick Add Form */}
                    <div className="glass p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-white/5 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                                <PlusIcon className="w-4 h-4" />
                            </div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Novo Registro</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <input 
                                value={quickDesc}
                                onChange={e => setQuickDesc(e.target.value)}
                                placeholder="Descrição..."
                                className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none transition-colors"
                            />
                            <div className="relative">
                                <input 
                                    type="number"
                                    value={quickAmount}
                                    onChange={e => setQuickAmount(e.target.value)}
                                    placeholder="Valor (MT)"
                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none transition-colors"
                                />
                                <ZapIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                            </div>
                            <select 
                                value={quickCat}
                                onChange={e => setQuickCat(e.target.value as CategoryType)}
                                className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:border-emerald-500/50 outline-none transition-colors appearance-none"
                            >
                                <option value={CategoryType.NEED}>Necessidade (50%)</option>
                                <option value={CategoryType.WANT}>Desejo (30%)</option>
                                <option value={CategoryType.SAVING}>Reserva (20%)</option>
                                <option value={CategoryType.INCOME}>Renda Extra</option>
                            </select>
                            <button 
                                onClick={handleQuickAdd}
                                className="w-full bg-emerald-500 py-3 md:py-4 text-slate-950 font-black rounded-2xl hover:bg-emerald-400 transition-colors shadow-lg text-xs uppercase tracking-widest"
                            >
                                Adicionar Registro
                            </button>
                        </div>
                    </div>

                    <div className="glass p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-white/5 space-y-6">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Atividade Recente</h2>
                        <div className="space-y-4">
                            {transactions.slice(0, 5).map(t => (
                                <div key={t.id} className="flex items-center gap-4 group">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                        t.category === CategoryType.INCOME ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'
                                    }`}>
                                        {t.category === CategoryType.INCOME ? <TrendingUpIcon className="w-5 h-5" /> : <TrendingDownIcon className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{t.description}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.subcategory}</p>
                                    </div>
                                    <div className={`text-sm font-black ${t.category === CategoryType.INCOME ? 'text-emerald-500' : 'text-slate-300'}`}>
                                        {t.amount.toLocaleString()} MT
                                    </div>
                                </div>
                            ))}
                            {transactions.length === 0 && (
                                <p className="text-center py-10 text-slate-600 text-xs font-bold uppercase tracking-widest">Sem registros ainda</p>
                            )}
                        </div>
                        <Link to="/transactions" className="block text-center pt-4 text-xs font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors">
                            Ver Todas
                        </Link>
                    </div>

                    <div className="glass p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-emerald-500 border-none relative overflow-hidden group">
                        <div className="absolute -bottom-4 -right-4 opacity-20 transform group-hover:scale-110 transition-transform">
                            <ZapIcon className="w-32 h-32 text-slate-950" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <h3 className="text-xl md:text-2xl font-black text-white">Dica do Mentor</h3>
                            <p className="text-white text-xs md:text-sm font-medium leading-tight">
                                {mentorTip ? mentorTip.message : "Carregando dica do mentor..."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
