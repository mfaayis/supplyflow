/**
 * SUPPLYFLOW — Active Trade Card
 *
 * Displays a single ACTIVE trade with live current price, distances to SL/TP,
 * real-time P/L, and a duration counter.
 * Designed for the professional trading terminal aesthetic — compact, dense, precise.
 */
import React, { useState, useEffect } from 'react';
import { TradeRecord, LivePrice } from '../../types';
import { TrendingUp, TrendingDown, Clock, X, ChevronRight } from 'lucide-react';

interface ActiveTradeCardProps {
  trade: TradeRecord;
  livePrice?: LivePrice;
  onManualClose?: (tradeId: string) => void;
  onCancel?: (tradeId: string) => void;
  onOpenDetail?: (trade: TradeRecord) => void;
}

function formatDuration(openedAt: string | undefined): string {
  if (!openedAt) return '—';
  const ms = Date.now() - new Date(openedAt).getTime();
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatPrice(price: number, symbol: string): string {
  // Use more decimal places for forex, fewer for indices/crypto
  const isForex = /^(EUR|GBP|AUD|NZD|USD|CAD|CHF|JPY|XAU|XAG)/.test(symbol);
  const isJpy = symbol.includes('JPY');
  const digits = isJpy ? 3 : isForex ? 5 : 2;
  return price.toFixed(digits);
}

function computePips(price1: number, price2: number, symbol: string): number {
  const isJpy = symbol.includes('JPY');
  const pipSize = isJpy ? 0.01 : 0.0001;
  return Math.abs(price1 - price2) / pipSize;
}

function computeCurrentPL(trade: TradeRecord, currentPrice: number): number {
  const { direction, entryPrice, positionSize = 0 } = trade;
  const priceDiff = direction === 'BUY'
    ? currentPrice - entryPrice
    : entryPrice - currentPrice;
  // Approximate P/L: priceDiff * positionSize (in account currency units)
  return priceDiff * positionSize;
}

function computeRMultiple(trade: TradeRecord, currentPrice: number): number {
  const { direction, entryPrice, stopLoss } = trade;
  const riskDist = Math.abs(entryPrice - stopLoss);
  if (riskDist === 0) return 0;
  const priceDiff = direction === 'BUY'
    ? currentPrice - entryPrice
    : entryPrice - currentPrice;
  return priceDiff / riskDist;
}

export const ActiveTradeCard: React.FC<ActiveTradeCardProps> = ({
  trade,
  livePrice,
  onManualClose,
  onCancel,
  onOpenDetail,
}) => {
  const [now, setNow] = useState(Date.now());

  // Tick duration counter every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const currentPrice = livePrice?.price ?? trade.lastPrice;
  const { pair, direction, entryPrice, stopLoss, takeProfit, plannedRR } = trade;

  const hasLivePrice = currentPrice !== undefined;

  // Distance calculations
  const toTP = hasLivePrice
    ? direction === 'BUY'
      ? computePips(takeProfit, currentPrice, pair)
      : computePips(currentPrice, takeProfit, pair)
    : null;

  const toSL = hasLivePrice
    ? direction === 'BUY'
      ? computePips(currentPrice, stopLoss, pair)
      : computePips(stopLoss, currentPrice, pair)
    : null;

  const currentPL = hasLivePrice ? computeCurrentPL(trade, currentPrice) : null;
  const currentR = hasLivePrice ? computeRMultiple(trade, currentPrice) : null;
  const isProfit = currentPL !== null && currentPL >= 0;

  const isBuy = direction === 'BUY';

  return (
    <div
      className="border border-[#181920] bg-[#0A0B0E] rounded-lg overflow-hidden cursor-pointer hover:border-[#272932] transition-colors"
      onClick={() => onOpenDetail?.(trade)}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#181920]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-white tracking-wide">{pair}</span>
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
              isBuy
                ? 'text-[#34D399] bg-[#10B981]/10 border border-[#10B981]/20'
                : 'text-[#F87171] bg-[#EF4444]/10 border border-[#EF4444]/20'
            }`}
          >
            {direction}
          </span>
          {trade.executionTimeframe && (
            <span className="text-[10px] text-[#525866] font-mono-num">{trade.executionTimeframe}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-[10px] text-[#525866]">
            <Clock className="h-3 w-3" />
            {formatDuration(trade.openedAt)}
          </span>
          <span className="text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
            ACTIVE
          </span>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 divide-x divide-[#181920]">
        {/* Entry */}
        <div className="p-2.5">
          <p className="text-[9px] uppercase tracking-wider text-[#525866] mb-0.5">Entry</p>
          <p className="text-xs font-mono-num font-semibold text-[#E1E4EA]">
            {formatPrice(entryPrice, pair)}
          </p>
        </div>
        {/* Current Price */}
        <div className="p-2.5">
          <p className="text-[9px] uppercase tracking-wider text-[#525866] mb-0.5">Current</p>
          {hasLivePrice ? (
            <p
              className={`text-xs font-mono-num font-bold ${
                isProfit ? 'text-[#34D399]' : 'text-[#F87171]'
              }`}
            >
              {formatPrice(currentPrice!, pair)}
            </p>
          ) : (
            <p className="text-xs text-[#525866] font-mono-num">—</p>
          )}
        </div>
        {/* Live R / P/L */}
        <div className="p-2.5">
          <p className="text-[9px] uppercase tracking-wider text-[#525866] mb-0.5">P/L</p>
          {currentR !== null ? (
            <p
              className={`text-xs font-mono-num font-bold ${
                currentR >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
              }`}
            >
              {currentR >= 0 ? '+' : ''}{currentR.toFixed(2)}R
            </p>
          ) : (
            <p className="text-xs text-[#525866] font-mono-num">—</p>
          )}
        </div>
      </div>

      {/* SL / TP levels + distances */}
      <div className="grid grid-cols-2 divide-x divide-[#181920] border-t border-[#181920]">
        <div className="p-2.5">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[9px] uppercase tracking-wider text-[#F87171]">SL</p>
            {toSL !== null && (
              <span className="text-[9px] font-mono-num text-[#525866]">
                {toSL.toFixed(1)} pips
              </span>
            )}
          </div>
          <p className="text-xs font-mono-num text-[#E1E4EA]">{formatPrice(stopLoss, pair)}</p>
        </div>
        <div className="p-2.5">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[9px] uppercase tracking-wider text-[#34D399]">TP</p>
            {toTP !== null && (
              <span className="text-[9px] font-mono-num text-[#525866]">
                {toTP.toFixed(1)} pips
              </span>
            )}
          </div>
          <p className="text-xs font-mono-num text-[#E1E4EA]">{formatPrice(takeProfit, pair)}</p>
        </div>
      </div>

      {/* Footer: R:R + actions */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[#181920]">
        <span className="text-[10px] font-mono-num text-[#525866]">
          R:R&nbsp;1:{plannedRR.toFixed(1)}
        </span>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {onCancel && (
            <button
              onClick={() => onCancel(trade.id)}
              className="text-[10px] text-[#525866] hover:text-[#F87171] transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          )}
          {onManualClose && (
            <button
              onClick={() => onManualClose(trade.id)}
              className="text-[10px] text-[#8E95A2] hover:text-white transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              Close
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
