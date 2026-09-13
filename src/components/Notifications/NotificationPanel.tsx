/**
 * SUPPLYFLOW — Notification Panel
 *
 * Toast-style notification system that appears in the top-right corner.
 * Driven by the useNotifications hook (Supabase Realtime).
 * Professional: no animations, no excessive color, no spam.
 *
 * Rules:
 * - Max 3 toasts visible at once (oldest hidden).
 * - Auto-dismiss after 8 seconds.
 * - TP HIT: green. SL HIT: red. Approaching: amber. Info: neutral.
 */
import React, { useEffect, useRef, useState } from 'react';
import { TradeNotification, NotificationType } from '../../types';
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Bell, BellOff } from 'lucide-react';

interface NotificationPanelProps {
  notifications: TradeNotification[];
  unreadCount: number;
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
}

interface ToastConfig {
  icon: React.ReactNode;
  borderColor: string;
  textColor: string;
  bgAccent: string;
}

function getToastConfig(type: NotificationType): ToastConfig {
  switch (type) {
    case 'TP_HIT':
      return {
        icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />,
        borderColor: 'border-[#10B981]/30',
        textColor: 'text-[#34D399]',
        bgAccent: 'bg-[#10B981]/5',
      };
    case 'SL_HIT':
      return {
        icon: <XCircle className="h-3.5 w-3.5 shrink-0" />,
        borderColor: 'border-[#EF4444]/30',
        textColor: 'text-[#F87171]',
        bgAccent: 'bg-[#EF4444]/5',
      };
    case 'APPROACHING_TP':
    case 'APPROACHING_SL':
      return {
        icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0" />,
        borderColor: 'border-[#F59E0B]/30',
        textColor: 'text-[#FBBF24]',
        bgAccent: 'bg-[#F59E0B]/5',
      };
    default:
      return {
        icon: <Info className="h-3.5 w-3.5 shrink-0" />,
        borderColor: 'border-[#272932]',
        textColor: 'text-[#8E95A2]',
        bgAccent: 'bg-[#0E0F14]',
      };
  }
}

interface ToastItem {
  notification: TradeNotification;
  expiresAt: number;
}

const TOAST_DURATION_MS = 8000;
const MAX_VISIBLE_TOASTS = 3;

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  unreadCount,
  onDismiss,
  onMarkAllRead,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  // Show new unread notifications as toasts
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read && !seenIds.current.has(n.id));
    if (unread.length === 0) return;

    const newToasts: ToastItem[] = unread.map((n) => ({
      notification: n,
      expiresAt: Date.now() + TOAST_DURATION_MS,
    }));

    unread.forEach((n) => seenIds.current.add(n.id));

    setToasts((prev) => {
      const combined = [...newToasts, ...prev];
      return combined.slice(0, MAX_VISIBLE_TOASTS);
    });
  }, [notifications]);

  // Auto-dismiss expired toasts
  useEffect(() => {
    if (toasts.length === 0) return;
    const nearest = Math.min(...toasts.map((t) => t.expiresAt));
    const delay = Math.max(nearest - Date.now(), 100);
    const timer = setTimeout(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((t) => t.expiresAt > now));
    }, delay);
    return () => clearTimeout(timer);
  }, [toasts]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.notification.id !== id));
    onDismiss(id);
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map(({ notification }) => {
        const config = getToastConfig(notification.type);
        return (
          <div
            key={notification.id}
            className={`pointer-events-auto border ${config.borderColor} ${config.bgAccent} bg-[#0A0B0E] rounded-lg px-3 py-2.5 shadow-xl`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className={`flex items-start gap-2 ${config.textColor}`}>
                {config.icon}
                <p className="text-xs font-semibold leading-snug">{notification.message}</p>
              </div>
              <button
                onClick={() => dismissToast(notification.id)}
                className="text-[#525866] hover:text-[#8E95A2] transition-colors shrink-0 mt-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {notification.rMultiple != null && (
              <p className={`text-[10px] font-mono-num font-bold mt-0.5 ml-5.5 ${config.textColor}`}>
                {notification.rMultiple >= 0 ? '+' : ''}{notification.rMultiple.toFixed(2)}R
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Notification bell icon for the nav bar, shows unread count badge.
 */
export const NotificationBell: React.FC<{
  unreadCount: number;
  onClick: () => void;
}> = ({ unreadCount, onClick }) => (
  <button
    onClick={onClick}
    className="relative p-1.5 rounded-lg text-[#525866] hover:text-white hover:bg-[#0E0F14] transition-colors cursor-pointer"
    title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
  >
    {unreadCount > 0 ? (
      <Bell className="h-4 w-4 text-[#F59E0B]" />
    ) : (
      <BellOff className="h-4 w-4" />
    )}
    {unreadCount > 0 && (
      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-[#F59E0B] text-[8px] font-black text-black">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    )}
  </button>
);
