import React, { useState } from 'react';
import { WalletIcon, AlertCircleIcon } from 'lucide-react';
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-4">
                    <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center">
                        <WalletIcon className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h1 className="text-4xl font-black text-white">Finmo</h1>
                    <p className="text-slate-400">Mentor Financeiro 50/30/20</p>
                </div>

                <div className="bg-slate-900/70 p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3">
                            <AlertCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-400 leading-tight">{error}</p>
                        </div>
                    )}

                    <button 
                        onClick={handleLogin}
                        className="w-full bg-white hover:bg-slate-100 text-slate-950 font-black py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg shadow-xl"
                    >
                        Entrar com Google
                    </button>
                    
                    <p className="text-center text-xs text-slate-600">
                        Ao entrar, você concorda com nossos termos.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
