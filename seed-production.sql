-- Production Database Seed
-- Generates sample orders and data for charts

-- Insert Users
INSERT INTO users (user_id, name, email, password_hash, role, active, created_at)
VALUES
  ('USR-PICK01', 'John Picker', '$2b$10$N9q8p8hVv7pRtNQzJY8LkUJqF6NqM', 'PICKER', true, NOW()),
  ('USR-PICK02', 'Mike Johnson', '$2b$10$N9q8p8hVv7pRtNQzJY8LkUJqF6NqM', 'PICKER', true, NOW()),
  ('USR-PICK03', 'Sarah Williams', '$2b$10$N9q8p8hVv7pRtNQzJY8LkUJqF6NqM', 'PICKER', true, NOW()),
  ('USR-PICK04', 'David Chen', '$2b$10$N9q8p8hVv7pRtNQzJY8LkUJqF6NqM', 'PICKER', true, NOW())
ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role;

-- Insert SKUs
INSERT INTO skus (sku, name, description, category, active, created_at, updated_at)
VALUES
  ('WIDGET-A-001', 'Widget A Type 1', 'Standard widget type A', 'Widgets', true, NOW(), NOW()),
  ('GADGET-B-002', 'Gadget B Type 2', 'Standard gadget type B', 'Gadgets', true, NOW(), NOW()),
  ('TOOL-C-003', 'Tool C Type 3', 'Standard tool type C', 'Tools', true, NOW(), NOW()),
  ('PART-D-004', 'Part D Type 4', 'Standard part type D', 'Parts', true, NOW(), NOW()),
  ('COMP-E-005', 'Component E Type 5', 'Standard component type E', 'Components', true, NOW(), NOW()),
  ('MATERIAL-F-006', 'Material F Type 6', 'Standard material type F', 'Materials', true, NOW(), NOW())
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  active = EXCLUDED.active,
  updated_at = NOW();

-- Insert Bin Locations
INSERT INTO bin_locations (bin_id, zone, aisle, shelf, type, active)
VALUES
  ('A-01-01', 'A', '01', '01', 'SHELF', true),
  ('A-01-02', 'A', '01', '02', 'SHELF', true),
  ('A-01-03', 'A', '01', '03', 'SHELF', true),
  ('B-05-03', 'B', '005', '03', 'SHELF', true),
  ('C-10-05', 'C', '010', '05', 'SHELF', true),
  ('D-02-01', 'D', '002', '01', 'BIN', true),
  ('E-08-02', 'E', '008', '02', 'SHELF', true),
  ('F-12-03', 'F', '012', '03', 'SHELF', true)
ON CONFLICT (bin_id) DO NOTHING;

-- Insert Inventory
INSERT INTO inventory_units (unit_id, sku, bin_location, quantity, reserved)
VALUES
  ('IU-A-01-01', 'WIDGET-A-001', 'A-01-01', 50, 0),
  ('IU-B-05-03', 'GADGET-B-002', 'B-05-03', 40, 0),
  ('IU-C-10-05', 'TOOL-C-003', 'C-10-05', 25, 0),
  ('IU-D-02-01', 'PART-D-004', 'D-02-01', 100, 0),
  ('IU-E-08-02', 'COMP-E-005', 'E-08-02', 60, 0),
  ('IU-F-12-03', 'MATERIAL-F-006', 'F-12-03', 50, 0)
ON CONFLICT (unit_id) DO NOTHING;

