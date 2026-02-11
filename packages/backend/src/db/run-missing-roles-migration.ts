/**
 * Run the add_all_missing_roles migration
 * This ensures all user roles defined in the frontend enum exist in the database
 */

import { query, closePool } from './client';

const ROLES_TO_ADD = [
  'STOCK_CONTROLLER',
  'INWARDS',
  'DISPATCH',
  'PRODUCTION',
  'SALES',
  'MAINTENANCE',
  'RMA',
  'ACCOUNTING',
  'HR_MANAGER',
  'HR_ADMIN',
];

async function runMigration() {
  try {
    console.log('Running add_all_missing_roles migration...');

    // First, list current roles
    const currentRoles = await query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
      ORDER BY enumlabel
    `);

    console.log('\nCurrent user_role enum values:');
    currentRoles.rows.forEach(row => console.log(`  - ${row.enumlabel}`));

    // Add each missing role
    for (const role of ROLES_TO_ADD) {
      const exists = await query(
        `
        SELECT 1 FROM pg_enum
        WHERE enumlabel = $1
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
      `,
        [role]
      );

      if (exists.rows.length === 0) {
        console.log(`Adding ${role} to user_role enum...`);
        await query(`ALTER TYPE user_role ADD VALUE '${role}'`);
      } else {
        console.log(`${role} already exists in user_role enum`);
      }
    }

    // List final roles
    const finalRoles = await query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
      ORDER BY enumlabel
    `);

    console.log('\nFinal user_role enum values:');
    finalRoles.rows.forEach(row => console.log(`  - ${row.enumlabel}`));

    console.log('\nMigration completed successfully!');
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

runMigration();
