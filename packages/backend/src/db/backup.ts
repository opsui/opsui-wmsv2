/**
 * Database Backup Utility
 *
 * Creates JSON backups of database data
 */

import { query, closePool } from './client';
import { logger } from '../config/logger';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

interface BackupData {
  timestamp: string;
  version: string;
  tables: {
    [key: string]: any[];
  };
}

/**
 * Create a backup of all database data
 */
export async function createBackup(backupName?: string): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = backupName || `backup-${timestamp}`;

    logger.info('Creating database backup...', { backupId });

    const tables = [
      'users',
      'skus',
      'bin_locations',
      'inventory_units',
      'orders',
      'order_items',
      'pick_tasks',
      'inventory_transactions',
      'order_state_changes',
    ];

    const backupData: BackupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      tables: {},
    };

    // Dump each table
    for (const table of tables) {
      try {
        const result = await query(`SELECT * FROM ${table}`);
        backupData.tables[table] = result.rows;
        logger.info(`Backed up ${table}: ${result.rowCount} rows`);
      } catch (error) {
        logger.warn(`Failed to backup ${table}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with other tables
      }
    }

    // Ensure backup directory exists
    const backupDir = join(process.cwd(), 'backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    // Write backup file
    const backupPath = join(backupDir, `${backupId}.json`);
    writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');

    const fileSize = Buffer.byteLength(JSON.stringify(backupData), 'utf-8');
    logger.info('Backup created successfully', {
      backupId,
      path: backupPath,
      size: `${(fileSize / 1024).toFixed(2)} KB`,
    });

    return backupPath;
  } catch (error) {
    logger.error('Backup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Restore database from a backup file
 */
export async function restoreBackup(backupPath: string): Promise<void> {
  try {
    logger.info('Restoring database from backup...', { backupPath });

    // Read backup file
    const backupContent = readFileSync(backupPath, 'utf-8');
    const backupData: BackupData = JSON.parse(backupContent);

    logger.info('Backup info', {
      timestamp: backupData.timestamp,
      version: backupData.version,
      tables: Object.keys(backupData.tables),
    });

    // Begin transaction
    await query('BEGIN');

    // Clear existing data
    await query(`
      TRUNCATE TABLE
        order_state_changes CASCADE,
        inventory_transactions CASCADE,
        pick_tasks CASCADE,
        order_items CASCADE,
        orders CASCADE,
        inventory_units CASCADE,
        bin_locations CASCADE,
        skus CASCADE,
        users CASCADE
    `);

    // Restore each table
    for (const [table, rows] of Object.entries(backupData.tables)) {
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const columnsStr = columns.join(', ');

      for (const row of rows) {
        const values = columns.map(col => row[col]);
        await query(`INSERT INTO ${table} (${columnsStr}) VALUES (${placeholders})`, values);
      }

      logger.info(`Restored ${table}: ${rows.length} rows`);
    }

    // Commit transaction
    await query('COMMIT');

    logger.info('Database restored successfully');
  } catch (error) {
    await query('ROLLBACK');
    logger.error('Restore failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<string[]> {
  const backupDir = join(process.cwd(), 'backups');

  if (!existsSync(backupDir)) {
    return [];
  }

  const files = readdirSync(backupDir)
    .filter((f: string) => f.endsWith('.json'))
    .sort()
    .reverse();

  return files.map((f: string) => join(backupDir, f));
}

// CLI Entry Point
async function main() {
  const command = process.argv[2] || 'create';
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'create':
        const backupPath = await createBackup(arg);
        console.log(`✅ Backup created: ${backupPath}`);
        break;

      case 'restore':
        if (!arg) {
          console.error('Usage: tsx src/db/backup.ts restore <backup-file>');
          process.exit(1);
        }
        await restoreBackup(arg);
        console.log('✅ Database restored');
        break;

      case 'list':
        const backups = await listBackups();
        if (backups.length === 0) {
          console.log('No backups found');
        } else {
          console.log('\n📋 Available backups:\n');
          backups.forEach((backup, i) => {
            const stats = statSync(backup);
            const size = (stats.size / 1024).toFixed(2);
            const fileName = backup.split('\\').pop()?.split('/').pop() || backup;
            console.log(`  ${i + 1}. ${fileName} (${size} KB)`);
          });
        }
        break;

      default:
        console.error('Unknown command:', command);
        console.error('Usage: tsx src/db/backup.ts <create|restore|list> [arg]');
        process.exit(1);
    }

    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    await closePool();
    process.exit(1);
  }
}

// Check if this file is being run directly
const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] === modulePath) {
  main();
}

export { main as backupCli };
