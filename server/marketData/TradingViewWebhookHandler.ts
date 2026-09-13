/**
 * SUPPLYFLOW — TradingView Webhook Handler
 *
 * Accepts POST /api/webhooks/tradingview with a validated secret.
 * The payload carries symbol + price; the handler feeds the tick
 * directly into the TradeMonitorEngine.
 *
 * TradingView Alert Message template (JSON):
 * {
 *   "secret": "{{your-webhook-secret}}",
 *   "symbol": "{{ticker}}",
 *   "price": {{close}},
 *   "event": "price_update",
 *   "timestamp": "{{time}}"
 * }
 *
 * NOTE: TradingView webhooks supplement (not replace) the Twelve Data
 * WebSocket. They are useful for custom alerts ("TP approach") but the
 * WebSocket is the primary source of truth for SL/TP detection.
 */
import { Request, Response } from 'express';
import { TickData } from './MarketDataProvider';

export interface WebhookPayload {
  secret: string;
  symbol: string;
  price: number | string;
  event?: string;
  timestamp?: string;
}

export class TradingViewWebhookHandler {
  private expectedSecret: string;
  private tickHandlers: Array<(tick: TickData) => void> = [];

  constructor(secret: string) {
    if (!secret) {
      throw new Error('[TradingViewWebhook] WEBHOOK_SECRET is not set.');
    }
    this.expectedSecret = secret;
  }

  /** Register a handler that receives validated webhook ticks */
  onTick(handler: (tick: TickData) => void): void {
    this.tickHandlers.push(handler);
  }

  /**
   * Express route handler for POST /api/webhooks/tradingview
   * Validates, parses, and dispatches the tick.
   */
  handle = (req: Request, res: Response): void => {
    try {
      const body = req.body as Partial<WebhookPayload>;

      // 1. Validate secret (constant-time comparison to prevent timing attacks)
      if (!body.secret || !this._safeCompare(body.secret, this.expectedSecret)) {
        console.warn('[TradingViewWebhook] Rejected request — invalid secret.');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // 2. Validate required fields
      if (!body.symbol || body.price === undefined || body.price === null) {
        res.status(400).json({ error: 'Missing symbol or price' });
        return;
      }

      // 3. Parse and validate price (full precision)
      const price = typeof body.price === 'string' ? parseFloat(body.price) : body.price;
      if (isNaN(price) || price <= 0) {
        res.status(400).json({ error: 'Invalid price value' });
        return;
      }

      // 4. Normalise symbol (remove slashes, uppercase)
      const symbol = body.symbol.toUpperCase().replace('/', '');

      // 5. Construct tick and dispatch
      const tick: TickData = {
        symbol,
        price,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      };

      console.log(`[TradingViewWebhook] Received tick: ${symbol} @ ${price}`);
      for (const handler of this.tickHandlers) {
        try { handler(tick); } catch (e) {
          console.error('[TradingViewWebhook] Handler error:', e);
        }
      }

      // 6. Idempotent response — always 200 so TradingView stops retrying
      res.json({ ok: true, symbol, price });
    } catch (err) {
      console.error('[TradingViewWebhook] Unexpected error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Constant-time string comparison (prevents timing attacks).
   */
  private _safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
