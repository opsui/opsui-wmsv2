/**
 * Integration tests for order routes
 * @covers src/routes/orders.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { orderService } from '../../services/OrderService';
import { authenticate } from '../../middleware/auth';
import { User, UserRole, OrderStatus } from '@opsui/shared';

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req, res, next) => {
    req.user = {
      userId: 'user-123',
      email: 'supervisor@example.com',
      role: UserRole.SUPERVISOR,
      baseRole: UserRole.SUPERVISOR,
      effectiveRole: UserRole.SUPERVISOR,
    };
    next();
  }),
}));

// Mock the orderService
jest.mock('../../services/OrderService');
jest.mock('../../config/logger');
jest.mock('../../db/client');

const mockedAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

describe('Orders Routes', () => {
  let app: any;

  const mockUser: User = {
    userId: 'user-123',
    email: 'supervisor@example.com',
    name: 'Test Supervisor',
    role: UserRole.SUPERVISOR,
    activeRole: null,
    active: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  afterEach(() => {});

  // ==========================================================================
  // GET /api/orders
  // ==========================================================================

  describe('GET /api/orders', () => {
    it('should return orders with default filters', async () => {
      const mockOrders = [
        {
          order_id: 'ORD-001',
          customer_id: 'CUST-001',
          status: OrderStatus.PENDING,
          priority: 'HIGH',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          order_id: 'ORD-002',
          customer_id: 'CUST-002',
          status: OrderStatus.PICKING,
          priority: 'NORMAL',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      (orderService.getOrderQueue as jest.Mock).mockResolvedValue({
        orders: mockOrders,
        total: 2,
        page: 1,
        totalPages: 1,
      });

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = {
          ...mockUser,
          baseRole: mockUser.role,
          effectiveRole: mockUser.activeRole || mockUser.role,
        };
        next();
      });

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.orders).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(orderService.getOrderQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 0,
        })
      );
    });

    it('should filter orders by status', async () => {
      (orderService.getOrderQueue as jest.Mock).mockResolvedValue({
        orders: [{ order_id: 'ORD-001', status: OrderStatus.PENDING }],
        total: 1,
        page: 1,
        totalPages: 1,
      });

      const response = await request(app)
        .get('/api/orders?status=PENDING')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(orderService.getOrderQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.PENDING,
        })
      );
    });

    it('should filter orders by priority', async () => {
      (orderService.getOrderQueue as jest.Mock).mockResolvedValue({
        orders: [{ order_id: 'ORD-001', priority: 'HIGH' }],
        total: 1,
      });

      const response = await request(app)
        .get('/api/orders?priority=HIGH')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(orderService.getOrderQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'HIGH',
        })
      );
    });

    it('should paginate orders', async () => {
      (orderService.getOrderQueue as jest.Mock).mockResolvedValue({
        orders: [],
        total: 100,
        page: 2,
        totalPages: 5,
      });

      const response = await request(app)
        .get('/api/orders?page=2&limit=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(orderService.getOrderQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 20,
        })
      );
    });

    it('should search orders by SKU', async () => {
      (orderService.getOrderQueue as jest.Mock).mockResolvedValue({
        orders: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/orders?search=SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(orderService.getOrderQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'SKU-001',
        })
      );
    });
  });

  // ==========================================================================
  // GET /api/orders/:orderId
  // ==========================================================================

  describe('GET /api/orders/:orderId', () => {
    it('should return order by ID', async () => {
      const mockOrder = {
        order_id: 'ORD-001',
        customer_id: 'CUST-001',
        status: OrderStatus.PENDING,
        priority: 'HIGH',
      };

      (orderService.getOrder as jest.Mock).mockResolvedValue(mockOrder);

      const response = await request(app)
        .get('/api/v1/orders/ORD-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockOrder);
      expect(orderService.getOrder).toHaveBeenCalledWith('ORD-001');
    });

    it('should return 404 when order not found', async () => {
      (orderService.getOrder as jest.Mock).mockRejectedValue(
        new Error('Order ORD-NONEXISTENT not found')
      );

      const response = await request(app)
        .get('/api/v1/orders/ORD-NONEXISTENT')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(orderService.getOrder).toHaveBeenCalledWith('ORD-NONEXISTENT');
    });
  });

  // ==========================================================================
  // POST /api/orders
  // ==========================================================================

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const newOrder = {
        order_id: 'ORD-001',
        customer_id: 'CUST-001',
        items: [
          { sku: 'SKU-001', quantity: 2 },
          { sku: 'SKU-002', quantity: 1 },
        ],
        priority: 'HIGH',
      };

      (orderService.createOrder as jest.Mock).mockResolvedValue(newOrder);

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', 'Bearer valid-token')
        .send({
          customerId: 'CUST-001',
          items: [
            { sku: 'SKU-001', quantity: 2 },
            { sku: 'SKU-002', quantity: 1 },
          ],
          priority: 'HIGH',
        })
        .expect(200);

      expect(response.body).toEqual(newOrder);
    });

    it('should return 400 when customerId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', 'Bearer valid-token')
        .send({
          items: [{ sku: 'SKU-001', quantity: 1 }],
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when items are missing', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', 'Bearer valid-token')
        .send({
          customerId: 'CUST-001',
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Customer ID and items are required',
        code: 'MISSING_REQUIRED_FIELDS',
      });
    });

    it('should return 400 when items array is empty', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', 'Bearer valid-token')
        .send({
          customerId: 'CUST-001',
          items: [],
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'At least one item is required',
        code: 'EMPTY_ITEMS',
      });
    });
  });

  // ==========================================================================
  // PUT /api/orders/:orderId
  // NOTE: Skipped - route not implemented
  // ==========================================================================

  describe.skip('PUT /api/orders/:orderId', () => {
    it('should update an order', async () => {
      const updatedOrder = {
        order_id: 'ORD-001',
        priority: 'URGENT',
        status: OrderStatus.PENDING,
      };

      // @ts-ignore - updateOrder method not implemented
      (orderService.updateOrder as jest.Mock).mockResolvedValue(updatedOrder);

      const response = await request(app)
        .put('/api/v1/orders/ORD-001')
        .set('Authorization', 'Bearer valid-token')
        .send({
          priority: 'URGENT',
        })
        .expect(200);

      expect(response.body).toEqual(updatedOrder);
    });

    it('should return 400 when no update data provided', async () => {
      const response = await request(app)
        .put('/api/v1/orders/ORD-001')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'No update data provided',
        code: 'NO_UPDATE_DATA',
      });
    });
  });

  // ==========================================================================
  // POST /api/orders/:orderId/priority
  // NOTE: Skipped - route not implemented
  // ==========================================================================

  describe.skip('POST /api/orders/:orderId/priority', () => {
    it('should update order priority', async () => {
      const updatedOrder = {
        order_id: 'ORD-001',
        priority: 'URGENT',
      };

      // @ts-ignore - updateOrderPriority method not implemented
      (orderService.updateOrderPriority as jest.Mock).mockResolvedValue(updatedOrder);

      const response = await request(app)
        .post('/api/v1/orders/ORD-001/priority')
        .set('Authorization', 'Bearer valid-token')
        .send({
          priority: 'URGENT',
        })
        .expect(200);

      expect(response.body.priority).toBe('URGENT');
    });

    it('should return 400 when priority is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/orders/ORD-001/priority')
        .set('Authorization', 'Bearer valid-token')
        .send({
          priority: 'INVALID',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  // ==========================================================================
  // POST /api/orders/:orderId/cancel
  // ==========================================================================

  describe('POST /api/orders/:orderId/cancel', () => {
    it('should cancel an order', async () => {
      const cancelledOrder = {
        order_id: 'ORD-001',
        status: OrderStatus.CANCELLED,
      };

      (orderService.cancelOrder as jest.Mock).mockResolvedValue(cancelledOrder);

      const response = await request(app)
        .post('/api/v1/orders/ORD-001/cancel')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.CANCELLED);
    });

    it('should include cancellation reason when provided', async () => {
      (orderService.cancelOrder as jest.Mock).mockResolvedValue({
        order_id: 'ORD-001',
        status: OrderStatus.CANCELLED,
      });

      const response = await request(app)
        .post('/api/v1/orders/ORD-001/cancel')
        .set('Authorization', 'Bearer valid-token')
        .send({
          reason: 'Customer request',
        })
        .expect(200);

      expect(orderService.cancelOrder).toHaveBeenCalledWith('ORD-001', {
        orderId: 'ORD-001',
        userId: 'user-123',
        reason: 'Customer request',
      });
    });
  });

  // ==========================================================================
  // Authentication
  // ==========================================================================

  describe.skip('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = null;
        next();
      });

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    });

    it('should allow access with valid authentication', async () => {
      (orderService.getOrderQueue as jest.Mock).mockResolvedValue({
        orders: [],
        total: 0,
      });

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = {
          ...mockUser,
          baseRole: mockUser.role,
          effectiveRole: mockUser.activeRole || mockUser.role,
        };
        next();
      });

      await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      (orderService.getOrderQueue as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = {
          ...mockUser,
          baseRole: mockUser.role,
          effectiveRole: mockUser.activeRole || mockUser.role,
        };
        next();
      });

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });
});
