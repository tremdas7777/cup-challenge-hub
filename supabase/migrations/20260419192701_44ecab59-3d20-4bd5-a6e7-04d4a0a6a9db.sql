
ALTER TABLE public.gateway_config
ADD COLUMN IF NOT EXISTS product_ticket_cents INTEGER NOT NULL DEFAULT 4490;
