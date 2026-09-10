import {
  TradeRecord,
  PerformanceStats,
  CurrencyCode,
  ConfluenceBreakdown,
  SetupRating,
  TradeFilterCriteria,
  SampleSizeInfo,
} from '../types';

/**
 * Returns statistical sample size evaluation and advisory warnings
 */
export function getSampleSizeInfo(count: number): SampleSizeInfo {
  if (count === 0) {
    return {
      count: 0,
      label: 'No Trades',
      description: 'Not enough data to draw a meaningful conclusion.',
      level: 'none',
      badgeClass: 'bg-[#181920] text-[#656B77] border-[#272932]',
      isMeaningful: false,
      reliabilityBadge: 'No Data',
      reliabilityColor: 'bg-[#181920] text-[#656B77]',
      message: 'Zero trades matched current filter. Adjust criteria to inspect trade cohorts.',
    };
  }
  if (count <= 10) {
    return {
      count,
      label: 'Very small sample',
      description: 'Not enough data to draw a meaningful conclusion.',
      level: 'very-small',
      badgeClass: 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30',
      isMeaningful: false,
      reliabilityBadge: 'Very Small Sample (≤10)',
      reliabilityColor: 'bg-[#EF4444]/15 text-[#F87171]',
      message: 'Very small sample (≤10 trades). Descriptive only; do not form strong conclusions from tiny cohorts.',
    };
  }
  if (count <= 30) {
    return {
      count,
      label: 'Early sample — use caution',
      description: 'Early sample — use caution when interpreting performance indicators.',
      level: 'early',
      badgeClass: 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30',
      isMeaningful: true,
      reliabilityBadge: 'Early Sample (11–30)',
      reliabilityColor: 'bg-[#F59E0B]/15 text-[#FBBF24]',
      message: 'Early sample (11–30 trades). Useful for tracking initial tendencies, but variance remains high.',
    };
  }
  if (count <= 50) {
    return {
      count,
      label: 'Developing sample',
      description: 'Developing sample size with emerging systematic patterns.',
      level: 'developing',
      badgeClass: 'bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30',
      isMeaningful: true,
      reliabilityBadge: 'Developing Sample (31–50)',
      reliabilityColor: 'bg-[#3B82F6]/15 text-[#60A5FA]',
      message: 'Developing sample size (31–50 trades). Systematic tendencies and playbook edge begin to stabilize.',
    };
  }
  if (count <= 100) {
    return {
      count,
      label: 'Useful sample',
      description: 'Useful sample size for identifying consistent edge.',
      level: 'useful',
      badgeClass: 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30',
      isMeaningful: true,
      reliabilityBadge: 'Useful Sample (51–100)',
      reliabilityColor: 'bg-[#10B981]/15 text-[#34D399]',
      message: 'Statistically useful sample (51–100 trades). Good confidence for playbook validation.',
    };
  }
  return {
    count,
    label: 'Stronger evidence',
    description: 'Stronger evidence with higher statistical confidence.',
    level: 'strong',
    badgeClass: 'bg-[#8B5CF6]/15 text-[#A78BFA] border-[#8B5CF6]/30',
    isMeaningful: true,
    reliabilityBadge: 'Strong Sample (>100)',
    reliabilityColor: 'bg-[#8B5CF6]/15 text-[#A78BFA]',
    message: 'Strong empirical sample size (>100 trades). High statistical robustness and playbook confidence.',
  };
}

/**
 * Calculates confluence score and factor list for a trade
 */
