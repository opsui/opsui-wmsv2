/**
 * Test Data Factories
 *
 * Provides factory functions for creating test data.
 * Uses faker.js for generating realistic test data.
 */

import { faker } from '@faker-js/faker';
import {
  Order,
  OrderStatus,
  OrderPriority,
  OrderItem,
  OrderItemStatus,
  User,
  UserRole,
  PickTask,
  TaskStatus,
  InventoryUnit,
} from '@opsui/shared';

/**
 * Factory for creating test users
 */
export const userFactory = {
  create(overrides: Partial<User> = {}): User {
    const roles = Object.values(UserRole);
    return {
      userId: `USR-${faker.string.uuid()}`,
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: faker.helpers.arrayElement(roles),
      active: true,
      createdAt: faker.date.past(),
      ...overrides,
    };
  },

  createPicker(overrides: Partial<User> = {}): User {
    return this.create({
      role: UserRole.PICKER,
      ...overrides,
    });
  },

  createPacker(overrides: Partial<User> = {}): User {
    return this.create({
      role: UserRole.PACKER,
      ...overrides,
    });
  },

  createAdmin(overrides: Partial<User> = {}): User {
    return this.create({
      role: UserRole.ADMIN,
      ...overrides,
    });
  },

  createSupervisor(overrides: Partial<User> = {}): User {
    return this.create({
      role: UserRole.SUPERVISOR,
      ...overrides,
    });
  },
};

/**
 * Factory for creating test orders
 */
