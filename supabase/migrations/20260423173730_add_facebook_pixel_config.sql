ALTER TABLE public.gateway_config ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT;
ALTER TABLE public.gateway_config ADD COLUMN IF NOT EXISTS facebook_access_token TEXT;
