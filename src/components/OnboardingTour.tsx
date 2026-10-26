import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';
import { 
  SparklesIcon, 
  ArrowRightIcon, 
  ArrowLeftIcon, 
  XIcon, 
  CompassIcon,
  CheckCircle2Icon,
  HelpCircleIcon,
  TargetIcon,
  EyeIcon,
  RotateCcwIcon
} from 'lucide-react';

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export const OnboardingTour: React.FC = () => {
  const {
    currentTabTour,
    isCardVisible,
    isSpotlightActive,
    currentStepIndex,
    totalSteps,
    currentStep,
    isFirstLoginModalOpen,
    startTabTour,
    dismissTabCard,
    nextStep,
    prevStep,
    skipSpotlight,
    dismissFirstLoginModal,
    startFirstLoginTour,
    resetAllTours,
  } = useOnboarding();

  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'center' }>({
    top: 0,
    left: 0,
    placement: 'bottom',
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Measure target element
  const updateTargetPosition = useCallback(() => {
    if (!isSpotlightActive || !currentStep) {
      setTargetRect(null);
      return;
    }

    const primaryEl = document.getElementById(currentStep.targetId);
    const fallbackEl = currentStep.fallbackTargetId 
      ? document.getElementById(currentStep.fallbackTargetId) 
      : null;
    const el = primaryEl || fallbackEl;

    if (el) {
      // Ensure target is visible in viewport
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      
      const r = el.getBoundingClientRect();
      const rect: ElementRect = {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        bottom: r.bottom,
        right: r.right,
      };
      setTargetRect(rect);

      const tooltipWidth = 380;
      const tooltipHeight = 220;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const padding = 16;

      let placement: 'top' | 'bottom' | 'center' = 'bottom';
      let top = rect.bottom + 16;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;

      // If bottom overflows
      if (top + tooltipHeight > windowHeight - padding) {
        if (rect.top - tooltipHeight - 16 >= padding) {
          placement = 'top';
          top = rect.top - tooltipHeight - 16;
        } else {
          placement = 'center';
          top = Math.max(padding, windowHeight / 2 - tooltipHeight / 2);
        }
      }

      left = Math.max(padding, Math.min(left, windowWidth - tooltipWidth - padding));
      setTooltipPos({ top, left, placement });
    } else {
      setTargetRect(null);
      setTooltipPos({
        top: Math.max(16, window.innerHeight / 2 - 110),
        left: Math.max(16, window.innerWidth / 2 - 190),
        placement: 'center',
      });
    }
  }, [isSpotlightActive, currentStep]);

  useEffect(() => {
    if (!isSpotlightActive) return;

    updateTargetPosition();
    const t1 = setTimeout(updateTargetPosition, 80);
    const t2 = setTimeout(updateTargetPosition, 250);

    const handleResizeOrScroll = () => {
      updateTargetPosition();
    };

    window.addEventListener('resize', handleResizeOrScroll, { passive: true });
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
    };
  }, [isSpotlightActive, currentStepIndex, updateTargetPosition]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSpotlightActive) {
        if (e.key === 'Escape') {
          skipSpotlight();
        } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
          nextStep();
        } else if (e.key === 'ArrowLeft') {
          prevStep();
        }
      } else if (isCardVisible && e.key === 'Escape') {
        dismissTabCard();
      } else if (isFirstLoginModalOpen && e.key === 'Escape') {
        dismissFirstLoginModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSpotlightActive,
    isCardVisible,
    isFirstLoginModalOpen,
    nextStep,
    prevStep,
    skipSpotlight,
    dismissTabCard,
    dismissFirstLoginModal
  ]);

  return (
    <>
      {/* 1. FIRST LOGIN WELCOME MODAL */}
      {isFirstLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl shadow-emerald-950/30 overflow-hidden text-left">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
            
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <CompassIcon className="w-7 h-7" />
              </div>
              <button
                onClick={dismissFirstLoginModal}
                className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                aria-label="Fechar"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Primeiro Acesso</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Bem-vindo ao Finmo!
              </h2>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed font-normal">
                Gostaria de fazer um tour guiado rápido de 1 minuto para aprender a configurar seus orçamentos e criar seu primeiro Desafio de Poupança?
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={dismissFirstLoginModal}
                className="w-full sm:w-auto flex-1 px-5 py-3.5 rounded-2xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-bold text-sm transition-all text-center"
              >
                Explorar por Conta Própria
              </button>
              <button
                onClick={startFirstLoginTour}
                className="w-full sm:w-auto flex-1 px-5 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-center"
              >
                <span>Fazer Tour Guiado</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONTEXTUAL BOTTOM-RIGHT TAB ONBOARDING CARD */}
      {isCardVisible && !isSpotlightActive && currentTabTour && (
        <aside
          aria-label="Dicas da Página"
          className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 md:right-8 z-50 w-[calc(100vw-32px)] sm:w-[410px] bg-slate-900/95 border border-emerald-500/30 rounded-3xl p-5 md:p-6 shadow-2xl shadow-emerald-950/50 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300"
        >
          {/* Top subtle glow line */}
          <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
                {currentTabTour.badge}
              </span>
            </div>
            <button
              onClick={dismissTabCard}
              className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Dispensar Dicas"
              aria-label="Dispensar Dicas"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-2 mb-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>{currentTabTour.tabName}</span>
            </h3>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              {currentTabTour.summaryMessage}
            </p>
          </div>

          {/* Highlights Mini List */}
          <div className="mb-5 space-y-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Destaques desta aba:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {currentTabTour.steps.map((st) => (
                <span
                  key={st.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-white/5 text-[11px] text-slate-200 font-semibold"
                >
                  <EyeIcon className="w-3 h-3 text-emerald-400" />
                  {st.title}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
            <button
              onClick={dismissTabCard}
              className="px-3.5 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Entendido / Dispensar
            </button>
            <button
              onClick={() => startTabTour()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            >
              <TargetIcon className="w-3.5 h-3.5" />
              <span>Ver Destaques na Tela</span>
            </button>
          </div>
        </aside>
      )}

      {/* 3. SPOTLIGHT OVERLAY & INTERACTIVE TOUR */}
      {isSpotlightActive && currentStep && currentTabTour && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          {/* Spotlight Highlight Box around target element */}
          {targetRect ? (
            <div
              style={{
                top: Math.max(0, targetRect.top - 8),
                left: Math.max(0, targetRect.left - 8),
                width: targetRect.width + 16,
                height: targetRect.height + 16,
              }}
              className="fixed rounded-2xl transition-all duration-300 pointer-events-none border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.85),0_0_35px_rgba(16,185,129,0.45)]"
            />
          ) : (
            <div className="fixed inset-0 bg-slate-950/85 pointer-events-none transition-opacity duration-300" />
          )}

          {/* Interactive Tooltip Card */}
          <div
            ref={tooltipRef}
            style={{
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.left}px`,
            }}
            className="fixed w-[calc(100vw-32px)] sm:w-[390px] pointer-events-auto bg-slate-900/95 border border-white/15 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl z-[101] transition-all duration-300 animate-in fade-in zoom-in-95"
          >
            {/* Header: Step counter & Dismiss */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
                  {currentTabTour.tabName} • {currentStepIndex + 1}/{totalSteps}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentStepIndex
                          ? 'w-5 bg-emerald-400'
                          : idx < currentStepIndex
                          ? 'w-1.5 bg-emerald-700'
                          : 'w-1.5 bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={skipSpotlight}
                className="p-1 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                title="Pular Tour"
                aria-label="Pular Tour"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-2 mb-6">
              <h4 className="text-lg font-black text-white leading-snug">
                {currentStep.title}
              </h4>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <button
                onClick={skipSpotlight}
                className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors"
              >
                Pular
              </button>

              <div className="flex items-center gap-2">
                {currentStepIndex > 0 && (
                  <button
                    onClick={prevStep}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-bold text-xs transition-colors"
                  >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    <span>Anterior</span>
                  </button>
                )}

                <button
                  onClick={nextStep}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20"
                >
                  <span>
                    {currentStepIndex === totalSteps - 1 ? 'Concluir' : 'Próximo'}
                  </span>
                  {currentStepIndex === totalSteps - 1 ? (
                    <CheckCircle2Icon className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