export const orderFactory = {
  create(overrides: Partial<Order> = {}): Order {
    const orderId = `ORD-${faker.date.past().toISOString().slice(0, 10).replace(/-/g, '')}-${faker.string.numeric(6)}`;

    return {
      orderId,
      customerName: faker.person.fullName(),
      customerId: `CUST-${faker.string.numeric(6)}`,
      status: OrderStatus.PENDING,
      priority: faker.helpers.arrayElement(Object.values(OrderPriority)),
      pickerId: undefined,
      packerId: undefined,
      items: [],
      progress: 0,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  },

  createPicking(overrides: Partial<Order> = {}): Order {
    const picker = userFactory.createPicker();
    return this.create({
      status: OrderStatus.PICKING,
      pickerId: picker.userId,
      ...overrides,
    });
  },

  createPicked(overrides: Partial<Order> = {}): Order {
    const picker = userFactory.createPicker();
    return this.create({
      status: OrderStatus.PICKED,
      pickerId: picker.userId,
      items: orderItemFactory.createList(3, { pickedQuantity: 10 }),
      ...overrides,
    });
  },

  createPacking(overrides: Partial<Order> = {}): Order {
    const picker = userFactory.createPicker();
    const packer = userFactory.createPacker();
    return this.create({
      status: OrderStatus.PACKING,
      pickerId: picker.userId,
      packerId: packer.userId,
      items: orderItemFactory.createList(3, { pickedQuantity: 10 }),
      ...overrides,
    });
  },

  createShipped(overrides: Partial<Order> = {}): Order {
    const picker = userFactory.createPicker();
    const packer = userFactory.createPacker();
    return this.create({
      status: OrderStatus.SHIPPED,
      pickerId: picker.userId,
      packerId: packer.userId,
      items: orderItemFactory.createList(3, { pickedQuantity: 10 }),
      ...overrides,
    });
  },

  createWithItems(itemCount: number, overrides: Partial<Order> = {}): Order {
    return this.create({
      items: orderItemFactory.createList(itemCount),
      ...overrides,
    });
  },
};

/**
 * Factory for creating test order items
 */
export const orderItemFactory = {
  create(overrides: Partial<OrderItem> = {}): OrderItem {
    return {
      orderItemId: `ITM-${faker.string.uuid()}`,
      orderId: orderFactory.create().orderId,
      sku: `PROD-${faker.string.alphanumeric({ casing: 'upper', length: 6 })}`,
      name: faker.commerce.productName(),
      quantity: faker.number.int({ min: 1, max: 100 }),
      pickedQuantity: 0,
      binLocation: `A-${faker.string.numeric(2)}-${faker.string.numeric(2)}`,
      status: OrderItemStatus.PENDING,
      ...overrides,
    };
  },

  createList(count: number, overrides: Partial<OrderItem> = {}): OrderItem[] {
    return Array.from({ length: count }, () => this.create(overrides));
  },

  createPicked(overrides: Partial<OrderItem> = {}): OrderItem {
    const quantity = faker.number.int({ min: 1, max: 100 });
    return this.create({
      quantity,
      pickedQuantity: quantity,
      ...overrides,
    });
  },
};

/**
 * Factory for creating test pick tasks
 */
export const pickTaskFactory = {
  create(overrides: Partial<PickTask> = {}): PickTask {
    const order = orderFactory.create();
    const item = orderItemFactory.create({ orderId: order.orderId });

    return {
      pickTaskId: `TSK-${faker.date.past().toISOString().slice(0, 10).replace(/-/g, '')}-${faker.string.numeric(6)}`,
      orderId: order.orderId,
      orderItemId: item.orderItemId,
      sku: item.sku,
      name: item.name,
      targetBin: item.binLocation,
      quantity: item.quantity,
      pickedQuantity: 0,
      status: TaskStatus.PENDING,
      ...overrides,
    };
  },

  createInProgress(overrides: Partial<PickTask> = {}): PickTask {
    const picker = userFactory.createPicker();
    return this.create({
      status: TaskStatus.IN_PROGRESS,
      pickerId: picker.userId,
      startedAt: faker.date.recent(),
      ...overrides,
    });
  },

  createCompleted(overrides: Partial<PickTask> = {}): PickTask {
    const picker = userFactory.createPicker();
    return this.create({
      status: TaskStatus.COMPLETED,
      pickerId: picker.userId,
      completedAt: faker.date.recent(),
      ...overrides,
    });
  },

  createList(count: number, overrides: Partial<PickTask> = {}): PickTask[] {
    return Array.from({ length: count }, () => this.create(overrides));
  },
};

/**
 * Factory for creating test inventory
 */
export const inventoryFactory = {
  create(overrides: Partial<InventoryUnit> = {}): InventoryUnit {
    const quantity = faker.number.int({ min: 10, max: 1000 });
    const reserved = faker.number.int({ min: 0, max: Math.floor(quantity / 2) });

    return {
      unitId: `INV-${faker.string.uuid()}`,
      sku: `PROD-${faker.string.alphanumeric({ casing: 'upper', length: 6 })}`,
      quantity,
      reserved,
      available: quantity - reserved,
      binLocation: `${faker.helpers.arrayElement(['A', 'B', 'C'])}-${faker.number.int({ min: 1, max: 20 })}-${faker.number.int({ min: 1, max: 20 })}`,
      lastUpdated: faker.date.recent(),
      ...overrides,
    };
  },

  createLowStock(overrides: Partial<InventoryUnit> = {}): InventoryUnit {
    return this.create({
      quantity: 15,
      reserved: 10,
      available: 5,
      ...overrides,
    });
  },

  createOutOfStock(overrides: Partial<InventoryUnit> = {}): InventoryUnit {
    return this.create({
      quantity: 0,
      reserved: 0,
      available: 0,
      ...overrides,
    });
  },

  createList(count: number, overrides: Partial<InventoryUnit> = {}): InventoryUnit[] {
    return Array.from({ length: count }, () => this.create(overrides));
  },
};

/**
 * Test database helpers
 */
export const testDbHelpers = {
  /**
   * Clean all test data from database
   */
  async cleanDatabase(db: any): Promise<void> {
    await db('inventory_transactions').truncate();
    await db('order_state_changes').truncate();
    await db('pick_tasks').truncate();
    await db('order_items').truncate();
    await db('orders').truncate();
    await db('inventory').truncate();
    await db('users').truncate();
  },

  /**
   * Seed test database with sample data
   */
  async seedTestData(db: any): Promise<void> {
    // Create users
    const picker = userFactory.createPicker();
    const packer = userFactory.createPacker();
    const admin = userFactory.createAdmin();

    await db('users').insert([picker, packer, admin]);

    // Create inventory
    const inventory = inventoryFactory.createList(10);
    await db('inventory').insert(inventory);

    // Create order
    const order = orderFactory.createWithItems(3);
    await db('orders').insert(order);
    await db('order_items').insert(order.items);

    // Create pick tasks
    const pickTasks = pickTaskFactory.createList(3);
    await db('pick_tasks').insert(pickTasks);
  },

  /**
   * Create test transaction
   */
  async createTestTransaction(db: any): Promise<any> {
    return db.transaction();
  },
};

/**
 * API test helpers
 */
export const apiTestHelpers = {
  /**
   * Get authentication token for test user
   */
  async getAuthToken(request: any, email: string, password: string): Promise<string> {
    const response = await request.post('/api/auth/login').send({ email, password });

    return response.body.token;
  },

  /**
   * Create authenticated request
   */
  authenticatedRequest(token: string) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  },

  /**
   * Expect error response
   */
  expectErrorResponse(response: any, statusCode: number, errorCode: string) {
    expect(response.status).toBe(statusCode);
    expect(response.body.error).toBeDefined();
    expect(response.body.code).toBe(errorCode);
  },
};

/**
 * Performance test helpers
 */
export const perfTestHelpers = {
  /**
   * Measure execution time
   */
  async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;

    return { result, duration };
  },

  /**
   * Generate load test data
   */
  generateLoadTestData(orderCount: number) {
    return {
      users: [userFactory.createPicker(), userFactory.createPacker(), userFactory.createAdmin()],
      orders: Array.from({ length: orderCount }, () => orderFactory.create()),
      inventory: inventoryFactory.createList(100),
    };
  },
};
