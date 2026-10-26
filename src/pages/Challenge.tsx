import React, { useState, useEffect } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { ChallengeSlot, SavingsChallenge, CategoryType } from '../types';
import { 
  TrophyIcon, 
  CheckCircle2Icon, 
  ArrowRightIcon, 
  XIcon, 
  ShieldCheckIcon, 
  CalendarIcon, 
  RotateCcwIcon,
  PlusIcon,
  SlidersIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { 
  saveCachedChallenge, 
  getCachedChallenge, 
  enqueueOfflineAction 
} from '../services/offlineSyncService';

export const generateDynamicChallenge = (
  targetAmount: number,
  totalDays: number,
  mode: 'progressive' | 'fixed' | 'linear' = 'progressive'
): SavingsChallenge => {
  const slots: ChallengeSlot[] = [];
  const third = Math.floor(totalDays / 3);
  const remainder = totalDays % 3;
  const d1 = third;
  const d2 = third;
  const d3 = third + remainder;

  if (mode === 'fixed') {
    const baseVal = Math.round(targetAmount / totalDays);
    let runningSum = 0;
    for (let i = 1; i <= totalDays; i++) {
      let amt = baseVal;
      if (i === totalDays) {
        amt = targetAmount - runningSum;
      }
      runningSum += amt;
      const tier = i <= d1 ? 'light' : i <= d1 + d2 ? 'medium' : 'intense';
      slots.push({ id: i, tier, amount: Math.max(amt, 1), isCompleted: false, completedAt: null });
    }
  } else if (mode === 'linear') {
    let a1 = Math.max(5, Math.floor((targetAmount / totalDays) * 0.4));
    let step = (2 * (targetAmount - totalDays * a1)) / (totalDays * (totalDays - 1));
    if (step < 0) step = 0;
    let runningSum = 0;
    for (let i = 1; i <= totalDays; i++) {
      let amt = Math.round(a1 + (i - 1) * step);
      if (i === totalDays) {
        amt = targetAmount - runningSum;
      }
      runningSum += amt;
      const tier = i <= d1 ? 'light' : i <= d1 + d2 ? 'medium' : 'intense';
      slots.push({ id: i, tier, amount: Math.max(amt, 1), isCompleted: false, completedAt: null });
    }
  } else {
    // Progressive tiers (Leves / Médios / Intensos)
    const avg = targetAmount / totalDays;
    
    let runningSum = 0;
    const t1Amounts: number[] = [];
    for (let i = 0; i < d1; i++) {
      const factor = 0.25 + (i / Math.max(1, d1 - 1)) * 0.45;
      let amt = Math.round(avg * factor);
      t1Amounts.push(amt);
      runningSum += amt;
    }
    
    const t2Amounts: number[] = [];
    for (let i = 0; i < d2; i++) {
      const factor = 0.75 + (i / Math.max(1, d2 - 1)) * 0.50;
      let amt = Math.round(avg * factor);
      t2Amounts.push(amt);
      runningSum += amt;
    }

    const t3Amounts: number[] = [];
    for (let i = 0; i < d3; i++) {
      const factor = 1.30 + (i / Math.max(1, d3 - 1)) * 0.70;
      let amt = Math.round(avg * factor);
      t3Amounts.push(amt);
      runningSum += amt;
    }

    const diff = targetAmount - runningSum;
    if (t3Amounts.length > 0) {
      t3Amounts[t3Amounts.length - 1] += diff;
    } else if (t2Amounts.length > 0) {
      t2Amounts[t2Amounts.length - 1] += diff;
    } else if (t1Amounts.length > 0) {
      t1Amounts[t1Amounts.length - 1] += diff;
    }

    let id = 1;
    t1Amounts.forEach(amt => {
      slots.push({ id: id++, tier: 'light', amount: Math.max(amt, 5), isCompleted: false, completedAt: null });
    });
    t2Amounts.forEach(amt => {
      slots.push({ id: id++, tier: 'medium', amount: Math.max(amt, 5), isCompleted: false, completedAt: null });
    });
    t3Amounts.forEach(amt => {
      slots.push({ id: id++, tier: 'intense', amount: Math.max(amt, 5), isCompleted: false, completedAt: null });
    });
  }

  return {
    id: 'main',
    targetAmount,
    totalDays,
    slots
  };
};

const Challenge: React.FC = () => {
  const { fbUser, addTransaction } = useFinancial();
  const [challenge, setChallenge] = useState<SavingsChallenge>(generateDynamicChallenge(12000, 60, 'progressive'));
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<ChallengeSlot | null>(null);
  const [sourceAccount, setSourceAccount] = useState('Saldo Geral / Conta Corrente');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'light' | 'medium' | 'intense'>('all');

  // Config Modal State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configTarget, setConfigTarget] = useState('12000');
  const [configDays, setConfigDays] = useState('60');
  const [configMode, setConfigMode] = useState<'progressive' | 'fixed' | 'linear'>('progressive');

  useEffect(() => {
    // Check cached challenge first for immediate offline rendering
    const cached = getCachedChallenge();
    if (cached && cached.slots && cached.slots.length > 0) {
      setChallenge(cached);
    }

    if (!fbUser) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false);
      return;
    }

    const fetchChallenge = async () => {
      const path = `users/${fbUser.uid}/savings_challenge/main`;
      try {
        const docSnap = await getDoc(doc(db, path));
        if (docSnap.exists()) {
          const data = docSnap.data() as SavingsChallenge;
          if (data && data.slots && data.slots.length > 0) {
            setChallenge(data);
            saveCachedChallenge(data);
          } else {
            const defaultCh = generateDynamicChallenge(12000, 60, 'progressive');
            await setDoc(doc(db, path), defaultCh);
            setChallenge(defaultCh);
            saveCachedChallenge(defaultCh);
          }
        } else {
          const defaultCh = generateDynamicChallenge(12000, 60, 'progressive');
          await setDoc(doc(db, path), defaultCh);
          setChallenge(defaultCh);
          saveCachedChallenge(defaultCh);
        }
      } catch (err) {
        console.warn('Could not fetch remote challenge, using cached:', err);
        const localCached = getCachedChallenge();
        if (localCached) setChallenge(localCached);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenge();
  }, [fbUser]);

  const saveChallengeToFirestore = async (updated: SavingsChallenge) => {
    saveCachedChallenge(updated);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineAction('COMPLETE_CHALLENGE_SLOT', updated);
      return;
    }

    if (!fbUser) return;
    const path = `users/${fbUser.uid}/savings_challenge/main`;
    try {
      await setDoc(doc(db, path), {
        ...updated,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore write failed, enqueuing action:', err);
      enqueueOfflineAction('COMPLETE_CHALLENGE_SLOT', updated);
    }
  };

  const handleConfirmDeposit = async () => {
    if (!selectedSlot || !fbUser) return;
    setIsSubmitting(true);
    try {
      await addTransaction({
        description: `Desafio ${challenge.totalDays} Dias - Slot #${selectedSlot.id} (${selectedSlot.amount} MT)`,
        amount: selectedSlot.amount,
        justification: `Aporte flexível - ${sourceAccount}`,
        category: CategoryType.SAVING,
        subcategory: `Desafio Poupança (${selectedSlot.tier.toUpperCase()})`,
        date: new Date().toISOString()
      });

      const now = new Date().toISOString();
      const updatedSlots = challenge.slots.map(s => 
        s.id === selectedSlot.id ? { ...s, isCompleted: true, completedAt: now } : s
      );

      const updatedChallenge: SavingsChallenge = {
        ...challenge,
        slots: updatedSlots
      };

      setChallenge(updatedChallenge);
      await saveChallengeToFirestore(updatedChallenge);
      setSelectedSlot(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetChallenge = async () => {
    if (!window.confirm('Tem certeza que deseja reiniciar o desafio atual? Todo o progresso será zerado.')) return;
    const fresh = generateDynamicChallenge(challenge.targetAmount, challenge.totalDays, 'progressive');
    setChallenge(fresh);
    await saveChallengeToFirestore(fresh);
  };

  const handleCreateCustomChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    const tAmt = Number(configTarget) || 12000;
    const tDays = Number(configDays) || 60;
    if (tAmt <= 0 || tDays <= 0) return;

    const newCh = generateDynamicChallenge(tAmt, tDays, configMode);
    setChallenge(newCh);
    await saveChallengeToFirestore(newCh);
    setIsConfigOpen(false);
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const completedSlotsCount = challenge.slots.filter(s => s.isCompleted).length;
  const currentSavedAmount = challenge.slots.filter(s => s.isCompleted).reduce((sum, s) => sum + s.amount, 0);
  const progressPercent = Math.min((currentSavedAmount / challenge.targetAmount) * 100, 100);

  const lightSlots = challenge.slots.filter(s => s.tier === 'light');
  const mediumSlots = challenge.slots.filter(s => s.tier === 'medium');
  const intenseSlots = challenge.slots.filter(s => s.tier === 'intense');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
              <TrophyIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Desafio de Poupança: {challenge.targetAmount.toLocaleString()} MT</h1>
              <p className="text-slate-400 text-sm">Duração de {challenge.totalDays} dias com aportes flexíveis direto na Reserva</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="tour-challenge-create-btn"
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs transition-all hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <PlusIcon className="w-4 h-4" /> Criar Novo Desafio
          </button>
          <button
            onClick={handleResetChallenge}
            className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-white/5 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all hover:bg-slate-800"
          >
            <RotateCcwIcon className="w-4 h-4" /> Reiniciar
          </button>
        </div>
      </header>

      {/* Quick Indicators (Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-[2rem] border-emerald-500/20 bg-emerald-500/5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Progresso Atual</span>
            <span className="text-emerald-500 font-black">{progressPercent.toFixed(1)}%</span>
          </div>
          <div className="text-3xl font-black text-white">
            {currentSavedAmount.toLocaleString()} <span className="text-sm font-bold text-emerald-500">/ {challenge.targetAmount.toLocaleString()} MT</span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="glass p-6 rounded-[2rem] border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Slots Concluídos</span>
            <CalendarIcon className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-white">
            {completedSlotsCount} <span className="text-sm font-bold text-slate-500">/ {challenge.totalDays} Dias</span>
          </div>
          <p className="text-xs text-slate-500">Clique em qualquer slot livre para realizar o depósito.</p>
        </div>

        <div className="glass p-6 rounded-[2rem] border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Restante para a Meta</span>
            <ShieldCheckIcon className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {Math.max(challenge.targetAmount - currentSavedAmount, 0).toLocaleString()} <span className="text-sm font-bold text-slate-500">MT</span>
          </div>
          <p className="text-xs text-slate-500">Consistência diária constrói seu patrimônio.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'all' 
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Todos os {challenge.totalDays} Slots ({challenge.targetAmount.toLocaleString()} MT)
        </button>
        {lightSlots.length > 0 && (
          <button
            onClick={() => setActiveTab('light')}
            className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'light' 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Dias Leves ({lightSlots.length})
          </button>
        )}
        {mediumSlots.length > 0 && (
          <button
            onClick={() => setActiveTab('medium')}
            className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'medium' 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Dias Médios ({mediumSlots.length})
          </button>
        )}
        {intenseSlots.length > 0 && (
          <button
            onClick={() => setActiveTab('intense')}
            className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'intense' 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Dias Intensos ({intenseSlots.length})
          </button>
        )}
      </div>

      {/* Grid Interativo com Accordions por Categoria */}
      <div id="tour-challenge-accordions" className="space-y-4">
        {(activeTab === 'all' || activeTab === 'light') && lightSlots.length > 0 && (
          <CategoryAccordion
            title="Dias Leves - Início de Ritmo"
            subtitle={`${lightSlots.length} slots acessíveis para criar o hábito diário`}
            colorDot="bg-emerald-500"
            completedCount={lightSlots.filter(s => s.isCompleted).length}
            totalCount={lightSlots.length}
            defaultOpen={true}
          >
            {lightSlots.map(slot => (
              <SlotCard key={slot.id} slot={slot} onClick={() => setSelectedSlot(slot)} />
            ))}
          </CategoryAccordion>
        )}

        {(activeTab === 'all' || activeTab === 'medium') && mediumSlots.length > 0 && (
          <CategoryAccordion
            title="Dias Médios - Ritmo Constante"
            subtitle={`${mediumSlots.length} slots intermediários de aceleração`}
            colorDot="bg-amber-500"
            completedCount={mediumSlots.filter(s => s.isCompleted).length}
            totalCount={mediumSlots.length}
            defaultOpen={activeTab === 'medium'}
          >
            {mediumSlots.map(slot => (
              <SlotCard key={slot.id} slot={slot} onClick={() => setSelectedSlot(slot)} />
            ))}
          </CategoryAccordion>
        )}

        {(activeTab === 'all' || activeTab === 'intense') && intenseSlots.length > 0 && (
          <CategoryAccordion
            title="Dias Intensos - Alta Performance"
            subtitle={`${intenseSlots.length} slots para consolidar sua meta financeira`}
            colorDot="bg-rose-500"
            completedCount={intenseSlots.filter(s => s.isCompleted).length}
            totalCount={intenseSlots.length}
            defaultOpen={activeTab === 'intense'}
          >
            {intenseSlots.map(slot => (
              <SlotCard key={slot.id} slot={slot} onClick={() => setSelectedSlot(slot)} />
            ))}
          </CategoryAccordion>
        )}
      </div>

      {/* Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass max-w-lg w-full p-8 rounded-[2.5rem] border-emerald-500/20 bg-slate-900/95 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                <SlidersIcon className="w-6 h-6" />
              </div>
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Criar Desafio Personalizado</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configure a meta, o número de dias e o modo de distribuição dos valores automaticamente.
              </p>
            </div>

            <form onSubmit={handleCreateCustomChallenge} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Meta Total em Meticais (MT)</label>
                <input 
                  type="number"
                  value={configTarget}
                  onChange={e => setConfigTarget(e.target.value)}
                  placeholder="Ex: 12000, 50000..."
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white text-sm focus:border-emerald-500/50 outline-none transition-colors"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Duração do Desafio (Dias)</label>
                <input 
                  type="number"
                  value={configDays}
                  onChange={e => setConfigDays(e.target.value)}
                  placeholder="Ex: 30, 60, 90..."
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white text-sm focus:border-emerald-500/50 outline-none transition-colors"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Modo de Distribuição</label>
                <select
                  value={configMode}
                  onChange={e => setConfigMode(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white text-sm focus:border-emerald-500/50 outline-none transition-colors"
                >
                  <option value="progressive">Progressivo por Níveis (Leves / Médios / Intensos)</option>
                  <option value="fixed">Aporte Fixo Diário (Valor Uniforme)</option>
                  <option value="linear">Progressão Aritmética Linear (Crescente)</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="flex-1 py-4 bg-slate-800 text-slate-300 font-bold rounded-2xl hover:bg-slate-700 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 text-sm active:scale-95"
                >
                  Gerar Desafio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Confirmation Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass max-w-md w-full p-8 rounded-[2.5rem] border-emerald-500/20 bg-slate-900/90 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                <TrophyIcon className="w-6 h-6" />
              </div>
              <button 
                onClick={() => setSelectedSlot(null)}
                className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                Slot #{selectedSlot.id} • Categoria {selectedSlot.tier.toUpperCase()}
              </span>
              <h2 className="text-2xl font-black text-white">Confirmar Aporte de {selectedSlot.amount.toLocaleString()} MT</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Este valor será debitado e registrado como aporte direto na sua Reserva de Emergência.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conta de Origem</label>
              <select
                value={sourceAccount}
                onChange={e => setSourceAccount(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-4 text-white text-sm focus:border-emerald-500/50 outline-none transition-colors"
              >
                <option value="Saldo Geral / Conta Corrente">Saldo Geral / Conta Corrente</option>
                <option value="Renda Extra">Renda Extra</option>
                <option value="Economias Disponíveis">Economias Disponíveis</option>
              </select>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setSelectedSlot(null)}
                className="flex-1 py-4 bg-slate-800 text-slate-300 font-bold rounded-2xl hover:bg-slate-700 transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeposit}
                disabled={isSubmitting}
                className="flex-1 py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>Confirmar Aporte <ArrowRightIcon className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CategoryAccordionProps {
  title: string;
  subtitle: string;
  colorDot: string;
  completedCount: number;
  totalCount: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CategoryAccordion: React.FC<CategoryAccordionProps> = ({
  title,
  subtitle,
  colorDot,
  completedCount,
  totalCount,
  defaultOpen = false,
  children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <div className="glass rounded-[2rem] border border-white/5 overflow-hidden transition-all duration-300">
      {/* Header Clicável */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`w-3.5 h-3.5 rounded-full ${colorDot} ring-4 ring-white/5 shrink-0`} />
          <div>
            <h3 className="text-base font-black text-white">{title}</h3>
            <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs font-bold px-3 py-1 bg-slate-900 border border-white/5 rounded-full text-slate-400">
            {completedCount} / {totalCount} Concluídos
          </span>
          <div className="w-8 h-8 rounded-full bg-slate-900/60 flex items-center justify-center text-slate-400">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Conteúdo Expansível */}
      {isOpen && (
        <div className="p-6 pt-0 border-t border-white/5 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

interface SlotCardProps {
  slot: ChallengeSlot;
  onClick: () => void;
}

const SlotCard: React.FC<SlotCardProps> = ({ slot, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between items-center text-center group active:scale-95 ${
        slot.isCompleted
          ? 'bg-emerald-500/20 border-emerald-500/40 text-white shadow-lg shadow-emerald-500/10'
          : 'bg-[#1e293b]/60 border-white/5 hover:border-emerald-500/30 text-slate-300 hover:bg-[#1e293b]'
      }`}
    >
      <div className="flex justify-between w-full items-center mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-emerald-400 transition-colors">
          #{slot.id}
        </span>
        {slot.isCompleted ? (
          <CheckCircle2Icon className="w-4 h-4 text-emerald-400" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-slate-700 group-hover:bg-emerald-500 transition-colors" />
        )}
      </div>

      <div className="py-2">
        <span className={`text-lg font-black ${slot.isCompleted ? 'text-emerald-400' : 'text-white'}`}>
          {slot.amount.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">MT</span>
        </span>
      </div>

      <div className="w-full mt-2 pt-2 border-t border-white/5 text-[10px] font-bold uppercase tracking-widest">
        {slot.isCompleted ? (
          <span className="text-emerald-400">Concluído</span>
        ) : (
          <span className="text-slate-500 group-hover:text-emerald-400 transition-colors">Depositar</span>
        )}
      </div>
    </button>
  );
};

export default Challenge;
