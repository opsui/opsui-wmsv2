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
 * Helper function to get a random date within the last N days
 */
function getRandomDate(daysBack: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

/**
 * Helper function to get a date relative to a base date
 */
function addHours(baseDate: Date, hours: number): Date {
  return new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Seed sample orders with historical data for dashboard graphs
 */
async function seedOrders(): Promise<void> {
  logger.info('Seeding sample orders with historical data...');

  const customers = [
    'Acme Corp',
    'Globex Inc',
    'Soylent Corp',
    'Initech',
    'Umbrella Corp',
    'Stark Industries',
    'Wayne Enterprises',
    'Cyberdyne Systems',
  ];
  const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
  const pickers = ['USR-PICK01', 'USR-PICK02'];
  const packers = ['USR-PACK01'];

  // Create orders distributed across the last 90 days with various statuses
  const ordersConfig = [
    // Recent shipped orders (last 7 days) - for throughput graphs
    ...Array.from({ length: 15 }, () => ({
      daysAgo: Math.random() * 7,
      status: 'SHIPPED' as const,
      priority: 'NORMAL' as const,
    })),
    // Recently picked/packed orders
    ...Array.from({ length: 8 }, () => ({
      daysAgo: Math.random() * 3,
      status: 'PACKED' as const,
      priority: 'NORMAL' as const,
    })),
    ...Array.from({ length: 5 }, () => ({
      daysAgo: Math.random() * 2,
      status: 'PICKED' as const,
      priority: 'NORMAL' as const,
    })),
    // Currently being processed
    ...Array.from({ length: 6 }, () => ({
      daysAgo: Math.random() * 1,
      status: 'PICKING' as const,
      priority: 'HIGH' as const,
    })),
    ...Array.from({ length: 4 }, () => ({
      daysAgo: Math.random() * 1,
      status: 'PACKING' as const,
      priority: 'NORMAL' as const,
    })),
    // Pending orders in queue
    ...Array.from({ length: 12 }, () => ({
      daysAgo: Math.random() * 0.5,
      status: 'PENDING' as const,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
    })),
    // Historical shipped orders (for monthly/yearly graphs)
    ...Array.from({ length: 30 }, () => ({
      daysAgo: 7 + Math.random() * 83, // 7-90 days ago
      status: 'SHIPPED' as const,
      priority: 'NORMAL' as const,
    })),
    // Some cancelled orders for status breakdown
    ...Array.from({ length: 3 }, () => ({
      daysAgo: Math.random() * 30,
      status: 'CANCELLED' as const,
      priority: 'LOW' as const,
    })),
  ];

  for (const config of ordersConfig) {
    const orderId = generateOrderId();
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const createdAt = getRandomDate(config.daysAgo);
    const status = config.status;
    const priority = config.priority;

    // Assign picker/packer based on status
    let pickerId: string | null = null;
    let packerId: string | null = null;
    let shippedAt: Date | null = null;
    let progress = 0;

    if (
      status === 'PICKING' ||
      status === 'PICKED' ||
      status === 'PACKING' ||
      status === 'PACKED' ||
      status === 'SHIPPED'
    ) {
      pickerId = pickers[Math.floor(Math.random() * pickers.length)];
      progress = status === 'PICKING' ? 50 : 100;
    }

    if (status === 'PACKING' || status === 'PACKED' || status === 'SHIPPED') {
      packerId = packers[Math.floor(Math.random() * packers.length)];
      progress = status === 'PACKING' ? 75 : 100;
    }

    if (status === 'SHIPPED') {
      shippedAt = addHours(createdAt, 24 + Math.random() * 48); // 1-3 days after creation
      progress = 100;
    }

    await query(
      `INSERT INTO orders (order_id, customer_id, customer_name, priority, status, picker_id, packer_id, shipped_at, created_at, updated_at, progress)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (order_id) DO NOTHING`,
      [
        orderId,
        `CUST-${Math.floor(Math.random() * 10000)}`,
        customer,
        priority,
        status,
        pickerId,
        packerId,
        shippedAt,
        createdAt,
        status === 'SHIPPED' ? shippedAt : createdAt,
        progress,
      ]
    );

    // Add random items to each order
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const usedSKUs = new Set<string>();

    for (let j = 0; j < itemCount; j++) {
      const sku = sampleSKUs[Math.floor(Math.random() * sampleSKUs.length)];
      if (usedSKUs.has(sku.sku)) {
        continue;
      }
      usedSKUs.add(sku.sku);

      const quantity = Math.floor(Math.random() * 5) + 1;
      const binLocation = sku.binLocations[Math.floor(Math.random() * sku.binLocations.length)];

      const orderItemId = `OI${orderId.slice(-3)}${Date.now().toString().slice(-6)}${j}`;

      // Calculate picked quantity and verified quantity based on order status
      let pickedQuantity = 0;
      let verifiedQuantity = 0;
      let itemStatus = 'PENDING';

      if (status === 'PICKING') {
        pickedQuantity = Math.floor(Math.random() * quantity);
        itemStatus = pickedQuantity > 0 ? 'PARTIAL_PICKED' : 'PENDING';
      } else if (
        status === 'PICKED' ||
        status === 'PACKING' ||
        status === 'PACKED' ||
        status === 'SHIPPED'
      ) {
        pickedQuantity = quantity;
        itemStatus = 'FULLY_PICKED';
      }

      if (status === 'PACKING' || status === 'PACKED' || status === 'SHIPPED') {
        verifiedQuantity = quantity;
      }

      await query(
        `INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, verified_quantity, bin_location, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          orderItemId,
          orderId,
          sku.sku,
          sku.name,
          quantity,
          pickedQuantity,
          verifiedQuantity,
          binLocation,
          itemStatus,
        ]
      );

      // Create pick_tasks for orders that are being picked or have been picked
      if (
        pickerId &&
        (status === 'PICKING' ||
          status === 'PICKED' ||
          status === 'PACKING' ||
          status === 'PACKED' ||
          status === 'SHIPPED')
      ) {
        const pickTaskId = `PT-${orderId.slice(-6)}${j}`;
        const startedAt = addHours(createdAt, 1 + Math.random() * 4);

        let taskStatus = 'COMPLETED';
        let completedAt: Date | null = addHours(startedAt, 0.5 + Math.random() * 2);

        if (status === 'PICKING') {
          // Some tasks might still be in progress
          if (Math.random() > 0.7) {
            taskStatus = 'IN_PROGRESS';
            completedAt = null;
          }
        }

        const actualPickedQuantity = taskStatus === 'COMPLETED' ? quantity : pickedQuantity;

        await query(
          `INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, sku, name, target_bin, quantity, picked_quantity, status, picker_id, started_at, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (pick_task_id) DO NOTHING`,
          [
            pickTaskId,
            orderId,
            orderItemId,
            sku.sku,
            sku.name,
            binLocation,
            quantity,
            actualPickedQuantity,
            taskStatus,
            pickerId,
            startedAt,
            completedAt,
          ]
        );
      }
      // Note: pack_tasks table doesn't exist in this schema - packers are tracked via orders.packer_id
    }
  }

  logger.info('Seeded sample orders with historical data');
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

// Run if called directly (ES module equivalent of require.main === module)
const isMainModule =
  import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;

if (isMainModule) {
  main();
}

export { main as seedCli };
