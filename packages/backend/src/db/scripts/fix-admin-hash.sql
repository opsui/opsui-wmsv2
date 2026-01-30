-- Fix admin password hash
-- Generated: 2026-01-12
-- Password: admin123
-- Rounds: 10
-- Hash length: 60

-- Delete old admin user (if exists)
DELETE FROM users WHERE email = 'admin@wms.local';

-- Insert admin user with correct password hash
INSERT INTO users (user_id, name, email, password_hash, role, active)
VALUES (
  'USR-ADMIN01',
  'System Administrator',
  'admin@wms.local',
  '$2b$10$UnBiXTid.WeCOmGuppXlfuQKOdVIRegkJHCXKoSCLSciGL07bgT7u',
  'ADMIN',
  true
);

-- Verify insertion
SELECT user_id, email, name, role FROM users WHERE email = 'admin@wms.local';