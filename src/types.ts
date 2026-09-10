/**
 * SUPPLYFLOW — Multi-Timeframe Supply & Demand Trading Journal
 * Core Data Models & Type Definitions
 */

export type Timeframe = 'Weekly' | 'Daily' | '4H' | '1H' | '15M' | '5M' | '1M';

export type MarketBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'UNCLEAR';

export type ZoneType = 'SUPPLY' | 'DEMAND' | 'NONE';

export type ZoneQuality = 'FRESH' | 'TESTED ONCE' | 'TESTED MULTIPLE TIMES' | 'WEAK / UNCLEAR';

export type TradeDirection = 'BUY' | 'SELL';

export type TradingSession = 'NEW YORK' | 'LONDON' | 'ASIA' | 'OTHER';
export type SessionType = TradingSession;
export type PairSymbol = string;

export type TradeSource = 'PERSONAL' | 'LIVESTREAM';

export type TradeResult = 'TP HIT' | 'SL HIT' | 'BREAKEVEN' | 'MANUAL CLOSE' | 'OPEN';

export type SetupRating = 'A+' | 'A' | 'B' | 'C';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD' | 'JPY';

export type MistakeType =
  | 'FOMO'
  | 'Late Entry'
  | 'Revenge Trade'
  | 'Moved SL'
  | 'Closed Early'
  | 'Overtraded'
  | 'Ignored HTF'
  | 'Ignored Zone Rules'
  | 'Traded Outside Session'
  | 'Entered Without Confirmation'
  | 'Other';

export interface TimeframeAnalysis {
  bias: MarketBias;
  zone: ZoneType;
  quality?: ZoneQuality;
}

export interface TradeRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  tradeDate: string; // YYYY-MM-DD
  tradeTime: string; // HH:mm

  // Step 1: Basic Trade
  pair: string;
  direction: TradeDirection;
  session: TradingSession;
  source: TradeSource;

  // Step 2 & 3: Multi-timeframe analysis
  htfBias: MarketBias; // Overall higher timeframe bias
  timeframeData: Record<Timeframe, TimeframeAnalysis>;
  zoneQuality: ZoneQuality;

  // Step 4: Liquidity / Reference Levels
  previousDayHOD: boolean;
  previousDayLOD: boolean;
  twoDayHOD: boolean;
  twoDayLOD: boolean;
  reactingAroundKeyLevel: boolean;

  // Step 5: Market Structure & Confirmation
  structureConfirmation: boolean;
  bos: boolean; // Break of Structure
  choch: boolean; // Change of Character
  priceActionConfirmation: boolean;
  candleConfirmation: boolean;
  otherConfirmation?: string;
  setupNotes?: string;

  // Step 6: Entry & Risk
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice?: number;
  riskDistance: number;
  rewardDistance: number;
  plannedRR: number; // Planned R:R e.g., 2.0 (1:2.0)
  meetsStandardRR: boolean; // >= 2.0

  // Position sizing & currency
  accountSize?: number;
  riskPercent?: number; // e.g., 1.0%
  positionSize?: number;
  currency: CurrencyCode;

  // Step 7: Screenshots
  beforeScreenshot?: string;
  afterScreenshot?: string;

  // Step 8: Execution & Discipline
  followedPlan: boolean;
  mistakes: MistakeType[];
  lesson?: string;

  // Step 9: Result & Output
  result: TradeResult;
  actualR: number; // e.g., +2.0, -1.0, 0.0
  pnl?: number; // Calculated or manual currency profit/loss

  // Classification & Computed Confluences
  setupGrade: SetupRating;
  confluenceScore: number; // Computed factor count (0-10)

  // Demo data marker
  isDemo?: boolean;
}

export interface UserSettings {
  userName: string;
  accountCurrency: CurrencyCode;
  accountBalance: number;
  defaultRiskPercent: number;
  riskPercentage?: number;
  defaultPair: string;
  defaultSession: TradingSession;
  defaultRRTarget: number; // Default 2.0 (1:2)
  defaultTargetRR?: number;
  customPairs: string[];
  theme: 'dark';
}

export interface ConfluenceBreakdown {
  score: number;
  factors: string[];
  isHighProbability: boolean;
}

export interface PerformanceStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number; // percentage (0-100)
  lossRate: number; // percentage (0-100)
  breakevenRate: number; // percentage (0-100)
  totalR: number;
  averageR: number;
  profitFactor: number;
  expectancy: number; // Expected R per trade
  maxDrawdownR: number;
  averageWinnerR: number;
  averageLoserR: number;
  rulesFollowedPercent: number;
  totalPnl: number;
  currency: CurrencyCode;
}

export type SampleSizeLevel = 'none' | 'very-small' | 'early' | 'developing' | 'useful' | 'strong';

export interface SampleSizeInfo {
  count: number;
  label: string;
  description: string;
  level: SampleSizeLevel;
  badgeClass: string;
  isMeaningful: boolean;
  reliabilityBadge: string;
  reliabilityColor: string;
  message: string;
}

export interface TradeFilterCriteria {
  pair?: string;
  direction?: TradeDirection | 'ALL';
  session?: TradingSession | 'ALL';
  source?: TradeSource | 'ALL';
  dateRangePreset?: 'ALL' | 'TODAY' | 'LAST_7D' | 'LAST_30D' | 'LAST_90D' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
  zoneType?: ZoneType | 'ALL';
  zoneQuality?: ZoneQuality | 'ALL';
  weeklyBias?: MarketBias | 'ALL';
  dailyBias?: MarketBias | 'ALL';
  h4Bias?: MarketBias | 'ALL';
  h1Bias?: MarketBias | 'ALL';
  m15Bias?: MarketBias | 'ALL';
  m5Bias?: MarketBias | 'ALL';
  m1Bias?: MarketBias | 'ALL';
  alignedTimeframes?: number | 'ALL'; // 7, 6, 5, 4, 3
  hodLodConfluence?: 'ANY' | 'HOD' | 'LOD' | 'TWO_DAY_HOD' | 'TWO_DAY_LOD' | 'KEY_LEVEL' | 'NONE';
  confirmationType?: 'ANY' | 'BOS' | 'CHOCH' | 'STRUCTURE' | 'PRICE_ACTION' | 'CANDLE' | 'NONE';
  confluenceScoreTier?: 'ALL' | '7+' | '5-6' | '3-4' | '0-2';
  plannedRRMin?: number | 'ALL'; // e.g. 2.0
  followedPlan?: 'ALL' | 'YES' | 'NO';
  mistakeType?: MistakeType | 'NONE' | 'ALL';
  setupGrade?: SetupRating | 'ALL';
}
