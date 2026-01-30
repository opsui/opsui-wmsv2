/**
 * Add barcode column to SKUs table and generate barcodes for existing SKUs
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Adding barcode column to skus table...');
    await client.query(`ALTER TABLE skus ADD COLUMN IF NOT EXISTS barcode VARCHAR(20)`);
    console.log('✓ Barcode column added');

    console.log('Creating index on barcode...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_skus_barcode ON skus(barcode)`);
    console.log('✓ Index created');

    console.log('Generating barcodes for existing SKUs...');
    const barcodeUpdates = [
      ['WIDGET-A-001', '0012345678901'],
      ['WIDGET-A-002', '0012345678902'],
      ['WIDGET-B-001', '0012345678903'],
      ['GADGET-X-100', '0012345678904'],
      ['GADGET-Y-200', '0012345678905'],
      ['TOOL-PLYR-01', '0012345678906'],
      ['TOOL-HAMM-02', '0012345678907'],
      ['TOOL-SDRV-03', '0012345678908'],
      ['ELEC-CBL-001', '0012345678909'],
      ['ELEC-CHR-002', '0012345678910'],
      ['ELEC-BTY-003', '0012345678911'],
      ['HOME-LAMP-01', '0012345678912'],
      ['HOME-ORG-02', '0012345678913'],
      ['AUTO-OIL-001', '0012345678914'],
      ['AUTO-FIL-002', '0012345678915'],
    ];

    for (const [sku, barcode] of barcodeUpdates) {
      await client.query(`UPDATE skus SET barcode = $1 WHERE sku = $2`, [barcode, sku]);
      console.log(`  ✓ ${sku}: ${barcode}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!');

    // Verify
    const result = await pool.query(`SELECT sku, name, barcode FROM skus ORDER BY sku`);
    console.log('\n📦 SKUs with barcodes:');
    result.rows.forEach(row => {
      console.log(`  ${row.sku}: ${row.barcode || '(none)'} - ${row.name}`);
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
