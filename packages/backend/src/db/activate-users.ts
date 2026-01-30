/**
 * Activate all users
 */

import { query, closePool } from './client';
import { logger } from '../config/logger';

async function activateUsers() {
  try {
    logger.info('Activating users...');
    const result = await query(`UPDATE users SET active = true`);
    logger.info(`Updated ${result.rowCount} users`);
    await closePool();
    process.exit(0);
  } catch (error) {
    logger.error('Failed to activate users', {
      error: error instanceof Error ? error.message : String(error),
    });
    await closePool();
    process.exit(1);
  }
}

activateUsers().catch(error => {
  logger.error('Unhandled error in activateUsers', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