export function calculateConfluence(trade: Partial<TradeRecord>): ConfluenceBreakdown {
  const factors: string[] = [];
  const direction = trade.direction;

  if (!trade.timeframeData) {
    return { score: 0, factors: [], isHighProbability: false };
  }

  const tf = trade.timeframeData;
  const isBull = direction === 'BUY';
  const matchingBias = isBull ? 'BULLISH' : 'BEARISH';
  const matchingZone = isBull ? 'DEMAND' : 'SUPPLY';

  // 1. HTF Direction (Weekly or Daily)
  const htfAligned = tf.Weekly?.bias === matchingBias || tf.Daily?.bias === matchingBias;
  if (htfAligned) {
    factors.push('Higher Timeframe Bias Aligned (W/D)');
  }

  // 2. Intermediate TF Direction (4H or 1H)
  const itfAligned = tf['4H']?.bias === matchingBias || tf['1H']?.bias === matchingBias;
  if (itfAligned) {
    factors.push('Intermediate Structure Aligned (4H/1H)');
  }

  // 3. LTF Direction (15M or 5M)
  const ltfAligned = tf['15M']?.bias === matchingBias && tf['5M']?.bias === matchingBias;
  if (ltfAligned) {
    factors.push('Lower Timeframe Alignment (15M & 5M)');
  }

  // 4. 15M S/D Zone
  if (tf['15M']?.zone === matchingZone) {
    factors.push('15M ' + (isBull ? 'Demand Zone' : 'Supply Zone'));
  }

  // 5. 5M S/D Zone
  if (tf['5M']?.zone === matchingZone) {
    factors.push('5M ' + (isBull ? 'Demand Zone' : 'Supply Zone'));
  }

  // 6. 1M S/D Zone
  if (tf['1M']?.zone === matchingZone) {
    factors.push('1M Execution Zone');
  }

  // 7. Zone Quality: Fresh or Tested Once
  if (trade.zoneQuality === 'FRESH' || trade.zoneQuality === 'TESTED ONCE') {
    factors.push(`High Quality Zone (${trade.zoneQuality})`);
  }

  // 8. HOD / LOD Liquidity Level Confluence
  const hasLiquidityLevel = trade.previousDayHOD || trade.previousDayLOD || trade.twoDayHOD || trade.twoDayLOD;
  if (hasLiquidityLevel) {
    factors.push('HOD / LOD Liquidity Confluence');
  }

  // 9. Key Level Price Reaction
  if (trade.reactingAroundKeyLevel) {
    factors.push('Reaction at Reference Level');
  }

  // 10. Market Structure / Confirmation (BOS, CHoCH, Candle)
  if (trade.bos || trade.choch || trade.structureConfirmation || trade.candleConfirmation) {
    const confirms: string[] = [];
    if (trade.choch) confirms.push('CHoCH');
    if (trade.bos) confirms.push('BOS');
    if (trade.structureConfirmation) confirms.push('MS Conf');
    if (trade.candleConfirmation) confirms.push('Candle Conf');
    factors.push(`Confirmation (${confirms.join(', ') || 'Valid'})`);
  }

  // 11. New York Session
  if (trade.session === 'NEW YORK') {
    factors.push('New York Session');
  }

  // 12. Minimum 1:2 R:R
  if (trade.plannedRR && trade.plannedRR >= 2.0) {
    factors.push(`Meets 1:${trade.plannedRR.toFixed(1)} R:R`);
  }

  const score = factors.length;
  const isHighProbability = score >= 6;

  return { score, factors, isHighProbability };
}

/**
 * Calculates number of aligned timeframes out of 7 (Weekly, Daily, 4H, 1H, 15M, 5M, 1M)
 */
export function calculateTimeframeAlignment(trade: TradeRecord): { aligned: number; total: number; ratio: string } {
  if (!trade.timeframeData) return { aligned: 0, total: 7, ratio: '0/7' };

  const targetBias = trade.direction === 'BUY' ? 'BULLISH' : 'BEARISH';
  const tfs: Array<keyof typeof trade.timeframeData> = ['Weekly', 'Daily', '4H', '1H', '15M', '5M', '1M'];
  
  let count = 0;
  for (const t of tfs) {
    if (trade.timeframeData[t]?.bias === targetBias) {
      count++;
    }
  }

  return { aligned: count, total: 7, ratio: `${count}/7` };
}

/**
 * Recommends setup grade (A+, A, B, C) based on objective strategy criteria
 */
