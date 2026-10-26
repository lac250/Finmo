import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface OnboardingState {
  dashboardCompleted: boolean;
  desafiosCompleted: boolean;
  reservaCompleted: boolean;
  mentorCompleted: boolean;
}

export interface TabStep {
  id: string;
  targetId: string;
  fallbackTargetId?: string;
  title: string;
  description: string;
}

export interface TabTourConfig {
  key: keyof OnboardingState;
  tabName: string;
  badge: string;
  route: string;
  summaryMessage: string;
  steps: TabStep[];
}

export const TAB_TOURS: Record<string, TabTourConfig> = {
  dashboard: {
    key: 'dashboardCompleted',
    tabName: 'Dashboard',
    badge: 'Visão Geral & Fluxo',
    route: '/',
    summaryMessage: 'Acompanhe seus rendimentos e o saldo geral da sua conta em tempo real.',
    steps: [
      {
        id: 'dash-cashflow',
        targetId: 'tour-cashflow-chart',
        title: 'Gráfico de Fluxo de Caixa',
        description: 'Acompanhe a projeção dos últimos 30 dias de saldo, despesas fixas e aportes na reserva em tempo real.',
      },
      {
        id: 'dash-50-30-20',
        targetId: 'tour-50-30-20',
        title: 'Resumo da Regra 50/30/20',
        description: 'Equilíbrio orçamentário: 50% Essenciais, 30% Desejos e 20% direcionados à sua Reserva Financeira.',
      },
      {
        id: 'dash-form',
        targetId: 'tour-transaction-form',
        title: 'Formulário de Novo Registro',
        description: 'Adicione transações rapidamente informando justificativas para identificar impulsos de compra.',
      },
    ],
  },
  desafios: {
    key: 'desafiosCompleted',
    tabName: 'Desafio de Poupança',
    badge: 'Metas Dinâmicas',
    route: '/challenge',
    summaryMessage: 'Aqui você define metas dinâmicas de poupança. Escolha qualquer slot para fazer aportes flexíveis que vão direto para a sua Reserva.',
    steps: [
      {
        id: 'challenge-create',
        targetId: 'tour-challenge-create-btn',
        title: 'Botão "Criar Novo Desafio"',
        description: 'Personalize a meta total (ex: 12.000 MT, 50.000 MT), prazo em dias e a distribuição (Progressivo, Fixo ou Linear).',
      },
      {
        id: 'challenge-accordions',
        targetId: 'tour-challenge-accordions',
        title: 'Accordion de Slots por Categoria',
        description: 'Slots divididos em Dias Leves, Médios e Intensos com expansão retrátil. Clique em qualquer slot livre para aportar!',
      },
    ],
  },
  reserva: {
    key: 'reservaCompleted',
    tabName: 'Reserva de Emergência',
    badge: 'Proteção Ativa',
    route: '/reserve',
    summaryMessage: 'Veja todo o valor acumulado através dos seus desafios e economias mensais.',
    steps: [
      {
        id: 'reserve-card',
        targetId: 'tour-reserve-card',
        title: 'Card da Reserva de Emergência',
        description: 'Seu escudo financeiro protegido com liquidez diária. Monitore o cumprimento da meta de 20% da renda.',
      },
      {
        id: 'reserve-history',
        targetId: 'tour-reserve-history',
        title: 'Histórico de Aportes',
        description: 'Extrato consolidado de depósitos manuais e quantias depositadas diretamente pelos Desafios de Poupança.',
      },
    ],
  },
  mentor: {
    key: 'mentorCompleted',
    tabName: 'Mentor IA',
    badge: 'Inteligência Financeira',
    route: '/mentor',
    summaryMessage: 'A sua inteligência financeira para analisar seus hábitos e dar conselhos estratégicos de economia.',
    steps: [
      {
        id: 'mentor-chat',
        targetId: 'tour-mentor-chat-box',
        title: 'Diagnóstico & Chat com Finmo',
        description: 'Análise automática de hábitos, raio-x de gatilhos emocionais e conversa em tempo real com IA.',
      },
      {
        id: 'mentor-prompts',
        targetId: 'tour-mentor-prompts',
        title: 'Prompts e Ações Inteligentes',
        description: 'Peça conselhos rápidos ou pergunte sobre como renegociar despesas, quitar dívidas ou planejar compras.',
      },
    ],
  },
};

const STORAGE_KEY = 'finmo_onboarding_state';

interface OnboardingContextType {
  onboardingState: OnboardingState;
  currentTabTour: TabTourConfig | null;
  isCardVisible: boolean;
  isSpotlightActive: boolean;
  currentStepIndex: number;
  totalSteps: number;
  currentStep: TabStep | null;
  isFirstLoginModalOpen: boolean;
  startTabTour: (tabKey?: string) => void;
  dismissTabCard: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipSpotlight: () => void;
  triggerManualTour: () => void;
  resetAllTours: () => void;
  dismissFirstLoginModal: () => void;
  startFirstLoginTour: () => void;
}

