/**
 * SUPPLYFLOW — Supabase Admin Client (Server-side only)
 *
 * Uses the service_role key which bypasses Row Level Security.
 * NEVER import or expose this module to the frontend.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    '[supabaseAdmin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env'
  );
}

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ── Typed helpers ─────────────────────────────────────────────────────────────

export interface DbTrade {
  id: string;
  user_id: string;
  data: Record<string, unknown>;
  status: string;
  last_price: number | null;
  last_price_at: string | null;
  exit_price_raw: number | null;
  exit_reason: string | null;
  trigger_price: number | null;
  trigger_timestamp: string | null;
  resolution_source: string | null;
  broker_exit_price: number | null;
  broker_exit_timestamp: string | null;
  opened_at: string | null;
  closed_at: string | null;
  r_multiple: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all ACTIVE trades across all users.
 * Returns the full row including the embedded `data` JSONB column.
 */
export async function getActiveTrades(): Promise<DbTrade[]> {
  const { data, error } = await supabaseAdmin
    .from('trades')
    .select('*')
    .eq('status', 'ACTIVE');

  if (error) {
    console.error('[supabaseAdmin] getActiveTrades error:', error.message);
    return [];
  }
  return (data ?? []) as DbTrade[];
}

/**
 * Atomically close a trade. Uses a WHERE status='ACTIVE' guard so that
 * duplicate events cannot double-close the same trade.
 * Returns true if the trade was actually updated (not already closed).
 */
export async function closeTrade(params: {
  tradeId: string;
  status: 'WON' | 'LOST' | 'AMBIGUOUS';
  exitPriceRaw: number;
  triggerPrice: number;
  triggerTimestamp: string;
  resolutionSource: 'AUTO_MARKET_DATA' | 'AMBIGUOUS';
  exitReason: 'TP_HIT' | 'SL_HIT' | 'AMBIGUOUS';
  rMultiple: number;
  closedAt: string;
  updatedData: Record<string, unknown>;
}): Promise<boolean> {
  const { tradeId, status, exitPriceRaw, triggerPrice, triggerTimestamp, resolutionSource, exitReason, rMultiple, closedAt, updatedData } = params;

  const { data, error } = await supabaseAdmin
    .from('trades')
    .update({
      status,
      exit_price_raw: exitPriceRaw,
      trigger_price: triggerPrice,
      trigger_timestamp: triggerTimestamp,
      resolution_source: resolutionSource,
      exit_reason: exitReason,

      r_multiple: rMultiple,
      closed_at: closedAt,
      data: updatedData,
      updated_at: closedAt,
    })
    .eq('id', tradeId)
    .eq('status', 'ACTIVE')  // Idempotency guard
    .select('id');

  if (error) {
    console.error(`[supabaseAdmin] closeTrade(${tradeId}) error:`, error.message);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

/**
 * Update the last-seen price for a trade (non-blocking, best-effort).
 */
export async function updateTradeLastPrice(
  tradeId: string,
  price: number,
  at: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('trades')
    .update({ last_price: price, last_price_at: at })
    .eq('id', tradeId)
    .eq('status', 'ACTIVE');

  if (error) {
    console.error(`[supabaseAdmin] updateTradeLastPrice(${tradeId}) error:`, error.message);
  }
}

/**
 * Upsert the latest price for a symbol in the market_prices table.
 */
export async function upsertMarketPrice(
  symbol: string,
  price: number,
  bid?: number,
  ask?: number,
  source: string = 'twelvedata'
): Promise<void> {
  const { error } = await supabaseAdmin.from('market_prices').upsert(
    { symbol, price, bid, ask, source, updated_at: new Date().toISOString() },
    { onConflict: 'symbol' }
  );
  if (error) {
    console.error(`[supabaseAdmin] upsertMarketPrice(${symbol}) error:`, error.message);
  }
}

/**
 * Insert a trade event into the audit log.
 */
export async function insertTradeEvent(
  tradeId: string,
  eventType: string,
  price?: number,
  note?: string
): Promise<void> {
  const { error } = await supabaseAdmin.from('trade_events').insert({
    trade_id: tradeId,
    event_type: eventType,
    price,
    note,
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`[supabaseAdmin] insertTradeEvent(${tradeId}, ${eventType}) error:`, error.message);
  }
}

/**
 * Insert a notification for a specific user.
 */
export async function insertNotification(params: {
  userId: string;
  tradeId: string;
  type: string;
  message: string;
  price?: number;
  rMultiple?: number;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('notifications').insert({
    user_id: params.userId,
    trade_id: params.tradeId,
    type: params.type,
    message: params.message,
    price: params.price,
    r_multiple: params.rMultiple,
    read: false,
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.error('[supabaseAdmin] insertNotification error:', error.message);
  }
}
