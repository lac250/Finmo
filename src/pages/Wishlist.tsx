import React, { useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { Priority, WishlistItem } from '../types';
import { PlusIcon, Trash2Icon, BrainCircuitIcon, DollarSignIcon, TargetIcon } from 'lucide-react';
import { motion } from 'motion/react';

const Wishlist: React.FC = () => {
    const { wishlist, addWishlistItem, deleteWishlistItem, stats } = useFinancial();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [priority, setPriority] = useState<Priority>(Priority.LONG_TERM);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !price) return;
        
        await addWishlistItem({
            name,
            price: Number(price),
            priority,
            createdAt: new Date().toISOString()
        });
        
        setName('');
        setPrice('');
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
                    <button className="col-span-full bg-emerald-500 py-3 md:py-4 rounded-2xl font-black text-slate-950">Adicionar Desejo</button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.sort((a,b) => a.priority - b.priority).map(item => {
                    const totalReserve = stats?.savings || 0;
                    const itemPrice = item.price;
                    const monthlySavingsRate = stats?.savings || 0;
                    
                    // Cálculo Primário: Tempo sem reserva
                    const monthsWithoutReserve = monthlySavingsRate > 0 ? (itemPrice / monthlySavingsRate).toFixed(1) : '∞';

                    // Lógica de Prioridade
                    let reserveLimitPercent = 0;
                    let isBlocked = false;
                    let mentorMessage = "";

                    if (item.priority === Priority.URGENT) {
                        reserveLimitPercent = 0.20;
                    } else if (item.priority === Priority.IMPORTANT) {
                        reserveLimitPercent = 0.15;
                    } else { // LONG_TERM
                        isBlocked = true;
                        mentorMessage = "Este é um desejo de longo prazo. Para sua segurança, vamos focar em adquiri-lo 100% com sua economia mensal, preservando sua reserva para emergências ou desejos de Nível 1.";
                    }

                    const maxReserveAllowedByReserveBalance = totalReserve * reserveLimitPercent;
                    const reserveContribution = isBlocked ? 0 : Math.min(itemPrice * 0.5, maxReserveAllowedByReserveBalance); 
                    const amountNeededFromSavings = itemPrice - reserveContribution;
                    
                    const monthsToSaveWithReserve = monthlySavingsRate > 0 ? (amountNeededFromSavings / monthlySavingsRate).toFixed(1) : '∞';
                    const timeSaved = monthlySavingsRate > 0 ? (Number(monthsWithoutReserve) - Number(monthsToSaveWithReserve)).toFixed(1) : "0";
                    const progress = Math.min((reserveContribution / itemPrice) * 100, 50);

                    return (
                        <div key={item.id} className="glass p-6 rounded-[2.5rem] border-white/5 space-y-4 group">
                            <div className="flex justify-between items-start">
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.priority === Priority.URGENT ? "bg-red-500/10 text-red-500" : item.priority === Priority.IMPORTANT ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-400"}`}>P{item.priority}</div>
                                <button onClick={() => deleteWishlistItem(item.id)} className="text-slate-600 hover:text-red-500"><Trash2Icon className="w-4 h-4" /></button>
                            </div>
                            <h3 className="text-lg font-bold text-white">{item.name}</h3>
                            <div className="text-2xl font-black text-emerald-400">{item.price.toLocaleString()} MT</div>
                            
                            <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/5 text-center">
                                <div className="space-y-1">
                                    <div className="text-[9px] font-bold text-slate-500 uppercase">Via Salário</div>
                                    <div className="text-xs font-black text-white">{monthsWithoutReserve} m</div>
                                </div>
                                <div className="space-y-1 border-x border-white/5">
                                    <div className="text-[9px] font-bold text-slate-500 uppercase">Via Reserva</div>
                                    <div className="text-xs font-black text-emerald-400">
                                        {isBlocked ? "0" : reserveContribution.toLocaleString()} <span className="text-[8px]">MT</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] font-bold text-slate-500 uppercase">Veredito</div>
                                    <div className="text-[9px] font-bold text-white leading-tight">
                                        {!isBlocked ? "Viável e Seguro" : "Alerta de Segurança"}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                                    {isBlocked ? 
                                     "Este é um desejo de longo prazo. Foco total na economia mensal para proteger sua estabilidade." :
                                     `Ao usar ${reserveContribution.toLocaleString()} MT da reserva, você reduz seu tempo de espera em ${timeSaved} meses!`
                                    }
                                </p>
                                {!isBlocked && (
                                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
export default Wishlist;
