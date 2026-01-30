-- ============================================================================
-- Add Test Pickers for Testing
-- ============================================================================

-- Insert test picker users (all active by default)
INSERT INTO users (user_id, name, email, password_hash, role) VALUES
  ('USR-PICK01', 'John Picker', 'picker1@wms.local', '$2b$10$rOzJQvNqPvJzNQZPNnPX6e9nXNzxNJz3GNdXnQNPNnZXNPN', 'PICKER'),
  ('USR-PICK02', 'Jane Walker', 'picker2@wms.local', '$2b$10$rOzJQvNqPvJzNQZPNnPX6e9nXNzxNJz3GNdXnQNPNnZXNPN', 'PICKER'),
  ('USR-PICK03', 'Mike Carrier', 'picker3@wms.local', '$2b$10$rOzJQvNqPvJzNQZPNnPX6e9nXNzxNJz3GNdXnQNPNnZXNPN', 'PICKER'),
  ('USR-PICK04', 'Sarah Boxer', 'picker4@wms.local', '$2b$10$rOzJQvNqPvJzNQZPNnPX6e9nXNzxNJz3GNdXnQNPNnZXNPN', 'PICKER')
ON CONFLICT (user_id) DO NOTHING;

-- Create some test orders with items
-- Order 1: Being picked by John Picker
INSERT INTO orders (order_id, customer_id, customer_name, priority, status, picker_id, progress)
VALUES ('ORD-TEST01', 'CUST-001', 'Test Customer 1', 'NORMAL', 'PICKING', 'USR-PICK01', 45);

INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, bin_location, status)
VALUES 
  ('OI-TEST01-1', 'ORD-TEST01', 'SKU-APPLE', 'Apple iPhone 15', 1, 'Z-A-01', 'FULLY_PICKED'),
  ('OI-TEST01-2', 'ORD-TEST01', 'SKU-SAMS', 'Samsung Galaxy S23', 2, 'Z-A-01', 'FULLY_PICKED'),
  ('OI-TEST01-3', 'ORD-TEST01', 'SKU-CHRG', 'Google Pixel 8', 1, 'Z-A-02', 'PENDING');

INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, sku, name, target_bin, quantity, status, picker_id, started_at)
VALUES 
  ('PT-TEST01-1', 'ORD-TEST01', 'OI-TEST01-1', 'SKU-APPLE', 'Apple iPhone 15', 'Z-A-01', 1, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '10 minutes'),
  ('PT-TEST01-2', 'ORD-TEST01', 'OI-TEST01-2', 'SKU-SAMS', 'Samsung Galaxy S23', 'Z-A-01', 2, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '5 minutes');

-- Order 2: Pending - no picker assigned yet
INSERT INTO orders (order_id, customer_id, customer_name, priority, status, progress)
VALUES ('ORD-TEST02', 'CUST-002', 'Test Customer 2', 'HIGH', 'PENDING', 0);

INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, bin_location, status)
VALUES 
  ('OI-TEST02-1', 'ORD-TEST02', 'SKU-LAPT', 'Dell XPS 15', 1, 'Z-B-01', 'PENDING'),
  ('OI-TEST02-2', 'ORD-TEST02', 'SKU-THNK', 'ThinkPad X1', 1, 'Z-B-02', 'PENDING'),
  ('OI-TEST02-3', 'ORD-TEST02', 'SKU-ACER', 'Acer Aspire 5', 2, 'Z-B-03', 'PENDING');

-- Order 3: Recently completed by Jane Picker
INSERT INTO orders (order_id, customer_id, customer_name, priority, status, picker_id, progress, picked_at)
VALUES ('ORD-TEST03', 'CUST-003', 'Test Customer 3', 'NORMAL', 'PICKED', 'USR-PICK02', 100, NOW() - INTERVAL '30 minutes');

INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, bin_location, status)
VALUES 
  ('OI-TEST03-1', 'ORD-TEST03', 'SKU-MACB', 'MacBook Pro', 1, 'Z-C-01', 'FULLY_PICKED'),
  ('OI-TEST03-2', 'ORD-TEST03', 'SKU-MACS', 'MacBook Air', 1, 'Z-C-02', 'FULLY_PICKED');

-- Order 4: Being picked by Mike Carrier (just started)
INSERT INTO orders (order_id, customer_id, customer_name, priority, status, picker_id, progress)
VALUES ('ORD-TEST04', 'CUST-004', 'Test Customer 4', 'URGENT', 'PICKING', 'USR-PICK03', 25);

INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, bin_location, status)
VALUES 
  ('OI-TEST04-1', 'ORD-TEST04', 'SKU-IPOD', 'iPad Pro', 2, 'Z-A-03', 'FULLY_PICKED'),
  ('OI-TEST04-2', 'ORD-TEST04', 'SKU-IPOA', 'iPad Air', 1, 'Z-A-04', 'FULLY_PICKED');

INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, sku, name, target_bin, quantity, status, picker_id, started_at)
VALUES 
  ('PT-TEST04-1', 'ORD-TEST04', 'OI-TEST04-1', 'SKU-IPOD', 'iPad Pro', 'Z-A-03', 2, 'IN_PROGRESS', 'USR-PICK03', NOW());

-- Order 5: Sarah Boxer - idle (no recent activity)
-- She completed an order 2 hours ago, then went idle
INSERT INTO orders (order_id, customer_id, customer_name, priority, status, picker_id, progress, picked_at)
VALUES ('ORD-TEST05', 'CUST-005', 'Test Customer 5', 'LOW', 'PICKED', 'USR-PICK04', 100, NOW() - INTERVAL '2 hours');

INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, bin_location, status)
VALUES 
  ('OI-TEST05-1', 'ORD-TEST05', 'SKU-XBOS', 'Xbox Series X', 1, 'Z-C-04', 'FULLY_PICKED');

INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, sku, name, target_bin, quantity, status, picker_id, started_at, completed_at)
VALUES 
  ('PT-TEST05-1', 'ORD-TEST05', 'OI-TEST05-1', 'SKU-XBOS', 'Xbox Series X', 'Z-C-04', 1, 'COMPLETED', 'USR-PICK04', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours');