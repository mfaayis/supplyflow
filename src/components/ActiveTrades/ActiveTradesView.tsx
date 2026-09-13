/**
 * SUPPLYFLOW — Active Trades View
 *
 * Dedicated view showing all ACTIVE trades in a compact table.
 * Prices update in real-time via Supabase Realtime / live price map.
 * When a trade closes, it smoothly moves to the History section below.
 */
import React, { useState, useMemo } from 'react';
import { TradeRecord, LivePrice, MarketDataStatus } from '../../types';
import { ActiveTradeCard } from './ActiveTradeCard';
import { tradeRepository } from '../../services/tradeRepository';
import { supabase } from '../../lib/supabase';
import {
  Activity,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  RotateCcw,
} from 'lucide-react';

interface ActiveTradesViewProps {
  activeTrades: TradeRecord[];
  recentlyClosed: TradeRecord[];  // trades just closed (WON/LOST) to show transition
  livePrices: Map<string, LivePrice>;
  connectionStatus: MarketDataStatus;
  onNewTrade: () => void;
  onOpenDetail: (trade: TradeRecord) => void;
  onRefreshData: () => Promise<void>;
}

function StatusBadge({ status }: { status: MarketDataStatus }) {
  if (status === 'CONNECTED') {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#34D399]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] animate-pulse" />
        LIVE
      </span>
    );
  }
  if (status === 'CONNECTING') {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#F59E0B]">
        <Loader2 className="h-3 w-3 animate-spin" />
        CONNECTING
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#F87171]">
      <WifiOff className="h-3 w-3" />
      DISCONNECTED
    </span>
  );
}

function TradeResultBadge({ trade }: { trade: TradeRecord }) {
  if (trade.status === 'WON') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-[#34D399] bg-[#10B981]/10 border border-[#10B981]/20 px-2 py-0.5 rounded">
        <CheckCircle2 className="h-3 w-3" />
        WIN {trade.rMultiple != null ? `+${trade.rMultiple.toFixed(2)}R` : ''}
      </span>
    );
  }
  if (trade.status === 'LOST') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-[#F87171] bg-[#EF4444]/10 border border-[#EF4444]/20 px-2 py-0.5 rounded">
        <XCircle className="h-3 w-3" />
        LOSS {trade.rMultiple != null ? `${trade.rMultiple.toFixed(2)}R` : ''}
      </span>
    );
  }
  if (trade.status === 'AMBIGUOUS') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-2 py-0.5 rounded">
        <AlertTriangle className="h-3 w-3" />
        REVIEW
      </span>
    );
  }
  return null;
}

