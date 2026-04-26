ALTER TABLE public.gateway_config
  ADD COLUMN IF NOT EXISTS utmify_api_token text,
  ADD COLUMN IF NOT EXISTS utmify_api_token_2 text;