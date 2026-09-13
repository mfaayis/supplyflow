-- Harden monitoring with broker execution separation
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS trigger_price NUMERIC,
ADD COLUMN IF NOT EXISTS trigger_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolution_source TEXT,
ADD COLUMN IF NOT EXISTS broker_exit_price NUMERIC,
ADD COLUMN IF NOT EXISTS broker_exit_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS broker_r_multiple NUMERIC;
