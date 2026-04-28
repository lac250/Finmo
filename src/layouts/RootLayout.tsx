import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboardIcon, 
  ArrowLeftRightIcon, 
  BrainCircuitIcon, 
  ShieldCheckIcon,
  Settings2Icon,
  LogOutIcon,
  CheckCircle2Icon,
  WalletIcon,
  GiftIcon
} from 'lucide-react';
import { useFinancial } from '../contexts/FinancialContext';
import { auth } from '../services/firebase';

const RootLayout: React.FC = () => {
  const { fbUser } = useFinancial();

  const handleLogout = () => {
    auth.signOut();
  };

  const navItems = [
    { to: '/', icon: LayoutDashboardIcon, label: 'Dashboard' },
    { to: '/transactions', icon: ArrowLeftRightIcon, label: 'Transações' },
    { to: '/mentor', icon: BrainCircuitIcon, label: 'Mentor IA' },
    { to: '/reserve', icon: ShieldCheckIcon, label: 'Reserva' },
    { to: '/wishlist', icon: GiftIcon, label: 'Lista de Desejos' },
    { to: '/settings', icon: Settings2Icon, label: 'Ajustes' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-emerald-500/30">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-64 border-r border-white/5 flex-col h-screen sticky top-0 bg-slate-950/50 backdrop-blur-xl">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <WalletIcon className="w-6 h-6 text-slate-950" />
          </div>
          <span className="text-2xl font-black tracking-tighter">Finmo</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group
                ${isActive 
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20' 
                  : 'text-slate-500 hover:text-white hover:bg-white/5 font-bold'}
              `}
            >
              <item.icon className="w-6 h-6 flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-bold group"
          >
            <LogOutIcon className="w-6 h-6" />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {/* Bottom Nav (Mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950 border-t border-white/5 flex justify-around items-center z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              p-2 rounded-xl transition-all 
              ${isActive ? 'text-emerald-500' : 'text-slate-600'}
            `}
          >
            <item.icon className="w-6 h-6" />
          </NavLink>
        ))}
      </nav>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-slate-950/30 backdrop-blur-md sticky top-0 z-40">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Bem-vindo,</span>
              <span className="font-black text-white leading-none">{fbUser?.displayName || 'Investidor'}</span>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-full border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Servidor Ativo</span>
              </div>
              <img 
                src={fbUser?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} 
                alt="Avatar" 
                className="w-10 h-10 rounded-2xl border-2 border-white/5 hover:border-emerald-500/50 transition-colors cursor-pointer"
                referrerPolicy="no-referrer"
              />
           </div>
        </header>

        <main className="flex-1 p-4 md:p-8 pb-24 lg:pb-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
             <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
};

export default RootLayout;
