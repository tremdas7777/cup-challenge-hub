
-- =========================
-- gateway_config
-- =========================
CREATE TABLE public.gateway_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  active_gateway TEXT NOT NULL DEFAULT 'centurionpay',
  pagouai_public_key TEXT,
  pagouai_secret_key TEXT,
  vennox_secret_key TEXT,
  vennox_company_id TEXT,
  centurionpay_secret_key TEXT,
  centurionpay_company_id TEXT,
  ironpay_api_token TEXT,
  simpayout_client_id TEXT,
  simpayout_client_secret TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.gateway_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gateway_config public read" ON public.gateway_config FOR SELECT USING (true);
CREATE POLICY "gateway_config public insert" ON public.gateway_config FOR INSERT WITH CHECK (true);
CREATE POLICY "gateway_config public update" ON public.gateway_config FOR UPDATE USING (true);
INSERT INTO public.gateway_config (active_gateway) VALUES ('ironpay');

-- =========================
-- orders
-- =========================
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT,
  gateway TEXT NOT NULL DEFAULT 'ironpay',
  gateway_response JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  amount_cents INTEGER NOT NULL,
  shipping_method TEXT,
  shipping_cost_cents INTEGER,
  items_description TEXT,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_document TEXT,
  buyer_phone TEXT,
  buyer_cep TEXT,
  buyer_address TEXT,
  buyer_address_number TEXT,
  buyer_complement TEXT,
  buyer_neighborhood TEXT,
  buyer_city TEXT,
  buyer_state TEXT,
  pix_code TEXT,
  pix_qr_code_base64 TEXT,
  qr_code_copied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders public read" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders public insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders public update" ON public.orders FOR UPDATE USING (true);

-- =========================
-- funnel_events
-- =========================
CREATE TABLE public.funnel_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funnel_events public read" ON public.funnel_events FOR SELECT USING (true);
CREATE POLICY "funnel_events public insert" ON public.funnel_events FOR INSERT WITH CHECK (true);

-- =========================
-- cloaker_config
-- =========================
CREATE TABLE public.cloaker_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cloaker_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cloaker_config public read" ON public.cloaker_config FOR SELECT USING (true);
CREATE POLICY "cloaker_config public update" ON public.cloaker_config FOR UPDATE USING (true);
CREATE POLICY "cloaker_config public insert" ON public.cloaker_config FOR INSERT WITH CHECK (true);
INSERT INTO public.cloaker_config (enabled) VALUES (false);

-- =========================
-- webhook_endpoints
-- =========================
CREATE TABLE public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_endpoints public read" ON public.webhook_endpoints FOR SELECT USING (true);
CREATE POLICY "webhook_endpoints public insert" ON public.webhook_endpoints FOR INSERT WITH CHECK (true);
CREATE POLICY "webhook_endpoints public update" ON public.webhook_endpoints FOR UPDATE USING (true);
CREATE POLICY "webhook_endpoints public delete" ON public.webhook_endpoints FOR DELETE USING (true);

-- =========================
-- updated_at triggers
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER gateway_config_set_updated_at BEFORE UPDATE ON public.gateway_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER cloaker_config_set_updated_at BEFORE UPDATE ON public.cloaker_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
