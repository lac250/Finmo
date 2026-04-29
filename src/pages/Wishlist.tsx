import React, { useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { Priority, WishlistItem } from '../types';
import { PlusIcon, Trash2Icon, BrainCircuitIcon, DollarSignIcon, TargetIcon } from 'lucide-react';
import { motion } from 'motion/react';

const WishlistCard: React.FC<{ item: WishlistItem; stats: any; onDelete: (id: string) => void }> = ({ item, stats, onDelete }) => {
    const totalReserve = stats?.savings || 0;
    const itemPrice = item.price;
    const monthlyWantsBudget = (stats?.totalIncome || 0) * 0.3;
    
    // 1. Cálculo de Limite da Reserva
    let reserveLimitPercent = 0;
    if (item.priority === Priority.URGENT) reserveLimitPercent = 0.20;
    else if (item.priority === Priority.IMPORTANT) reserveLimitPercent = 0.15;
    
    const maxReserveAllowedByPriority = totalReserve * reserveLimitPercent;
    const maxReserveBy50PercentRule = itemPrice * 0.5;
    
    // Valor máximo que a reserva pode cobrir
    const reserveContribution = Math.min(maxReserveAllowedByPriority, maxReserveBy50PercentRule);
    
    // Valor que deve vir do salário (30% wants)
    const viaSalary = itemPrice - reserveContribution;
    
    // Tempo Estimado (meses)
    const monthsRemaining = monthlyWantsBudget > 0 ? (viaSalary / monthlyWantsBudget) : Infinity;
    const monthsFormatted = monthsRemaining === Infinity ? '∞' : monthsRemaining.toFixed(1);

    // Progress percentages for the bar
    const reservePercent = (reserveContribution / itemPrice) * 100;
    const salaryPercent = 100 - reservePercent;

    // Veredito Logic
    let statusColor = "bg-emerald-500";
    let statusText = "";
    let statusTextColor = "text-emerald-500";
    let statusBorderColor = "border-emerald-500/20";
    let statusBgColor = "bg-emerald-500/10";

    if (item.priority === Priority.LONG_TERM) {
        statusColor = "bg-blue-500";
        statusTextColor = "text-blue-400";
        statusBorderColor = "border-blue-500/20";
        statusBgColor = "bg-blue-500/10";
        statusText = "Foco Total: Item P3. Protegendo sua reserva e financiando 100% via salário.";
    } else if (monthsRemaining <= 1) {
        statusColor = "bg-emerald-500";
        statusText = `Sinal Verde: Você pode antecipar este desejo em ${monthsFormatted} meses usando a margem segura da sua reserva (P${item.priority} ${(reserveLimitPercent * 100).toFixed(0)}%)`;
    } else {
        statusColor = "bg-amber-500";
        statusTextColor = "text-amber-500";
        statusBorderColor = "border-amber-500/20";
        statusBgColor = "bg-amber-500/10";
        statusText = `Atenção/Poupando: Recomendado aguardar. Faltam ${monthsFormatted} meses de economia via salário.`;
    }

    const isLowJustificationP1 = item.priority === Priority.URGENT && 
        (item.justification.toLowerCase().includes("vi no") || 
         item.justification.toLowerCase().includes("vontade") || 
         item.justification.length < 15);

    return (
        <div className="glass p-6 rounded-[2.5rem] border-white/5 space-y-6 group flex flex-col h-full">
            <div className="flex justify-between items-start">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.priority === Priority.URGENT ? "bg-red-500/10 text-red-500" : item.priority === Priority.IMPORTANT ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-400"}`}>P{item.priority}</div>
                <button onClick={() => onDelete(item.id)} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2Icon className="w-4 h-4" /></button>
            </div>
            
            <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                <p className="text-[10px] text-slate-500 italic mb-4">"{item.justification}"</p>
                <div className="text-3xl font-black text-white mb-6">
                    {item.price.toLocaleString()} <span className="text-sm font-bold text-slate-500">MT</span>
                </div>

                {isLowJustificationP1 && (
                    <div className="mb-4 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                        <p className="text-[10px] text-red-500 font-bold leading-tight uppercase tracking-wider">⚠️ Alerta de Impulso</p>
                        <p className="text-[10px] text-slate-400 mt-1">A razão parece ser impulso. Recomendo mudar para Prioridade 3 para proteger sua segurança financeira.</p>
                    </div>
                )}

                {/* Barra de Progresso Segmentada */}
                <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">
                        <span>Financiamento</span>
                        <span>100%</span>
                    </div>
                    <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-white/5">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${salaryPercent}%` }}
                            className="h-full bg-cyan-400 rounded-l-full relative group/salary"
                        >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover/salary:opacity-100 transition-opacity whitespace-nowrap">Via Salário</div>
                        </motion.div>
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${reservePercent}%` }}
                            className="h-full bg-emerald-500/40 rounded-r-full relative group/reserve border-l border-white/10"
                        >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover/reserve:opacity-100 transition-opacity whitespace-nowrap">Da Reserva</div>
                        </motion.div>
                    </div>
                </div>

                {/* Grid de Status */}
                <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/5 text-center">
                    <div className="space-y-1">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Via Salário</div>
                        <div className="text-xs font-black text-cyan-400">{viaSalary.toLocaleString()}</div>
                    </div>
                    <div className="space-y-1 border-x border-white/5">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Da Reserva</div>
                        <div className="text-xs font-black text-emerald-400">{reserveContribution.toLocaleString()}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Faltam</div>
                        <div className="text-xs font-black text-white">{monthsFormatted} <span className="text-[8px]">meses</span></div>
                    </div>
                </div>
            </div>

            {/* Veredito do Mentor */}
            <div className={`p-4 rounded-3xl border ${statusBorderColor} ${statusBgColor} transition-all`}>
                <div className="flex items-start gap-3">
                    <BrainCircuitIcon className={`w-4 h-4 ${statusTextColor} shrink-0 mt-0.5`} />
                    <p className={`text-[10px] font-bold leading-relaxed ${statusTextColor}`}>
                        {statusText}
                    </p>
                </div>
            </div>
        </div>
    );
};

const Wishlist: React.FC = () => {
    const { wishlist, addWishlistItem, deleteWishlistItem, stats } = useFinancial();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [justification, setJustification] = useState('');
    const [priority, setPriority] = useState<Priority>(Priority.LONG_TERM);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !price || !justification) return;
        
        await addWishlistItem({
            name,
            price: Number(price),
            priority,
            justification,
            createdAt: new Date().toISOString()
        });
        
        setName('');
        setPrice('');
        setJustification('');
    };

    return (
        <div className="space-y-8 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-black text-white">Lista de Desejos</h1>
                <div className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-slate-900 rounded-2xl border border-white/5">
                    <BrainCircuitIcon className="w-5 h-5 text-emerald-500" />
                    <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Inteligência Preditiva ATIVA</span>
                </div>
            </header>

            <div className="glass p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-white/5">
                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Item desejado..." className="col-span-1 md:col-span-2 bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white" />
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Valor (MT)" className="bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white" />
                    <select value={priority} onChange={e => setPriority(Number(e.target.value))} className="bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white appearance-none">
                        <option value={Priority.URGENT}>Urgente (P1)</option>
                        <option value={Priority.IMPORTANT}>Importante (P2)</option>
                        <option value={Priority.LONG_TERM}>Longo Prazo (P3)</option>
                    </select>
                    <input 
                        value={justification} 
                        onChange={e => setJustification(e.target.value)} 
                        placeholder="Por que você deseja este item? (Ex: Melhorar minha produtividade no trabalho)" 
                        className="col-span-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white" 
                    />
                    <button className="col-span-full bg-emerald-500 py-3 md:py-4 rounded-2xl font-black text-slate-950">Adicionar Desejo</button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.sort((a,b) => a.priority - b.priority).map(item => (
                    <WishlistCard 
                        key={item.id} 
                        item={item} 
                        stats={stats} 
                        onDelete={deleteWishlistItem} 
                    />
                ))}
            </div>
        </div>
    );
};
export default Wishlist;
