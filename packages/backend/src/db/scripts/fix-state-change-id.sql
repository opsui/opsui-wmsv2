-- Fix generate_state_change_id to use milliseconds to avoid duplicates
CREATE OR REPLACE FUNCTION public.generate_state_change_id()
RETURNS character varying
LANGUAGE sql
AS $function$
  SELECT 'OSC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000)::TEXT, 11, '0');
$function$;