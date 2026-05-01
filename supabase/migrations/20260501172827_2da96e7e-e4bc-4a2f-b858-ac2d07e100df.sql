DELETE FROM public.gateway_config
WHERE id IN (
  SELECT id FROM public.gateway_config
  ORDER BY updated_at DESC NULLS LAST
  OFFSET 1
);