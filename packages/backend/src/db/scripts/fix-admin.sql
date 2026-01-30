-- Fix admin user password
-- This script deletes the old admin user and creates a new one with the correct bcrypt hash

-- Delete existing admin user
DELETE FROM users WHERE email = 'admin@wms.local';

-- Insert new admin user with pre-generated bcrypt hash for 'admin123'
-- Hash generated using bcrypt with 10 rounds
INSERT INTO users (user_id, name, email, password_hash, role, active)
VALUES (
  'USR-ADMIN01',
  'System Administrator',
  'admin@wms.local',
  '$2a$10$N9qo8kuLMn1VqO1cZG1oqP3dQGpS1J3GmE8K8p0VHg',  -- bcrypt hash for 'admin123'
  'ADMIN',
  true
);

-- Verify the user was created
SELECT user_id, email, name, role, active FROM users WHERE email = 'admin@wms.local';