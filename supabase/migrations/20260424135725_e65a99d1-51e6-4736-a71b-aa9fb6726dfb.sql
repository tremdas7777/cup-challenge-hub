ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking jsonb,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS fbp text,
  ADD COLUMN IF NOT EXISTS fbc text,
  ADD COLUMN IF NOT EXISTS fbclid text,
  ADD COLUMN IF NOT EXISTS client_user_agent text,
  ADD COLUMN IF NOT EXISTS client_ip text,
  ADD COLUMN IF NOT EXISTS source_url text;

CREATE INDEX IF NOT EXISTS idx_orders_utm_campaign ON public.orders(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_orders_utm_source ON public.orders(utm_source);