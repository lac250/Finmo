import React, { useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { Priority, WishlistItem } from '../types';
import { PlusIcon, Trash2Icon, BrainCircuitIcon, DollarSignIcon, TargetIcon } from 'lucide-react';
import { motion } from 'motion/react';

const WishlistCard: React.FC<{ item: WishlistItem; stats: any; onDelete: (id: string) => void }> = ({ item, stats, onDelete }) => {
    const totalReserve = stats?.savings || 0;
    const itemPrice = item.price;
    const monthlyWantsBudget = (stats?.totalIncome || 0) * 0.3;
    
    let reserveLimitPercent = 0;
    let priorityLabel = "Longo Prazo";
    if (item.priority === Priority.URGENT) {
        reserveLimitPercent = 0.20;
        priorityLabel = "URGENTE";
    } else if (item.priority === Priority.IMPORTANT) {
        reserveLimitPercent = 0.15;
        priorityLabel = "IMPORTANTE";
    }
    
    const maxReserveAllowedByPriority = totalReserve * reserveLimitPercent;
    const maxReserveBy50PercentRule = itemPrice * 0.5;
    const reserveContribution = Math.min(maxReserveAllowedByPriority, maxReserveBy50PercentRule);
    const viaSalary = Math.max(0, itemPrice - reserveContribution);
    
    const monthsRemaining = monthlyWantsBudget > 0 ? (viaSalary / monthlyWantsBudget) : Infinity;
    const monthsFormatted = monthsRemaining === Infinity ? '∞' : Math.ceil(monthsRemaining);

    const reservePercent = (reserveContribution / itemPrice) * 100;
    const salaryAllowedPercent = (Math.min(viaSalary, itemPrice - reserveContribution) / itemPrice) * 100;

    let statusText = "";
    let statusTextColor = "text-emerald-500";
    let statusBgColor = "bg-emerald-500/5";

    if (item.priority === Priority.LONG_TERM) {
        statusTextColor = "text-blue-400";
        statusBgColor = "bg-blue-500/5";
        statusText = "Foco Total: Item P3. Protegendo sua reserva e financiando 100% via salário.";
    } else if (monthsRemaining <= 2) {
        statusText = `Sinal Verde: Você pode antecipar este desejo em ${monthsFormatted} meses usando a margem segura da sua reserva (P${item.priority} ${(reserveLimitPercent * 100).toFixed(0)}%)`;
    } else {
        statusTextColor = "text-amber-500";
        statusBgColor = "bg-amber-500/5";
        statusText = `Atenção: Recomendado focar no salário. Faltam aproximadamente ${monthsFormatted} meses de economia.`;
    }

    return (
        <div className="bg-[#111827] p-8 rounded-[2rem] border border-white/5 space-y-6 flex flex-col h-full shadow-2xl">
            <div className="flex justify-between items-start">
                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black border ${item.priority === Priority.URGENT ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-500" : item.priority === Priority.IMPORTANT ? "border-amber-500/30 bg-amber-500/10 text-amber-500" : "border-blue-500/30 bg-blue-500/10 text-blue-400"}`}>
                    P{item.priority} - {priorityLabel}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => onDelete(item.id)} className="text-slate-600 hover:text-red-500 transition-colors p-1">
                        <Trash2Icon className="w-4 h-4" />
                    </button>
                    <div className="text-slate-600 p-1">
                        <DollarSignIcon className="w-4 h-4 opacity-30" />
                    </div>
                </div>
            </div>
            
            <div className="flex-1 space-y-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-100">{item.name}</h3>
                </div>

                <div className="text-4xl font-black text-white flex items-baseline gap-2">
                    {item.price.toLocaleString()} <span className="text-xl font-bold text-slate-100">MT</span>
                </div>

                <div className="space-y-4">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                        Progresso de aquisição
                    </div>
                    
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(1 - monthsRemaining / 12) * 50}%` }}
                            className="h-full bg-cyan-400"
                        />
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${reservePercent}%` }}
                            className="h-full bg-emerald-500/40 border-l border-white/10"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-1">
                            <div className="text-[9px] font-bold text-slate-500 uppercase">Via Salário</div>
                            <div className="text-sm font-bold text-white">{(itemPrice * 0.35).toLocaleString()} MT</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[9px] font-bold text-slate-500 uppercase">Da Reserva</div>
                            <div className="text-sm font-bold text-white">{reserveContribution.toLocaleString()} MT</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[9px] font-bold text-slate-500 uppercase">Faltam</div>
                            <div className="text-sm font-bold text-white">{(itemPrice - reserveContribution - (itemPrice * 0.35)).toLocaleString()} MT</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`p-5 rounded-2xl ${statusBgColor} transition-all`}>
                <p className={`text-[11px] font-medium leading-relaxed ${statusTextColor}`}>
                    {statusText}
                </p>
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