const defaultState: OnboardingState = {
  dashboardCompleted: false,
  desafiosCompleted: false,
  reservaCompleted: false,
  mentorCompleted: false,
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [onboardingState, setOnboardingState] = useState<OnboardingState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultState, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Error loading onboarding state', e);
    }
    return defaultState;
  });

  const [isFirstLoginModalOpen, setIsFirstLoginModalOpen] = useState(false);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [isSpotlightActive, setIsSpotlightActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Identify active tab based on route
  const currentTabTour = useMemo<TabTourConfig | null>(() => {
    const path = location.pathname;
    if (path === '/' || path === '') return TAB_TOURS.dashboard;
    if (path.startsWith('/challenge')) return TAB_TOURS.desafios;
    if (path.startsWith('/reserve')) return TAB_TOURS.reserva;
    if (path.startsWith('/mentor')) return TAB_TOURS.mentor;
    return null;
  }, [location.pathname]);

  // Persist state updates to localStorage
  const updateOnboardingState = useCallback((patch: Partial<OnboardingState>) => {
    setOnboardingState((prev) => {
      const updated = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving onboarding state', e);
      }
      return updated;
    });
  }, []);

  // Check if first-ever login
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const legacyRaw = localStorage.getItem('finmo_onboarding_completed');
    if (!raw && !legacyRaw) {
      // First access
      const timer = setTimeout(() => {
        setIsFirstLoginModalOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Contextual Trigger on Route / Tab Change
  useEffect(() => {
    if (!currentTabTour) {
      setIsCardVisible(false);
      setIsSpotlightActive(false);
      return;
    }

    const isCompleted = onboardingState[currentTabTour.key];
    if (!isCompleted && !isFirstLoginModalOpen) {
      // Delay slightly for smooth page render
      const timer = setTimeout(() => {
        setIsCardVisible(true);
        setIsSpotlightActive(false);
        setCurrentStepIndex(0);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsCardVisible(false);
      setIsSpotlightActive(false);
    }
  }, [location.pathname, onboardingState, currentTabTour, isFirstLoginModalOpen]);

  // Dismiss card and mark current tab completed
  const dismissTabCard = useCallback(() => {
    setIsCardVisible(false);
    setIsSpotlightActive(false);
    if (currentTabTour) {
      updateOnboardingState({ [currentTabTour.key]: true });
    }
  }, [currentTabTour, updateOnboardingState]);

  // Start spotlight tour for current tab or chosen tab
  const startTabTour = useCallback((tabKey?: string) => {
    let target = currentTabTour;
    if (tabKey && TAB_TOURS[tabKey]) {
      target = TAB_TOURS[tabKey];
      if (location.pathname !== target.route) {
        navigate(target.route);
      }
    }
    if (!target) return;

    setIsFirstLoginModalOpen(false);
    setIsCardVisible(false);
    setCurrentStepIndex(0);
    setIsSpotlightActive(true);
  }, [currentTabTour, location.pathname, navigate]);

  // Next step in spotlight
  const nextStep = useCallback(() => {
    if (!currentTabTour) return;
    if (currentStepIndex < currentTabTour.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Completed all steps for this tab
      setIsSpotlightActive(false);
      updateOnboardingState({ [currentTabTour.key]: true });
    }
  }, [currentTabTour, currentStepIndex, updateOnboardingState]);

  // Prev step in spotlight
  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  // Skip spotlight
  const skipSpotlight = useCallback(() => {
    setIsSpotlightActive(false);
    if (currentTabTour) {
      updateOnboardingState({ [currentTabTour.key]: true });
    }
  }, [currentTabTour, updateOnboardingState]);

  // Manual Trigger: start tour of current active tab
  const triggerManualTour = useCallback(() => {
    if (currentTabTour) {
      setCurrentStepIndex(0);
      setIsCardVisible(false);
      setIsSpotlightActive(true);
    } else {
      // If on transactions, wishlist or settings, navigate to dashboard and start
      navigate('/');
      setTimeout(() => {
        setCurrentStepIndex(0);
        setIsCardVisible(false);
        setIsSpotlightActive(true);
      }, 300);
    }
  }, [currentTabTour, navigate]);

  // Reset all tours to uncompleted
  const resetAllTours = useCallback(() => {
    setOnboardingState(defaultState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    } catch (e) {
      console.error(e);
    }
    setIsCardVisible(true);
    setIsSpotlightActive(false);
    setCurrentStepIndex(0);
  }, []);

  // Welcome modal handlers
  const dismissFirstLoginModal = useCallback(() => {
    setIsFirstLoginModalOpen(false);
    // Mark dashboard as viewed or let contextual cards trigger naturally
  }, []);

  const startFirstLoginTour = useCallback(() => {
    setIsFirstLoginModalOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
    }
    setTimeout(() => {
      setCurrentStepIndex(0);
      setIsCardVisible(false);
      setIsSpotlightActive(true);
    }, 200);
  }, [location.pathname, navigate]);

  const currentStep = (isSpotlightActive && currentTabTour && currentTabTour.steps[currentStepIndex]) 
    ? currentTabTour.steps[currentStepIndex] 
    : null;

  return (
    <OnboardingContext.Provider
      value={{
        onboardingState,
        currentTabTour,
        isCardVisible,
        isSpotlightActive,
        currentStepIndex,
        totalSteps: currentTabTour ? currentTabTour.steps.length : 0,
        currentStep,
        isFirstLoginModalOpen,
        startTabTour,
        dismissTabCard,
        nextStep,
        prevStep,
        skipSpotlight,
        triggerManualTour,
        resetAllTours,
        dismissFirstLoginModal,
        startFirstLoginTour,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
