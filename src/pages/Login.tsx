
import React, { useState } from 'react';
import { WalletIcon, LogInIcon, InfoIcon, AlertCircleIcon } from 'lucide-react';
import { loginWithGoogle } from '../services/firebase';

const Login: React.FC = () => {
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        setError(null);
        try {
            await loginWithGoogle();
        } catch (error: any) {
            console.error("Login failed", error);
            setError("Falha na autenticação. Verifique sua conexão ou configurações do Firebase.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
            <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-4">
                    <div className="inline-flex bg-emerald-500 p-4 rounded-3xl shadow-2xl shadow-emerald-500/20 mb-4 scale-110">
                        <WalletIcon className="w-10 h-10 text-slate-950" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-white">Finmo</h1>
                    <p className="text-slate-400 text-lg leading-relaxed">Seu mentor financeiro 50/30/20.<br/>Simples, pragmático, local.</p>
                </div>

                <div className="glass p-8 rounded-[2.5rem] border-slate-800 space-y-6 shadow-2xl">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 animate-in shake duration-300">
                            <AlertCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-400 leading-tight">{error}</p>
                        </div>
                    )}

                    <button 
                        onClick={handleLogin}
                        className="w-full bg-white hover:bg-slate-100 text-slate-950 font-black py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg shadow-xl"
                    >
                        <LogInIcon className="w-6 h-6" />
                        Entrar com Google
                    </button>
                    
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                        <div className="flex gap-3 text-slate-500">
                            <InfoIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-400" />
                            <p className="text-xs leading-relaxed">
                                Seus dados são salvos com segurança na nuvem e vinculados à sua conta Google.
                            </p>
                        </div>
                    </div>
                </div>

                <p className="text-center text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black">
                    Construído para Moçambique 🇲🇿
                </p>
            </div>
        </div>
    );
};

export default Login;
