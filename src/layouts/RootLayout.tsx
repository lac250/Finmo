import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboardIcon, RepeatIcon, Settings2Icon, CheckCircle2Icon } from 'lucide-react';
import { useFinancial } from '../contexts/FinancialContext';

const RootLayout: React.FC = () => {
  const { fbUser } = useFinancial();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <nav className="glass sticky top-0 z-50 p-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold">Finmo</Link>
          <div className="flex gap-4">
            <Link to="/"><LayoutDashboardIcon className="w-5 h-5" /></Link>
            <Link to="/fixed-expenses"><RepeatIcon className="w-5 h-5" /></Link>
            <Link to="/settings"><Settings2Icon className="w-5 h-5" /></Link>
          </div>
        </div>
      </nav>
      
      <main className="flex-grow p-4">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

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
