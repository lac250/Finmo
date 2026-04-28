
import React, { useState } from 'react';
import { 
  TrendingUpIcon, 
  CreditCardIcon, 
  PieChartIcon, 
  SparklesIcon,
  Trash2Icon,
  ChevronRightIcon,
  LineChartIcon,
  ClockIcon,
  TrashIcon
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
import { useFinancial } from '../contexts/FinancialContext';
import { CategoryType } from '../types';
import { CATEGORY_COLORS, SUBCATEGORIES, formatCurrency } from '../constants';
import { getFinancialAdvice } from '../services/geminiService';

const Dashboard: React.FC = () => {
  const { 
    transactions, stats, projectionData, targets, 
    addTransaction, deleteTransaction, 
    safeToSpendDaily, daysUntilPayday 
  } = useFinancial();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [interestAmount, setInterestAmount] = useState('');
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState<CategoryType>(CategoryType.NEED);
  const [subcategory, setSubcategory] = useState<string>(SUBCATEGORIES[CategoryType.NEED][0]);
  const [dueDate, setDueDate] = useState('');
  
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTransaction(description, amount, category, subcategory, formType, interestAmount, dueDate);
    setDescription('');
    setAmount('');
    setInterestAmount('');
    setDueDate('');
  };

  const getMentorship = async () => {
    setLoadingAdvice(true);
    const advice = await getFinancialAdvice(stats, transactions, stats.totalIncome);
    setAiAdvice(advice);
    setLoadingAdvice(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                  formatter={(value: any) => [formatCurrency(value), 'Saldo']}
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
                  {aiAdvice.recommendations.map((rec: string, i: number) => (
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
             <button onClick={() => setFormType('income')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${formType === 'income' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>RENDA</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button type="submit" className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] ${formType === 'income' ? 'bg-emerald-500 text-slate-950' : 'bg-white text-slate-950'}`}>
              {formType === 'income' ? 'Registrar Renda' : 'Registrar Gasto'}
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
                const isDebtWithInt = (t.category === CategoryType.DEBT_INTEREST || t.category === CategoryType.DEBT_NO_INTEREST) && t.interestAmount && t.interestAmount > 0;
                return (
                  <div key={t.id} className={`group relative p-4 rounded-2xl border transition-all ${isInc ? 'bg-emerald-500/5 border-emerald-500/20' : isDebtWithInt ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900/50 border-transparent hover:border-slate-800'}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-full ${isInc ? 'bg-emerald-500' : CATEGORY_COLORS[t.category as keyof typeof CATEGORY_COLORS]}`} />
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

      {showDeleteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative glass p-8 rounded-3xl max-w-sm w-full space-y-6">
            <h3 className="text-xl font-bold text-center">Apagar Registro?</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="py-3 rounded-xl bg-slate-800 text-slate-300 font-bold">Voltar</button>
              <button 
                onClick={async () => {
                   if (transactionToDelete) {
                     await deleteTransaction(transactionToDelete);
                     setTransactionToDelete(null);
                     setShowDeleteModal(false);
                   }
                }} 
                className="py-3 rounded-xl bg-red-600 text-white font-bold"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
