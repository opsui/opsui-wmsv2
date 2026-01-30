-- Mock Data Seeder for Warehouse Management System
-- Creates SKUs, bin locations, orders, order items, and pick tasks

-- ============================================================================
-- STEP 1: Create Bin Locations
-- ============================================================================

INSERT INTO bin_locations (bin_id, zone, aisle, shelf, type, active) VALUES
-- Zone A - Fast Moving Items
('A-01-01', 'A', '01', '01', 'SHELF', true),
('A-01-02', 'A', '01', '02', 'SHELF', true),
('A-01-03', 'A', '01', '03', 'SHELF', true),
('A-02-01', 'A', '02', '01', 'SHELF', true),
('A-02-02', 'A', '02', '02', 'SHELF', true),
('A-02-03', 'A', '02', '03', 'SHELF', true),
-- Zone B - Medium Moving Items
('B-01-01', 'B', '01', '01', 'SHELF', true),
('B-01-02', 'B', '01', '02', 'SHELF', true),
('B-01-03', 'B', '01', '03', 'SHELF', true),
('B-02-01', 'B', '02', '01', 'SHELF', true),
('B-02-02', 'B', '02', '02', 'SHELF', true),
('B-02-03', 'B', '02', '03', 'SHELF', true),
-- Zone C - Slow Moving Items
('C-01-01', 'C', '01', '01', 'SHELF', true),
('C-01-02', 'C', '01', '02', 'SHELF', true),
('C-01-03', 'C', '01', '03', 'SHELF', true),
-- Zone D - Bulk Storage
('D-01-01', 'D', '01', '01', 'BIN', true),
('D-01-02', 'D', '01', '02', 'BIN', true),
('D-02-01', 'D', '02', '01', 'BIN', true),
('D-02-02', 'D', '02', '02', 'BIN', true);

-- ============================================================================
-- STEP 2: Create SKUs
-- ============================================================================

