ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE public.gateway_config ADD COLUMN IF NOT EXISTS support_whatsapp TEXT DEFAULT '11991537247';

INSERT INTO storage.buckets (id, name, public) 
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public uploads to proofs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'proofs');

CREATE POLICY "Allow public read from proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'proofs');
