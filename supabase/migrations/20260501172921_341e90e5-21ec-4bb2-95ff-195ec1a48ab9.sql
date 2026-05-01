-- Habilita REPLICA IDENTITY FULL para que o Realtime receba também o estado anterior em UPDATEs
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Adiciona a tabela orders à publicação do Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;