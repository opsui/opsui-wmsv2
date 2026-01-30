UPDATE users SET password_hash = '$2b$10$OnX72ywk0pMNkwl.di/SIe4AQ77O2CxTqQ.1oOYHL0t.EK0oYfLve' WHERE email = 'admin@wms.local';
SELECT user_id, email, password_hash FROM users WHERE email = 'admin@wms.local';
