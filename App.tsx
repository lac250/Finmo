
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUpIcon, 
  WalletIcon, 
  CreditCardIcon, 
  PieChartIcon, 
  SparklesIcon,
  Trash2Icon,
  ChevronRightIcon,
  TagIcon,
  AlertTriangleIcon,
  XIcon,
  RotateCcwIcon,
  CalendarIcon,
  ArrowRightIcon,
  FlameIcon,
  BanknoteIcon,
  RepeatIcon,
  Settings2Icon,
  InfoIcon,
  LineChartIcon,
  ClockIcon,
  LogOutIcon,
  CloudCheckIcon,
  CloudIcon,
  UserIcon,
  LogInIcon
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area
} from 'recharts';
import { CategoryType, Transaction, BudgetStats, AIAdvice, FixedExpense } from './types';
import { CATEGORY_LABELS, CATEGORY_COLORS, SUBCATEGORIES, formatCurrency } from './constants';
import { getFinancialAdvice } from './services/geminiService';

interface User {
  name: string;
  email: string;
  picture: string;
}

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('finmo_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Persistence states
  const [baseIncome, setBaseIncome] = useState<number>(() => {
    const saved = localStorage.getItem('finmo_income');
    return saved ? Number(saved) : 0; // Salário padrão alterado para 0
  });

  const [payday, setPayday] = useState<number>(() => {
    const saved = localStorage.getItem('finmo_payday');
    return saved ? Number(saved) : 1;
  });

  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(() => {
    const saved = localStorage.getItem('finmo_fixed');
    return saved ? JSON.parse(saved) : [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('finmo_transactions');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Erro ao carregar transações:", e);
      return [];
    }
  });

  // UI / Form states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [interestAmount, setInterestAmount] = useState('');
  const [formType, setFormType] = useState<'expense' | 'income' | 'fixed'>('expense');
  const [category, setCategory] = useState<CategoryType>(CategoryType.NEED);
  const [subcategory, setSubcategory] = useState<string>(SUBCATEGORIES[CategoryType.NEED][0]);
  const [dueDate, setDueDate] = useState('');
  const [aiAdvice, setAiAdvice] = useState<AIAdvice | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [showFixedManager, setShowFixedManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Sync with LocalStorage
  useEffect(() => localStorage.setItem('finmo_income', baseIncome.toString()), [baseIncome]);
  useEffect(() => localStorage.setItem('finmo_payday', payday.toString()), [payday]);
  useEffect(() => localStorage.setItem('finmo_fixed', JSON.stringify(fixedExpenses)), [fixedExpenses]);
  useEffect(() => localStorage.setItem('finmo_transactions', JSON.stringify(transactions)), [transactions]);
  useEffect(() => {
    if (user) localStorage.setItem('finmo_user', JSON.stringify(user));
    else localStorage.removeItem('finmo_user');
  }, [user]);

  // Google Auth Initialization
  useEffect(() => {
    const handleCredentialResponse = (response: any) => {
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        const userData: User = {
          name: payload.name,
          email: payload.email,
          picture: payload.picture
        };
        setUser(userData);
        setAuthError(null);
      } catch (error) {
        console.error("Erro ao decodificar token do Google", error);
        setAuthError("Erro ao processar login.");
      }
    };

    const initGoogleAuth = () => {
      const google = (window as any).google;
      if (google && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
          // O Erro "Access Blocked" ocorre se o Client ID não estiver configurado corretamente 
          // ou se a URL atual não estiver nas 'Authorized JavaScript origins'.
          client_id: "776077583626-v2i5c1s8unr1e23u9b9p3i8m9u9m4n9m.apps.googleusercontent.com",
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });
        
        if (!user && googleBtnRef.current) {
          google.accounts.id.renderButton(
            googleBtnRef.current,
            { 
              theme: "outline", 
              size: "large", 
              type: "icon", 
              shape: "circle"
            }
          );
        }
      }
    };

    // Tentar inicializar, ou esperar o script carregar
    if ((window as any).google) {
      initGoogleAuth();
    } else {
      const interval = setInterval(() => {
        if ((window as any).google) {
          initGoogleAuth();
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    setShowUserMenu(false);
    localStorage.removeItem('finmo_user');
  };

  // Adjust category based on form type
  useEffect(() => {
    if (formType === 'income') setCategory(CategoryType.INCOME);
    else if (formType === 'fixed') setCategory(CategoryType.NEED);
    else if (category === CategoryType.INCOME) setCategory(CategoryType.NEED);
  }, [formType]);

  useEffect(() => {
    setSubcategory(SUBCATEGORIES[category][0]);
    if (category !== CategoryType.DEBT_INTEREST && category !== CategoryType.DEBT_NO_INTEREST) {
      setDueDate('');
      setInterestAmount('');
    }
  }, [category]);

  const stats = useMemo<BudgetStats>(() => {
    const s: BudgetStats = { 
      baseIncome, 
      variableIncome: 0, 
      totalIncome: 0,
      fixedNeeds: 0,
      variableNeeds: 0,
      totalNeeds: 0,
      wants: 0,
      fixedWants: 0,
      savings: 0, 
      debtInterest: 0, 
      debtNoInterest: 0, 
      fixedDebts: 0,
      totalSpent: 0 
    };

    fixedExpenses.forEach(fe => {
      if (fe.category === CategoryType.NEED) s.fixedNeeds += fe.amount;
      if (fe.category === CategoryType.WANT) s.fixedWants += fe.amount;
      if (fe.category === CategoryType.DEBT_NO_INTEREST) s.fixedDebts += fe.amount;
    });

    transactions.forEach(t => {
      if (t.category === CategoryType.INCOME) {
        s.variableIncome += t.amount;
      } else {
        if (t.category === CategoryType.NEED) s.variableNeeds += t.amount;
        if (t.category === CategoryType.WANT) s.wants += t.amount;
        if (t.category === CategoryType.SAVING) s.savings += t.amount;
        if (t.category === CategoryType.DEBT_INTEREST) s.debtInterest += t.amount;
        if (t.category === CategoryType.DEBT_NO_INTEREST) s.debtNoInterest += t.amount;
      }
    });

    s.totalIncome = s.baseIncome + s.variableIncome;
    s.totalNeeds = s.fixedNeeds + s.variableNeeds;
    s.totalSpent = s.totalNeeds + s.wants + s.fixedWants + s.savings + s.debtInterest + s.debtNoInterest + s.fixedDebts;
    
    return s;
  }, [transactions, baseIncome, fixedExpenses]);

  // Cash Flow Projection
  const projectionData = useMemo(() => {
    const days = 30;
    const data = [];
    let currentBalance = stats.totalIncome - stats.totalSpent;
    const totalFixedPerMonth = stats.fixedNeeds + stats.fixedWants + stats.fixedDebts;
    const today = new Date();
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfMonth = date.getDate();
      if (dayOfMonth === payday && i > 0) {
        currentBalance += baseIncome;
        currentBalance -= totalFixedPerMonth;
      }
      data.push({
        day: date.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' }),
        balance: Math.max(0, currentBalance),
      });
    }
    return data;
  }, [stats, payday, baseIncome]);

  const targets = {
    [CategoryType.NEED]: stats.totalIncome * 0.5,
    [CategoryType.WANT]: stats.totalIncome * 0.3,
    [CategoryType.SAVING]: stats.totalIncome * 0.2,
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    const val = parseFloat(amount);

    if (formType === 'fixed') {
      const newFixed: FixedExpense = {
        id: Math.random().toString(36).substr(2, 9),
        description,
        amount: val,
        category: category as any
      };
      setFixedExpenses([...fixedExpenses, newFixed]);
    } else {
      const newTransaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        description,
        amount: val,
        interestAmount: interestAmount ? parseFloat(interestAmount) : undefined,
        category,
        subcategory,
        date: new Date().toISOString(),
        dueDate: isDebt(category) ? dueDate : undefined
      };
      setTransactions([newTransaction, ...transactions]);
    }

    setDescription('');
    setAmount('');
    setInterestAmount('');
    setDueDate('');
  };

  const executeDelete = () => {
    if (transactionToDelete) {
      setTransactions(transactions.filter(t => t.id !== transactionToDelete));
      setTransactionToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const handleResetData = () => {
    setBaseIncome(0);
    setPayday(1);
    setFixedExpenses([]);
    setTransactions([]);
    setAiAdvice(null);
    setShowResetModal(false);
  };

  const removeFixed = (id: string) => {
    setFixedExpenses(fixedExpenses.filter(fe => fe.id !== id));
  };

  const getMentorship = async () => {
    setLoadingAdvice(true);
    const advice = await getFinancialAdvice(stats, transactions, stats.totalIncome);
    setAiAdvice(advice);
    setLoadingAdvice(false);
  };

  const isDebt = (cat: CategoryType) => cat === CategoryType.DEBT_INTEREST || cat === CategoryType.DEBT_NO_INTEREST;

  const daysUntilPayday = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    if (currentDay < payday) return payday - currentDay;
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return (lastDayOfMonth - currentDay) + payday;
  }, [payday]);

  const safeToSpendDaily = useMemo(() => {
    const currentBalance = stats.totalIncome - stats.totalSpent;
    return Math.max(0, currentBalance / (daysUntilPayday || 1));
  }, [stats, daysUntilPayday]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <header className="sticky top-0 z-50 glass border-b border-slate-800 px-4 md:px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
            <WalletIcon className="w-5 h-5 md:w-6 md:h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Finmo</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setShowFixedManager(!showFixedManager)}
            className={`p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest ${showFixedManager ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-blue-400'}`}
          >
            <RepeatIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Fixos</span>
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-all flex items-center gap-2"
          >
            <Settings2Icon className="w-4 h-4" />
            <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">Ajustes</span>
          </button>

          <div className="w-px h-6 bg-slate-800 mx-1 hidden sm:block" />

          {user ? (
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center transition-all hover:opacity-80 active:scale-95 p-1 rounded-full border border-slate-800 bg-slate-900"
              >
                <img 
                  src={user.picture} 
                  alt={user.name} 
                  className="w-7 h-7 rounded-full shadow-lg" 
                />
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-48 glass rounded-2xl shadow-2xl border-slate-700 py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                  <div className="px-4 py-2 border-b border-slate-800">
                    <p className="text-[10px] font-bold truncate text-slate-200">{user.name}</p>
                    <p className="text-[8px] text-slate-500 truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                  >
                    <LogOutIcon className="w-3 h-3" />
                    Encerrar Sessão
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative group">
              <div 
                ref={googleBtnRef} 
                className="opacity-0 absolute inset-0 z-10 cursor-pointer overflow-hidden rounded-full w-8 h-8"
              >
                {/* Google Identity Services rendering */}
              </div>
              <button className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/50 transition-all">
                <UserIcon className="w-4 h-4" />
              </button>
              
              {authError && (
                <div className="absolute top-10 right-0 w-48 bg-red-950/80 border border-red-500 text-red-200 text-[8px] p-2 rounded-lg backdrop-blur-sm z-[100]">
                  {authError} <br/> 
                  <span className="opacity-70 text-[7px]">Client ID ou Origens de Domínio inválidas.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative glass p-6 md:p-8 rounded-3xl max-w-sm w-full space-y-6 shadow-2xl border-slate-700 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Settings2Icon className="w-5 h-5 text-emerald-400" />
                Configuração Base
              </h3>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
                <XIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase font-black ml-1">Renda Fixa Mensal (Base)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xs">MT</span>
                  <input type="number" value={baseIncome} onChange={(e) => setBaseIncome(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-emerald-400 font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase font-black ml-1">Dia do Salário</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="number" min="1" max="31" value={payday} onChange={(e) => setPayday(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-200 font-bold" />
                </div>
              </div>
            </div>

            <button onClick={() => setShowSettings(false)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg">Confirmar Ajustes</button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Essenciais*', val: stats.totalNeeds + stats.debtInterest + stats.debtNoInterest + stats.fixedDebts, fixed: stats.fixedNeeds + stats.fixedDebts, target: targets[CategoryType.NEED], color: 'blue', icon: CreditCardIcon },
              { label: 'Desejos', val: stats.wants + stats.fixedWants, fixed: stats.fixedWants, target: targets[CategoryType.WANT], color: 'purple', icon: PieChartIcon },
              { label: 'Reserva', val: stats.savings, fixed: 0, target: targets[CategoryType.SAVING], color: 'emerald', icon: TrendingUpIcon }
            ].map((card, idx) => {
              const isOver = card.val > card.target;
              return (
                <div key={idx} className={`glass p-6 rounded-3xl space-y-2 border-l-4 transition-all ${isOver ? 'border-red-500 shadow-lg shadow-red-900/10' : `border-${card.color}-500`}`}>
                  <div className="flex justify-between items-start">
                    <p className="text-slate-400 text-sm">{card.label}</p>
                    <card.icon className={`w-4 h-4 ${isOver ? 'text-red-500' : `text-${card.color}-500`}`} />
                  </div>
                  <p className={`text-xl font-bold ${isOver ? 'text-red-400' : ''}`}>{formatCurrency(card.val)}</p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                    <div className="bg-slate-500 h-full opacity-50" style={{ width: `${Math.min(100, (card.fixed / (card.target || 1)) * 100)}%` }} />
                    <div className={`${isOver ? 'bg-red-500' : `bg-${card.color}-500`} h-full`} style={{ width: `${Math.min(100, ((card.val - card.fixed) / (card.target || 1)) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass p-6 md:p-8 rounded-3xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-3 rounded-2xl"><LineChartIcon className="w-6 h-6 text-blue-400" /></div>
                <div>
                  <h2 className="text-xl font-bold">Previsão 30 Dias</h2>
                  <p className="text-xs text-slate-500">Saldo projetado considerando fixos</p>
                </div>
              </div>
              <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-4">
                 <div className="text-center">
                    <p className="text-[9px] text-slate-500 uppercase font-black">Gasto Diário Seguro</p>
                    <p className="text-sm font-black text-emerald-400">{formatCurrency(safeToSpendDaily)}</p>
                 </div>
                 <div className="w-px h-8 bg-slate-800" />
                 <div className="text-center">
                    <p className="text-[9px] text-slate-500 uppercase font-black">Próximo Salário</p>
                    <p className="text-sm font-black text-blue-400">{daysUntilPayday} dias</p>
                 </div>
              </div>
            </div>

            <div className="h-[220px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} interval={5} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                    formatter={(value: number) => [formatCurrency(value), 'Saldo']}
                  />
                  <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="relative overflow-hidden group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-3xl blur opacity-25"></div>
            <div className="relative glass p-6 md:p-8 rounded-3xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/20 p-3 rounded-2xl"><SparklesIcon className="w-6 h-6 text-emerald-400" /></div>
                  <div>
                    <h2 className="text-xl font-bold">Mentor Finmo</h2>
                    <p className="text-xs text-slate-500">Conselho inteligente e pragmático</p>
                  </div>
                </div>
                <button onClick={getMentorship} disabled={loadingAdvice} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-6 rounded-xl transition-all">
                  {loadingAdvice ? "Analisando..." : "Pedir Mentoria"}
                </button>
              </div>
              {aiAdvice && (
                <div className={`p-6 rounded-2xl border-l-4 animate-in fade-in slide-in-from-bottom-2 ${aiAdvice.status === 'critical' ? 'bg-red-500/10 border-red-500' : 'bg-emerald-500/10 border-emerald-500'}`}>
                  <p className="text-base md:text-lg font-medium mb-4 italic text-slate-200 leading-relaxed">"{aiAdvice.message}"</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiAdvice.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                        <ChevronRightIcon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-300">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="glass p-5 md:p-6 rounded-3xl sticky top-24">
            <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl mb-6">
               <button onClick={() => setFormType('expense')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${formType === 'expense' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>GASTO</button>
               <button onClick={() => setFormType('fixed')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${formType === 'fixed' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>FIXO</button>
               <button onClick={() => setFormType('income')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${formType === 'income' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>RENDA</button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <input type="text" placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              <input type="number" placeholder="Valor (MT)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-100" />

              {category === CategoryType.DEBT_INTEREST && formType === 'expense' && (
                <div className="space-y-1 animate-in slide-in-from-top-2">
                  <label className="text-[10px] text-red-400 uppercase font-black ml-1">Juros Inclusos (MT)</label>
                  <input type="number" placeholder="Opcional" value={interestAmount} onChange={(e) => setInterestAmount(e.target.value)} className="w-full bg-red-950/20 border border-red-900/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-red-400" />
                </div>
              )}
              
              {formType !== 'income' && (
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setCategory(CategoryType.NEED)} className={`text-[10px] py-2 rounded-lg border ${category === CategoryType.NEED ? 'bg-blue-500/20 border-blue-500 text-blue-400 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>Necessidade</button>
                    <button type="button" onClick={() => setCategory(CategoryType.WANT)} className={`text-[10px] py-2 rounded-lg border ${category === CategoryType.WANT ? 'bg-purple-500/20 border-purple-500 text-purple-400 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>Desejo</button>
                </div>
              )}

              <div className="relative">
                <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 outline-none text-sm appearance-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
                  {SUBCATEGORIES[category].map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                </select>
                <ChevronRightIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
              </div>

              <button type="submit" className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] ${formType === 'income' ? 'bg-emerald-500 text-slate-950' : formType === 'fixed' ? 'bg-blue-500 text-white' : 'bg-white text-slate-950'}`}>
                {formType === 'fixed' ? 'Salvar Fixo' : formType === 'income' ? 'Registrar Renda' : 'Registrar Gasto'}
              </button>
            </form>
          </div>

          <div className="glass p-5 md:p-6 rounded-3xl min-h-[300px]">
            <h3 className="text-sm font-bold mb-6 text-slate-400 uppercase tracking-widest flex items-center gap-2"><ClockIcon className="w-4 h-4" /> Atividade Recente</h3>
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center py-20 text-slate-600 text-xs italic">Sem registros.</div>
              ) : (
                transactions.slice(0, 10).map((t) => {
                  const isInc = t.category === CategoryType.INCOME;
                  const isDebtWithInt = t.category === CategoryType.DEBT_INTEREST && t.interestAmount && t.interestAmount > 0;
                  return (
                    <div key={t.id} className={`group relative p-4 rounded-2xl border transition-all ${isInc ? 'bg-emerald-500/5 border-emerald-500/20' : isDebtWithInt ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900/50 border-transparent hover:border-slate-800'}`}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-full ${isInc ? 'bg-emerald-500' : CATEGORY_COLORS[t.category]}`} />
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-bold truncate">{t.description}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{t.subcategory} • {new Date(t.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className={`font-black text-xs ${isInc ? 'text-emerald-400' : 'text-slate-100'}`}>{isInc ? '+' : '-'}{formatCurrency(t.amount)}</span>
                           <button onClick={() => { setTransactionToDelete(t.id); setShowDeleteModal(true); }} className="p-1 text-slate-600 hover:text-red-400 transition-all"><Trash2Icon className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative glass p-8 rounded-3xl max-w-sm w-full space-y-6">
            <h3 className="text-xl font-bold text-center">Apagar Registro?</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="py-3 rounded-xl bg-slate-800 text-slate-300 font-bold">Voltar</button>
              <button onClick={executeDelete} className="py-3 rounded-xl bg-red-600 text-white font-bold">Apagar</button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowResetModal(false)} />
          <div className="relative glass p-8 rounded-3xl max-w-sm w-full space-y-6 text-center">
             <RotateCcwIcon className="w-12 h-12 text-orange-500 mx-auto" />
            <h3 className="text-xl font-bold">Reiniciar Dados?</h3>
            <p className="text-xs text-slate-400">Esta ação não pode ser desfeita.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowResetModal(false)} className="py-3 rounded-xl bg-slate-800 font-bold">Cancelar</button>
              <button onClick={handleResetData} className="py-3 rounded-xl bg-orange-600 font-bold">Sim, Reset</button>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-t border-slate-900 py-3 px-4 flex justify-between items-center text-[9px] tracking-widest text-slate-600 uppercase">
        <span>Finmo • {new Date().getFullYear()}</span>
        {user && <span className="flex items-center gap-1 text-emerald-500/50"><CloudCheckIcon className="w-3 h-3" /> Sincronizado</span>}
      </footer>
    </div>
  );
};

export default App;