export function recommendSetupGrade(trade: Partial<TradeRecord>): SetupRating {
  const { score } = calculateConfluence(trade);
  const tf = trade.timeframeData;
  const targetBias = trade.direction === 'BUY' ? 'BULLISH' : 'BEARISH';
  const matchingZone = trade.direction === 'BUY' ? 'DEMAND' : 'SUPPLY';

  const strongHTF = tf?.Weekly?.bias === targetBias && tf?.Daily?.bias === targetBias;
  const has15mZone = tf?.['15M']?.zone === matchingZone;
  const has5mZone = tf?.['5M']?.zone === matchingZone;
  const hasConfirmation = trade.bos || trade.choch || trade.structureConfirmation;
  const hasHODLOD = trade.previousDayHOD || trade.previousDayLOD || trade.twoDayHOD || trade.twoDayLOD;
  const isNY = trade.session === 'NEW YORK';
  const meetsRR = (trade.plannedRR || 0) >= 2.0;

  if (strongHTF && has15mZone && has5mZone && hasConfirmation && hasHODLOD && isNY && meetsRR && score >= 7) {
    return 'A+';
  }
  if (score >= 6 && meetsRR) {
    return 'A';
  }
  if (score >= 4) {
    return 'B';
  }
  return 'C';
}

/**
 * Calculates all aggregated performance statistics for a list of trades
 */
export function calculatePerformanceStats(trades: TradeRecord[], currency: CurrencyCode = 'USD'): PerformanceStats {
  const closedTrades = trades.filter((t) => t.result !== 'OPEN');
  const totalTrades = closedTrades.length;

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      winRate: 0,
      lossRate: 0,
      breakevenRate: 0,
      totalR: 0,
      averageR: 0,
      profitFactor: 0,
      expectancy: 0,
      maxDrawdownR: 0,
      averageWinnerR: 0,
      averageLoserR: 0,
      rulesFollowedPercent: 0,
      totalPnl: 0,
      currency,
    };
  }

  let totalR = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let breakevenTrades = 0;
  let winSumR = 0;
  let lossSumR = 0;
  let rulesFollowedCount = 0;
  let totalPnl = 0;

  // For max drawdown calculation
  let peakR = 0;
  let cumulativeR = 0;
  let maxDrawdownR = 0;

  // Sort trades chronologically for accurate equity/drawdown calculation
  const sorted = [...closedTrades].sort((a, b) => {
    const dtA = new Date(`${a.tradeDate}T${a.tradeTime || '12:00'}`).getTime();
    const dtB = new Date(`${b.tradeDate}T${b.tradeTime || '12:00'}`).getTime();
    return dtA - dtB;
  });

  for (const t of sorted) {
    const r = t.actualR || 0;
    totalR += r;
    cumulativeR += r;
    if (cumulativeR > peakR) {
      peakR = cumulativeR;
    }
    const currentDrawdown = peakR - cumulativeR;
    if (currentDrawdown > maxDrawdownR) {
      maxDrawdownR = currentDrawdown;
    }

    if (r > 0.05) {
      winningTrades++;
      winSumR += r;
    } else if (r < -0.05) {
      losingTrades++;
      lossSumR += Math.abs(r);
    } else {
      breakevenTrades++;
    }

    if (t.followedPlan) {
      rulesFollowedCount++;
    }

    if (t.pnl !== undefined) {
      totalPnl += t.pnl;
    }
  }

  // Formula:
  // Win Rate = (Number of profitable/TP trades ÷ Number of completed trades) × 100
  // Loss Rate = (Number of losing trades ÷ Number of completed trades) × 100
  // Breakevens kept distinct
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const lossRate = totalTrades > 0 ? (losingTrades / totalTrades) * 100 : 0;
  const breakevenRate = totalTrades > 0 ? (breakevenTrades / totalTrades) * 100 : 0;
  const averageR = totalTrades > 0 ? totalR / totalTrades : 0;
  const averageWinnerR = winningTrades > 0 ? winSumR / winningTrades : 0;
  const averageLoserR = losingTrades > 0 ? lossSumR / losingTrades : 0;
  
  // Profit Factor: Gross Gains / Gross Losses
  const profitFactor = lossSumR > 0 ? winSumR / lossSumR : winSumR > 0 ? 99.9 : 0;

  // Expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
  const winFraction = totalTrades > 0 ? winningTrades / totalTrades : 0;
  const lossFraction = totalTrades > 0 ? losingTrades / totalTrades : 0;
  const expectancy = (winFraction * averageWinnerR) - (lossFraction * averageLoserR);

  const rulesFollowedPercent = totalTrades > 0 ? (rulesFollowedCount / totalTrades) * 100 : 0;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate: Number(winRate.toFixed(1)),
    lossRate: Number(lossRate.toFixed(1)),
    breakevenRate: Number(breakevenRate.toFixed(1)),
    totalR: Number(totalR.toFixed(2)),
    averageR: Number(averageR.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    expectancy: Number(expectancy.toFixed(2)),
    maxDrawdownR: Number(maxDrawdownR.toFixed(2)),
    averageWinnerR: Number(averageWinnerR.toFixed(2)),
    averageLoserR: Number(averageLoserR.toFixed(2)),
    rulesFollowedPercent: Number(rulesFollowedPercent.toFixed(1)),
    totalPnl: Number(totalPnl.toFixed(2)),
    currency,
  };
}

