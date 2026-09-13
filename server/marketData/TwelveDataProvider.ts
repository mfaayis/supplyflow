/**
 * SUPPLYFLOW — Twelve Data WebSocket Provider
 *
 * Connects to the Twelve Data real-time WebSocket API and streams
 * price ticks for all subscribed symbols.
 *
 * Docs: https://twelvedata.com/docs#websockets
 *
 * Free tier: up to 8 symbols simultaneously.
 * Paid tier: more symbols + higher frequency.
 *
 * Symbol mapping (Twelve Data format):
 *   Forex:  EUR/USD, GBP/USD, XAU/USD (XAUUSD → XAU/USD)
 *   Crypto: BTC/USD, ETH/USD
 *   Stocks: AAPL, TSLA (US30, NAS100 are indices — use futures)
 */
import WebSocket from 'ws';
import { MarketDataProvider, TickData, TickHandler } from './MarketDataProvider';

// Twelve Data WS endpoint
const WS_URL = 'wss://ws.twelvedata.com/v1/quotes/price';

/**
 * Convert SUPPLYFLOW symbol (e.g. 'EURUSD', 'XAUUSD', 'BTCUSD')
 * to Twelve Data symbol format ('EUR/USD', 'XAU/USD', 'BTC/USD').
 */
function toTwelveDataSymbol(symbol: string): string {
  // Already has slash — pass through
  if (symbol.includes('/')) return symbol;

  // Known forex pairs (6-char: EURUSD → EUR/USD)
  if (symbol.length === 6) {
    return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  }

  // Gold / commodities
  if (symbol === 'XAUUSD') return 'XAU/USD';
  if (symbol === 'XAGUSD') return 'XAG/USD';

  // Crypto (handle BTCUSD, ETHUSD, etc.)
  const cryptoMap: Record<string, string> = {
    BTCUSD: 'BTC/USD',
    ETHUSD: 'ETH/USD',
    BNBUSD: 'BNB/USD',
    SOLUSD: 'SOL/USD',
    XRPUSD: 'XRP/USD',
  };
  if (cryptoMap[symbol]) return cryptoMap[symbol];

  // Indices — map to their futures/ETF equivalents if possible
  const indexMap: Record<string, string> = {
    US30: 'DIA',     // Dow Jones ETF on TD (note: may not be realtime free)
    NAS100: 'QQQ',   // Nasdaq ETF
    SPX500: 'SPY',   // S&P 500 ETF
  };
  if (indexMap[symbol]) return indexMap[symbol];

  // Fallback — return as-is
  return symbol;
}

/**
 * Convert Twelve Data symbol back to SUPPLYFLOW canonical format.
 */
function fromTwelveDataSymbol(tdSymbol: string): string {
  return tdSymbol.replace('/', '');
}

export class TwelveDataProvider implements MarketDataProvider {
  private apiKey: string;
  private ws: WebSocket | null = null;
  private handlers: TickHandler[] = [];
  private subscribedSymbols: Set<string> = new Set();
  private connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 5000; // ms, doubles on each failure (max 60s)
  private maxReconnectDelay = 60000;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private intentionalClose = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async connect(): Promise<void> {
    if (this.ws && this.connected) return;
    this.intentionalClose = false;
    return this._openSocket();
  }

