const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password'
});

async function addProducts() {
  try {
    // Check if products table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'products'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Products table does not exist. Creating it...');
      await pool.query(`
        CREATE TABLE products (
          product_id SERIAL PRIMARY KEY,
          sku VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(50),
          uom VARCHAR(10) DEFAULT 'EA',
          status VARCHAR(20) DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('Products table created.');
    }
    
    // Insert products
    const result = await pool.query(`
      INSERT INTO products (sku, name, description, category, uom, status)
      VALUES 
        ('WIDGET-001', 'Widget Product', 'Manufactured widget product', 'FINISHED_GOODS', 'EA', 'ACTIVE'),
        ('COMP-001', 'Component 001', 'Component for widget', 'RAW_MATERIAL', 'EA', 'ACTIVE')
      ON CONFLICT (sku) DO UPDATE SET 
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        status = EXCLUDED.status
      RETURNING sku, name;
    `);
    
    console.log('Products added/updated:', result.rows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addProducts();