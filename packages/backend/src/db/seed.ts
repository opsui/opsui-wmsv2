/**
 * Database seed data
 *
 * Populates the database with sample data for development and testing.
 */

import { query } from './client';
import { logger } from '../config/logger';
import { generateOrderId } from '@opsui/shared';

// ============================================================================
// SEED DATA
// ============================================================================

const sampleSKUs = [
  {
    sku: 'WIDGET-A',
    name: 'Standard Widget A',
    description: 'A basic widget for general purpose use',
    category: 'Widgets',
    barcode: '0796548106754',
    binLocations: ['A-01-01', 'A-01-02'],
  },
  {
    sku: 'WIDGET-B',
    name: 'Premium Widget B',
    description: 'A high-quality widget for specialized applications',
    category: 'Widgets',
    barcode: '0796548106761',
    binLocations: ['A-02-01', 'A-02-02'],
  },
  {
    sku: 'GADGET-X',
    name: 'Gadget Model X',
    description: 'Advanced gadget with multiple features',
    category: 'Gadgets',
    barcode: '0796548106778',
    binLocations: ['B-01-01', 'B-01-02'],
  },
  {
    sku: 'GADGET-Y',
    name: 'Gadget Model Y',
    description: 'Compact gadget for tight spaces',
    category: 'Gadgets',
    barcode: '0796548106785',
    binLocations: ['B-02-01'],
  },
  {
    sku: 'TOOL-001',
    name: 'Basic Tool Set',
    description: 'Entry-level tool set for beginners',
    category: 'Tools',
    barcode: '0796548106792',
    binLocations: ['C-01-01', 'C-01-02'],
  },
  {
    sku: 'TOOL-002',
    name: 'Professional Tool Set',
    description: 'Professional-grade tool set',
    category: 'Tools',
    barcode: '0796548106808',
    binLocations: ['C-02-01'],
  },
  {
    sku: 'PART-123',
    name: 'Replacement Part 123',
    description: 'Common replacement part',
    category: 'Parts',
    barcode: '0796548106815',
    binLocations: ['D-01-01', 'D-01-02', 'D-01-03'],
  },
  {
    sku: 'PART-456',
    name: 'Replacement Part 456',
    description: 'Specialized replacement part',
    category: 'Parts',
    barcode: '0796548106822',
    binLocations: ['D-02-01'],
  },
];

const sampleUsers = [
  {
    userId: 'USR-ADMIN01',
    name: 'System Administrator',
    email: 'admin@wms.local',
    passwordHash: '$2b$10$CgKwmXM87JdTeFqtAyPb8u7.0tJZ2Fy856HYQ7xpNIjzeeKcMA/m.', // admin123
    role: 'ADMIN',
  },
  {
    userId: 'USR-PICK01',
    name: 'John Picker',
    email: 'john.picker@wms.local',
    passwordHash: '$2b$10$q6FA5Ae8XrStPD6StY2GROk6pze4j29Mb214EnLOqh4dddBWdWvxq', // password123
    role: 'PICKER',
  },
  {
    userId: 'USR-PICK02',
    name: 'Jane Picker',
    email: 'jane.picker@wms.local',
    passwordHash: '$2b$10$q6FA5Ae8XrStPD6StY2GROk6pze4j29Mb214EnLOqh4dddBWdWvxq', // password123
    role: 'PICKER',
  },
  {
    userId: 'USR-PACK01',
    name: 'Bob Packer',
    email: 'bob.packer@wms.local',
    passwordHash: '$2b$10$q6FA5Ae8XrStPD6StY2GROk6pze4j29Mb214EnLOqh4dddBWdWvxq', // password123
    role: 'PACKER',
  },
  {
    userId: 'USR-SUPV01',
    name: 'Alice Supervisor',
    email: 'alice.supervisor@wms.local',
    passwordHash: '$2b$10$q6FA5Ae8XrStPD6StY2GROk6pze4j29Mb214EnLOqh4dddBWdWvxq', // password123
    role: 'SUPERVISOR',
  },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

/**
 * Seed SKUs and bin locations
 */
async function seedSKUs(): Promise<void> {
  logger.info('Seeding SKUs...');

  for (const sku of sampleSKUs) {
    await query(
      `INSERT INTO skus (sku, name, description, category, barcode)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (sku) DO NOTHING`,
      [sku.sku, sku.name, sku.description, sku.category, sku.barcode]
    );

    // Create bin locations
    for (const binId of sku.binLocations) {
      const match = binId.match(/^([A-Z])-([0-9]{1,3})-([0-9]{2})$/);
      if (match) {
        await query(
          `INSERT INTO bin_locations (bin_id, zone, aisle, shelf)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (bin_id) DO NOTHING`,
          [binId, match[1], match[2], match[3]]
        );

        // Add inventory
        await query(
          `INSERT INTO inventory_units (unit_id, sku, bin_location, quantity, reserved)
           VALUES ($1, $2, $3, $4, 0)
           ON CONFLICT (unit_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
          [`IU-${sku.sku}-${binId}`, sku.sku, binId, Math.floor(Math.random() * 50) + 10]
        );
      }
    }
  }

  logger.info(`Seeded ${sampleSKUs.length} SKUs`);
}

/**
 * Seed users
 */
async function seedUsers(): Promise<void> {
  logger.info('Seeding users...');

  for (const user of sampleUsers) {
    await query(
      `INSERT INTO users (user_id, name, email, password_hash, role, active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.userId, user.name, user.email, user.passwordHash, user.role]
    );
  }

  logger.info(`Seeded ${sampleUsers.length} users`);
}

/**
 * Seed sample orders
 */
async function seedOrders(): Promise<void> {
  logger.info('Seeding sample orders...');

  const customers = ['Acme Corp', 'Globex Inc', 'Soylent Corp', 'Initech'];
  const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

  for (let i = 0; i < 10; i++) {
    const orderId = generateOrderId();
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];

    await query(
      `INSERT INTO orders (order_id, customer_id, customer_name, priority, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       ON CONFLICT (order_id) DO NOTHING`,
      [orderId, `CUST-${Math.floor(Math.random() * 1000)}`, customer, priority]
    );

    // Add random items to each order
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const usedSKUs = new Set<string>();

    for (let j = 0; j < itemCount; j++) {
      const sku = sampleSKUs[Math.floor(Math.random() * sampleSKUs.length)];
      if (usedSKUs.has(sku.sku)) {
        continue;
      }
      usedSKUs.add(sku.sku);

      const quantity = Math.floor(Math.random() * 5) + 1;
      const binLocation = sku.binLocations[0];

      const orderItemId = `OI${orderId.slice(-3)}${Date.now().toString().slice(-6)}`;
      // Don't specify status - let it use the default
      await query(
        `INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, bin_location)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderItemId, orderId, sku.sku, sku.name, quantity, binLocation]
      );
    }
  }

  logger.info('Seeded sample orders');
}

/**
 * Run all seed operations
 */
export async function runSeed(): Promise<void> {
  try {
    logger.info('Starting database seed...');

    await seedSKUs();
    await seedUsers();
    await seedOrders();

    logger.info('Database seed completed successfully');
  } catch (error) {
    logger.error('Database seed failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

/**
 * Main function for running seed from command line
 */
async function main(): Promise<void> {
  const { closePool } = await import('./client');

  try {
    await runSeed();
    await closePool();
    process.exit(0);
  } catch (error) {
    logger.error('Seed script failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    await closePool();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as seedCli };