  private _openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[TwelveData] Connecting to WebSocket...');
      const url = `${WS_URL}?apikey=${this.apiKey}`;
      this.ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        reject(new Error('[TwelveData] Connection timeout'));
        this.ws?.terminate();
      }, 15000);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        console.log('[TwelveData] WebSocket connected.');
        this.connected = true;
        this.reconnectDelay = 5000;

        // Re-subscribe to all tracked symbols after reconnect
        if (this.subscribedSymbols.size > 0) {
          this._sendSubscribe([...this.subscribedSymbols]);
        }

        this._startHeartbeat();
        resolve();
      });

      this.ws.on('message', (raw: WebSocket.Data) => {
        try {
          const msg = JSON.parse(raw.toString());
          this._handleMessage(msg);
        } catch {
          // Non-JSON ping/pong frames — ignore
        }
      });

      this.ws.on('error', (err) => {
        console.error('[TwelveData] WebSocket error:', err.message);
        clearTimeout(timeout);
        if (!this.connected) reject(err);
      });

      this.ws.on('close', (code, reason) => {
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

  private _handleMessage(msg: Record<string, unknown>): void {
    // Twelve Data sends: { event: 'price', symbol: 'EUR/USD', price: '1.17382', ... }
    if (msg.event === 'price') {
      const tdSymbol = (msg.symbol as string) || '';
      const price = parseFloat(msg.price as string);

      if (!tdSymbol || isNaN(price)) return;

      const symbol = fromTwelveDataSymbol(tdSymbol);
      const tick: TickData = {
        symbol,
        price,
        bid: msg.bid ? parseFloat(msg.bid as string) : undefined,
        ask: msg.ask ? parseFloat(msg.ask as string) : undefined,
        timestamp: new Date(),
      };

      for (const handler of this.handlers) {
        try { handler(tick); } catch (e) {
          console.error('[TwelveData] Handler error:', e);
        }
      }
    }

    // Log connection confirmation events
    if (msg.event === 'subscribe-status') {
      console.log('[TwelveData] Subscribe status:', JSON.stringify(msg));
    }
  }

  subscribe(symbols: string[]): void {
    const newSymbols = symbols.filter((s) => !this.subscribedSymbols.has(s));
    if (newSymbols.length === 0) return;

    newSymbols.forEach((s) => this.subscribedSymbols.add(s));

    if (this.connected) {
      this._sendSubscribe(newSymbols);
    }
    // If not yet connected, symbols will be sent in the 'open' handler
  }

  unsubscribe(symbols: string[]): void {
    symbols.forEach((s) => this.subscribedSymbols.delete(s));

    if (this.connected && this.ws) {
      const payload = {
        action: 'unsubscribe',
        params: {
          symbols: symbols.map(toTwelveDataSymbol).join(','),
        },
      };
      this.ws.send(JSON.stringify(payload));
    }
  }

  private _sendSubscribe(symbols: string[]): void {
    if (!this.ws || !this.connected) return;
    const payload = {
      action: 'subscribe',
      params: {
        symbols: symbols.map(toTwelveDataSymbol).join(','),
      },
    };
    this.ws.send(JSON.stringify(payload));
    console.log(`[TwelveData] Subscribed to: ${symbols.join(', ')}`);
  }

  onTick(handler: TickHandler): void {
    this.handlers.push(handler);
  }

  async getLatestPrice(symbol: string): Promise<number | null> {
    // REST fallback for on-demand price fetch
    const tdSymbol = toTwelveDataSymbol(symbol);
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(tdSymbol)}&apikey=${this.apiKey}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[TwelveData] REST price fetch failed for ${symbol}: HTTP ${res.status}`);
        return null;
      }
      const json = await res.json() as Record<string, unknown>;
      const price = parseFloat(json.price as string);
      return isNaN(price) ? null : price;
    } catch (e) {
      console.error(`[TwelveData] REST price fetch error for ${symbol}:`, e);
      return null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    this.intentionalClose = true;
    this._stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Server shutting down');
      this.ws = null;
    }
    this.connected = false;
  }

  private _scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    console.log(`[TwelveData] Reconnecting in ${this.reconnectDelay / 1000}s...`);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this._openSocket();
      } catch {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      }
    }, this.reconnectDelay);
  }

  private _startHeartbeat(): void {
    this._stopHeartbeat();
    // Twelve Data expects a ping every 10 seconds to keep the connection alive
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.connected) {
        this.ws.ping();
      }
    }, 10000);
  }

  private _stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
