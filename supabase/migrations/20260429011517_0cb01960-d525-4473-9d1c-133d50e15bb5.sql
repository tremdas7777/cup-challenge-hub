ALTER TABLE public.gateway_config 
ADD COLUMN IF NOT EXISTS stripe_public_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT;

ALTER TABLE public.gateway_config 
ALTER COLUMN active_gateway SET DEFAULT 'stripe';