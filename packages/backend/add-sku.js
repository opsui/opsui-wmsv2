const { Pool } = require('pg');
require('dotenv').config();

async function addSku() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'wms_db',
    user: process.env.DB_USER || 'wms_user',
    password: process.env.DB_PASSWORD || 'wms_password',
  });

  try {
    await pool.query(`
      INSERT INTO skus (sku, name, status, created_at, updated_at)
      VALUES ('WIDGET-001', 'WIDGET-001', 'ACTIVE', NOW(), NOW())
      ON CONFLICT (sku) DO NOTHING
    `);
    console.log('SKU WIDGET-001 created successfully');
  } catch (error) {
    console.error('Error creating SKU:', error);
  } finally {
    await pool.end();
  }
}

addSku();