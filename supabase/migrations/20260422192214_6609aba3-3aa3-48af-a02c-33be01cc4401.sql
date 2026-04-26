ALTER TABLE public.gateway_config
  ADD COLUMN IF NOT EXISTS credit_card_enabled boolean NOT NULL DEFAULT false;