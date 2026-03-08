const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  try {
    // First run phase 1 (chart of accounts needed as dependency)
    const phase1 = fs.readFileSync(
      path.join(__dirname, 'src/db/migrations/044_add_full_erp_accounting_phase1.sql'),
      'utf8'
    );
    console.log('Running Phase 1 migration...');
    await pool.query(phase1);
    console.log('Phase 1 completed!');

    // Run phase 2
    const phase2 = fs.readFileSync(
      path.join(__dirname, 'src/db/migrations/045_add_full_erp_accounting_phase2.sql'),
      'utf8'
    );
    console.log('Running Phase 2 migration...');
    await pool.query(phase2);
    console.log('Phase 2 completed!');

    // Run phase 3 (fixed assets)
    const phase3 = fs.readFileSync(
      path.join(__dirname, 'src/db/migrations/046_add_full_erp_accounting_phase3.sql'),
      'utf8'
    );
    console.log('Running Phase 3 migration...');
    await pool.query(phase3);
    console.log('Phase 3 completed!');

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();
