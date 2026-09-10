import React, { useState, useMemo } from 'react';
import { TradeRecord } from '../../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';

interface TradingCalendarWidgetProps {
  trades: TradeRecord[];
  currencySymbol?: string;
  onOpenTrade: (trade: TradeRecord) => void;
  onViewFullCalendar?: () => void;
}

export const TradingCalendarWidget: React.FC<TradingCalendarWidgetProps> = ({
  trades,
  currencySymbol = '$',
  onOpenTrade,
  onViewFullCalendar,
}) => {
  // Current month being viewed
  const [currentDate, setCurrentDate] = useState(() => {
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

  const setThisMonth = () => {
    setCurrentDate(new Date());
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

  // Calendar weeks structure: 5 or 6 weeks array of 7 days
  const calendarWeeks = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: Array<
      Array<{
        dayNumber: number | null;
        dateStr: string | null;
        trades: TradeRecord[];
        netPnl: number;
        netR: number;
        winRate: number;
      }>
    > = [];

    let currentWeek: Array<{
      dayNumber: number | null;
      dateStr: string | null;
      trades: TradeRecord[];
      netPnl: number;
      netR: number;
      winRate: number;
    }> = [];

    // Empty lead slots before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      currentWeek.push({ dayNumber: null, dateStr: null, trades: [], netPnl: 0, netR: 0, winRate: 0 });
    }

    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayFormatted = String(d).padStart(2, '0');
      const monthFormatted = String(month + 1).padStart(2, '0');
      const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;
      const dayTrades = tradesByDay.get(dateStr) || [];
      const netR = dayTrades.reduce((acc, t) => acc + (t.actualR || 0), 0);
      const netPnl = dayTrades.reduce((acc, t) => acc + (t.pnl || (t.actualR || 0) * 500), 0);
      const winCount = dayTrades.filter((t) => (t.actualR || 0) > 0.05).length;
      const winRate = dayTrades.length > 0 ? (winCount / dayTrades.length) * 100 : 0;

      currentWeek.push({
        dayNumber: d,
        dateStr,
        trades: dayTrades,
        netPnl,
        netR,
        winRate,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Trailing days to fill last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ dayNumber: null, dateStr: null, trades: [], netPnl: 0, netR: 0, winRate: 0 });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [year, month, tradesByDay]);

  // Overall Monthly Stats
  const monthlyStats = useMemo(() => {
    let totalPnl = 0;
    let tradingDays = 0;
    let winningDays = 0;
    let totalTrades = 0;

    calendarWeeks.forEach((week) => {
      week.forEach((day) => {
        if (day.dayNumber && day.trades.length > 0) {
          totalPnl += day.netPnl;
          tradingDays++;
          totalTrades += day.trades.length;
          if (day.netPnl > 0) winningDays++;
        }
      });
    });

    return { totalPnl, tradingDays, winningDays, totalTrades };
  }, [calendarWeeks]);

  return (
    <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 flex flex-col justify-between h-full">
      {/* Calendar Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#181920]">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-[#8E95A2] hover:text-white bg-[#111217] hover:bg-[#181922] border border-[#1E2028] transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-white tracking-tight min-w-[120px] text-center">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-[#8E95A2] hover:text-white bg-[#111217] hover:bg-[#181922] border border-[#1E2028] transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={setThisMonth}
            className="ml-2 px-2.5 py-1 rounded-lg bg-[#111217] hover:bg-[#181922] border border-[#1E2028] text-[11px] font-semibold text-[#8E95A2] hover:text-white transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Monthly stats badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#111217] border border-[#1E2028] text-xs">
            <span className="text-[#8E95A2] text-[11px]">Month:</span>
            <span
              className={`font-mono-num font-bold ${
                monthlyStats.totalPnl >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
              }`}
            >
              {monthlyStats.totalPnl >= 0 ? '+' : ''}
              {currencySymbol}
              {Math.abs(monthlyStats.totalPnl) >= 1000
                ? (monthlyStats.totalPnl / 1000).toFixed(2) + 'K'
                : monthlyStats.totalPnl.toFixed(0)}
            </span>
            <span className="text-[#525866] font-mono-num">
              {monthlyStats.tradingDays} days
            </span>
          </div>

          {onViewFullCalendar && (
            <button
              onClick={onViewFullCalendar}
              title="Open full-screen calendar"
              className="p-1.5 rounded-lg bg-[#111217] border border-[#1E2028] text-[#8E95A2] hover:text-[#A78BFA] hover:border-[#8B5CF6]/40 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Days of Week + Calendar Tiles + Weekly Stats Column */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {/* Days Table (7 columns) */}
        <div className="flex-1 min-w-[340px]">
          {/* Day of week labels */}
          <div className="grid grid-cols-7 gap-1 mb-1 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d} className="text-[10px] font-semibold text-[#525866] uppercase py-0.5">
                {d}
              </span>
            ))}
          </div>

          {/* Weeks and Days Grid */}
          <div className="space-y-1">
            {calendarWeeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-7 gap-1">
                {week.map((day, dIdx) => {
                  if (!day.dayNumber) {
                    return (
                      <div
                        key={dIdx}
                        className="h-[52px] rounded-lg bg-[#060709]/50 border border-transparent"
                      />
                    );
                  }

                  const hasTrades = day.trades.length > 0;
                  const isGreen = hasTrades && day.netPnl > 0;
                  const isRed = hasTrades && day.netPnl < 0;

                  return (
                    <button
                      key={dIdx}
                      onClick={() => {
                        if (hasTrades) {
                          setSelectedDayTrades({
                            dateStr: day.dateStr!,
                            trades: day.trades,
                          });
                        }
                      }}
                      className={`h-[52px] rounded-lg p-1 flex flex-col justify-between text-left transition-all relative group ${
                        isGreen
                          ? 'bg-[#0B2418] border border-[#16432C] hover:border-[#226344] shadow-xs cursor-pointer'
                          : isRed
                          ? 'bg-[#240D12] border border-[#481A22] hover:border-[#6B2430] shadow-xs cursor-pointer'
                          : 'bg-[#0E0F14] border border-[#181922] hover:border-[#282B36]'
                      }`}
                    >
                      {/* Day Number */}
                      <span className="text-[9px] font-mono-num text-[#8E95A2] leading-none">
                        {day.dayNumber}
                      </span>

                      {/* Trade details inside cell */}
                      {hasTrades ? (
                        <div className="space-y-0.5 mt-auto">
                          <div
                            className={`text-[10.5px] font-mono-num font-bold leading-tight ${
                              isGreen ? 'text-[#34D399]' : isRed ? 'text-[#F87171]' : 'text-white'
                            }`}
                          >
                            {day.netPnl >= 0 ? '+' : ''}
                            {currencySymbol}
                            {Math.abs(day.netPnl) >= 1000
                              ? (day.netPnl / 1000).toFixed(1) + 'K'
                              : day.netPnl.toFixed(0)}
                          </div>
                          <div className="flex items-center justify-between text-[8px] font-mono-num text-[#8E95A2] leading-none">
                            <span>{day.trades.length}t</span>
                            <span>{day.winRate.toFixed(0)}%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-4" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Summary Column (TradeZella style) */}
        <div className="w-24 shrink-0 flex flex-col justify-between pt-5 border-l border-[#181920] pl-2 space-y-1">
          {calendarWeeks.map((week, idx) => {
            const weekPnl = week.reduce((acc, d) => acc + d.netPnl, 0);
            const weekDaysTraded = week.filter((d) => d.dayNumber && d.trades.length > 0).length;

            return (
              <div
                key={idx}
                className="h-[52px] rounded-lg bg-[#0E0F14] border border-[#181922] p-1.5 flex flex-col justify-between text-[9px]"
              >
                <span className="text-[#8E95A2] font-semibold">Week {idx + 1}</span>
                <div>
                  <span
                    className={`font-mono-num font-bold block ${
                      weekPnl > 0 ? 'text-[#34D399]' : weekPnl < 0 ? 'text-[#F87171]' : 'text-[#525866]'
                    }`}
                  >
                    {weekPnl > 0 ? '+' : ''}
                    {currencySymbol}
                    {Math.abs(weekPnl) >= 1000 ? (weekPnl / 1000).toFixed(1) + 'K' : weekPnl.toFixed(0)}
                  </span>
                  <span className="text-[8px] text-[#525866] font-mono-num block">
                    {weekDaysTraded} {weekDaysTraded === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Quick Inspector Drawer */}
      {selectedDayTrades && (
        <div className="mt-3 pt-3 border-t border-[#181920] animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-[#8B5CF6]" />
              <span>Trades for {selectedDayTrades.dateStr}</span>
            </span>
            <button
              onClick={() => setSelectedDayTrades(null)}
              className="text-[10px] text-[#8E95A2] hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {selectedDayTrades.trades.map((trade) => (
              <div
                key={trade.id}
                onClick={() => onOpenTrade(trade)}
                className="flex items-center justify-between p-2 rounded-lg bg-[#111217] hover:bg-[#181922] border border-[#1E2028] text-xs cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      trade.direction === 'BUY'
                        ? 'bg-[#0B2418] text-[#34D399] border border-[#16432C]'
                        : 'bg-[#240D12] text-[#F87171] border border-[#481A22]'
                    }`}
                  >
                    {trade.direction}
                  </span>
                  <span className="font-bold text-white">{trade.pair}</span>
                  <span className="text-[#8E95A2] text-[11px]">{trade.session}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono-num font-bold ${
                      (trade.actualR || 0) >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
                    }`}
                  >
                    {(trade.actualR || 0) >= 0 ? '+' : ''}
                    {(trade.actualR || 0).toFixed(2)}R
                  </span>
                  <span className="text-[11px] font-mono-num text-[#8E95A2]">
                    {trade.result}
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