/**
 * Builds chronological equity curve data points for charting
 */
export interface EquityPoint {
  index: number;
  tradeId: string;
  date: string;
  pair: string;
  tradeR: number;
  cumulativeR: number;
  cumulativePnl: number;
  cumulativePercent: number;
  followedPlan: boolean;
  result: string;
}

export function buildEquityCurve(trades: TradeRecord[], startingAccountBalance: number = 10000): EquityPoint[] {
  const closedTrades = trades
    .filter((t) => t.result !== 'OPEN')
    .sort((a, b) => {
      const dtA = new Date(`${a.tradeDate}T${a.tradeTime || '12:00'}`).getTime();
      const dtB = new Date(`${b.tradeDate}T${b.tradeTime || '12:00'}`).getTime();
      return dtA - dtB;
    });

  let cumR = 0;
  let cumPnl = 0;
  const points: EquityPoint[] = [
    {
      index: 0,
      tradeId: 'start',
      date: closedTrades[0]?.tradeDate || 'Start',
      pair: '-',
      tradeR: 0,
      cumulativeR: 0,
      cumulativePnl: 0,
      cumulativePercent: 0,
      followedPlan: true,
      result: 'START',
    },
  ];

  closedTrades.forEach((t, i) => {
    const r = t.actualR || 0;
    cumR += r;
    const pnl = t.pnl !== undefined ? t.pnl : (r * (startingAccountBalance * ((t.riskPercent || 1) / 100)));
    cumPnl += pnl;
    const cumPercent = (cumPnl / startingAccountBalance) * 100;

    points.push({
      index: i + 1,
      tradeId: t.id,
      date: t.tradeDate,
      pair: t.pair,
      tradeR: r,
      cumulativeR: Number(cumR.toFixed(2)),
      cumulativePnl: Number(cumPnl.toFixed(2)),
      cumulativePercent: Number(cumPercent.toFixed(2)),
      followedPlan: t.followedPlan,
      result: t.result,
    });
  });

  return points;
}

/**
 * Filter trades dynamically by comprehensive criteria
 */