-- Insert Orders
INSERT INTO orders (order_id, customer_id, customer_name, status, priority, created_at, updated_at, progress)
VALUES
  ('SO71001', 'CUST-71001', 'Acme Corporation', 'PENDING', 'HIGH', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours', 0),
  ('SO71002', 'CUST-71002', 'Globex Industries', 'PENDING', 'NORMAL', NOW() - INTERVAL '24 hours', NOW() - INTERVAL '24 hours', 0),
  ('SO71003', 'CUST-71003', 'Soylent Corp', 'PENDING', 'LOW', NOW() - INTERVAL '36 hours', NOW() - INTERVAL '36 hours', 0),
  ('SO71004', 'CUST-71004', 'Initech', 'PENDING', 'HIGH', NOW() - INTERVAL '48 hours', NOW() - INTERVAL '48 hours', 0),
  ('SO71005', 'CUST-71005', 'Umbrella Corporation', 'PICKING', 'NORMAL', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '3 hours', 60),
  ('SO71006', 'CUST-71006', 'Cyberdyne Systems', 'PICKING', 'HIGH', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '2 hours', 33),
  ('SO71007', 'CUST-71007', 'Stark Industries', 'PICKING', 'URGENT', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour', 40),
  ('SO71008', 'CUST-71008', 'Wayne Enterprises', 'PICKED', 'NORMAL', NOW() - INTERVAL '24 hours', NOW() - INTERVAL '12 hours', 100),
  ('SO71009', 'CUST-71009', 'Massive Dynamic', 'PACKING', 'HIGH', NOW() - INTERVAL '18 hours', NOW() - INTERVAL '6 hours', 100),
  ('SO71010', 'CUST-71010', 'Hooli', 'PACKED', 'LOW', NOW() - INTERVAL '72 hours', NOW() - INTERVAL '48 hours', 100),
  ('SO71011', 'CUST-71011', 'Pied Piper', 'PACKED', 'NORMAL', NOW() - INTERVAL '96 hours', NOW() - INTERVAL '72 hours', 100),
  ('SO71012', 'CUST-71012', 'Aviato', 'SHIPPED', 'NORMAL', NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days', 100),
  ('SO71013', 'CUST-71013', 'Endframe', 'SHIPPED', 'LOW', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days', 100),
  ('SO71014', 'CUST-71014', 'Bachmanity', 'SHIPPED', 'HIGH', NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days', 100)
ON CONFLICT (order_id) DO NOTHING;

-- Insert Order Items
INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status)
VALUES
  ('OI71001-1', 'SO71001', 'WIDGET-A-001', 'Widget A Type 1', 2, 0, 'A-01-01', 'PENDING'),
  ('OI71001-2', 'SO71001', 'GADGET-B-002', 'Gadget B Type 2', 1, 0, 'B-05-03', 'PENDING'),
  ('OI71001-3', 'SO71001', 'TOOL-C-003', 'Tool C Type 3', 3, 0, 'C-10-05', 'PENDING'),
  ('OI71002-1', 'SO71002', 'PART-D-004', 'Part D Type 4', 1, 0, 'D-02-01', 'PENDING'),
  ('OI71002-2', 'SO71002', 'COMP-E-005', 'Component E Type 5', 2, 0, 'E-08-02', 'PENDING'),
  ('OI71002-3', 'SO71002', 'MATERIAL-F-006', 'Material F Type 6', 1, 0, 'F-12-03', 'PENDING'),
  ('OI71003-1', 'SO71003', 'WIDGET-A-001', 'Widget A Type 1', 3, 0, 'A-01-01', 'PENDING'),
  ('OI71003-2', 'SO71003', 'GADGET-B-002', 'Gadget B Type 2', 2, 0, 'B-05-03', 'PENDING'),
  ('OI71004-1', 'SO71004', 'TOOL-C-003', 'Tool C Type 3', 1, 0, 'C-10-05', 'PENDING'),
  ('OI71004-2', 'SO71004', 'PART-D-004', 'Part D Type 4', 2, 0, 'D-02-01', 'PENDING'),
  ('OI71004-3', 'SO71004', 'COMP-E-005', 'Component E Type 5', 1, 0, 'E-08-02', 'PENDING'),
  ('OI71004-4', 'SO71004', 'MATERIAL-F-006', 'Material F Type 6', 2, 0, 'F-12-03', 'PENDING'),
  ('OI71005-1', 'SO71005', 'GADGET-B-002', 'Gadget B Type 2', 4, 4, 'B-05-03', 'FULLY_PICKED'),
  ('OI71005-2', 'SO71005', 'TOOL-C-003', 'Tool C Type 3', 2, 0, 'C-10-05', 'PENDING'),
  ('OI71005-3', 'SO71005', 'COMP-E-005', 'Component E Type 5', 3, 0, 'E-08-02', 'PENDING'),
  ('OI71005-4', 'SO71005', 'MATERIAL-F-006', 'Material F Type 6', 1, 0, 'F-12-03', 'PENDING'),
  ('OI71006-1', 'SO71006', 'COMP-E-005', 'Component E Type 5', 2, 2, 'E-08-02', 'FULLY_PICKED'),
  ('OI71006-2', 'SO71006', 'MATERIAL-F-006', 'Material F Type 6', 1, 1, 'F-12-03', 'FULLY_PICKED'),
  ('OI71006-3', 'SO71006', 'WIDGET-A-001', 'Widget A Type 1', 2, 0, 'A-01-01', 'PENDING'),
  ('OI71007-1', 'SO71007', 'PART-D-004', 'Part D Type 4', 4, 4, 'D-02-01', 'FULLY_PICKED'),
  ('OI71007-2', 'SO71007', 'COMP-E-005', 'Component E Type 5', 2, 2, 'E-08-02', 'FULLY_PICKED'),
  ('OI71007-3', 'SO71007', 'MATERIAL-F-006', 'Material F Type 6', 3, 0, 'F-12-03', 'PENDING'),
  ('OI71007-4', 'SO71007', 'WIDGET-A-001', 'Widget A Type 1', 1, 0, 'A-01-01', 'PENDING'),
  ('OI71007-5', 'SO71007', 'GADGET-B-002', 'Gadget B Type 2', 2, 0, 'B-05-03', 'PENDING')
ON CONFLICT (order_item_id) DO NOTHING;

-- Insert Pick Tasks for PICKING orders
INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, sku, name, target_bin, quantity, picked_quantity, status, picker_id, started_at, completed_at)
VALUES
  ('PT-SO71005-1', 'SO71005', 'OI71005-1', 'GADGET-B-002', 'Gadget B Type 2', 'B-05-03', 4, 4, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours'),
  ('PT-SO71006-1', 'SO71006', 'OI71006-1', 'COMP-E-005', 'Component E Type 5', 'E-08-02', 2, 2, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
  ('PT-SO71006-2', 'SO71006', 'OI71006-2', 'MATERIAL-F-006', 'Material F Type 6', 'F-12-03', 1, 1, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
  ('PT-SO71007-1', 'SO71007', 'OI71007-1', 'PART-D-004', 'Part D Type 4', 'D-02-01', 4, 4, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes'),
  ('PT-SO71007-2', 'SO71007', 'OI71007-2', 'COMP-E-005', 'Component E Type 5', 'E-08-02', 2, 2, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '10 minutes')
ON CONFLICT (pick_task_id) DO NOTHING;

-- Historical pick tasks for charts (completed in past 30 days)
INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, sku, name, target_bin, quantity, picked_quantity, status, picker_id, started_at, completed_at)
VALUES
  ('PT-SO71008-1', 'SO71008', 'OI71008-1', 'WIDGET-A-001', 'Widget A Type 1', 'A-01-01', 3, 3, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '24 hours', NOW() - INTERVAL '20 hours'),
  ('PT-SO71008-2', 'SO71008', 'OI71008-2', 'TOOL-C-003', 'C-10-05', 1, 1, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '22 hours', NOW() - INTERVAL '20 hours'),
  ('PT-SO71008-3', 'SO71008', 'OI71008-3', 'COMP-E-005', 'E-08-02', 2, 2, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '23 hours', NOW() - INTERVAL '20 hours'),
  ('PT-SO71008-4', 'SO71008', 'OI71008-4', 'PART-D-004', 'D-02-01', 1, 1, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '21 hours', NOW() - INTERVAL '20 hours'),
  ('PT-SO71009-1', 'SO71009', 'OI71009-1', 'GADGET-B-002', 'B-05-03', 2, 2, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '18 hours', NOW() - INTERVAL '14 hours'),
  ('PT-SO71009-2', 'SO71009', 'OI71009-2', 'TOOL-C-003', 'C-10-05', 1, 1, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '17 hours', NOW() - INTERVAL '14 hours'),
  ('PT-SO71009-3', 'SO71009', 'OI71009-3', 'MATERIAL-F-006', 'F-12-03', 2, 2, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '16 hours', NOW() - INTERVAL '14 hours'),
  ('PT-SO71010-1', 'SO71010', 'OI71010-1', 'WIDGET-A-001', 'A-01-01', 1, 1, 'COMPLETED', 'USR-PICK02', NOW() - INTERVAL '72 hours', NOW() - INTERVAL '65 hours'),
  ('PT-SO71010-2', 'SO71010', 'OI71010-2', 'PART-D-004', 'D-02-01', 3, 3, 'COMPLETED', 'USR-PICK02', NOW() - INTERVAL '70 hours', NOW() - INTERVAL '65 hours'),
  ('PT-SO71011-1', 'SO71011', 'OI71011-1', 'COMP-E-005', 'E-08-02', 2, 2, 'COMPLETED', 'USR-PICK02', NOW() - INTERVAL '95 hours', NOW() - INTERVAL '90 hours'),
  ('PT-SO71011-2', 'SO71011', 'OI71011-2', 'MATERIAL-F-006', 'F-12-03', 1, 1, 'COMPLETED', 'USR-PICK02', NOW() - INTERVAL '94 hours', NOW() - INTERVAL '90 hours'),
  ('PT-SO71011-3', 'SO71011', 'OI71011-3', 'GADGET-B-002', 'B-05-03', 2, 2, 'COMPLETED', 'USR-PICK02', NOW() - INTERVAL '93 hours', NOW() - INTERVAL '90 hours'),
  ('PT-SO71011-4', 'SO71011', 'OI71011-4', 'TOOL-C-003', 'C-10-05', 1, 1, 'COMPLETED', 'USR-PICK02', NOW() - INTERVAL '92 hours', NOW() - INTERVAL '90 hours'),
  ('PT-SO71012-1', 'SO71012', 'OI71012-1', 'WIDGET-A-001', 'A-01-01', 2, 2, 'COMPLETED', 'USR-PICK03', NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days'),
  ('PT-SO71012-2', 'SO71012', 'OI71012-2', 'GADGET-B-002', 'B-05-03', 1, 1, 'COMPLETED', 'USR-PICK03', NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),
  ('PT-SO71012-3', 'SO71012', 'OI71012-3', 'PART-D-004', 'D-02-01', 2, 2, 'COMPLETED', 'USR-PICK03', NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),
  ('PT-SO71013-1', 'SO71013', 'OI71013-1', 'TOOL-C-003', 'C-10-05', 3, 3, 'COMPLETED', 'USR-PICK04', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'),
  ('PT-SO71013-2', 'SO71013', 'OI71013-2', 'COMP-E-005', 'E-08-02', 1, 1, 'COMPLETED', 'USR-PICK04', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'),
  ('PT-SO71013-3', 'SO71013', 'OI71013-3', 'MATERIAL-F-006', 'F-12-03', 2, 2, 'COMPLETED', 'USR-PICK04', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'),
  ('PT-SO71013-4', 'SO71013', 'OI71013-4', 'WIDGET-A-001', 'A-01-01', 1, 1, 'COMPLETED', 'USR-PICK04', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'),
  ('PT-SO71013-5', 'SO71013', 'OI71013-5', 'GADGET-B-002', 'B-05-03', 2, 2, 'COMPLETED', 'USR-PICK04', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'),
  ('PT-SO71014-1', 'SO71014', 'OI71014-1', 'PART-D-004', 'D-02-01', 4, 4, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days'),
  ('PT-SO71014-2', 'SO71014', 'OI71014-2', 'COMP-E-005', 'E-08-02', 3, 3, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '19 days', NOW() - INTERVAL '15 days'),
  ('PT-SO71014-3', 'SO71014', 'OI71014-3', 'MATERIAL-F-006', 'F-12-03', 2, 2, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '19 days', NOW() - INTERVAL '15 days'),
  ('PT-SO71014-4', 'SO71014', 'OI71014-4', 'TOOL-C-003', 'C-10-05', 1, 1, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '18 days', NOW() - INTERVAL '15 days'),
  ('PT-SO71014-5', 'SO71014', 'OI71014-5', 'WIDGET-A-001', 'A-01-01', 2, 2, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '18 days', NOW() - INTERVAL '15 days'),
  ('PT-SO71014-6', 'SO71014', 'OI71014-6', 'GADGET-B-002', 'B-05-03', 2, 2, 'COMPLETED', 'USR-PICK01', NOW() - INTERVAL '18 days', NOW() - INTERVAL '15 days')
ON CONFLICT (pick_task_id) DO NOTHING;
