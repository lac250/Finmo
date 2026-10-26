import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  requestNotificationPermission, 
  getNotificationPermission, 
  sendLocalPushNotification 
} from '../services/notificationService';

export interface AppNotification {
  id: string;
  type: 'challenge' | 'wishlist' | 'mentor' | 'system';
  title: string;
  message: string;
  timeAgo: string;
  timestamp: number;
  read: boolean;
  link?: string;
  actionLabel?: string;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-challenge-daily',
    type: 'challenge',
    title: 'Lembrete de Desafio',
    message: 'Não se esqueça do seu aporte diário! Resta apenas 1 slot no nível Leves para hoje.',
    timeAgo: 'Há 25 min',
    timestamp: Date.now() - 25 * 60 * 1000,
    read: false,
    link: '/challenge',
    actionLabel: 'Ver Desafio',
  },
  {
    id: 'notif-wishlist-goal',
    type: 'wishlist',
    title: 'Meta Atingida / Lista de Desejos',
    message: 'Parabéns! Você acumulou valor suficiente na Reserva para adquirir o item da sua Lista de Desejos.',
    timeAgo: 'Há 2 horas',
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    read: false,
    link: '/wishlist',
    actionLabel: 'Ver Desejos',
  },
  {
    id: 'notif-mentor-cashflow',
    type: 'mentor',
    title: 'Dica do Mentor IA',
    message: 'Seu fluxo de caixa da semana está 12% abaixo do limite configurado.',
    timeAgo: 'Ontem às 18:40',
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    read: false,
    link: '/mentor',
    actionLabel: 'Ver Análise',
  },
];

const NOTIFICATIONS_STORAGE_KEY = 'finmo_inapp_notifications';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (item: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'timeAgo'>) => void;
  pushPermission: NotificationPermission | 'unsupported';
  isPushEnabled: boolean;
  requestPush: () => Promise<void>;
  sendTestPush: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading notifications', e);
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setPushPermission(getNotificationPermission());
  }, []);

  const saveNotifications = useCallback((updated: AppNotification[]) => {
    setNotifications(updated);
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error storing notifications', e);
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  const markAsRead = useCallback((id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  const removeNotification = useCallback((id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  const clearAll = useCallback(() => {
    saveNotifications([]);
  }, [saveNotifications]);

  const addNotification = useCallback((item: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'timeAgo'>) => {
    const newNotif: AppNotification = {
      ...item,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      timeAgo: 'Agora mesmo',
      read: false,
    };
    const updated = [newNotif, ...notifications];
    saveNotifications(updated);

    // If native push is active, send native notification as well
    if (pushPermission === 'granted') {
      sendLocalPushNotification(item.title, {
        body: item.message,
      });
    }
  }, [notifications, pushPermission, saveNotifications]);

  const requestPush = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPushPermission(result);
  }, []);

  const sendTestPush = useCallback(() => {
    sendLocalPushNotification('Finmo Alerta', {
      body: 'Notificação nativa enviada com sucesso para seu dispositivo!',
    });
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const isPushEnabled = pushPermission === 'granted';

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllAsRead,
        markAsRead,
        removeNotification,
        clearAll,
        addNotification,
        pushPermission,
        isPushEnabled,
        requestPush,
        sendTestPush,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