export function filterTradesByCriteria(trades: TradeRecord[], criteria: TradeFilterCriteria): TradeRecord[] {
  return trades.filter((t) => {
    // 1. Pair
    if (criteria.pair && criteria.pair !== 'ALL' && t.pair !== criteria.pair) {
      return false;
    }
    // 2. Direction
    if (criteria.direction && criteria.direction !== 'ALL' && t.direction !== criteria.direction) {
      return false;
    }
    // 3. Session
    if (criteria.session && criteria.session !== 'ALL' && t.session !== criteria.session) {
      return false;
    }
    // 4. Source (Personal vs Livestream)
    if (criteria.source && criteria.source !== 'ALL' && t.source !== criteria.source) {
      return false;
    }
    // 5. Date Range
    if (criteria.dateRangePreset && criteria.dateRangePreset !== 'ALL') {
      const tradeDate = new Date(t.tradeDate + 'T12:00:00');
      const now = new Date();
      if (criteria.dateRangePreset === 'TODAY') {
        const todayStr = now.toISOString().slice(0, 10);
        if (t.tradeDate !== todayStr) return false;
      } else if (criteria.dateRangePreset === 'LAST_7D') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
        if (tradeDate < sevenDaysAgo) return false;
      } else if (criteria.dateRangePreset === 'LAST_30D') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
        if (tradeDate < thirtyDaysAgo) return false;
      } else if (criteria.dateRangePreset === 'LAST_90D') {
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
        if (tradeDate < ninetyDaysAgo) return false;
      } else if (criteria.dateRangePreset === 'CUSTOM') {
        if (criteria.startDate && t.tradeDate < criteria.startDate) return false;
        if (criteria.endDate && t.tradeDate > criteria.endDate) return false;
      }
    }
    // 6. Supply vs Demand (Execution zone or direction bias)
    if (criteria.zoneType && criteria.zoneType !== 'ALL') {
      const matchesExecution =
        t.timeframeData?.['1M']?.zone === criteria.zoneType ||
        t.timeframeData?.['15M']?.zone === criteria.zoneType ||
        t.timeframeData?.['5M']?.zone === criteria.zoneType;
      const matchesDirection =
        (criteria.zoneType === 'DEMAND' && t.direction === 'BUY') ||
        (criteria.zoneType === 'SUPPLY' && t.direction === 'SELL');
      if (!matchesExecution && !matchesDirection) return false;
    }
    // 7. Zone Quality
    if (criteria.zoneQuality && criteria.zoneQuality !== 'ALL' && t.zoneQuality !== criteria.zoneQuality) {
      return false;
    }
    // 8. Timeframe Biases
    if (criteria.weeklyBias && criteria.weeklyBias !== 'ALL' && t.timeframeData?.Weekly?.bias !== criteria.weeklyBias) {
      return false;
    }
    if (criteria.dailyBias && criteria.dailyBias !== 'ALL' && t.timeframeData?.Daily?.bias !== criteria.dailyBias) {
      return false;
    }
    if (criteria.h4Bias && criteria.h4Bias !== 'ALL' && t.timeframeData?.['4H']?.bias !== criteria.h4Bias) {
      return false;
    }
    if (criteria.h1Bias && criteria.h1Bias !== 'ALL' && t.timeframeData?.['1H']?.bias !== criteria.h1Bias) {
      return false;
    }
    if (criteria.m15Bias && criteria.m15Bias !== 'ALL' && t.timeframeData?.['15M']?.bias !== criteria.m15Bias) {
      return false;
    }
    if (criteria.m5Bias && criteria.m5Bias !== 'ALL' && t.timeframeData?.['5M']?.bias !== criteria.m5Bias) {
      return false;
    }
    if (criteria.m1Bias && criteria.m1Bias !== 'ALL' && t.timeframeData?.['1M']?.bias !== criteria.m1Bias) {
      return false;
    }
    // 9. Number of Aligned Timeframes
    if (criteria.alignedTimeframes !== undefined && criteria.alignedTimeframes !== 'ALL') {
      const { aligned } = calculateTimeframeAlignment(t);
      if (typeof criteria.alignedTimeframes === 'number') {
        if (criteria.alignedTimeframes <= 4) {
          if (aligned > 4) return false;
        } else {
          if (aligned !== criteria.alignedTimeframes) return false;
        }
      }
    }
    // 10. HOD/LOD Confluence
    if (criteria.hodLodConfluence && criteria.hodLodConfluence !== 'ANY') {
      if (criteria.hodLodConfluence === 'HOD' && !t.previousDayHOD) return false;
      if (criteria.hodLodConfluence === 'LOD' && !t.previousDayLOD) return false;
      if (criteria.hodLodConfluence === 'TWO_DAY_HOD' && !t.twoDayHOD) return false;
      if (criteria.hodLodConfluence === 'TWO_DAY_LOD' && !t.twoDayLOD) return false;
      if (criteria.hodLodConfluence === 'KEY_LEVEL' && !t.reactingAroundKeyLevel) return false;
      if (criteria.hodLodConfluence === 'NONE') {
        if (t.previousDayHOD || t.previousDayLOD || t.twoDayHOD || t.twoDayLOD || t.reactingAroundKeyLevel) return false;
      }
    }
    // 11. Confirmation Type
    if (criteria.confirmationType && criteria.confirmationType !== 'ANY') {
      if (criteria.confirmationType === 'BOS' && !t.bos) return false;
      if (criteria.confirmationType === 'CHOCH' && !t.choch) return false;
      if (criteria.confirmationType === 'STRUCTURE' && !t.structureConfirmation) return false;
      if (criteria.confirmationType === 'PRICE_ACTION' && !t.priceActionConfirmation) return false;
      if (criteria.confirmationType === 'CANDLE' && !t.candleConfirmation) return false;
      if (criteria.confirmationType === 'NONE') {
        if (t.bos || t.choch || t.structureConfirmation || t.priceActionConfirmation || t.candleConfirmation) return false;
      }
    }
    // 12. Confluence Score Tier
    if (criteria.confluenceScoreTier && criteria.confluenceScoreTier !== 'ALL') {
      const score = t.confluenceScore || 0;
      if (criteria.confluenceScoreTier === '7+' && score < 7) return false;
      if (criteria.confluenceScoreTier === '5-6' && (score < 5 || score > 6)) return false;
      if (criteria.confluenceScoreTier === '3-4' && (score < 3 || score > 4)) return false;
      if (criteria.confluenceScoreTier === '0-2' && score > 2) return false;
    }
    // 13. Planned R:R
    if (criteria.plannedRRMin !== undefined && criteria.plannedRRMin !== 'ALL') {
      const rr = t.plannedRR || 0;
      if (typeof criteria.plannedRRMin === 'number' && rr < criteria.plannedRRMin) return false;
    }
    // 14. Plan Followed
    if (criteria.followedPlan && criteria.followedPlan !== 'ALL') {
      if (criteria.followedPlan === 'YES' && !t.followedPlan) return false;
      if (criteria.followedPlan === 'NO' && t.followedPlan) return false;
    }
    // 15. Mistake Type
    if (criteria.mistakeType && criteria.mistakeType !== 'ALL') {
      if (criteria.mistakeType === 'NONE') {
        if (t.mistakes && t.mistakes.length > 0) return false;
      } else {
        if (!t.mistakes || !t.mistakes.includes(criteria.mistakeType)) return false;
      }
    }
    // 16. Setup Grade
    if (criteria.setupGrade && criteria.setupGrade !== 'ALL' && t.setupGrade !== criteria.setupGrade) {
      return false;
    }

    return true;
  });
}

