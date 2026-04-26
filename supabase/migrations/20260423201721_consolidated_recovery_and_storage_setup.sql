-- 1. ADICIONA TODAS AS COLUNAS NECESSÁRIAS NAS TABELAS
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recovery_sent BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recovery_last_sent_at TIMESTAMPTZ;

ALTER TABLE public.gateway_config ADD COLUMN IF NOT EXISTS support_whatsapp TEXT DEFAULT '11991537247';
ALTER TABLE public.gateway_config ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT;
ALTER TABLE public.gateway_config ADD COLUMN IF NOT EXISTS facebook_access_token TEXT;

-- 2. CRIA O ESPAÇO PARA GUARDAR FOTOS DOS COMPROVANTES
INSERT INTO storage.buckets (id, name, public) 
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 3. DÁ PERMISSÃO PARA ENVIAR E VER AS FOTOS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public uploads to proofs') THEN
        CREATE POLICY "Allow public uploads to proofs" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'proofs');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read from proofs') THEN
        CREATE POLICY "Allow public read from proofs" ON storage.objects FOR SELECT TO public USING (bucket_id = 'proofs');
    END IF;
END $$;

-- 4. ATIVA AS FERRAMENTAS DE AUTOMAÇÃO E E-MAIL
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 5. CONFIGURA O ROBÔ DE RECUPERAÇÃO DE VENDAS (RODA A CADA 10 MINUTOS)
-- Nota: O agendamento via cron requer permissões de superuser ou configuração específica no Supabase Dashboard.
-- A URL e a Service Role Key devem ser configuradas de acordo com o ambiente.
-- SELECT cron.schedule(
--   'enviar-recuperacao-pix-final',
--   '*/10 * * * *',
--   $$
--   SELECT net.http_post(
--     url:='https://vkhmvleeacdckjkickwk.supabase.co/functions/v1/recovery-email',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--   )
--   $$
-- );