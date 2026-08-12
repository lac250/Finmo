import React, { useState, useEffect } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { Settings2Icon, SaveIcon, UserIcon, CreditCardIcon, BellIcon, LogOutIcon, Trash2Icon, DownloadIcon } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../services/firebase';

const Settings: React.FC = () => {
    const { fbUser, baseIncome, setBaseIncome, payday, setPayday, logout, resetData } = useFinancial();
    const [showConfirm, setShowConfirm] = useState(false);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handler = () => setIsInstallable(true);
        if ((window as any).deferredPrompt) setIsInstallable(true);
        window.addEventListener('app-installable', handler);
        return () => window.removeEventListener('app-installable', handler);
    }, []);

    const handleInstall = async () => {
        const promptEvent = (window as any).deferredPrompt;
        if (!promptEvent) return;
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
            (window as any).deferredPrompt = null;
            setIsInstallable(false);
        }
    };

    
    const handleSave = async () => {
        if (!fbUser) return;
        const userRef = doc(db, 'users', fbUser.uid);
        try {
            await updateDoc(userRef, {
                baseIncome,
                payday
            });
            alert("Configurações salvas!");
        } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${fbUser.uid}`);
        }
    };

    const handleReset = async () => {
        await resetData();
        setShowConfirm(false);
        alert("Dados resetados com sucesso!");
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="space-y-1">
                <h1 className="text-3xl font-black text-white">Configurações</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Ajuste sua infraestrutura financeira</p>
            </header>

            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="glass p-8 rounded-[2rem] border-white/5 space-y-6 max-w-sm w-full">
                        <h3 className="text-xl font-bold text-white">Resetar todos os dados?</h3>
                        <p className="text-slate-400 text-sm">Esta ação é irreversível. Todos os seus desejos, despesas e transações serão apagados permanentemente.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-3 rounded-2xl bg-slate-800 text-white font-bold">Cancelar</button>
                            <button onClick={handleReset} className="flex-1 px-4 py-3 rounded-2xl bg-red-500 text-white font-bold">Sim, Resetar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Info */}
                <div className="md:col-span-1 space-y-6">
                    <div className="glass p-6 rounded-[2rem] border-white/5 text-center space-y-4">
                        <img 
                            src={fbUser?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} 
                            alt="Avatar" 
                            className="w-24 h-24 rounded-[2rem] mx-auto border-4 border-white/5"
                        />
                        <div>
                            <h2 className="font-black text-white">{fbUser?.displayName}</h2>
                            <p className="text-xs text-slate-500">{fbUser?.email}</p>
                        </div>
                    </div>

                    <div className="glass p-4 rounded-[1.5rem] border-white/5 space-y-1">
                        <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-black uppercase tracking-widest">
                            <UserIcon className="w-4 h-4" /> Perfil
                        </button>
                        <button className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-white/5 text-xs font-black uppercase tracking-widest transition-colors">
                            <CreditCardIcon className="w-4 h-4" /> Assinatura
                        </button>
                        <button className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-white/5 text-xs font-black uppercase tracking-widest transition-colors">
                            <BellIcon className="w-4 h-4" /> Notificações
                        </button>
                        <button onClick={logout} className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-500/10 text-xs font-black uppercase tracking-widest transition-colors">
                            <LogOutIcon className="w-4 h-4" /> Sair
                        </button>
                        {isInstallable && (
                            <button onClick={handleInstall} className="w-full mt-4 flex items-center justify-center gap-3 p-4 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-black uppercase tracking-widest transition-colors shadow-lg shadow-emerald-500/20">
                                <DownloadIcon className="w-5 h-5" /> Instalar Aplicativo
                            </button>
                        )}
                    </div>
                </div>

                {/* Configuration Form */}
                <div className="md:col-span-2 space-y-6">
                    <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500">
                                <Settings2Icon className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Parâmetros de Orçamento</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Renda Base (Pró-labore)</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={baseIncome}
                                        onChange={(e) => setBaseIncome(Number(e.target.value))}
                                        className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-4 py-4 text-white font-black text-lg focus:border-emerald-500/50 outline-none transition-colors" 
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs uppercase">MT</span>
                                </div>
                                <p className="text-[10px] text-slate-600 px-1 font-medium">Sua retirada fixa mensal. Rendas variadas são registradas separadamente.</p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ciclo de Pagamento (Dia)</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    max="31"
                                    value={payday}
                                    onChange={(e) => setPayday(Number(e.target.value))}
                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-4 py-4 text-white font-black text-lg focus:border-emerald-500/50 outline-none transition-colors"
                                />
                                <p className="text-[10px] text-slate-600 px-1 font-medium">Dia do mês em que seu fluxo de caixa é reiniciado.</p>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button 
                                onClick={handleSave}
                                className="w-full bg-white hover:bg-emerald-500 hover:text-slate-950 text-slate-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest shadow-xl active:scale-95"
                            >
                                <SaveIcon className="w-5 h-5" /> Salvar
                            </button>
                        </div>
                    </div>

                    <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-4">
                         <h3 className="font-bold text-white uppercase text-[10px] tracking-widest text-slate-500">Sobre a Regra 50/30/20</h3>
                         <p className="text-xs text-slate-400 leading-relaxed">
                            O Finmo utiliza a metodologia de orçamento equilibrado: 50% para necessidades básicas, 30% para desejos pessoais e estilo de vida, e 20% obrigatoriamente para sua reserva de emergência ou investimentos de longo prazo.
                         </p>
                    </div>
                    
                    <button 
                        onClick={() => setShowConfirm(true)}
                        className="w-full bg-slate-800 hover:bg-red-500/20 hover:text-red-500 text-slate-400 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest shadow-xl active:scale-95"
                    >
                        <Trash2Icon className="w-5 h-5" /> Resetar Dados do Sistema
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
