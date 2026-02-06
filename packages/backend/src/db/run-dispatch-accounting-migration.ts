/**
 * Run the add_dispatch_and_accounting_roles migration
 */

import { query, closePool } from './client';

async function runMigration() {
  try {
    console.log('Running add_dispatch_and_accounting_roles migration...');

    // Check if DISPATCH exists
    const dispatchExists = await query(`
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'DISPATCH'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    `);

    // Add DISPATCH if it doesn't exist
    if (dispatchExists.rows.length === 0) {
      console.log('Adding DISPATCH to user_role enum...');
      await query(`ALTER TYPE user_role ADD VALUE 'DISPATCH'`);
    } else {
      console.log('DISPATCH already exists in user_role enum');
    }

    // Check if ACCOUNTING exists
    const accountingExists = await query(`
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'ACCOUNTING'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    `);

    // Add ACCOUNTING if it doesn't exist
    if (accountingExists.rows.length === 0) {
      console.log('Adding ACCOUNTING to user_role enum...');
      await query(`ALTER TYPE user_role ADD VALUE 'ACCOUNTING'`);
    } else {
      console.log('ACCOUNTING already exists in user_role enum');
    }

    console.log('Migration completed successfully!');
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

runMigration();
