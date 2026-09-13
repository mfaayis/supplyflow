/**
 * SUPPLYFLOW — Trade Monitor Engine
 *
 * This is the core of the automated SL/TP detection system.
 * It runs entirely server-side, independent of the browser.
 *
 * Architecture:
 *   MarketDataProvider (ticks) → TradeMonitorEngine → Supabase DB
 *                                                    ↓
 *                                           Supabase Realtime
 *                                                    ↓
 *                                           Frontend WebSocket
 *
 * Key design decisions:
 * - All comparisons use full-precision prices (never rounded display values).
 * - Idempotency: the DB UPDATE WHERE status='ACTIVE' guard prevents double-close.
 * - Ambiguous candles: if both SL and TP would be hit, the trade is marked AMBIGUOUS.
 * - Proxy alerts: fires when price is ≥ threshold% of the way to SL or TP.
 * - Poll fallback: every MONITOR_POLL_INTERVAL_MS, re-checks active trades
 *   and fetches current price via REST in case the WS tick was missed.
 */
import {
  getActiveTrades,
  closeTrade,
  updateTradeLastPrice,
  upsertMarketPrice,
  insertTradeEvent,
  insertNotification,
  DbTrade,
} from './supabaseAdmin';
import { MarketDataProvider, TickData } from './marketData/MarketDataProvider';

const PROXIMITY_THRESHOLD = parseFloat(process.env.PROXIMITY_ALERT_THRESHOLD ?? '0.80');
const POLL_INTERVAL_MS = parseInt(process.env.MONITOR_POLL_INTERVAL_MS ?? '30000', 10);

// ─── Internal Trade State ────────────────────────────────────────────────────

