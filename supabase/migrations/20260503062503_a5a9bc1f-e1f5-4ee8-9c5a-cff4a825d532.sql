DELETE FROM public.gateway_config
WHERE id NOT IN (
  SELECT id FROM public.gateway_config
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1
);