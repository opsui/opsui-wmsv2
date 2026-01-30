CREATE OR REPLACE FUNCTION public.update_order_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  total_items INTEGER;
  completed_items INTEGER;
  new_progress INTEGER;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Count total items and fully completed items
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE picked_quantity >= quantity) AS completed
    INTO total_items, completed_items
    FROM order_items
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

    -- Calculate progress based on fully completed items only
    new_progress := CASE
      WHEN total_items > 0 THEN ROUND(completed_items::FLOAT / total_items * 100)
      ELSE 0
    END;

    -- Update order progress
    UPDATE orders
    SET progress = new_progress,
        updated_at = NOW()
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;