export const ActiveTradesView: React.FC<ActiveTradesViewProps> = ({
  activeTrades,
  recentlyClosed,
  livePrices,
  connectionStatus,
  onNewTrade,
  onOpenDetail,
  onRefreshData,
}) => {
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);

  const handleManualClose = async (tradeId: string) => {
    if (!confirm('Manually close this trade? The backend will stop monitoring it.')) return;

    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    setClosingTradeId(tradeId);
    try {
      const trade = activeTrades.find((t) => t.id === tradeId);
      if (!trade) return;

      const now = new Date().toISOString();
      const closedData = {
        ...trade,
        status: 'CLOSED_MANUALLY' as const,
        exitReason: 'MANUAL' as const,
        resolutionSource: 'MANUAL' as const,
        exitPrice: trade.lastPrice ?? trade.entryPrice,
        exitPriceRaw: trade.lastPrice ?? trade.entryPrice,
        triggerPrice: trade.lastPrice ?? trade.entryPrice,
        triggerTimestamp: now,
        closedAt: now,
        updatedAt: now,
        result: 'MANUAL CLOSE' as const,
        actualR: trade.rMultiple ?? 0,
      };

      await tradeRepository.updateTrade(tradeId, closedData);

      // Update DB monitoring columns
      await supabase.from('trades').update({
        status: 'CLOSED_MANUALLY',
        exit_reason: 'MANUAL',
        resolution_source: 'MANUAL',
        exit_price_raw: closedData.exitPrice,
        trigger_price: closedData.triggerPrice,
        trigger_timestamp: now,
        closed_at: now,
        updated_at: now,
      }).eq('id', tradeId);

      await onRefreshData();
    } finally {
      setClosingTradeId(null);
    }
  };

  const handleCancel = async (tradeId: string) => {
    if (!confirm('Cancel this trade? No result will be recorded.')) return;

    const now = new Date().toISOString();
    await tradeRepository.updateTrade(tradeId, {
      status: 'CANCELLED',
      closedAt: now,
      result: 'MANUAL CLOSE',
    } as Partial<TradeRecord>);

    await supabase.from('trades').update({
      status: 'CANCELLED',
      closed_at: now,
    }).eq('id', tradeId);

    await onRefreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#F59E0B]" />
            Active Trades
          </h1>
          <span className="text-[10px] font-mono-num font-bold text-[#8E95A2] bg-[#0E0F14] border border-[#181920] px-1.5 py-0.5 rounded">
            {activeTrades.length}
          </span>
          <StatusBadge status={connectionStatus} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshData}
            className="p-1.5 rounded-lg text-[#525866] hover:text-white hover:bg-[#0E0F14] transition-colors cursor-pointer"
            title="Refresh"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onNewTrade}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            New Trade
          </button>
        </div>
      </div>

      {/* Market Data Disconnected Banner */}
      {connectionStatus === 'DISCONNECTED' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg">
          <WifiOff className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" />
          <p className="text-xs text-[#F59E0B]">
            Market data disconnected. Showing last known prices. Monitoring continues server-side.
          </p>
        </div>
      )}

      {/* Active Trades Grid */}
      {activeTrades.length === 0 ? (
        <div className="border border-dashed border-[#181920] rounded-lg p-8 text-center">
          <Activity className="h-6 w-6 text-[#525866] mx-auto mb-2" />
          <p className="text-xs font-semibold text-[#8E95A2] mb-1">No active trades</p>
          <p className="text-[10px] text-[#525866] mb-3">
            Create a new trade and set it to ACTIVE to start live monitoring.
          </p>
          <button
            onClick={onNewTrade}
            className="text-xs font-bold text-[#A78BFA] hover:text-white transition-colors cursor-pointer"
          >
            + Open New Trade
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {activeTrades.map((trade) => (
            <div key={trade.id} className="relative">
              {closingTradeId === trade.id && (
                <div className="absolute inset-0 bg-[#0A0B0E]/80 rounded-lg flex items-center justify-center z-10">
                  <Loader2 className="h-5 w-5 text-[#8B5CF6] animate-spin" />
                </div>
              )}
              <ActiveTradeCard
                trade={trade}
                livePrice={livePrices.get(trade.pair)}
                onManualClose={handleManualClose}
                onCancel={handleCancel}
                onOpenDetail={onOpenDetail}
              />
            </div>
          ))}
        </div>
      )}

      {/* Recently Closed (auto-closed by backend in this session) */}
      {recentlyClosed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#525866]">
            Just Closed
          </h2>
          <div className="space-y-2">
            {recentlyClosed.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between px-3 py-2 border border-[#181920] rounded-lg bg-[#0A0B0E] cursor-pointer hover:border-[#272932] transition-colors"
                onClick={() => onOpenDetail(trade)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xs text-white">{trade.pair}</span>
                  <span
                    className={`text-[10px] font-black uppercase ${
                      trade.direction === 'BUY' ? 'text-[#34D399]' : 'text-[#F87171]'
                    }`}
                  >
                    {trade.direction}
                  </span>
                  <span className="text-[10px] font-mono-num text-[#525866]">
                    Exit {trade.exitPriceRaw?.toFixed(5) ?? '—'}
                  </span>
                </div>
                <TradeResultBadge trade={trade} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