/**
 * Calculates rolling Win Rate data across the chronological trade series
 */
export interface RollingWinRatePoint {
  index: number;
  tradeId: string;
  date: string;
  pair: string;
  result: string;
  actualR: number;
  rollingWinRate: number; // percentage
  overallWinRate: number; // constant benchmark
  windowSize: number;
}

export function calculateRollingWinRate(
  trades: TradeRecord[],
  windowSize: number = 20
): { points: RollingWinRatePoint[]; overallWinRate: number } {
  const closedTrades = trades
    .filter((t) => t.result !== 'OPEN')
    .sort((a, b) => {
      const dtA = new Date(`${a.tradeDate}T${a.tradeTime || '12:00'}`).getTime();
      const dtB = new Date(`${b.tradeDate}T${b.tradeTime || '12:00'}`).getTime();
      return dtA - dtB;
    });

  const totalWins = closedTrades.filter((t) => (t.actualR || 0) > 0.05).length;
  const overallWinRate = closedTrades.length > 0 ? Number(((totalWins / closedTrades.length) * 100).toFixed(1)) : 0;

  if (closedTrades.length === 0) {
    return { points: [], overallWinRate: 0 };
  }

  const points: RollingWinRatePoint[] = [];

  for (let i = 0; i < closedTrades.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const windowTrades = closedTrades.slice(start, i + 1);
    const windowWins = windowTrades.filter((t) => (t.actualR || 0) > 0.05).length;
    const rollingWinRate = Number(((windowWins / windowTrades.length) * 100).toFixed(1));

    const currentTrade = closedTrades[i];
    points.push({
      index: i + 1,
      tradeId: currentTrade.id,
      date: currentTrade.tradeDate,
      pair: currentTrade.pair,
      result: currentTrade.result,
      actualR: currentTrade.actualR || 0,
      rollingWinRate,
      overallWinRate,
      windowSize: windowTrades.length,
    });
  }

  return { points, overallWinRate };
}

