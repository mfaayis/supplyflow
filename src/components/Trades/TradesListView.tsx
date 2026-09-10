import React, { useState, useMemo } from 'react';
import { TradeRecord, TradeDirection, TradingSession, TradeResult } from '../../types';
import { tradeRepository } from '../../services/tradeRepository';
import {
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  ChevronDown,
  Check,
  X,
  Eye,
  Camera,
  Layers,
  Calendar,
} from 'lucide-react';

interface TradesListViewProps {
  trades: TradeRecord[];
  onOpenTrade: (trade: TradeRecord) => void;
  onNewTrade: () => void;
}

export const TradesListView: React.FC<TradesListViewProps> = ({ trades, onOpenTrade, onNewTrade }) => {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [pairFilter, setPairFilter] = useState('ALL');
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [sessionFilter, setSessionFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL'); // 'ALL' | 'YES' | 'NO'
  const [sortBy, setSortBy] = useState<'date' | 'r' | 'pnl' | 'confluence' | 'rr'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Filter pairs available
  const availablePairs = useMemo(() => {
    const set = new Set(trades.map((t) => t.pair));
    return ['ALL', ...Array.from(set)];
  }, [trades]);

  // Filtered and Sorted Trades
  const processedTrades = useMemo(() => {
    let result = trades.filter((t) => {
      // Search matches
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchPair = t.pair.toLowerCase().includes(query);
        const matchNotes = t.setupNotes?.toLowerCase().includes(query) || false;
        const matchLesson = t.lesson?.toLowerCase().includes(query) || false;
        if (!matchPair && !matchNotes && !matchLesson) return false;
      }

      // Dropdown filters
      if (pairFilter !== 'ALL' && t.pair !== pairFilter) return false;
      if (directionFilter !== 'ALL' && t.direction !== directionFilter) return false;
      if (sessionFilter !== 'ALL' && t.session !== sessionFilter) return false;
      if (resultFilter !== 'ALL' && t.result !== resultFilter) return false;
      if (planFilter === 'YES' && !t.followedPlan) return false;
      if (planFilter === 'NO' && t.followedPlan) return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        const dtA = new Date(`${a.tradeDate}T${a.tradeTime || '12:00'}`).getTime();
        const dtB = new Date(`${b.tradeDate}T${b.tradeTime || '12:00'}`).getTime();
        comparison = dtA - dtB;
      } else if (sortBy === 'r') {
        comparison = (a.actualR || 0) - (b.actualR || 0);
      } else if (sortBy === 'pnl') {
        comparison = (a.pnl || 0) - (b.pnl || 0);
      } else if (sortBy === 'confluence') {
        comparison = (a.confluenceScore || 0) - (b.confluenceScore || 0);
      } else if (sortBy === 'rr') {
        comparison = (a.plannedRR || 0) - (b.plannedRR || 0);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [trades, searchTerm, pairFilter, directionFilter, sessionFilter, resultFilter, planFilter, sortBy, sortOrder]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#525866]" />
            <input
              type="text"
              placeholder="Search trades (pair, notes, lesson)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-[#181920] bg-[#0A0B0E] pl-9 pr-3.5 py-2 text-xs text-white placeholder-[#525866] focus:border-[#8B5CF6]/60 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525866] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              showFilters
                ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border-[#8B5CF6]/40'
                : 'bg-[#0A0B0E] text-[#8E95A2] border-[#181920] hover:text-white'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => tradeRepository.exportToCSV()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A0B0E] hover:bg-[#121318] border border-[#181920] text-xs font-semibold text-[#8E95A2] hover:text-white transition-all shadow-xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onNewTrade}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(139,92,246,0.35)] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>New Trade</span>
          </button>
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {showFilters && (
        <div className="p-4 rounded-2xl border border-[#181920] bg-[#0A0B0E] grid grid-cols-2 sm:grid-cols-5 gap-3 animate-in fade-in duration-150">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8E95A2] mb-1">
              Pair
            </label>
            <select
              value={pairFilter}
              onChange={(e) => setPairFilter(e.target.value)}
              className="w-full rounded-lg border border-[#181920] bg-[#0E0F14] px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              {availablePairs.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8E95A2] mb-1">
              Direction
            </label>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="w-full rounded-lg border border-[#181920] bg-[#0E0F14] px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Directions</option>
              <option value="BUY">BUY / Long</option>
              <option value="SELL">SELL / Short</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8E95A2] mb-1">
              Session
            </label>
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="w-full rounded-lg border border-[#181920] bg-[#0E0F14] px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Sessions</option>
              <option value="NEW YORK">New York</option>
              <option value="LONDON">London</option>
              <option value="ASIA">Asia</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8E95A2] mb-1">
              Result
            </label>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="w-full rounded-lg border border-[#181920] bg-[#0E0F14] px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Results</option>
              <option value="TP HIT">TP HIT</option>
              <option value="SL HIT">SL HIT</option>
              <option value="BREAKEVEN">BREAKEVEN</option>
              <option value="MANUAL CLOSE">MANUAL CLOSE</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8E95A2] mb-1">
              Plan Followed
            </label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full rounded-lg border border-[#181920] bg-[#0E0F14] px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Trades</option>
              <option value="YES">Followed Plan</option>
              <option value="NO">Broke Rules</option>
            </select>
          </div>
        </div>
      )}

      {/* Trades Count & Sort Summary Bar */}
      <div className="flex items-center justify-between text-xs text-[#8E95A2] px-1">
        <span>
          Showing <strong className="text-white">{processedTrades.length}</strong> of{' '}
          <strong className="text-white">{trades.length}</strong> trades
        </span>
        <div className="flex items-center gap-1">
          <span>Sort:</span>
          <button
            onClick={() => toggleSort('date')}
            className={`px-1.5 py-0.5 rounded font-medium cursor-pointer ${sortBy === 'date' ? 'text-[#A78BFA]' : 'text-[#8E95A2]'}`}
          >
            Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
          <span>•</span>
          <button
            onClick={() => toggleSort('r')}
            className={`px-1.5 py-0.5 rounded font-medium cursor-pointer ${sortBy === 'r' ? 'text-[#A78BFA]' : 'text-[#8E95A2]'}`}
          >
            R {sortBy === 'r' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
          <span>•</span>
          <button
            onClick={() => toggleSort('confluence')}
            className={`px-1.5 py-0.5 rounded font-medium cursor-pointer ${sortBy === 'confluence' ? 'text-[#A78BFA]' : 'text-[#8E95A2]'}`}
          >
            Confluence {sortBy === 'confluence' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
        </div>
      </div>

      {/* Empty State */}
      {processedTrades.length === 0 && (
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#14151C] text-[#8E95A2]">
            <Layers className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-white">No trades found</h3>
          <p className="text-xs text-[#8E95A2] max-w-sm mx-auto">
            No trades match the current filters. Adjust your search or log a new trade.
          </p>
          <button
            onClick={onNewTrade}
            className="inline-flex items-center gap-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            Log Trade
          </button>
        </div>
      )}

      {/* Desktop Table View */}
      {processedTrades.length > 0 && (
        <div className="hidden md:block rounded-2xl border border-[#181920] bg-[#0A0B0E] overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#181920] bg-[#0D0E12] text-[10px] uppercase font-bold tracking-wider text-[#656B77]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Pair</th>
                <th className="py-3 px-3">Dir</th>
                <th className="py-3 px-3">Session</th>
                <th className="py-3 px-3">Grade</th>
                <th className="py-3 px-3">Entry</th>
                <th className="py-3 px-3">SL</th>
                <th className="py-3 px-3">TP</th>
                <th className="py-3 px-3">R:R</th>
                <th className="py-3 px-3">Result</th>
                <th className="py-3 px-3 text-right">R</th>
                <th className="py-3 px-3 text-center">Plan</th>
                <th className="py-3 px-4 text-center">Chart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181920]">
              {processedTrades.map((t) => {
                const isProfit = t.actualR > 0;
                const isLoss = t.actualR < 0;
                return (
                  <tr
                    key={t.id}
                    onClick={() => onOpenTrade(t)}
                    className="hover:bg-[#111217] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono-num text-[#8E95A2]">
                      {t.tradeDate} <span className="text-[#525866] text-[11px]">{t.tradeTime}</span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-white group-hover:text-[#A78BFA] transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-[#181922] border border-[#262832] flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                          {t.pair.substring(0, 2)}
                        </div>
                        <span>{t.pair}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          t.direction === 'BUY'
                            ? 'bg-[#0B2418] text-[#34D399] border border-[#16432C]'
                            : 'bg-[#240D12] text-[#F87171] border border-[#481A22]'
                        }`}
                      >
                        {t.direction}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-[#8E95A2] text-[11px]">{t.session}</td>
                    <td className="py-3.5 px-3">
                      <span className="font-mono-num font-semibold text-[10px] px-1.5 py-0.5 rounded bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/30">
                        {t.setupGrade || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono-num text-[#8E95A2]">{t.entryPrice || '—'}</td>
                    <td className="py-3.5 px-3 font-mono-num text-[#F87171]">{t.stopLoss || '—'}</td>
                    <td className="py-3.5 px-3 font-mono-num text-[#34D399]">{t.takeProfit || '—'}</td>
                    <td className="py-3.5 px-3 font-mono-num font-semibold text-white">
                      1:{t.plannedRR?.toFixed(1) || '2.0'}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-[11px] text-[#A0A6B2]">{t.result}</td>
                    <td className="py-3.5 px-3 text-right">
                      <span
                        className={`font-mono-num font-bold px-2 py-0.5 rounded ${
                          isProfit
                            ? 'text-[#34D399] bg-[#0B2418] border border-[#16432C]'
                            : isLoss
                            ? 'text-[#F87171] bg-[#240D12] border border-[#481A22]'
                            : 'text-[#8E95A2] bg-[#181922]'
                        }`}
                      >
                        {t.actualR > 0 ? `+${t.actualR.toFixed(2)}R ✓` : t.actualR < 0 ? `${t.actualR.toFixed(2)}R ✕` : '0.00R'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {t.followedPlan ? (
                        <span className="text-[#34D399] font-bold text-xs" title="Plan Followed">
                          ✓
                        </span>
                      ) : (
                        <span className="text-[#F87171] font-bold text-xs" title="Rule Broken">
                          ✕
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {t.beforeScreenshot || t.afterScreenshot ? (
                        <Camera className="h-3.5 w-3.5 text-[#A78BFA] mx-auto" />
                      ) : (
                        <span className="text-[#3E424D]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Card List View */}
      {processedTrades.length > 0 && (
        <div className="block md:hidden space-y-2.5">
          {processedTrades.map((t) => {
            const isProfit = t.actualR > 0;
            const isLoss = t.actualR < 0;
            return (
              <div
                key={t.id}
                onClick={() => onOpenTrade(t)}
                className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 active:bg-[#121318] transition-colors cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">{t.pair}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.direction === 'BUY'
                          ? 'bg-[#0B2418] text-[#34D399] border border-[#16432C]'
                          : 'bg-[#240D12] text-[#F87171] border border-[#481A22]'
                      }`}
                    >
                      {t.direction}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8B5CF6]/15 text-[#A78BFA] font-bold font-mono-num">
                      {t.setupGrade}
                    </span>
                  </div>

                  <span
                    className={`font-mono-num font-bold text-xs px-2 py-0.5 rounded ${
                      isProfit
                        ? 'text-[#34D399] bg-[#0B2418] border border-[#16432C]'
                        : isLoss
                        ? 'text-[#F87171] bg-[#240D12] border border-[#481A22]'
                        : 'text-[#8E95A2]'
                    }`}
                  >
                    {t.actualR > 0 ? `+${t.actualR.toFixed(2)}R ✓` : t.actualR < 0 ? `${t.actualR.toFixed(2)}R ✕` : '0.00R'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] text-[#8E95A2] pt-1 border-t border-[#181920]">
                  <div>
                    <span className="text-[10px] block text-[#525866]">Session</span>
                    <span className="text-white font-medium">{t.session}</span>
                  </div>
                  <div>
                    <span className="text-[10px] block text-[#525866]">R:R / Result</span>
                    <span className="text-white font-medium">1:{t.plannedRR?.toFixed(1) || '2.0'} • {t.result}</span>
                  </div>
                  <div>
                    <span className="text-[10px] block text-[#525866]">Plan Followed</span>
                    <span className={t.followedPlan ? 'text-[#34D399] font-bold' : 'text-[#F87171] font-bold'}>
                      {t.followedPlan ? 'Followed ✓' : 'Broken ✕'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-[#525866] font-mono-num">
                  <span>{t.tradeDate} {t.tradeTime}</span>
                  {(t.beforeScreenshot || t.afterScreenshot) && (
                    <span className="flex items-center gap-1 text-[#A78BFA]">
                      <Camera className="h-3 w-3" /> Chart attached
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
