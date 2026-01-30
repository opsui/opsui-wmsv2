-- Script to create a stock controller user account
-- Run this script in your PostgreSQL database after applying the migrations
--
-- Default credentials:
-- Email: stockcontroller@wms.local
-- Password: Stock123! (You should change this after first login)
--
-- Password hash is bcrypt hash of 'Stock123!'

INSERT INTO users (user_id, name, email, password_hash, role)
VALUES (
  'USR-SC001',
  'Stock Controller',
  'stockcontroller@wms.local',
  '$2b$10$YourBcryptHashHereForStock123',
  'STOCK_CONTROLLER'
)
ON CONFLICT (user_id) DO NOTHING
ON CONFLICT (email) DO NOTHING;

-- Note: Replace '$2b$10$YourBcryptHashHereForStock123' with an actual bcrypt hash
-- You can generate one using a backend utility or online bcrypt generator

-- Verification query to check if user was created
SELECT user_id, name, email, role, active, created_at
FROM users
WHERE role = 'STOCK_CONTROLLER';
