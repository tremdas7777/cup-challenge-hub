ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recovery_sent BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recovery_last_sent_at TIMESTAMPTZ;
