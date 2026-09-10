import React, { useState, useMemo } from 'react';
import { TradeRecord, UserSettings } from '../../types';
import { tradeRepository } from '../../services/tradeRepository';
import { calculatePerformanceStats, buildEquityCurve } from '../../utils/calculations';
import { EquityChart } from '../Shared/EquityChart';
import { RadarScoreChart } from './RadarScoreChart';
import { CircularRingGauge, SemiCircleGauge, SplitRatioBar } from './MetricGauges';
import { TradingCalendarWidget } from './TradingCalendarWidget';
import { StrategyPlaybookSection } from './StrategyPlaybookSection';
import { RevolveBalanceChart } from './RevolveBalanceChart';
import {
  Plus,
  Eye,
  EyeOff,
  ArrowRight,
  Info,
  Trash2,
  CheckCircle2,
  XCircle,
  Layers,
  ChevronRight,
  Home,
  ArrowLeftRight,
} from 'lucide-react';

interface OverviewViewProps {
  trades: TradeRecord[];
  userSettings: UserSettings;
  onNewTrade: () => void;
  onOpenTrade: (trade: TradeRecord) => void;
  onViewAllTrades: () => void;
  onViewFramework?: () => void;
  onRefreshData: () => Promise<void>;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  trades,
  userSettings,
  onNewTrade,
  onOpenTrade,
  onViewAllTrades,
  onViewFramework,
  onRefreshData,
}) => {
  const [timeframeFilter, setTimeframeFilter] = useState<'12M' | '6M' | '30D' | '7D' | '24H'>('12M');
  const [showPnlValue, setShowPnlValue] = useState(true);
  const [activeTab, setActiveTab] = useState<'RECENT' | 'STRATEGIES'>('RECENT');

  const currencySymbol =
    userSettings.accountCurrency === 'EUR'
      ? '€'
      : userSettings.accountCurrency === 'GBP'
      ? '£'
      : userSettings.accountCurrency === 'INR'
      ? '₹'
      : '$';

  // Filter trades based on selected timeframe
  const filteredTrades = useMemo(() => {
    const now = new Date();
    const daysLimit =
      timeframeFilter === '24H'
        ? 1
        : timeframeFilter === '7D'
        ? 7
        : timeframeFilter === '30D'
        ? 30
        : timeframeFilter === '6M'
        ? 180
        : 365;

    const cutoff = new Date(now.getTime() - daysLimit * 24 * 60 * 60 * 1000);

    return trades.filter((t) => {
      const tradeDate = new Date(t.tradeDate + 'T12:00:00');
      return tradeDate >= cutoff;
    });
  }, [trades, timeframeFilter]);

  const stats = useMemo(
    () => calculatePerformanceStats(filteredTrades.length > 0 ? filteredTrades : trades, userSettings.accountCurrency),
    [filteredTrades, trades, userSettings.accountCurrency]
  );

  const equityPoints = useMemo(
    () => buildEquityCurve(filteredTrades.length > 0 ? filteredTrades : trades, userSettings.accountBalance),
    [filteredTrades, trades, userSettings.accountBalance]
  );

  const isDemo = tradeRepository.hasAnyDemoData();

  // Recent 8 trades sorted chronologically
  const recentTrades = useMemo(() => {
    const list = filteredTrades.length > 0 ? filteredTrades : trades;
    return [...list]
      .sort((a, b) => {
        const dtA = new Date(`${a.tradeDate}T${a.tradeTime || '12:00'}`).getTime();
        const dtB = new Date(`${b.tradeDate}T${b.tradeTime || '12:00'}`).getTime();
        return dtB - dtA;
      })
      .slice(0, 8);
  }, [filteredTrades, trades]);

  // Overall Trader Discipline & Execution Score (0 - 100)
  const traderScore = useMemo(() => {
    if (stats.totalTrades === 0) return 75.0;
    const wrScore = Math.min(stats.winRate * 1.5, 100);
    const pfScore = Math.min(stats.profitFactor * 35, 100);
    const disciplineScore = stats.rulesFollowedPercent;
    const rrScore = Math.min((stats.averageR + 1) * 40, 100);
    return Math.round((wrScore * 0.25 + pfScore * 0.25 + disciplineScore * 0.35 + rrScore * 0.15) * 10) / 10;
  }, [stats]);

  // Radar chart metrics normalized 0-100
  const radarMetrics = useMemo(() => {
    return {
      winRate: stats.winRate || 58,
      profitFactor: Math.min((stats.profitFactor / 3.0) * 100, 100) || 72,
      avgWinLoss: Math.min((stats.averageWinnerR / Math.max(stats.averageLoserR, 0.5)) * 40, 100) || 78,
      recoveryFactor: Math.min((stats.totalR / Math.max(stats.maxDrawdownR, 1)) * 30, 100) || 68,
      drawdownControl: Math.max(100 - stats.maxDrawdownR * 15, 20) || 85,
      consistency: stats.rulesFollowedPercent || 92,
    };
  }, [stats]);

  // Net dollar P&L calculation
  const totalDollarPnl = useMemo(() => {
    if (stats.totalPnl !== 0) return stats.totalPnl;
    const riskPerTrade = userSettings.accountBalance * 0.01 || 500;
    return stats.totalR * riskPerTrade;
  }, [stats, userSettings.accountBalance]);

  // Average dollar win and loss
  const avgDollarWin = useMemo(() => {
    return Math.abs(stats.averageWinnerR * (userSettings.accountBalance * 0.01 || 500));
  }, [stats.averageWinnerR, userSettings.accountBalance]);

  const avgDollarLoss = useMemo(() => {
    return Math.abs(stats.averageLoserR * (userSettings.accountBalance * 0.01 || 500));
  }, [stats.averageLoserR, userSettings.accountBalance]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Demo Data Banner if active */}
      {isDemo && (
        <div className="rounded-2xl border border-[#16432C] bg-[#0B2418]/60 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#34D399]">
            <Info className="h-4 w-4 shrink-0 text-[#34D399]" />
            <span>
              <strong>Sample Data</strong> — Sample trades loaded to demonstrate the journal. Clear them to start fresh.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={async () => {
                await tradeRepository.clearDemoData();
                await onRefreshData();
              }}
              className="px-2.5 py-1 rounded-lg bg-[#111217] hover:bg-[#181922] text-[#8E95A2] hover:text-[#F87171] border border-[#1E2028] text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              Clear Sample Data
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Overview
          </h1>
        </div>

        {/* Right Top Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-[#0B0C0E] border border-[#181920] p-1 rounded-xl">
            {(
              [
                { id: '12M', label: '12M' },
                { id: '6M', label: '6M' },
                { id: '30D', label: '30D' },
                { id: '7D', label: '7D' },
                { id: '24H', label: '24H' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setTimeframeFilter(item.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  timeframeFilter === item.id
                    ? 'bg-[#181922] text-white shadow-xs'
                    : 'text-[#656B77] hover:text-[#A0A6B2]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={onNewTrade}
            className="flex items-center gap-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] px-4 py-2 text-xs font-bold tracking-wide text-white transition-all shadow-[0_0_20px_rgba(139,92,246,0.35)] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>+ New Trade (30s)</span>
          </button>
        </div>
      </div>

      {/* Hero: Balance & Equity Curve */}
      <RevolveBalanceChart
        trades={trades}
        userSettings={userSettings}
        currencySymbol={currencySymbol}
      />

      {/* Primary KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Net P&L */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#8E95A2]">
              <span>Net P&amp;L</span>
              <span className="text-[10px] text-[#525866] font-mono-num ml-1">
                {stats.totalTrades} {stats.totalTrades === 1 ? 'trade' : 'trades'}
              </span>
            </div>
            <button
              onClick={() => setShowPnlValue(!showPnlValue)}
              className="text-[#525866] hover:text-white p-0.5"
            >
              {showPnlValue ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="mt-2">
            <span
              className={`text-2xl font-bold font-mono-num tracking-tight block ${
                totalDollarPnl >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
              }`}
            >
              {showPnlValue
                ? `${totalDollarPnl >= 0 ? '+' : '-'}${currencySymbol}${Math.abs(totalDollarPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '••••••'}
            </span>
            <span className="text-[10.5px] text-[#8E95A2] font-mono-num mt-0.5 block">
              {stats.totalR >= 0 ? `+${stats.totalR.toFixed(2)}R` : `${stats.totalR.toFixed(2)}R`} total R
            </span>
          </div>
        </div>

        {/* Card 2: Profit Factor */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#8E95A2]">
              <span>Profit Factor</span>
            </div>
            <span className="text-2xl font-bold font-mono-num text-white tracking-tight block mt-2">
              {stats.profitFactor.toFixed(2)}
            </span>
            <span className="text-[10.5px] text-[#8E95A2] font-mono-num mt-0.5 block">
              Gross Win / Loss
            </span>
          </div>
          <CircularRingGauge value={stats.profitFactor} max={3.5} />
        </div>

        {/* Card 3: Win Rate */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#8E95A2]">
              <span>Win Rate</span>
            </div>
            <span className="text-2xl font-bold font-mono-num text-white tracking-tight block mt-2">
              {stats.winRate}%
            </span>
            <span className="text-[10.5px] text-[#8E95A2] font-mono-num mt-0.5 block">
              {stats.winningTrades}W • {stats.breakevenTrades}BE • {stats.losingTrades}L
            </span>
          </div>
          <SemiCircleGauge
            winRate={stats.winRate}
            wins={stats.winningTrades}
            be={stats.breakevenTrades}
            losses={stats.losingTrades}
          />
        </div>

        {/* Card 4: Avg Win / Loss */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#8E95A2]">
            <span>Avg Win / Loss</span>
          </div>

          <div className="mt-1">
            <span className="text-2xl font-bold font-mono-num text-white tracking-tight">
              {(stats.averageWinnerR / Math.max(stats.averageLoserR, 0.01)).toFixed(2)}
            </span>
            <SplitRatioBar
              avgWin={avgDollarWin}
              avgLoss={avgDollarLoss}
              currencySymbol={currencySymbol}
            />
          </div>
        </div>

        {/* Card 5: Expectancy */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#8E95A2]">
            <span>Expectancy</span>
          </div>

          <div className="mt-2">
            <span
              className={`text-2xl font-bold font-mono-num tracking-tight block ${
                stats.expectancy >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'
              }`}
            >
              {stats.expectancy >= 0 ? '+' : ''}
              {currencySymbol}
              {Math.abs(stats.expectancy * (userSettings.accountBalance * 0.01 || 500)).toFixed(2)}
            </span>
            <span className="text-[10.5px] text-[#8E95A2] font-mono-num mt-0.5 block">
              {stats.expectancy >= 0 ? '+' : ''}{stats.expectancy.toFixed(2)}R / trade
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Grid: Left (Score & Area Chart) vs Right (Monthly Calendar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Trader Discipline Score (Hexagonal Radar Chart) */}
          <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4">
            <RadarScoreChart score={traderScore} metrics={radarMetrics} />
          </div>

          {/* Cumulative R Chart */}
          <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8E95A2]">
                  Cumulative R
                </span>
              </div>
              <span className="text-[11px] font-mono-num text-[#34D399] font-bold">
                {stats.totalR >= 0 ? `+${stats.totalR.toFixed(1)}R` : `${stats.totalR.toFixed(1)}R`}
              </span>
            </div>

            <EquityChart
              data={equityPoints}
              currency={userSettings.accountCurrency}
              height={170}
              initialMode="PNL"
              showControls={false}
            />
          </div>
        </div>

        {/* Right Column (7 cols): Calendar */}
        <div className="lg:col-span-7">
          <TradingCalendarWidget
            trades={filteredTrades}
            currencySymbol={currencySymbol}
            onOpenTrade={onOpenTrade}
          />
        </div>
      </div>

      {/* Trades & Setups */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#181920] pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('RECENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'RECENT'
                  ? 'bg-[#181922] text-white border border-[#272932]'
                  : 'text-[#656B77] hover:text-[#A0A6B2]'
              }`}
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-[#8E95A2]" />
              <span>Recent Trades ({recentTrades.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('STRATEGIES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'STRATEGIES'
                  ? 'bg-[#181922] text-white border border-[#272932]'
                  : 'text-[#656B77] hover:text-[#A0A6B2]'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-[#A78BFA]" />
              <span>Setups</span>
            </button>
          </div>

          {activeTab === 'RECENT' && (
            <button
              onClick={onViewAllTrades}
              className="flex items-center gap-1 text-xs font-semibold text-[#A78BFA] hover:text-white transition-colors cursor-pointer"
            >
              <span>View All Trades</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {activeTab === 'STRATEGIES' && onViewFramework && (
            <button
              onClick={onViewFramework}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#A78BFA] hover:text-white transition-colors cursor-pointer"
            >
              <span>S&amp;D Framework</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tab 1: Recent Trades Table */}
        {activeTab === 'RECENT' && (
          <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] overflow-hidden">
            {recentTrades.length === 0 ? (
              <div className="py-12 text-center text-[#8E95A2] text-xs">
                No trades logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0D0E12] border-b border-[#181920] text-[#656B77] uppercase text-[10px] font-semibold tracking-wider">
                    <tr>
                      <th className="py-3 px-5">Pair / Setup</th>
                      <th className="py-3 px-5">Date</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">P&amp;L / R</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181920]">
                    {recentTrades.map((trade) => {
                      const isWin = (trade.actualR || 0) > 0.05;
                      const isLoss = (trade.actualR || 0) < -0.05;
                      const tradePnl = trade.pnl !== undefined ? trade.pnl : (trade.actualR || 0) * 500;

                      // Format date: "May 04, 2024, 3:50pm"
                      const tradeDateTime = new Date(`${trade.tradeDate}T${trade.tradeTime || '12:00:00'}`);
                      const formattedDate = !isNaN(tradeDateTime.getTime())
                        ? tradeDateTime.toLocaleDateString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            year: 'numeric',
                          }) +
                          ', ' +
                          tradeDateTime.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          }).toLowerCase()
                        : trade.tradeDate;

                      return (
                        <tr
                          key={trade.id}
                          onClick={() => onOpenTrade(trade)}
                          className="hover:bg-[#111217] transition-colors cursor-pointer group"
                        >
                          {/* Pair / Setup */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-[#181922] border border-[#262832] flex items-center justify-center font-bold text-xs text-white shrink-0 group-hover:border-[#8B5CF6]/50 transition-colors">
                                {trade.pair.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-white text-xs block group-hover:text-[#A78BFA] transition-colors">
                                  {trade.pair}
                                </span>
                                <span className="text-[11px] text-[#656B77] block">
                                  {trade.direction} • {trade.timeframeData?.['4H']?.zone !== 'NONE' ? '4H Demand' : trade.session}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-5 text-[#8E95A2] text-xs">
                            {formattedDate}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-5">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                isWin
                                  ? 'bg-[#0B2418] text-[#34D399] border border-[#16432C]'
                                  : isLoss
                                  ? 'bg-[#240D12] text-[#F87171] border border-[#481A22]'
                                  : 'bg-[#181922] text-[#8E95A2] border border-[#272932]'
                              }`}
                            >
                              {isWin ? 'Win' : isLoss ? 'Loss' : 'BE'}
                            </span>
                          </td>

                          {/* P&L / R */}
                          <td className="py-3.5 px-5 text-right font-mono-num">
                            <span className="font-bold text-white text-xs block">
                              {tradePnl >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(tradePnl).toFixed(2)} {userSettings.accountCurrency}
                            </span>
                            <span className={`text-[10px] block ${isWin ? 'text-[#34D399]' : isLoss ? 'text-[#F87171]' : 'text-[#656B77]'}`}>
                              {(trade.actualR || 0) >= 0 ? '+' : ''}{(trade.actualR || 0).toFixed(2)}R
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Setups */}
        {activeTab === 'STRATEGIES' && (
          <StrategyPlaybookSection
            trades={filteredTrades}
            currencySymbol={currencySymbol}
            onOpenTrade={onOpenTrade}
          />
        )}
      </div>
    </div>
  );
};
