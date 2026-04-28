
import React from 'react';
import { 
  Settings2Icon, 
  CalendarIcon, 
  RotateCcwIcon,
  LogOutIcon,
  UserIcon
} from 'lucide-react';
import { useFinancial } from '../contexts/FinancialContext';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

const Settings: React.FC = () => {
  const { user, baseIncome, setBaseIncome, payday, setPayday, resetData } = useFinancial();

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('finmo_user');
    window.location.href = '/';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="glass p-8 rounded-3xl space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-3 rounded-2xl"><Settings2Icon className="w-6 h-6 text-emerald-400" /></div>
          <h2 className="text-2xl font-bold">Configurações</h2>
        </div>

        {user && (
          <div className="flex items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full border-2 border-emerald-500/50 shadow-xl" />
            <div>
              <p className="text-lg font-bold">{user.name}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] text-slate-500 uppercase font-black ml-1">Renda Fixa Mensal (Base)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xs">MT</span>
              <input 
                type="number" 
                value={baseIncome} 
                onChange={(e) => setBaseIncome(Number(e.target.value))} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none text-emerald-400 font-bold text-lg" 
              />
            </div>
            <p className="text-[10px] text-slate-600 italic">Este valor é usado para calcular suas metas 50/30/20.</p>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] text-slate-500 uppercase font-black ml-1">Dia do Salário</label>
            <div className="relative">
              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="number" 
                min="1" 
                max="31" 
                value={payday} 
                onChange={(e) => setPayday(Number(e.target.value))} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-200 font-bold text-lg" 
              />
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 space-y-4">
          <button 
            onClick={() => {
              if (window.confirm('Tem certeza que deseja reiniciar todos os seus dados?')) {
                resetData();
              }
            }}
            className="w-full py-4 rounded-xl border border-orange-500/30 text-orange-400 font-bold hover:bg-orange-500/10 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcwIcon className="w-4 h-4" /> Reiniciar Dados
          </button>

          <button 
            onClick={handleLogout}
            className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
          >
            <LogOutIcon className="w-4 h-4" /> Encerrar Sessão
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
