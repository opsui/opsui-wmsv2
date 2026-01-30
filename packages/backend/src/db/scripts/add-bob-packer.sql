
-- Add bob.packer user account
-- Generated: 2026-01-16T14:23:12.110Z
-- Password: packer123
-- Rounds: 10

-- Insert bob.packer user
INSERT INTO users (user_id, name, email, password_hash, role, active)
VALUES (
  'USR-PACK01',
  'Bob Packer',
  'bob.packer@wms.local',
  '$2b$10$7uNW0EhE1ytkn2MjiuXh8.iGl3FgOZSpc0z6tur3.tZYXFJ/ODK8q',
  'PACKER',
  true
);

-- Verify insertion
SELECT user_id, email, name, role FROM users WHERE email = 'bob.packer@wms.local';
