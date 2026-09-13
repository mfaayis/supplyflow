/**
 * SUPPLYFLOW — Realtime Trades Hook
 *
 * Subscribes to Supabase Realtime for changes on the `trades` table
 * (filtered to the current user) and merges updates into local state.
 *
 * Returns:
 *   trades         — all trades, kept in sync via Realtime
 *   activeTrades   — trades with status === 'ACTIVE'
 *   livePrices     — Map<symbol, LivePrice> updated via market_prices table Realtime
 *   connectionStatus — Supabase Realtime connection health
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TradeRecord, LivePrice, MarketDataStatus } from '../types';

interface UseRealtimeTradesResult {
  trades: TradeRecord[];
  activeTrades: TradeRecord[];
  livePrices: Map<string, LivePrice>;
  connectionStatus: MarketDataStatus;
  refreshTrades: () => Promise<void>;
}

export function useRealtimeTrades(
  initialTrades: TradeRecord[],
  userId: string | undefined
): UseRealtimeTradesResult {
  const [trades, setTrades] = useState<TradeRecord[]>(initialTrades);
  const [livePrices, setLivePrices] = useState<Map<string, LivePrice>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<MarketDataStatus>('CONNECTING');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pricesChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Keep trades in sync when parent passes new data (e.g. initial load)
  useEffect(() => {
    setTrades(initialTrades);
  }, [initialTrades]);

  const refreshTrades = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('trades')
      .select('data, status, last_price, last_price_at, exit_price_raw, exit_reason, r_multiple, closed_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const merged = data.map((row: Record<string, unknown>) => {
        const tradeData = (row.data ?? {}) as Record<string, unknown>;
        // Merge server-side monitoring columns back into the data object
        return {
          ...tradeData,
          status: row.status ?? tradeData.status,
          lastPrice: row.last_price ?? tradeData.lastPrice,
          lastPriceAt: row.last_price_at ?? tradeData.lastPriceAt,
          exitPriceRaw: row.exit_price_raw ?? tradeData.exitPriceRaw,
          exitReason: row.exit_reason ?? tradeData.exitReason,
          rMultiple: row.r_multiple ?? tradeData.rMultiple,
          closedAt: row.closed_at ?? tradeData.closedAt,
        } as TradeRecord;
      });
      setTrades(merged);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // ── Trades Realtime Channel ──────────────────────────────────────────────
    const tradesChannel = supabase
      .channel(`trades:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (!row) return;

          const tradeData = (row.data ?? {}) as Record<string, unknown>;
          const updatedTrade: TradeRecord = {
            ...tradeData,
            status: row.status ?? tradeData.status,
            lastPrice: row.last_price ?? tradeData.lastPrice,
            lastPriceAt: row.last_price_at ?? tradeData.lastPriceAt,
            exitPriceRaw: row.exit_price_raw ?? tradeData.exitPriceRaw,
            exitReason: row.exit_reason ?? tradeData.exitReason,
            rMultiple: row.r_multiple ?? tradeData.rMultiple,
            closedAt: row.closed_at ?? tradeData.closedAt,
          } as TradeRecord;

          if (payload.eventType === 'INSERT') {
            setTrades((prev) => [updatedTrade, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTrades((prev) =>
              prev.map((t) => (t.id === updatedTrade.id ? updatedTrade : t))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>)?.id as string;
            if (deletedId) {
              setTrades((prev) => prev.filter((t) => t.id !== deletedId));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('CONNECTED');
        else if (status === 'CHANNEL_ERROR') setConnectionStatus('ERROR');
        else if (status === 'CLOSED') setConnectionStatus('DISCONNECTED');
        else setConnectionStatus('CONNECTING');
      });

    channelRef.current = tradesChannel;

    // ── Market Prices Realtime Channel ───────────────────────────────────────
    const pricesChannel = supabase
      .channel('market_prices')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_prices' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (!row?.symbol) return;

          const symbol = row.symbol as string;
          const price: LivePrice = {
            symbol,
            price: parseFloat(String(row.price)),
            bid: row.bid ? parseFloat(String(row.bid)) : undefined,
            ask: row.ask ? parseFloat(String(row.ask)) : undefined,
            updatedAt: row.updated_at as string,
            source: (row.source as LivePrice['source']) ?? 'twelvedata',
          };

          setLivePrices((prev) => {
            const next = new Map(prev);
            next.set(symbol, price);
            return next;
          });
        }
      )
      .subscribe();

    pricesChannelRef.current = pricesChannel;

    // Initial data load
    refreshTrades();

    return () => {
      supabase.removeChannel(tradesChannel);
      supabase.removeChannel(pricesChannel);
    };
  }, [userId, refreshTrades]);

  const activeTrades = trades.filter((t) => t.status === 'ACTIVE');

  return { trades, activeTrades, livePrices, connectionStatus, refreshTrades };
}
