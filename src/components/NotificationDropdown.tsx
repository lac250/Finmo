import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BellIcon, 
  CheckCheckIcon, 
  TrophyIcon, 
  GiftIcon, 
  BrainCircuitIcon, 
  SmartphoneIcon,
  CheckCircle2Icon,
  XIcon,
  ChevronRightIcon
} from 'lucide-react';
import { useNotifications, AppNotification } from '../contexts/NotificationContext';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    isPushEnabled,
    requestPush,
    sendTestPush,
  } = useNotifications();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  const getTypeIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'challenge':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <TrophyIcon className="w-4 h-4" />
          </div>
        );
      case 'wishlist':
        return (
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
            <GiftIcon className="w-4 h-4" />
          </div>
        );
      case 'mentor':
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <BrainCircuitIcon className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 border border-white/5">
            <BellIcon className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all border ${
          isOpen 
            ? 'bg-slate-800 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10' 
            : 'bg-slate-900/60 hover:bg-slate-800 border-white/10 text-slate-300 hover:text-white'
        }`}
        title="Notificações"
        aria-label="Abrir Notificações"
      >
        <BellIcon className="w-5 h-5 transition-transform active:scale-95" />

        {/* Unread Red Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-slate-950 shadow-md shadow-rose-500/50 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-14 w-[calc(100vw-32px)] sm:w-[390px] z-50 bg-slate-900/95 border border-white/10 rounded-3xl p-5 shadow-2xl shadow-slate-950/80 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 text-left">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-white text-base">Notificações</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-wider">
                  {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <CheckCheckIcon className="w-3.5 h-3.5" />
                <span>Marcar todas como lidas</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1 my-2">
            {notifications.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2Icon className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  Tudo em dia!
                </p>
                <p className="text-xs text-slate-400">
                  Nenhuma notificação recente pendente.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`group p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                    item.read
                      ? 'bg-slate-950/30 border-white/5 opacity-70 hover:opacity-100 hover:bg-slate-800/40'
                      : 'bg-slate-800/50 border-emerald-500/20 hover:bg-slate-800/80 shadow-sm'
                  }`}
                >
                  {/* Icon */}
                  {getTypeIcon(item.type)}

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-black text-white truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                        {item.timeAgo}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-snug">
                      {item.message}
                    </p>

                    {item.actionLabel && (
                      <div className="pt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                        <span>{item.actionLabel}</span>
                        <ChevronRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    )}
                  </div>

                  {/* Unread indicator dot */}
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1 shadow-sm shadow-emerald-400" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer: Web Push Permission & Test */}
          <div className="pt-3.5 mt-2 border-t border-white/5">
            {!isPushEnabled ? (
              <button
                onClick={requestPush}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95"
              >
                <SmartphoneIcon className="w-4 h-4" />
                <span>Ativar Notificações no Telemóvel</span>
              </button>
            ) : (
              <div className="flex items-center justify-between p-2.5 px-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <CheckCircle2Icon className="w-4 h-4" />
                  <span>Notificações no Telemóvel Ativas</span>
                </span>
                <button
                  onClick={sendTestPush}
                  className="text-[11px] font-bold text-slate-300 hover:text-white underline decoration-emerald-500 underline-offset-2 transition-colors"
                >
                  Disparar Teste
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
