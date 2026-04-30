ALTER TABLE public.gateway_config
  ADD COLUMN IF NOT EXISTS external_checkout_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_checkout_url text NOT NULL DEFAULT '';

UPDATE public.gateway_config
  SET external_checkout_enabled = true,
      external_checkout_url = 'https://buy.stripe.com/eVqdR9bPReGr37n6xV4Ni02',
      updated_at = now();