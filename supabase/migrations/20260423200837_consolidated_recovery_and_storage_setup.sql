-- Adiciona colunas necessárias às tabelas
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recovery_sent BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recovery_last_sent_at TIMESTAMPTZ;

ALTER TABLE public.gateway_config ADD COLUMN IF NOT EXISTS support_whatsapp TEXT DEFAULT '11991537247';
ALTER TABLE public.gateway_config ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT;
ALTER TABLE public.gateway_config ADD COLUMN IF NOT EXISTS facebook_access_token TEXT;

-- Cria o espaço para guardar fotos dos comprovantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Dá permissão para enviar e ver as fotos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public uploads to proofs') THEN
        CREATE POLICY "Allow public uploads to proofs" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'proofs');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read from proofs') THEN
        CREATE POLICY "Allow public read from proofs" ON storage.objects FOR SELECT TO public USING (bucket_id = 'proofs');
    END IF;
END $$;

-- Ativa as ferramentas de automação e e-mail
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Configura o robô de recuperação de vendas (roda a cada 10 minutos)
-- ATENÇÃO: A chave service_role deve ser configurada manualmente ou via vault para segurança em produção.
-- O comando abaixo tenta agendar o job. Se já existir, ele não fará nada ou falhará dependendo da versão do pg_cron.
-- Usamos um bloco DO para garantir que não tentamos criar duplicatas se o cron.schedule não suportar ON CONFLICT.

DO $$
BEGIN
    PERFORM cron.unschedule('enviar-recuperacao-pix-final');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

SELECT cron.schedule(
  'enviar-recuperacao-pix-final',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url:='https://vkhmvleeacdckjkickwk.supabase.co/functions/v1/recovery-email',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer COLE_AQUI_SUA_SERVICE_ROLE_KEY"}'::jsonb
  )
  $$
);