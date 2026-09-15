// server/index.ts
import express from "express";
import cors from "cors";
import * as dotenv2 from "dotenv";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// server/marketData/TwelveDataProvider.ts
import WebSocket from "ws";
var WS_URL = "wss://ws.twelvedata.com/v1/quotes/price";
function toTwelveDataSymbol(symbol) {
  if (symbol.includes("/")) return symbol;
  if (symbol.length === 6) {
    return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  }
  if (symbol === "XAUUSD") return "XAU/USD";
  if (symbol === "XAGUSD") return "XAG/USD";
  const cryptoMap = {
    BTCUSD: "BTC/USD",
    ETHUSD: "ETH/USD",
    BNBUSD: "BNB/USD",
    SOLUSD: "SOL/USD",
    XRPUSD: "XRP/USD"
  };
  if (cryptoMap[symbol]) return cryptoMap[symbol];
  const indexMap = {
    US30: "DIA",
    // Dow Jones ETF on TD (note: may not be realtime free)
    NAS100: "QQQ",
    // Nasdaq ETF
    SPX500: "SPY"
    // S&P 500 ETF
  };
  if (indexMap[symbol]) return indexMap[symbol];
  return symbol;
}
function fromTwelveDataSymbol(tdSymbol) {
  return tdSymbol.replace("/", "");
}
var TwelveDataProvider = class {
  constructor(apiKey) {
    this.ws = null;
    this.handlers = [];
    this.subscribedSymbols = /* @__PURE__ */ new Set();
    this.connected = false;
    this.reconnectTimer = null;
    this.reconnectDelay = 5e3;
    // ms, doubles on each failure (max 60s)
    this.maxReconnectDelay = 6e4;
    this.heartbeatTimer = null;
    this.intentionalClose = false;
    this.apiKey = apiKey;
  }
  async connect() {
    if (this.ws && this.connected) return;
    this.intentionalClose = false;
    return this._openSocket();
  }
  _openSocket() {
    return new Promise((resolve, reject) => {
      console.log("[TwelveData] Connecting to WebSocket...");
      const isDev = process.env.NODE_ENV !== "production";
      const allowInsecureTls = process.env.IGNORE_TLS_ERRORS === "true";
      const wsOptions = isDev && allowInsecureTls ? { rejectUnauthorized: false } : void 0;
      this.ws = new WebSocket(`${WS_URL}?apikey=${this.apiKey}`, wsOptions);
      const timeout = setTimeout(() => {
        reject(new Error("[TwelveData] Connection timeout"));
        this.ws?.terminate();
      }, 15e3);
      this.ws.on("open", () => {
        clearTimeout(timeout);
        console.log("[TwelveData] WebSocket connected.");
        this.connected = true;
        this.reconnectDelay = 5e3;
        if (this.subscribedSymbols.size > 0) {
          this._sendSubscribe([...this.subscribedSymbols]);
        }
        this._startHeartbeat();
        resolve();
      });
      this.ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          this._handleMessage(msg);
        } catch {
        }
      });
      this.ws.on("error", (err) => {
        console.error("[TwelveData] WebSocket error:", err.message);
        clearTimeout(timeout);
        if (!this.connected) reject(err);
      });
      this.ws.on("close", (code, reason) => {
        clearTimeout(timeout);
        this._stopHeartbeat();
        this.connected = false;
        console.warn(`[TwelveData] WebSocket closed (${code}: ${reason})`);
        if (!this.intentionalClose) {
          this._scheduleReconnect();
        }
      });
    });
  }
  _handleMessage(msg) {
    if (msg.event === "price") {
      const tdSymbol = msg.symbol || "";
      const price = parseFloat(msg.price);
      if (!tdSymbol || isNaN(price)) return;
      const symbol = fromTwelveDataSymbol(tdSymbol);
      const tick = {
        symbol,
        price,
        bid: msg.bid ? parseFloat(msg.bid) : void 0,
        ask: msg.ask ? parseFloat(msg.ask) : void 0,
        timestamp: /* @__PURE__ */ new Date()
      };
      for (const handler of this.handlers) {
        try {
          handler(tick);
        } catch (e) {
          console.error("[TwelveData] Handler error:", e);
        }
      }
    }
    if (msg.event === "subscribe-status") {
      console.log("[TwelveData] Subscribe status:", JSON.stringify(msg));
    }
  }
  subscribe(symbols) {
    const newSymbols = symbols.filter((s) => !this.subscribedSymbols.has(s));
    if (newSymbols.length === 0) return;
    newSymbols.forEach((s) => this.subscribedSymbols.add(s));
    if (this.connected) {
      this._sendSubscribe(newSymbols);
    }
  }
  unsubscribe(symbols) {
    symbols.forEach((s) => this.subscribedSymbols.delete(s));
    if (this.connected && this.ws) {
      const payload = {
        action: "unsubscribe",
        params: {
          symbols: symbols.map(toTwelveDataSymbol).join(",")
        }
      };
      this.ws.send(JSON.stringify(payload));
    }
  }
  _sendSubscribe(symbols) {
    if (!this.ws || !this.connected) return;
    const payload = {
      action: "subscribe",
      params: {
        symbols: symbols.map(toTwelveDataSymbol).join(",")
      }
    };
    this.ws.send(JSON.stringify(payload));
    console.log(`[TwelveData] Subscribed to: ${symbols.join(", ")}`);
  }
  onTick(handler) {
    this.handlers.push(handler);
  }
  async getLatestPrice(symbol) {
    const tdSymbol = toTwelveDataSymbol(symbol);
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(tdSymbol)}&apikey=${this.apiKey}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[TwelveData] REST price fetch failed for ${symbol}: HTTP ${res.status}`);
        return null;
      }
      const json = await res.json();
      const price = parseFloat(json.price);
      return isNaN(price) ? null : price;
    } catch (e) {
      console.error(`[TwelveData] REST price fetch error for ${symbol}:`, e);
      return null;
    }
  }
  isConnected() {
    return this.connected;
  }
  async disconnect() {
    this.intentionalClose = true;
    this._stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1e3, "Server shutting down");
      this.ws = null;
    }
    this.connected = false;
  }
  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    console.log(`[TwelveData] Reconnecting in ${this.reconnectDelay / 1e3}s...`);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this._openSocket();
      } catch {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      }
    }, this.reconnectDelay);
  }
  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.connected) {
        this.ws.ping();
      }
    }, 1e4);
  }
  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
};

// server/marketData/TradingViewWebhookHandler.ts
var TradingViewWebhookHandler = class {
  constructor(secret) {
    this.tickHandlers = [];
    /**
     * Express route handler for POST /api/webhooks/tradingview
     * Validates, parses, and dispatches the tick.
     */
    this.handle = (req, res) => {
      try {
        const body = req.body;
        if (!body.secret || !this._safeCompare(body.secret, this.expectedSecret)) {
          console.warn("[TradingViewWebhook] Rejected request \u2014 invalid secret.");
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
        if (!body.symbol || body.price === void 0 || body.price === null) {
          res.status(400).json({ error: "Missing symbol or price" });
          return;
        }
        const price = typeof body.price === "string" ? parseFloat(body.price) : body.price;
        if (isNaN(price) || price <= 0) {
          res.status(400).json({ error: "Invalid price value" });
          return;
        }
        const symbol = body.symbol.toUpperCase().replace("/", "");
        const tick = {
          symbol,
          price,
          timestamp: body.timestamp ? new Date(body.timestamp) : /* @__PURE__ */ new Date()
        };
        console.log(`[TradingViewWebhook] Received tick: ${symbol} @ ${price}`);
        for (const handler of this.tickHandlers) {
          try {
            handler(tick);
          } catch (e) {
            console.error("[TradingViewWebhook] Handler error:", e);
          }
        }
        res.json({ ok: true, symbol, price });
      } catch (err) {
        console.error("[TradingViewWebhook] Unexpected error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    };
    if (!secret) {
      throw new Error("[TradingViewWebhook] WEBHOOK_SECRET is not set.");
    }
    this.expectedSecret = secret;
  }
  /** Register a handler that receives validated webhook ticks */
  onTick(handler) {
    this.tickHandlers.push(handler);
  }
  /**
   * Constant-time string comparison (prevents timing attacks).
   */
  _safeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
};

// server/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });
var supabaseUrl = process.env.SUPABASE_URL;
var serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "[supabaseAdmin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env"
  );
}
var supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
async function getActiveTrades() {
  const { data, error } = await supabaseAdmin.from("trades").select("*").eq("status", "ACTIVE");
  if (error) {
    console.error("[supabaseAdmin] getActiveTrades error:", error.message);
    return [];
  }
  return data ?? [];
}
async function closeTrade(params) {
  const { tradeId, status, exitPriceRaw, triggerPrice, triggerTimestamp, resolutionSource, exitReason, rMultiple, closedAt, updatedData } = params;
  const { data, error } = await supabaseAdmin.from("trades").update({
    status,
    exit_price_raw: exitPriceRaw,
    trigger_price: triggerPrice,
    trigger_timestamp: triggerTimestamp,
    resolution_source: resolutionSource,
    exit_reason: exitReason,
    r_multiple: rMultiple,
    closed_at: closedAt,
    data: updatedData,
    updated_at: closedAt
  }).eq("id", tradeId).eq("status", "ACTIVE").select("id");
  if (error) {
    console.error(`[supabaseAdmin] closeTrade(${tradeId}) error:`, error.message);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}
async function updateTradeLastPrice(tradeId, price, at) {
  const { error } = await supabaseAdmin.from("trades").update({ last_price: price, last_price_at: at }).eq("id", tradeId).eq("status", "ACTIVE");
  if (error) {
    console.error(`[supabaseAdmin] updateTradeLastPrice(${tradeId}) error:`, error.message);
  }
}
async function upsertMarketPrice(symbol, price, bid, ask, source = "twelvedata") {
  const { error } = await supabaseAdmin.from("market_prices").upsert(
    { symbol, price, bid, ask, source, updated_at: (/* @__PURE__ */ new Date()).toISOString() },
    { onConflict: "symbol" }
  );
  if (error) {
    console.error(`[supabaseAdmin] upsertMarketPrice(${symbol}) error:`, error.message);
  }
}
async function insertTradeEvent(tradeId, eventType, price, note) {
  const { error } = await supabaseAdmin.from("trade_events").insert({
    trade_id: tradeId,
    event_type: eventType,
    price,
    note,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (error) {
    console.error(`[supabaseAdmin] insertTradeEvent(${tradeId}, ${eventType}) error:`, error.message);
  }
}
async function insertNotification(params) {
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: params.userId,
    trade_id: params.tradeId,
    type: params.type,
    message: params.message,
    price: params.price,
    r_multiple: params.rMultiple,
    read: false,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (error) {
    console.error("[supabaseAdmin] insertNotification error:", error.message);
  }
}

// server/TradeMonitorEngine.ts
var PROXIMITY_THRESHOLD = parseFloat(process.env.PROXIMITY_ALERT_THRESHOLD ?? "0.80");
var POLL_INTERVAL_MS = parseInt(process.env.MONITOR_POLL_INTERVAL_MS ?? "30000", 10);
var TradeMonitorEngine = class {
  constructor(provider2) {
    /** In-memory map: tradeId → ActiveTrade */
    this.activeTrades = /* @__PURE__ */ new Map();
    /** Symbol → Set of trade IDs */
    this.symbolIndex = /* @__PURE__ */ new Map();
    this.pollTimer = null;
    this.running = false;
    this.provider = provider2;
    this.provider.onTick((tick) => this._onTick(tick));
  }
  // ── Lifecycle ──────────────────────────────────────────────────────────────
  async start() {
    if (this.running) return;
    this.running = true;
    console.log("[Monitor] Starting Trade Monitor Engine...");
    await this._syncActiveTrades();
    this.pollTimer = setInterval(() => this._poll(), POLL_INTERVAL_MS);
    console.log(`[Monitor] Running. Poll interval: ${POLL_INTERVAL_MS / 1e3}s`);
  }
  stop() {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
  // ── Sync from DB ───────────────────────────────────────────────────────────
  async _syncActiveTrades() {
    const dbTrades = await getActiveTrades();
    const currentIds = new Set(this.activeTrades.keys());
    const dbIds = new Set(dbTrades.map((t) => t.id));
    for (const id of currentIds) {
      if (!dbIds.has(id)) {
        const trade = this.activeTrades.get(id);
        this._removeFromSymbolIndex(id, trade.symbol);
        this.activeTrades.delete(id);
      }
    }
    for (const dbTrade of dbTrades) {
      const trade = this._parseDbTrade(dbTrade);
      if (!trade) continue;
      const existing = this.activeTrades.get(trade.id);
      if (existing) {
        trade.approachingTpAlerted = existing.approachingTpAlerted;
        trade.approachingSlAlerted = existing.approachingSlAlerted;
      }
      this.activeTrades.set(trade.id, trade);
      this._addToSymbolIndex(trade.id, trade.symbol);
    }
    const activeSymbols = /* @__PURE__ */ new Set([...this.symbolIndex.keys()]);
    if (activeSymbols.size > 0) {
      this.provider.subscribe([...activeSymbols]);
    }
    console.log(
      `[Monitor] Synced ${dbTrades.length} active trade(s) across ${activeSymbols.size} symbol(s).`
    );
  }
  async _poll() {
    await this._syncActiveTrades();
    for (const symbol of this.symbolIndex.keys()) {
      const price = await this.provider.getLatestPrice(symbol);
      if (price !== null) {
        await this._onTick({ symbol, price, timestamp: /* @__PURE__ */ new Date() });
      }
    }
  }
  // ── Tick Processing ────────────────────────────────────────────────────────
  async _onTick(tick) {
    upsertMarketPrice(tick.symbol, tick.price, tick.bid, tick.ask).catch(() => {
    });
    const tradeIds = this.symbolIndex.get(tick.symbol);
    if (!tradeIds || tradeIds.size === 0) return;
    for (const tradeId of [...tradeIds]) {
      const trade = this.activeTrades.get(tradeId);
      if (!trade) continue;
      updateTradeLastPrice(tradeId, tick.price, tick.timestamp.toISOString()).catch(() => {
      });
      insertTradeEvent(tradeId, "PRICE_UPDATED", tick.price).catch(() => {
      });
      await this._evaluateTrade(trade, tick);
    }
  }
  // ── SL/TP Detection Logic ─────────────────────────────────────────────────
  async _evaluateTrade(trade, tick) {
    const { id, direction, entryPrice, stopLoss, takeProfit, riskDistance } = trade;
    const at = tick.timestamp.toISOString();
    let tpHit = false;
    let slHit = false;
    let evalPrice = tick.price;
    if (direction === "BUY") {
      evalPrice = tick.bid !== void 0 ? tick.bid : tick.price;
      tpHit = evalPrice >= takeProfit;
      slHit = evalPrice <= stopLoss;
    } else {
      evalPrice = tick.ask !== void 0 ? tick.ask : tick.price;
      tpHit = evalPrice <= takeProfit;
      slHit = evalPrice >= stopLoss;
    }
    if (tpHit && slHit) {
      console.warn(`[Monitor] Trade ${id} \u2014 AMBIGUOUS: both SL and TP touched at ${evalPrice}`);
      const closed = await closeTrade({
        tradeId: id,
        status: "AMBIGUOUS",
        exitPriceRaw: evalPrice,
        triggerPrice: evalPrice,
        triggerTimestamp: at,
        resolutionSource: "AMBIGUOUS",
        exitReason: "AMBIGUOUS",
        rMultiple: 0,
        closedAt: at,
        updatedData: this._buildClosedData(trade, evalPrice, "AMBIGUOUS", "AMBIGUOUS", 0, at, "AMBIGUOUS")
      });
      if (closed) {
        this._removeActiveTrade(id, trade.symbol);
        await insertTradeEvent(
          id,
          "AMBIGUOUS_CANDLE",
          evalPrice,
          "Both SL and TP levels were touched in the same price update. User review required."
        );
        await insertNotification({
          userId: trade.userId,
          tradeId: id,
          type: "SL_HIT",
          message: `\u26A0\uFE0F ${trade.symbol} \u2014 Ambiguous: both SL and TP touched at ${evalPrice}. Please review.`,
          price: evalPrice
        });
      }
      return;
    }
    if (tpHit) {
      const rMultiple = trade.rewardDistance > 0 ? Math.abs(takeProfit - entryPrice) / riskDistance : trade.plannedRR;
      console.log(`[Monitor] Trade ${id} TP DETECTED @ ${evalPrice}  (+${rMultiple.toFixed(2)}R)`);
      const closed = await closeTrade({
        tradeId: id,
        status: "WON",
        exitPriceRaw: evalPrice,
        triggerPrice: evalPrice,
        triggerTimestamp: at,
        resolutionSource: "AUTO_MARKET_DATA",
        exitReason: "TP_HIT",
        rMultiple,
        closedAt: at,
        updatedData: this._buildClosedData(trade, evalPrice, "WON", "TP_HIT", rMultiple, at, "AUTO_MARKET_DATA")
      });
      if (closed) {
        this._removeActiveTrade(id, trade.symbol);
        await insertTradeEvent(id, "TP_DETECTED", evalPrice, `+${rMultiple.toFixed(2)}R detected via market data.`);
        await insertNotification({
          userId: trade.userId,
          tradeId: id,
          type: "TP_HIT",
          message: `\u2705 ${trade.symbol} TP Detected \u2014 +${rMultiple.toFixed(2)}R`,
          price: evalPrice,
          rMultiple
        });
      }
      return;
    }
    if (slHit) {
      const rMultiple = -1;
      console.log(`[Monitor] Trade ${id} SL DETECTED @ ${evalPrice}  (-1R)`);
      const closed = await closeTrade({
        tradeId: id,
        status: "LOST",
        exitPriceRaw: evalPrice,
        triggerPrice: evalPrice,
        triggerTimestamp: at,
        resolutionSource: "AUTO_MARKET_DATA",
        exitReason: "SL_HIT",
        rMultiple,
        closedAt: at,
        updatedData: this._buildClosedData(trade, evalPrice, "LOST", "SL_HIT", rMultiple, at, "AUTO_MARKET_DATA")
      });
      if (closed) {
        this._removeActiveTrade(id, trade.symbol);
        await insertTradeEvent(id, "SL_DETECTED", evalPrice, `-1.00R detected via market data.`);
        await insertNotification({
          userId: trade.userId,
          tradeId: id,
          type: "SL_HIT",
          message: `\u274C ${trade.symbol} SL Detected \u2014 -1.00R`,
          price: evalPrice,
          rMultiple
        });
      }
      return;
    }
    this._checkProximityAlerts(trade, evalPrice, at);
  }
  _checkProximityAlerts(trade, price, at) {
    const { id, direction, entryPrice, stopLoss, takeProfit } = trade;
    if (direction === "BUY") {
      const totalTpDist = takeProfit - entryPrice;
      const movedTpDist = price - entryPrice;
      if (totalTpDist > 0 && movedTpDist / totalTpDist >= PROXIMITY_THRESHOLD && !trade.approachingTpAlerted) {
        trade.approachingTpAlerted = true;
        const pct = Math.round(movedTpDist / totalTpDist * 100);
        console.log(`[Monitor] Trade ${id} approaching TP (${pct}%)`);
        insertTradeEvent(id, "APPROACHING_TP", price, `${pct}% to TP`).catch(() => {
        });
        insertNotification({
          userId: trade.userId,
          tradeId: id,
          type: "APPROACHING_TP",
          message: `\u{1F4C8} ${trade.symbol} approaching TP (${pct}% of the way)`,
          price
        }).catch(() => {
        });
      }
      const totalSlDist = entryPrice - stopLoss;
      const movedSlDist = entryPrice - price;
      if (totalSlDist > 0 && movedSlDist / totalSlDist >= PROXIMITY_THRESHOLD && !trade.approachingSlAlerted) {
        trade.approachingSlAlerted = true;
        const pct = Math.round(movedSlDist / totalSlDist * 100);
        console.log(`[Monitor] Trade ${id} approaching SL (${pct}%)`);
        insertTradeEvent(id, "APPROACHING_SL", price, `${pct}% to SL`).catch(() => {
        });
        insertNotification({
          userId: trade.userId,
          tradeId: id,
          type: "APPROACHING_SL",
          message: `\u26A0\uFE0F ${trade.symbol} approaching SL (${pct}% of the way)`,
          price
        }).catch(() => {
        });
      }
    } else {
      const totalTpDist = entryPrice - takeProfit;
      const movedTpDist = entryPrice - price;
      if (totalTpDist > 0 && movedTpDist / totalTpDist >= PROXIMITY_THRESHOLD && !trade.approachingTpAlerted) {
        trade.approachingTpAlerted = true;
        const pct = Math.round(movedTpDist / totalTpDist * 100);
        insertTradeEvent(id, "APPROACHING_TP", price, `${pct}% to TP`).catch(() => {
        });
        insertNotification({
          userId: trade.userId,
          tradeId: id,
          type: "APPROACHING_TP",
          message: `\u{1F4C9} ${trade.symbol} approaching TP (${pct}% of the way)`,
          price
        }).catch(() => {
        });
      }
      const totalSlDist = stopLoss - entryPrice;
      const movedSlDist = price - entryPrice;
      if (totalSlDist > 0 && movedSlDist / totalSlDist >= PROXIMITY_THRESHOLD && !trade.approachingSlAlerted) {
        trade.approachingSlAlerted = true;
        const pct = Math.round(movedSlDist / totalSlDist * 100);
        insertTradeEvent(id, "APPROACHING_SL", price, `${pct}% to SL`).catch(() => {
        });
        insertNotification({
          userId: trade.userId,
          tradeId: id,
          type: "APPROACHING_SL",
          message: `\u26A0\uFE0F ${trade.symbol} approaching SL (${pct}% of the way)`,
          price
        }).catch(() => {
        });
      }
    }
  }
  // ── Helpers ────────────────────────────────────────────────────────────────
  _parseDbTrade(dbTrade) {
    try {
      const data = dbTrade.data;
      const direction = data.direction?.toUpperCase();
      if (direction !== "BUY" && direction !== "SELL") return null;
      const entryPrice = parseFloat(data.entryPrice);
      const stopLoss = parseFloat(data.stopLoss);
      const takeProfit = parseFloat(data.takeProfit);
      const positionSize = parseFloat(data.positionSize ?? "0");
      const symbol = data.pair?.toUpperCase();
      if (!symbol || isNaN(entryPrice) || isNaN(stopLoss) || isNaN(takeProfit)) {
        console.warn(`[Monitor] Trade ${dbTrade.id} has invalid price data \u2014 skipping.`);
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
        rawData: data
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
  _buildClosedData(trade, exitPrice, status, exitReason, rMultiple, closedAt, resolutionSource) {
    const legacyResult = status === "WON" ? "TP HIT" : status === "LOST" ? "SL HIT" : status === "AMBIGUOUS" ? "MANUAL CLOSE" : "MANUAL CLOSE";
    return {
      ...trade.rawData,
      // New monitoring fields (merged into the data blob)
      status,
      exitReason,
      resolutionSource,
      triggerPrice: exitPrice,
      triggerTimestamp: closedAt,
      exitPriceRaw: exitPrice,
      exitPrice,
      // also update legacy exitPrice field
      rMultiple,
      closedAt,
      updatedAt: closedAt,
      // Update legacy fields so existing charts/lists just work
      result: legacyResult,
      actualR: rMultiple
    };
  }
  _addToSymbolIndex(tradeId, symbol) {
    if (!this.symbolIndex.has(symbol)) {
      this.symbolIndex.set(symbol, /* @__PURE__ */ new Set());
    }
    this.symbolIndex.get(symbol).add(tradeId);
  }
  _removeFromSymbolIndex(tradeId, symbol) {
    const set = this.symbolIndex.get(symbol);
    if (set) {
      set.delete(tradeId);
      if (set.size === 0) {
        this.symbolIndex.delete(symbol);
        this.provider.unsubscribe([symbol]);
      }
    }
  }
  _removeActiveTrade(tradeId, symbol) {
    this.activeTrades.delete(tradeId);
    this._removeFromSymbolIndex(tradeId, symbol);
  }
  // ── Public API ─────────────────────────────────────────────────────────────
  /**
   * Called when a new trade becomes ACTIVE.
   * Immediately adds it to monitoring without waiting for the next poll.
   */
  addTrade(trade) {
    const riskDistance = Math.abs(trade.entryPrice - trade.stopLoss);
    const rewardDistance = Math.abs(trade.takeProfit - trade.entryPrice);
    const plannedRR = riskDistance > 0 ? rewardDistance / riskDistance : 0;
    const activeTrade = {
      ...trade,
      riskDistance,
      rewardDistance,
      plannedRR,
      approachingTpAlerted: false,
      approachingSlAlerted: false
    };
    this.activeTrades.set(trade.id, activeTrade);
    this._addToSymbolIndex(trade.id, trade.symbol);
    this.provider.subscribe([trade.symbol]);
    console.log(`[Monitor] Now monitoring trade ${trade.id} (${trade.symbol} ${trade.direction})`);
  }
  /** Current number of monitored trades */
  get activeCount() {
    return this.activeTrades.size;
  }
  /** Current symbols being monitored */
  get monitoredSymbols() {
    return [...this.symbolIndex.keys()];
  }
  /**
   * Feed an externally-sourced price tick (e.g. TradingView webhook) into
   * the monitoring engine. Uses the same processing path as WebSocket ticks.
   */
  addManualTick(symbol, price, timestamp = /* @__PURE__ */ new Date()) {
    this._onTick({ symbol: symbol.toUpperCase(), price, timestamp }).catch((e) => {
      console.error("[Monitor] addManualTick error:", e);
    });
  }
};

// server/index.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
dotenv2.config({ path: path2.resolve(__dirname2, ".env") });
var PORT = parseInt(process.env.PORT ?? "3001", 10);
var API_KEY = process.env.MARKET_DATA_API_KEY ?? "";
var WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";
if (!API_KEY) {
  console.error("\u274C  MARKET_DATA_API_KEY is not set in server/.env");
  process.exit(1);
}
var provider = new TwelveDataProvider(API_KEY);
var engine = new TradeMonitorEngine(provider);
var webhookHandler = WEBHOOK_SECRET ? new TradingViewWebhookHandler(WEBHOOK_SECRET) : null;
if (webhookHandler) {
  webhookHandler.onTick((tick) => {
    engine.addManualTick(tick.symbol, tick.price, tick.timestamp);
  });
}
var app = express();
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? [/\.supplyflow\.app$/, /\.vercel\.app$/] : "*",
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.get(["/api/status", "/health"], (_req, res) => {
  res.json({
    status: "ok",
    marketData: provider.isConnected() ? "connected" : "disconnected",
    activeTrades: engine.activeCount,
    monitoredSymbols: engine.monitoredSymbols,
    uptime: Math.floor(process.uptime()),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/prices/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const price = await provider.getLatestPrice(symbol);
  if (price === null) {
    res.status(404).json({ error: `No price available for ${symbol}` });
    return;
  }
  res.json({ symbol, price, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.post("/api/trades/activate", async (req, res) => {
  const { tradeId, userId, symbol, direction, entryPrice, stopLoss, takeProfit, positionSize, data } = req.body;
  if (!tradeId || !symbol || !direction || !entryPrice || !stopLoss || !takeProfit) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (direction !== "BUY" && direction !== "SELL") {
    res.status(400).json({ error: "direction must be BUY or SELL" });
    return;
  }
  engine.addTrade({
    id: tradeId,
    userId,
    symbol: symbol.toUpperCase(),
    direction,
    entryPrice: parseFloat(entryPrice),
    stopLoss: parseFloat(stopLoss),
    takeProfit: parseFloat(takeProfit),
    positionSize: parseFloat(positionSize ?? "0"),
    rawData: data ?? {}
  });
  await insertTradeEvent(tradeId, "MONITORING_STARTED", void 0, "Trade added to monitor engine");
  res.json({ ok: true, tradeId, monitoredSymbols: engine.monitoredSymbols });
});
if (webhookHandler) {
  app.post("/api/webhooks/tradingview", webhookHandler.handle);
} else {
  app.post("/api/webhooks/tradingview", (_req, res) => {
    res.status(503).json({ error: "WEBHOOK_SECRET not configured" });
  });
}
async function main() {
  try {
    await provider.connect();
    await engine.start();
    app.listen(PORT, () => {
      console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551   SUPPLYFLOW Trade Monitor Server             \u2551
\u2551   Listening on http://localhost:${PORT}         \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  Market Data:    Twelve Data WebSocket  ${provider.isConnected() ? "\u{1F7E2} CONNECTED" : "\u{1F534} DISCONNECTED"}
  Active Trades:  ${engine.activeCount}
  Symbols:        ${engine.monitoredSymbols.join(", ") || "none"}
  Webhook:        ${webhookHandler ? `\u{1F7E2} /api/webhooks/tradingview` : "\u26AA disabled (no WEBHOOK_SECRET)"}

  Press Ctrl+C to stop.
`);
    });
  } catch (err) {
    console.error("Fatal error starting server:", err);
    process.exit(1);
  }
}
process.on("SIGINT", async () => {
  console.log("\n[Server] Shutting down gracefully...");
  engine.stop();
  await provider.disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  engine.stop();
  await provider.disconnect();
  process.exit(0);
});
main();
