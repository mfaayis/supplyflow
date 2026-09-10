import React, { useState, useMemo } from 'react';
import { TradeRecord } from '../../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface TradingCalendarViewProps {
  trades: TradeRecord[];
  onOpenTrade: (trade: TradeRecord) => void;
}

export const TradingCalendarView: React.FC<TradingCalendarViewProps> = ({ trades, onOpenTrade }) => {
  // Current month being viewed
  const [currentDate, setCurrentDate] = useState(() => {
    // If we have trades, pick the month of the most recent trade, else today
    if (trades.length > 0) {
      const sorted = [...trades].sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
      const latest = new Date(sorted[0].tradeDate + 'T12:00:00');
      if (!isNaN(latest.getTime())) return latest;
    }
    return new Date();
  });

  const [selectedDayTrades, setSelectedDayTrades] = useState<{
    dateStr: string;
    trades: TradeRecord[];
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayTrades(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayTrades(null);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Map trades by day: "YYYY-MM-DD" => trades[]
  const tradesByDay = useMemo(() => {
    const map = new Map<string, TradeRecord[]>();
    trades.forEach((t) => {
      const list = map.get(t.tradeDate) || [];
      list.push(t);
      map.set(t.tradeDate, list);
    });
    return map;
  }, [trades]);

  // Calendar grid calculations
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dayNumber: number | null;
      dateStr: string | null;
      trades: TradeRecord[];
      netR: number;
    }> = [];

    // Empty lead slots before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, dateStr: null, trades: [], netR: 0 });
    }

    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayFormatted = String(d).padStart(2, '0');
      const monthFormatted = String(month + 1).padStart(2, '0');
      const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;
      const dayTrades = tradesByDay.get(dateStr) || [];
      const netR = dayTrades.reduce((acc, t) => acc + (t.actualR || 0), 0);

      days.push({
        dayNumber: d,
        dateStr,
        trades: dayTrades,
        netR,
      });
    }

    return days;
  }, [year, month, tradesByDay]);

  // Summary stats for currently viewed month
  const monthSummary = useMemo(() => {
    let totalTrades = 0;
    let netR = 0;
    let greenDays = 0;
    let redDays = 0;

    calendarDays.forEach((cd) => {
      if (cd.dayNumber && cd.trades.length > 0) {
        totalTrades += cd.trades.length;
        netR += cd.netR;
        if (cd.netR > 0) greenDays++;
        else if (cd.netR < 0) redDays++;
      }
    });

    return { totalTrades, netR, greenDays, redDays };
  }, [calendarDays]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Trading Calendar
          </h1>
          <p className="text-xs sm:text-sm text-[#8E9AA8] mt-0.5">
            Daily P&amp;L in R and trade count by day.
          </p>
        </div>

        {/* Month Selector Navigation */}
        <div className="flex items-center gap-2 bg-[#0E0F14] border border-[#181920] rounded-xl p-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-[#8E95A2] hover:text-white hover:bg-[#15161E] transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold text-white px-3 min-w-[130px] text-center font-mono-num">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-[#8E95A2] hover:text-white hover:bg-[#15161E] transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Month Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-3.5">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-[#8E95A2]">
            Trades
          </span>
          <div className="mt-1 text-xl font-mono-num font-bold text-white">
            {monthSummary.totalTrades}
          </div>
        </div>
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-3.5">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-[#8E95A2]">
            Net R
          </span>
          <div
            className={`mt-1 text-xl font-mono-num font-bold ${
              monthSummary.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {monthSummary.netR >= 0 ? `+${monthSummary.netR.toFixed(2)}R` : `${monthSummary.netR.toFixed(2)}R`}
          </div>
        </div>
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-3.5">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-[#8E95A2]">
            Green Days
          </span>
          <div className="mt-1 text-xl font-mono-num font-bold text-emerald-400">
            {monthSummary.greenDays} days
          </div>
        </div>
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-3.5">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-[#8E95A2]">
            Red Days
          </span>
          <div className="mt-1 text-xl font-mono-num font-bold text-rose-400">
            {monthSummary.redDays} days
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] overflow-hidden shadow-sm">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-[#181920] bg-[#0D0E12] text-center text-[10px] uppercase font-bold tracking-wider text-[#8E95A2] py-2.5">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#181920] bg-[#0A0B0E]">
          {calendarDays.map((cd, index) => {
            if (!cd.dayNumber) {
              return <div key={index} className="min-h-[85px] sm:min-h-[105px] bg-[#07080A]/40" />;
            }

            const hasTrades = cd.trades.length > 0;
            const isGreen = cd.netR > 0;
            const isRed = cd.netR < 0;
            const isSelected = selectedDayTrades?.dateStr === cd.dateStr;

            return (
              <div
                key={cd.dateStr}
                onClick={() => {
                  if (hasTrades) {
                    setSelectedDayTrades({ dateStr: cd.dateStr!, trades: cd.trades });
                  } else {
                    setSelectedDayTrades(null);
                  }
                }}
                className={`min-h-[85px] sm:min-h-[105px] p-2 flex flex-col justify-between transition-colors relative ${
                  hasTrades ? 'cursor-pointer hover:bg-[#15161E]' : 'opacity-60'
                } ${isSelected ? 'ring-2 ring-[#8B5CF6] z-10' : ''} ${
                  hasTrades
                    ? isGreen
                      ? 'bg-emerald-950/10'
                      : isRed
                      ? 'bg-rose-950/10'
                      : 'bg-gray-800/10'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-num text-xs font-semibold text-[#8E95A2]">
                    {cd.dayNumber}
                  </span>
                  {hasTrades && (
                    <span className="text-[10px] font-mono-num px-1.5 py-0.2 rounded bg-[#15161E] border border-[#181920] text-[#CBD5E1]">
                      {cd.trades.length}t
                    </span>
                  )}
                </div>

                {hasTrades ? (
                  <div className="mt-1 space-y-1">
                    <div
                      className={`font-mono-num font-bold text-xs sm:text-sm ${
                        isGreen ? 'text-emerald-400' : isRed ? 'text-rose-400' : 'text-gray-300'
                      }`}
                    >
                      {cd.netR > 0 ? `+${cd.netR.toFixed(2)}R` : `${cd.netR.toFixed(2)}R`}
                    </div>
                    <div className="hidden sm:flex flex-wrap gap-1 text-[9px]">
                      {cd.trades.map((t) => (
                        <span
                          key={t.id}
                          className="px-1 py-0.2 rounded bg-[#0E0F14] text-[#8E95A2] border border-[#181920]"
                        >
                          {t.pair}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-[#525866] font-mono-num">No trades</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Trade Details Panel */}
      {selectedDayTrades && (
        <div className="rounded-2xl border border-[#8B5CF6]/30 bg-[#0A0B0E] p-5 shadow-lg space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-[#A78BFA]" />
                Trades on {selectedDayTrades.dateStr}
              </h3>
              <p className="text-xs text-[#8E95A2]">
                {selectedDayTrades.trades.length} trades recorded • Net R:{' '}
                <span
                  className={
                    selectedDayTrades.trades.reduce((a, b) => a + (b.actualR || 0), 0) >= 0
                      ? 'text-emerald-400 font-bold'
                      : 'text-rose-400 font-bold'
                  }
                >
                  {selectedDayTrades.trades.reduce((a, b) => a + (b.actualR || 0), 0) >= 0 ? '+' : ''}
                  {selectedDayTrades.trades.reduce((a, b) => a + (b.actualR || 0), 0).toFixed(2)}R
                </span>
              </p>
            </div>
            <button
              onClick={() => setSelectedDayTrades(null)}
              className="text-xs text-[#8E95A2] hover:text-white px-2.5 py-1 rounded-lg bg-[#0E0F14] border border-[#181920] cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="divide-y divide-[#181920] border border-[#181920] rounded-xl bg-[#0E0F14] overflow-hidden">
            {selectedDayTrades.trades.map((t) => (
              <div
                key={t.id}
                onClick={() => onOpenTrade(t)}
                className="p-3.5 flex items-center justify-between hover:bg-[#15161E] transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">{t.pair}</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      t.direction === 'BUY'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-rose-500/15 text-rose-400'
                    }`}
                  >
                    {t.direction}
                  </span>
                  <span className="text-[#8E95A2] font-mono-num">{t.tradeTime}</span>
                  <span className="text-[#CBD5E1] hidden sm:inline">{t.session}</span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-[#CBD5E1]">{t.result}</span>
                  <span
                    className={`font-mono-num font-bold px-2 py-0.5 rounded text-xs ${
                      t.actualR > 0
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : t.actualR < 0
                        ? 'bg-rose-500/10 text-rose-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {t.actualR > 0 ? `+${t.actualR.toFixed(2)}R` : `${t.actualR.toFixed(2)}R`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
