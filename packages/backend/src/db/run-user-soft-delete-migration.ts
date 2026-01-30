/**
 * Run the add_user_soft_delete migration
 */

import { query, closePool } from './client';

async function runMigration() {
  try {
    console.log('Running add_user_soft_delete migration...');

    // Add deleted_at column
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`);
    console.log('✓ Added deleted_at column');

    // Create index for efficient queries
    await query(
      `CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL`
    );
    console.log('✓ Created index on deleted_at');

    // Add comment
    await query(
      `COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user was marked for deletion. Users are permanently deleted after 3 days. NULL means user is active.'`
    );
    console.log('✓ Added column comment');

    // Create cleanup function
    await query(`
      CREATE OR REPLACE FUNCTION cleanup_deleted_users()
      RETURNS INTEGER AS $$
      DECLARE
        deleted_count INTEGER;
      BEGIN
        DELETE FROM users
        WHERE deleted_at IS NOT NULL
          AND deleted_at < NOW() - INTERVAL '3 days';

        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Cleaned up % users past 3-day grace period', deleted_count;
        RETURN deleted_count;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✓ Created cleanup_deleted_users function');

    // Add function comment
    await query(
      `COMMENT ON FUNCTION cleanup_deleted_users() IS 'Permanently deletes users who were marked for deletion more than 3 days ago. Returns the count of deleted users.'`
    );
    console.log('✓ Added function comment');

    console.log('\n✅ Migration completed successfully!');
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

runMigration();
