/**
 * Migration: Add is_active column to users table
 *
 * This column tracks whether a user is currently active (tab open/focused)
 * independent of current_view and current_view_updated_at
 */

import { query, closePool } from './client';

async function addIsActiveColumn(): Promise<void> {
  console.log('🔍 Adding is_active column to users table...\n');

  try {
    // Check if column already exists
    const checkResult = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'is_active';
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Column is_active already exists, skipping migration');
      return;
    }

    // Add the column
    await query(`
      ALTER TABLE users
      ADD COLUMN is_active BOOLEAN DEFAULT true;
    `);

    console.log('✅ Successfully added is_active column to users table');

    // Add comment
    await query(`
      COMMENT ON COLUMN users.is_active IS 'Whether the user is currently active (tab open/focused). Set to false immediately when tab hidden, true when tab visible.';
    `);

    console.log('✅ Added comment to is_active column\n');

    // Verify the column was added
    const verifyResult = await query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'is_active';
    `);

    console.log('Column details:', verifyResult.rows[0]);
  } catch (error) {
    console.error('Error adding is_active column:', error);
    throw error;
  }
}

// Run the migration
addIsActiveColumn()
  .then(async () => {
    console.log('Migration completed successfully');
    await closePool();
  })
  .catch(async error => {
    console.error('Migration failed:', error);
    await closePool();
    process.exit(1);
  });
