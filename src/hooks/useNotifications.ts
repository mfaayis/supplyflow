/**
 * SUPPLYFLOW — Notifications Hook
 *
 * Subscribes to the `notifications` Supabase Realtime channel for
 * the current user. Dispatches in-app toasts when events arrive.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TradeNotification, NotificationType } from '../types';

interface UseNotificationsResult {
  notifications: TradeNotification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  dismiss: (id: string) => void;
}

export function useNotifications(userId: string | undefined): UseNotificationsResult {
  const [notifications, setNotifications] = useState<TradeNotification[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Load recent unread notifications on mount
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setNotifications(data.map(mapRow));
        }
      });

    // Subscribe to new notifications via Realtime
    const channel = supabase
      .channel(`notifications:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row) {
            setNotifications((prev) => [mapRow(row), ...prev].slice(0, 50));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [userId]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAllRead, markRead, dismiss };
}

function mapRow(row: Record<string, unknown>): TradeNotification {
  return {
    id: row.id as string,
    tradeId: row.trade_id as string,
    type: row.type as NotificationType,
    message: row.message as string,
    price: row.price != null ? parseFloat(String(row.price)) : undefined,
    rMultiple: row.r_multiple != null ? parseFloat(String(row.r_multiple)) : undefined,
    read: row.read as boolean,
    createdAt: row.created_at as string,
  };
}