interface ActiveTrade {
  id: string;
  userId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  riskDistance: number;
  rewardDistance: number;
  plannedRR: number;
  /** Tracks whether the proximity-to-TP alert has already fired */
  approachingTpAlerted: boolean;
  /** Tracks whether the proximity-to-SL alert has already fired */
  approachingSlAlerted: boolean;
  /** Raw DB data blob for merging back on close */
  rawData: Record<string, unknown>;
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export class TradeMonitorEngine {
  private provider: MarketDataProvider;
  /** In-memory map: tradeId → ActiveTrade */
  private activeTrades: Map<string, ActiveTrade> = new Map();
  /** Symbol → Set of trade IDs */
  private symbolIndex: Map<string, Set<string>> = new Map();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(provider: MarketDataProvider) {
    this.provider = provider;
    this.provider.onTick((tick) => this._onTick(tick));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    console.log('[Monitor] Starting Trade Monitor Engine...');
    await this._syncActiveTrades();

    // Poll as a safety net (handles ticks missed during downtime, new trades, etc.)
    this.pollTimer = setInterval(() => this._poll(), POLL_INTERVAL_MS);
    console.log(`[Monitor] Running. Poll interval: ${POLL_INTERVAL_MS / 1000}s`);
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ── Sync from DB ───────────────────────────────────────────────────────────

  private async _syncActiveTrades(): Promise<void> {
    const dbTrades = await getActiveTrades();

    const currentIds = new Set(this.activeTrades.keys());
    const dbIds = new Set(dbTrades.map((t) => t.id));

    // Remove trades no longer ACTIVE
    for (const id of currentIds) {
      if (!dbIds.has(id)) {
        const trade = this.activeTrades.get(id)!;
        this._removeFromSymbolIndex(id, trade.symbol);
        this.activeTrades.delete(id);
      }
    }

    // Add/update trades from DB
    for (const dbTrade of dbTrades) {
      const trade = this._parseDbTrade(dbTrade);
      if (!trade) continue;

      const existing = this.activeTrades.get(trade.id);
      if (existing) {
        // Preserve alert state across syncs
        trade.approachingTpAlerted = existing.approachingTpAlerted;
        trade.approachingSlAlerted = existing.approachingSlAlerted;
      }

      this.activeTrades.set(trade.id, trade);
      this._addToSymbolIndex(trade.id, trade.symbol);
    }

    // Update subscriptions
    const activeSymbols = new Set([...this.symbolIndex.keys()]);
    if (activeSymbols.size > 0) {
      this.provider.subscribe([...activeSymbols]);
    }

    console.log(
      `[Monitor] Synced ${dbTrades.length} active trade(s) across ${activeSymbols.size} symbol(s).`
    );
  }

  private async _poll(): Promise<void> {
    await this._syncActiveTrades();

    // For symbols without a recent tick, fetch current price via REST
    for (const symbol of this.symbolIndex.keys()) {
      const price = await this.provider.getLatestPrice(symbol);
      if (price !== null) {
        await this._onTick({ symbol, price, timestamp: new Date() });
      }
    }
  }

  // ── Tick Processing ────────────────────────────────────────────────────────

  private async _onTick(tick: TickData): Promise<void> {
    // 1. Persist latest price to DB (for frontend "last price" display)
    upsertMarketPrice(tick.symbol, tick.price, tick.bid, tick.ask).catch(() => {});

    // 2. Find all active trades on this symbol
    const tradeIds = this.symbolIndex.get(tick.symbol);
    if (!tradeIds || tradeIds.size === 0) return;

    for (const tradeId of [...tradeIds]) {
      const trade = this.activeTrades.get(tradeId);
      if (!trade) continue;

      // Update last price (non-blocking)
      updateTradeLastPrice(tradeId, tick.price, tick.timestamp.toISOString()).catch(() => {});
      insertTradeEvent(tradeId, 'PRICE_UPDATED', tick.price).catch(() => {});

      // 3. Evaluate SL/TP
      await this._evaluateTrade(trade, tick);
    }
  }

  // ── SL/TP Detection Logic ─────────────────────────────────────────────────

  private async _evaluateTrade(
    trade: ActiveTrade,
    tick: TickData
  ): Promise<void> {
    const { id, direction, entryPrice, stopLoss, takeProfit, riskDistance } = trade;
    const at = tick.timestamp.toISOString();

    let tpHit = false;
    let slHit = false;
    let evalPrice = tick.price;

    if (direction === 'BUY') {
      // BUY: exit means SELLING. Use BID price if available.
      evalPrice = tick.bid !== undefined ? tick.bid : tick.price;
      tpHit = evalPrice >= takeProfit;
      slHit = evalPrice <= stopLoss;
    } else {
      // SELL: exit means BUYING. Use ASK price if available.
      evalPrice = tick.ask !== undefined ? tick.ask : tick.price;
      tpHit = evalPrice <= takeProfit;
      slHit = evalPrice >= stopLoss;
    }

    // ── Case: Both SL and TP hit in the same tick (candle ambiguity) ──────────
    if (tpHit && slHit) {
      console.warn(`[Monitor] Trade ${id} — AMBIGUOUS: both SL and TP touched at ${evalPrice}`);
      const closed = await closeTrade({
        tradeId: id,
        status: 'AMBIGUOUS',
        exitPriceRaw: evalPrice,
        triggerPrice: evalPrice,
        triggerTimestamp: at,
        resolutionSource: 'AMBIGUOUS',
        exitReason: 'AMBIGUOUS',
        rMultiple: 0,
        closedAt: at,
        updatedData: this._buildClosedData(trade, evalPrice, 'AMBIGUOUS', 'AMBIGUOUS', 0, at, 'AMBIGUOUS'),
      });

      if (closed) {
        this._removeActiveTrade(id, trade.symbol);
        await insertTradeEvent(id, 'AMBIGUOUS_CANDLE', evalPrice,
          'Both SL and TP levels were touched in the same price update. User review required.');
        await insertNotification({
          userId: trade.userId,
          tradeId: id,
          type: 'SL_HIT',
          message: `⚠️ ${trade.symbol} — Ambiguous: both SL and TP touched at ${evalPrice}. Please review.`,
          price: evalPrice,
        });
      }
      return;
    }

    // ── Case: TP hit ──────────────────────────────────────────────────────────
    if (tpHit) {
      const rMultiple = trade.rewardDistance > 0
        ? Math.abs(takeProfit - entryPrice) / riskDistance
        : trade.plannedRR;

      console.log(`[Monitor] Trade ${id} TP DETECTED @ ${evalPrice}  (+${rMultiple.toFixed(2)}R)`);

      const closed = await closeTrade({
        tradeId: id,
        status: 'WON',
        exitPriceRaw: evalPrice,
        triggerPrice: evalPrice,
        triggerTimestamp: at,
        resolutionSource: 'AUTO_MARKET_DATA',
        exitReason: 'TP_HIT',
        rMultiple,
        closedAt: at,
        updatedData: this._buildClosedData(trade, evalPrice, 'WON', 'TP_HIT', rMultiple, at, 'AUTO_MARKET_DATA'),
      });

      if (closed) {
        this._removeActiveTrade(id, trade.symbol);
        await insertTradeEvent(id, 'TP_DETECTED', evalPrice, `+${rMultiple.toFixed(2)}R detected via market data.`);
        await insertNotification({
          userId: trade.userId,
          tradeId: id,

          type: 'TP_HIT',
          message: `✅ ${trade.symbol} TP Detected — +${rMultiple.toFixed(2)}R`,
          price: evalPrice,
          rMultiple,
        });
      }
      return;
    }

    // ── Case: SL hit ──────────────────────────────────────────────────────────
    if (slHit) {
      const rMultiple = -1.0;

      console.log(`[Monitor] Trade ${id} SL DETECTED @ ${evalPrice}  (-1R)`);

      const closed = await closeTrade({
        tradeId: id,
        status: 'LOST',
        exitPriceRaw: evalPrice,
        triggerPrice: evalPrice,
        triggerTimestamp: at,
        resolutionSource: 'AUTO_MARKET_DATA',
        exitReason: 'SL_HIT',
        rMultiple,
        closedAt: at,
        updatedData: this._buildClosedData(trade, evalPrice, 'LOST', 'SL_HIT', rMultiple, at, 'AUTO_MARKET_DATA'),
      });

      if (closed) {
        this._removeActiveTrade(id, trade.symbol);
        await insertTradeEvent(id, 'SL_DETECTED', evalPrice, `-1.00R detected via market data.`);
        await insertNotification({
          userId: trade.userId,
          tradeId: id,
          type: 'SL_HIT',
          message: `❌ ${trade.symbol} SL Detected — -1.00R`,
          price: evalPrice,
          rMultiple,
        });
      }
      return;
    }

    // ── Case: Proximity alerts (only if trade is still ACTIVE) ────────────────
    this._checkProximityAlerts(trade, evalPrice, at);
  }

  private _checkProximityAlerts(trade: ActiveTrade, price: number, at: string): void {
    const { id, direction, entryPrice, stopLoss, takeProfit } = trade;

    if (direction === 'BUY') {
      // Distance moved toward TP vs total TP distance
      const totalTpDist = takeProfit - entryPrice;
      const movedTpDist = price - entryPrice;
      if (totalTpDist > 0 && movedTpDist / totalTpDist >= PROXIMITY_THRESHOLD && !trade.approachingTpAlerted) {
        trade.approachingTpAlerted = true;
        const pct = Math.round((movedTpDist / totalTpDist) * 100);
        console.log(`[Monitor] Trade ${id} approaching TP (${pct}%)`);
        insertTradeEvent(id, 'APPROACHING_TP', price, `${pct}% to TP`).catch(() => {});
        insertNotification({
          userId: trade.userId,
          tradeId: id,
          type: 'APPROACHING_TP',
          message: `📈 ${trade.symbol} approaching TP (${pct}% of the way)`,
          price,
        }).catch(() => {});
      }

      // Distance moved toward SL vs total SL distance (BUY: price moving DOWN)
      const totalSlDist = entryPrice - stopLoss;
      const movedSlDist = entryPrice - price;
      if (totalSlDist > 0 && movedSlDist / totalSlDist >= PROXIMITY_THRESHOLD && !trade.approachingSlAlerted) {
        trade.approachingSlAlerted = true;
        const pct = Math.round((movedSlDist / totalSlDist) * 100);
        console.log(`[Monitor] Trade ${id} approaching SL (${pct}%)`);
        insertTradeEvent(id, 'APPROACHING_SL', price, `${pct}% to SL`).catch(() => {});
        insertNotification({
          userId: trade.userId,
          tradeId: id,
          type: 'APPROACHING_SL',
          message: `⚠️ ${trade.symbol} approaching SL (${pct}% of the way)`,
          price,
        }).catch(() => {});
      }
    } else {
      // SELL: price going DOWN toward TP, UP toward SL
      const totalTpDist = entryPrice - takeProfit;
      const movedTpDist = entryPrice - price;
      if (totalTpDist > 0 && movedTpDist / totalTpDist >= PROXIMITY_THRESHOLD && !trade.approachingTpAlerted) {
        trade.approachingTpAlerted = true;
        const pct = Math.round((movedTpDist / totalTpDist) * 100);
        insertTradeEvent(id, 'APPROACHING_TP', price, `${pct}% to TP`).catch(() => {});
        insertNotification({
          userId: trade.userId,
          tradeId: id,
          type: 'APPROACHING_TP',
          message: `📉 ${trade.symbol} approaching TP (${pct}% of the way)`,
          price,
        }).catch(() => {});
      }

      const totalSlDist = stopLoss - entryPrice;
      const movedSlDist = price - entryPrice;
      if (totalSlDist > 0 && movedSlDist / totalSlDist >= PROXIMITY_THRESHOLD && !trade.approachingSlAlerted) {
        trade.approachingSlAlerted = true;
        const pct = Math.round((movedSlDist / totalSlDist) * 100);
        insertTradeEvent(id, 'APPROACHING_SL', price, `${pct}% to SL`).catch(() => {});
        insertNotification({
          userId: trade.userId,
          tradeId: id,
          type: 'APPROACHING_SL',
          message: `⚠️ ${trade.symbol} approaching SL (${pct}% of the way)`,
          price,
        }).catch(() => {});
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _parseDbTrade(dbTrade: DbTrade): ActiveTrade | null {
    try {
      const data = dbTrade.data as Record<string, unknown>;

      const direction = (data.direction as string)?.toUpperCase();
      if (direction !== 'BUY' && direction !== 'SELL') return null;

      const entryPrice = parseFloat(data.entryPrice as string);
      const stopLoss = parseFloat(data.stopLoss as string);
      const takeProfit = parseFloat(data.takeProfit as string);
      const positionSize = parseFloat((data.positionSize as string) ?? '0');
      const symbol = (data.pair as string)?.toUpperCase();

      if (!symbol || isNaN(entryPrice) || isNaN(stopLoss) || isNaN(takeProfit)) {
        console.warn(`[Monitor] Trade ${dbTrade.id} has invalid price data — skipping.`);
        return null;
      }

      const riskDistance = Math.abs(entryPrice - stopLoss);
      const rewardDistance = Math.abs(takeProfit - entryPrice);
      const plannedRR = riskDistance > 0 ? rewardDistance / riskDistance : 0;

      return {
        id: dbTrade.id,
        userId: dbTrade.user_id,
        symbol,
        direction,
        entryPrice,
        stopLoss,
        takeProfit,
        positionSize,
        riskDistance,
        rewardDistance,
        plannedRR,
        approachingTpAlerted: false,
        approachingSlAlerted: false,
        rawData: data,
      };
    } catch (e) {
      console.error(`[Monitor] Failed to parse trade ${dbTrade.id}:`, e);
      return null;
    }
  }

  /**
   * Build the updated `data` JSONB blob to write back to Supabase on close.
   * Preserves all existing fields and merges the monitoring results.
   */
  private _buildClosedData(
    trade: ActiveTrade,
    exitPrice: number,
    status: string,
    exitReason: string,
    rMultiple: number,
    closedAt: string,
    resolutionSource: string
  ): Record<string, unknown> {
    // Map status → legacy result field so the existing UI still works
    const legacyResult =
      status === 'WON' ? 'TP HIT' :
      status === 'LOST' ? 'SL HIT' :
      status === 'AMBIGUOUS' ? 'MANUAL CLOSE' :
      'MANUAL CLOSE';

    return {
      ...trade.rawData,
      // New monitoring fields (merged into the data blob)
      status,
      exitReason,
      resolutionSource,
      triggerPrice: exitPrice,
      triggerTimestamp: closedAt,
      exitPriceRaw: exitPrice,
      exitPrice,             // also update legacy exitPrice field
      rMultiple,
      closedAt,
      updatedAt: closedAt,
      // Update legacy fields so existing charts/lists just work
      result: legacyResult,
      actualR: rMultiple,
    };
  }

  private _addToSymbolIndex(tradeId: string, symbol: string): void {
    if (!this.symbolIndex.has(symbol)) {
      this.symbolIndex.set(symbol, new Set());
    }
    this.symbolIndex.get(symbol)!.add(tradeId);
  }

  private _removeFromSymbolIndex(tradeId: string, symbol: string): void {
    const set = this.symbolIndex.get(symbol);
    if (set) {
      set.delete(tradeId);
      if (set.size === 0) {
        this.symbolIndex.delete(symbol);
        this.provider.unsubscribe([symbol]);
      }
    }
  }

  private _removeActiveTrade(tradeId: string, symbol: string): void {
    this.activeTrades.delete(tradeId);
    this._removeFromSymbolIndex(tradeId, symbol);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Called when a new trade becomes ACTIVE.
   * Immediately adds it to monitoring without waiting for the next poll.
   */
  addTrade(trade: {
    id: string;
    userId: string;
    symbol: string;
    direction: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    positionSize: number;
    rawData: Record<string, unknown>;
  }): void {
    const riskDistance = Math.abs(trade.entryPrice - trade.stopLoss);
    const rewardDistance = Math.abs(trade.takeProfit - trade.entryPrice);
    const plannedRR = riskDistance > 0 ? rewardDistance / riskDistance : 0;

    const activeTrade: ActiveTrade = {
      ...trade,
      riskDistance,
      rewardDistance,
      plannedRR,
      approachingTpAlerted: false,
      approachingSlAlerted: false,
    };

    this.activeTrades.set(trade.id, activeTrade);
    this._addToSymbolIndex(trade.id, trade.symbol);
    this.provider.subscribe([trade.symbol]);

    console.log(`[Monitor] Now monitoring trade ${trade.id} (${trade.symbol} ${trade.direction})`);
  }


  /** Current number of monitored trades */
  get activeCount(): number {
    return this.activeTrades.size;
  }

  /** Current symbols being monitored */
  get monitoredSymbols(): string[] {
    return [...this.symbolIndex.keys()];
  }

  /**
   * Feed an externally-sourced price tick (e.g. TradingView webhook) into
   * the monitoring engine. Uses the same processing path as WebSocket ticks.
   */
  addManualTick(symbol: string, price: number, timestamp: Date = new Date()): void {
    this._onTick({ symbol: symbol.toUpperCase(), price, timestamp }).catch((e) => {
      console.error('[Monitor] addManualTick error:', e);
    });
  }
}
