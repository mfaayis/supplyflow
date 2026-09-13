/**
 * SUPPLYFLOW — Backend Monitoring Server
 *
 * Responsibilities:
 * 1. Connect to Twelve Data WebSocket for real-time prices.
 * 2. Run TradeMonitorEngine (SL/TP detection).
 * 3. Expose REST endpoints:
 *    POST /api/webhooks/tradingview  — TradingView price alerts
 *    POST /api/trades/activate       — Immediately start monitoring a new trade
 *    GET  /api/status                — Health check / active trades info
 *    GET  /api/prices/:symbol        — On-demand price fetch
 *
 * The server runs independently of the browser.
 * Close the browser — monitoring continues.
 */
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import path from 'path';
import { TwelveDataProvider } from './marketData/TwelveDataProvider';
import { TradingViewWebhookHandler } from './marketData/TradingViewWebhookHandler';
import { TradeMonitorEngine } from './TradeMonitorEngine';
import { insertTradeEvent } from './supabaseAdmin';

// Load server/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const API_KEY = process.env.MARKET_DATA_API_KEY ?? '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';

if (!API_KEY) {
  console.error('❌  MARKET_DATA_API_KEY is not set in server/.env');
  process.exit(1);
}

// ── Market Data Provider ───────────────────────────────────────────────────────
const provider = new TwelveDataProvider(API_KEY);

// ── Trade Monitor Engine ──────────────────────────────────────────────────────
const engine = new TradeMonitorEngine(provider);

// ── TradingView Webhook Handler ────────────────────────────────────────────────
const webhookHandler = WEBHOOK_SECRET
  ? new TradingViewWebhookHandler(WEBHOOK_SECRET)
  : null;

if (webhookHandler) {
  // Feed TradingView ticks into the same monitoring engine
  webhookHandler.onTick((tick) => {
    // The engine's _onTick is private; we call the provider's handler list instead.
    // Since TradingViewWebhookHandler feeds ticks directly, we re-dispatch through engine
    // by temporarily treating it as a REST price update.
    engine.addManualTick(tick.symbol, tick.price, tick.timestamp);
  });
}

// ── Express App ───────────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [/\.supplyflow\.app$/, /\.vercel\.app$/]
    : '*',
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * Health check + status endpoint.
 * GET /api/status or /health
 */
app.get(['/api/status', '/health'], (_req, res) => {
  res.json({
    status: 'ok',
    marketData: provider.isConnected() ? 'connected' : 'disconnected',
    activeTrades: engine.activeCount,
    monitoredSymbols: engine.monitoredSymbols,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/**
 * On-demand price fetch for a symbol.
 * GET /api/prices/:symbol
 */
app.get('/api/prices/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const price = await provider.getLatestPrice(symbol);
  if (price === null) {
    res.status(404).json({ error: `No price available for ${symbol}` });
    return;
  }
  res.json({ symbol, price, timestamp: new Date().toISOString() });
});

/**
 * Immediately start monitoring a newly created ACTIVE trade.
 * POST /api/trades/activate
 * Body: { tradeId, userId, symbol, direction, entryPrice, stopLoss, takeProfit, positionSize, data }
 *
 * The frontend calls this right after inserting the trade into Supabase.
 * This is an optimisation — the engine would pick it up on the next poll anyway.
 */
app.post('/api/trades/activate', async (req, res) => {
  const { tradeId, userId, symbol, direction, entryPrice, stopLoss, takeProfit, positionSize, data } = req.body;

  if (!tradeId || !symbol || !direction || !entryPrice || !stopLoss || !takeProfit) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  if (direction !== 'BUY' && direction !== 'SELL') {
    res.status(400).json({ error: 'direction must be BUY or SELL' });
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
    positionSize: parseFloat(positionSize ?? '0'),
    rawData: data ?? {},
  });

  await insertTradeEvent(tradeId, 'MONITORING_STARTED', undefined, 'Trade added to monitor engine');

  res.json({ ok: true, tradeId, monitoredSymbols: engine.monitoredSymbols });
});

/**
 * TradingView webhook endpoint.
 * POST /api/webhooks/tradingview
 */
if (webhookHandler) {
  app.post('/api/webhooks/tradingview', webhookHandler.handle);
} else {
  app.post('/api/webhooks/tradingview', (_req, res) => {
    res.status(503).json({ error: 'WEBHOOK_SECRET not configured' });
  });
}

// ── Start ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  try {
    // Connect market data provider
    await provider.connect();

    // Start the monitoring engine (loads active trades from DB)
    await engine.start();

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════╗
║   SUPPLYFLOW Trade Monitor Server             ║
║   Listening on http://localhost:${PORT}         ║
╚═══════════════════════════════════════════════╝

  Market Data:    Twelve Data WebSocket  ${provider.isConnected() ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
  Active Trades:  ${engine.activeCount}
  Symbols:        ${engine.monitoredSymbols.join(', ') || 'none'}
  Webhook:        ${webhookHandler ? `🟢 /api/webhooks/tradingview` : '⚪ disabled (no WEBHOOK_SECRET)'}

  Press Ctrl+C to stop.
`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

// ── Graceful Shutdown ──────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  engine.stop();
  await provider.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  engine.stop();
  await provider.disconnect();
  process.exit(0);
});

main();
