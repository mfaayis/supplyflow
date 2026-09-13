/**
 * SUPPLYFLOW — Market Data Provider Interface
 *
 * All market data providers must implement this interface.
 * This allows swapping Twelve Data for Polygon.io or any other
 * provider without changing the monitoring engine.
 */

export interface TickData {
  /** Canonical symbol (e.g. 'EURUSD', 'XAUUSD', 'BTCUSD') */
  symbol: string;
  /** Full-precision mid price (or last trade price) */
  price: number;
  /** Best bid price, if available */
  bid?: number;
  /** Best ask price, if available */
  ask?: number;
  /** Server-side timestamp of this tick */
  timestamp: Date;
}

export type TickHandler = (tick: TickData) => void;

export interface MarketDataProvider {
  /**
   * Connect to the data source. Should be idempotent — calling
   * connect() when already connected is a no-op.
   */
  connect(): Promise<void>;

  /**
   * Subscribe to real-time price updates for the given symbols.
   * If already subscribed, silently ignores duplicate symbols.
   */
  subscribe(symbols: string[]): void;

  /**
   * Unsubscribe from symbols that no longer have active trades.
   */
  unsubscribe(symbols: string[]): void;

  /**
   * Register a callback to be called on every price tick.
   * Multiple handlers can be registered.
   */
  onTick(handler: TickHandler): void;

  /**
   * Fetch the latest price for a symbol on demand (REST fallback).
   * Returns null if the symbol is unknown or the request fails.
   */
  getLatestPrice(symbol: string): Promise<number | null>;

  /**
   * Whether the provider is currently connected and receiving data.
   */
  isConnected(): boolean;

  /**
   * Gracefully disconnect and release resources.
   */
  disconnect(): Promise<void>;
}
