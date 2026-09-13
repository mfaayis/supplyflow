/**
 * SUPPLYFLOW — Market Data Service (Frontend)
 *
 * Thin client that communicates with the backend monitoring server.
 * - Never holds API keys.
 * - Falls back to Supabase market_prices table if backend is unreachable.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface BackendStatus {
  ok: boolean;
  marketDataConnected: boolean;
  activeTrades: number;
  monitoredSymbols: string[];
  uptime: number;
  timestamp: string;
}

/**
 * Check if the backend monitoring server is online and connected.
 */
export async function fetchBackendStatus(): Promise<BackendStatus | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/status`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json() as BackendStatus;
  } catch {
    return null;
  }
}

/**
 * Ask the backend to immediately start monitoring a new trade.
 * Called right after inserting the trade into Supabase.
 */
export async function activateTradeOnServer(params: {
  tradeId: string;
  userId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  data: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/trades/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    // Backend unreachable — engine will pick it up on next poll
    console.warn('[marketDataService] Backend unreachable; trade will be picked up on next poll.');
    return false;
  }
}

/**
 * Fetch the current price for a symbol from the backend.
 * Falls back to Supabase market_prices table.
 */
export async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/prices/${encodeURIComponent(symbol)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { price: number };
    return json.price ?? null;
  } catch {
    return null;
  }
}