INSERT INTO skus (sku, name, description, category, barcode, active) VALUES
-- Electronics
('ELEC-001', 'Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 'Electronics', '1234567890011', true),
('ELEC-002', 'Mechanical Keyboard', 'RGB mechanical keyboard, blue switches', 'Electronics', '1234567890028', true),
('ELEC-003', 'USB-C Hub', '7-port USB-C hub with power delivery', 'Electronics', '1234567890035', true),
('ELEC-004', 'Laptop Stand', 'Aluminum laptop cooling stand', 'Electronics', '1234567890042', true),
('ELEC-005', 'Webcam 1080p', 'HD webcam with microphone', 'Electronics', '1234567890059', true),
-- Office Supplies
('OFF-001', 'A4 Paper Ream', '500 sheets of A4 paper, 80gsm', 'Office', '2234567890015', true),
('OFF-002', 'Ballpoint Pens', 'Box of 12 blue ballpoint pens', 'Office', '2234567890022', true),
('OFF-003', 'Stapler', 'Heavy duty stapler with 1000 staples', 'Office', '2234567890039', true),
('OFF-004', 'Highlighters', 'Set of 6 yellow highlighters', 'Office', '2234567890046', true),
('OFF-005', 'Notebook A5', 'A5 spiral notebook, 100 pages', 'Office', '2234567890053', true),
-- Tools
('TOOL-001', 'Cordless Drill', '18V cordless drill driver', 'Tools', '3234567890012', true),
('TOOL-002', 'Hammer', 'Claw hammer, fiberglass handle', 'Tools', '3234567890029', true),
('TOOL-003', 'Screwdriver Set', 'Set of 6 precision screwdrivers', 'Tools', '3234567890036', true),
('TOOL-004', 'Adjustable Wrench', '10-inch adjustable wrench', 'Tools', '3234567890043', true),
('TOOL-005', 'Tape Measure', '25ft tape measure', 'Tools', '3234567890050', true),
-- Home & Garden
('HOME-001', 'LED Bulb 60W', 'Pack of 4 LED bulbs, warm white', 'Home', '4234567890018', true),
('HOME-002', 'Plant Pot', 'Ceramic plant pot, 6 inch', 'Home', '4234567890025', true),
('HOME-003', 'Garden Hose', '50ft garden hose with nozzle', 'Home', '4234567890032', true),
('HOME-004', 'Door Mat', 'Heavy-duty rubber door mat', 'Home', '4234567890049', true),
('HOME-005', 'Storage Bin', '30L plastic storage bin', 'Home', '4234567890056', true);

-- ============================================================================
-- STEP 3: Create Mock Orders
-- ============================================================================

-- Generate order IDs with proper function (need to check if function exists)
-- For now, using simple IDs

INSERT INTO orders (order_id, customer_id, customer_name, priority, status, progress) VALUES
-- Urgent orders
('ORD-20250120-001', 'CUST-1001', 'Acme Corporation', 'URGENT', 'PENDING', 0),
('ORD-20250120-002', 'CUST-1002', 'Globex Inc', 'URGENT', 'PENDING', 0),
-- High priority orders
('ORD-20250120-003', 'CUST-1003', 'Soylent Corp', 'HIGH', 'PENDING', 0),
('ORD-20250120-004', 'CUST-1004', 'Initech', 'HIGH', 'PENDING', 0),
('ORD-20250120-005', 'CUST-1005', 'Umbrella Corp', 'HIGH', 'PENDING', 0),
-- Normal priority orders
('ORD-20250120-006', 'CUST-1006', 'Cyberdyne Systems', 'NORMAL', 'PENDING', 0),
('ORD-20250120-007', 'CUST-1007', 'Tyrell Corp', 'NORMAL', 'PENDING', 0),
('ORD-20250120-008', 'CUST-1008', 'Weyland-Yutani', 'NORMAL', 'PENDING', 0),
('ORD-20250120-009', 'CUST-1009', 'Massive Dynamic', 'NORMAL', 'PENDING', 0),
('ORD-20250120-010', 'CUST-1010', 'Stark Industries', 'NORMAL', 'PENDING', 0),
('ORD-20250120-011', 'CUST-1011', 'Wayne Enterprises', 'NORMAL', 'PENDING', 0),
('ORD-20250120-012', 'CUST-1012', 'Oscorp Industries', 'NORMAL', 'PENDING', 0),
-- Low priority orders
('ORD-20250120-013', 'CUST-1013', 'Vought International', 'LOW', 'PENDING', 0),
('ORD-20250120-014', 'CUST-1014', 'Quantum Laboratories', 'LOW', 'PENDING', 0),
('ORD-20250120-015', 'CUST-1015', 'Pym Technologies', 'LOW', 'PENDING', 0);

-- ============================================================================
-- STEP 4: Create Order Items with Pick Tasks
-- ============================================================================

-- Order 1 - Urgent, 3 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-001-001', 'ORD-20250120-001', 'ELEC-001', 'Wireless Mouse', 2, 0, 'A-01-01', 'PENDING'),
('OI-001-002', 'ORD-20250120-001', 'OFF-001', 'A4 Paper Ream', 5, 0, 'A-01-02', 'PENDING'),
('OI-001-003', 'ORD-20250120-001', 'TOOL-001', 'Cordless Drill', 1, 0, 'B-01-01', 'PENDING');

-- Order 2 - Urgent, 2 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-002-001', 'ORD-20250120-002', 'ELEC-002', 'Mechanical Keyboard', 1, 0, 'A-01-03', 'PENDING'),
('OI-002-002', 'ORD-20250120-002', 'ELEC-003', 'USB-C Hub', 3, 0, 'A-02-01', 'PENDING');

-- Order 3 - High priority, 4 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-003-001', 'ORD-20250120-003', 'OFF-002', 'Ballpoint Pens', 10, 0, 'A-02-02', 'PENDING'),
('OI-003-002', 'ORD-20250120-003', 'OFF-003', 'Stapler', 2, 0, 'A-02-03', 'PENDING'),
('OI-003-003', 'ORD-20250120-003', 'TOOL-002', 'Hammer', 1, 0, 'B-01-02', 'PENDING'),
('OI-003-004', 'ORD-20250120-003', 'HOME-001', 'LED Bulb 60W', 4, 0, 'C-01-01', 'PENDING');

-- Order 4 - High priority, 2 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-004-001', 'ORD-20250120-004', 'ELEC-004', 'Laptop Stand', 1, 0, 'A-01-01', 'PENDING'),
('OI-004-002', 'ORD-20250120-004', 'TOOL-003', 'Screwdriver Set', 3, 0, 'B-01-03', 'PENDING');

-- Order 5 - High priority, 3 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-005-001', 'ORD-20250120-005', 'ELEC-005', 'Webcam 1080p', 2, 0, 'A-02-02', 'PENDING'),
('OI-005-002', 'ORD-20250120-005', 'OFF-004', 'Highlighters', 5, 0, 'A-02-03', 'PENDING'),
('OI-005-003', 'ORD-20250120-005', 'TOOL-004', 'Adjustable Wrench', 2, 0, 'B-02-01', 'PENDING');

-- Order 6 - Normal priority, 4 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-006-001', 'ORD-20250120-006', 'OFF-005', 'Notebook A5', 20, 0, 'A-01-02', 'PENDING'),
('OI-006-002', 'ORD-20250120-006', 'TOOL-005', 'Tape Measure', 5, 0, 'B-01-01', 'PENDING'),
('OI-006-003', 'ORD-20250120-006', 'HOME-002', 'Plant Pot', 3, 0, 'C-01-02', 'PENDING'),
('OI-006-004', 'ORD-20250120-006', 'HOME-003', 'Garden Hose', 1, 0, 'C-02-01', 'PENDING');

-- Order 7 - Normal priority, 3 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-007-001', 'ORD-20250120-007', 'ELEC-001', 'Wireless Mouse', 3, 0, 'A-01-03', 'PENDING'),
('OI-007-002', 'ORD-20250120-007', 'OFF-001', 'A4 Paper Ream', 2, 0, 'A-02-01', 'PENDING'),
('OI-007-003', 'ORD-20250120-007', 'TOOL-002', 'Hammer', 2, 0, 'B-02-02', 'PENDING');

-- Order 8 - Normal priority, 5 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-008-001', 'ORD-20250120-008', 'ELEC-002', 'Mechanical Keyboard', 1, 0, 'A-02-02', 'PENDING'),
('OI-008-002', 'ORD-20250120-008', 'ELEC-003', 'USB-C Hub', 2, 0, 'A-02-03', 'PENDING'),
('OI-008-003', 'ORD-20250120-008', 'OFF-002', 'Ballpoint Pens', 10, 0, 'B-01-01', 'PENDING'),
('OI-008-004', 'ORD-20250120-008', 'OFF-003', 'Stapler', 1, 0, 'B-01-02', 'PENDING'),
('OI-008-005', 'ORD-20250120-008', 'TOOL-001', 'Cordless Drill', 1, 0, 'B-02-03', 'PENDING');

-- Order 9 - Normal priority, 2 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-009-001', 'ORD-20250120-009', 'HOME-004', 'Door Mat', 2, 0, 'C-01-03', 'PENDING'),
('OI-009-002', 'ORD-20250120-009', 'HOME-005', 'Storage Bin', 5, 0, 'C-02-02', 'PENDING');

-- Order 10 - Normal priority, 4 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-010-001', 'ORD-20250120-010', 'ELEC-004', 'Laptop Stand', 1, 0, 'A-01-01', 'PENDING'),
('OI-010-002', 'ORD-20250120-010', 'ELEC-005', 'Webcam 1080p', 1, 0, 'A-01-02', 'PENDING'),
('OI-010-003', 'ORD-20250120-010', 'TOOL-003', 'Screwdriver Set', 2, 0, 'B-01-03', 'PENDING'),
('OI-010-004', 'ORD-20250120-010', 'TOOL-004', 'Adjustable Wrench', 1, 0, 'B-02-01', 'PENDING');

-- Order 11 - Normal priority, 3 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-011-001', 'ORD-20250120-011', 'OFF-004', 'Highlighters', 8, 0, 'A-02-02', 'PENDING'),
('OI-011-002', 'ORD-20250120-011', 'OFF-005', 'Notebook A5', 15, 0, 'A-02-03', 'PENDING'),
('OI-011-003', 'ORD-20250120-011', 'HOME-001', 'LED Bulb 60W', 6, 0, 'C-01-01', 'PENDING');

-- Order 12 - Normal priority, 2 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-012-001', 'ORD-20250120-012', 'TOOL-001', 'Cordless Drill', 2, 0, 'B-01-01', 'PENDING'),
('OI-012-002', 'ORD-20250120-012', 'TOOL-005', 'Tape Measure', 3, 0, 'B-02-02', 'PENDING');

-- Order 13 - Low priority, 3 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-013-001', 'ORD-20250120-013', 'ELEC-003', 'USB-C Hub', 1, 0, 'A-01-01', 'PENDING'),
('OI-013-002', 'ORD-20250120-013', 'OFF-001', 'A4 Paper Ream', 3, 0, 'A-01-02', 'PENDING'),
('OI-013-003', 'ORD-20250120-013', 'HOME-002', 'Plant Pot', 4, 0, 'C-01-02', 'PENDING');

-- Order 14 - Low priority, 2 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-014-001', 'ORD-20250120-014', 'OFF-002', 'Ballpoint Pens', 12, 0, 'A-02-01', 'PENDING'),
('OI-014-002', 'ORD-20250120-014', 'OFF-003', 'Stapler', 4, 0, 'A-02-02', 'PENDING');

-- Order 15 - Low priority, 4 items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status) VALUES
('OI-015-001', 'ORD-20250120-015', 'HOME-003', 'Garden Hose', 1, 0, 'C-02-01', 'PENDING'),
('OI-015-002', 'ORD-20250120-015', 'HOME-004', 'Door Mat', 3, 0, 'C-02-02', 'PENDING'),
('OI-015-003', 'ORD-20250120-015', 'HOME-005', 'Storage Bin', 2, 0, 'D-01-01', 'PENDING'),
('OI-015-004', 'ORD-20250120-015', 'TOOL-002', 'Hammer', 1, 0, 'D-01-02', 'PENDING');

-- ============================================================================
-- STEP 5: Create Pick Tasks for each Order Item
-- ============================================================================

-- Create pick tasks for all order items
INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, sku, name, target_bin, quantity, picked_quantity, status)
SELECT
  'PT-' || order_item_id,
  order_id,
  order_item_id,
  sku,
  name,
  bin_location,
  quantity,
  0,
  'PENDING'::task_status
FROM order_items;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Mock Data Created Successfully!';
  RAISE NOTICE '- SKUs: 15';
  RAISE NOTICE '- Bin Locations: 17';
  RAISE NOTICE '- Orders: 15';
  RAISE NOTICE '- Order Items: 44';
  RAISE NOTICE '- Pick Tasks: 44';
END $$;