/**
 * Calculates metrics aggregated over Time periods: Daily, Weekly, Monthly
 */
export type TimeAggregation = 'daily' | 'weekly' | 'monthly';
export type AggregationMetric = 'winRate' | 'averageR' | 'totalR' | 'expectancy';

export interface PeriodicMetricPoint {
  periodKey: string;
  label: string;
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  lossRate: number;
  breakevenRate: number;
  averageR: number;
  totalR: number;
  expectancy: number;
  value: number; // active metric value
}

export function calculatePeriodicMetrics(
  trades: TradeRecord[],
  aggregation: TimeAggregation,
  metric: AggregationMetric,
  currency: CurrencyCode = 'USD'
): PeriodicMetricPoint[] {
  const closedTrades = trades
    .filter((t) => t.result !== 'OPEN')
    .sort((a, b) => {
      const dtA = new Date(`${a.tradeDate}T${a.tradeTime || '12:00'}`).getTime();
      const dtB = new Date(`${b.tradeDate}T${b.tradeTime || '12:00'}`).getTime();
      return dtA - dtB;
    });

  if (closedTrades.length === 0) return [];

  const groups: Record<string, { label: string; trades: TradeRecord[] }> = {};

  closedTrades.forEach((t) => {
    const d = new Date(t.tradeDate + 'T12:00:00');
    let key = t.tradeDate;
    let label = t.tradeDate;

    if (aggregation === 'daily') {
      key = t.tradeDate;
      label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (aggregation === 'weekly') {
      const day = d.getDay() || 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - day + 1);
      key = monday.toISOString().slice(0, 10);
      label = `Wk of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (aggregation === 'monthly') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    if (!groups[key]) {
      groups[key] = { label, trades: [] };
    }
    groups[key].trades.push(t);
  });

  return Object.entries(groups).map(([periodKey, { label, trades: periodTrades }]) => {
    const subStats = calculatePerformanceStats(periodTrades, currency);
    let value = subStats.winRate;
    if (metric === 'averageR') value = subStats.averageR;
    else if (metric === 'totalR') value = subStats.totalR;
    else if (metric === 'expectancy') value = subStats.expectancy;

    return {
      periodKey,
      label,
      totalTrades: subStats.totalTrades,
      wins: subStats.winningTrades,
      losses: subStats.losingTrades,
      breakevens: subStats.breakevenTrades,
      winRate: subStats.winRate,
      lossRate: subStats.lossRate,
      breakevenRate: subStats.breakevenRate,
      averageR: subStats.averageR,
      totalR: subStats.totalR,
      expectancy: subStats.expectancy,
      value: Number(value.toFixed(2)),
    };
  });
}
