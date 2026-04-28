
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  WalletIcon, 
  LayoutDashboardIcon, 
  RepeatIcon, 
  Settings2Icon,
  CloudIcon,
  CheckCircle2Icon
} from 'lucide-react';
import { useFinancial } from '../contexts/FinancialContext';

const RootLayout: React.FC = () => {
    const { user, fbUser } = useFinancial();
    const location = useLocation();

    const tabs = [
        { path: '/', icon: LayoutDashboardIcon, label: 'Dashboard' },
        { path: '/fixed-expenses', icon: RepeatIcon, label: 'Fixos' },
        { path: '/settings', icon: Settings2Icon, label: 'Ajustes' }
    ];

    if (!fbUser) return <Outlet />;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
            <header className="sticky top-0 z-50 glass border-b border-slate-800 px-4 md:px-6 py-4 flex justify-between items-center transition-all">
                <div className="flex items-center gap-2">
                    <div className="bg-emerald-500 p-2 rounded-xl">
                        <WalletIcon className="w-5 h-5 text-slate-950" />
                    </div>
                    <span className="text-xl font-bold font-sans tracking-tight">Finmo</span>
                </div>
                
                <div className="flex items-center gap-4">
                    {user && (
                        <div className="flex items-center gap-2 bg-slate-900/50 pr-3 pl-1 py-1 rounded-full border border-slate-800">
                            <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">{user.name.split(' ')[0]}</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 lg:p-8 animate-in fade-in duration-500">
                <Outlet />
            </main>

            <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="glass px-2 py-2 rounded-2xl border-slate-700 shadow-2xl flex items-center gap-1 backdrop-blur-xl">
                    {tabs.map((tab) => {
                        const isActive = location.pathname === tab.path;
                        return (
                            <Link 
                                key={tab.path}
                                to={tab.path}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <tab.icon className={`w-5 h-5 ${isActive ? 'scale-110' : 'opacity-70'}`} />
                                <span className={`text-[10px] uppercase tracking-widest ${isActive ? 'block' : 'hidden md:block'}`}>{tab.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <footer className="fixed bottom-0 left-0 right-0 py-2 px-4 flex justify-center items-center text-[8px] tracking-[0.3em] text-slate-700 uppercase pointer-events-none">
                <div className="flex items-center gap-2 bg-slate-950 px-4 py-1 rounded-full border border-slate-900/50">
                    <span>Finmo Core Engine</span>
                    {fbUser && <div className="flex items-center gap-1 text-emerald-500/30 font-black"><CheckCircle2Icon className="w-2.5 h-2.5" /> SYNC ON</div>}
                </div>
            </footer>
        </div>
    );
};

export default RootLayout;
