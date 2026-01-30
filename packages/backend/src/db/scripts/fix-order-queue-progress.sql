-- Fix Order Queue progress calculation
-- For PICKING orders: calculate progress based on fully completed items only
-- For PENDING orders: progress is always 0

-- First, remove the old trigger
DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items;

-- Create new trigger that counts only fully completed items
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
    -- Calculate progress based on fully completed items only
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE picked_quantity >= quantity) AS completed
    INTO total_items, completed_items
    FROM order_items
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

    -- Calculate progress percentage
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
END;
$$;

-- Re-create the trigger
DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items;
CREATE TRIGGER trigger_update_order_progress
  AFTER INSERT OR UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_progress();