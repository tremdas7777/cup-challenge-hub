-- Habilita pg_net para chamadas HTTP a partir do banco
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Função que chama a edge function utmify-backfill-paid para uma order específica
CREATE OR REPLACE FUNCTION public.notify_utmify_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text := 'https://kwcjpclgmjwsabvomzbr.supabase.co/functions/v1/utmify-backfill-paid';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Y2pwY2xnbWp3c2Fidm9temJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjcwNjEsImV4cCI6MjA5Mjc0MzA2MX0.bCCqjV2NSdH-TYQwPtkMAwf_SW8HHOZs1un9zVqL0rQ';
BEGIN
  -- Só dispara quando muda PARA paid (ou insert direto como paid)
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    -- Evita reenvio se já foi marcado como enviado
    IF (NEW.tracking->>'utmify_paid_sent_at') IS NULL THEN
      PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_anon
        ),
        body := jsonb_build_object('orderId', NEW.id::text)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_notify_utmify_paid ON public.orders;
CREATE TRIGGER trg_orders_notify_utmify_paid
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_utmify_on_paid();