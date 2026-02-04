/**
 * Integration tests for shipping routes
 * @covers src/routes/shipping.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { shippingService } from '../../services/ShippingService';
import { authenticate } from '../../middleware/auth';
import { User, UserRole } from '@opsui/shared';

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

// Mock the shippingService
jest.mock('../../services/ShippingService');
jest.mock('../../config/logger');
jest.mock('../../db/client');

const mockedAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

describe('Shipping Routes', () => {
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
  // GET /api/shipping/carriers
  // ==========================================================================

  describe('GET /api/v1/shipping/carriers', () => {
    it('should return all carriers', async () => {
      const mockCarriers = [
        {
          carrierId: 'carrier-1',
          name: 'FedEx',
          carrierCode: 'FEDEX',
          isActive: true,
        },
        {
          carrierId: 'carrier-2',
          name: 'UPS',
          carrierCode: 'UPS',
          isActive: true,
        },
      ];

      shippingService.getActiveCarriers = jest.fn().mockResolvedValue(mockCarriers as any);

      const response = await request(app)
        .get('/api/v1/shipping/carriers')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('FedEx');
      expect(shippingService.getActiveCarriers).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET /api/shipping/carriers/:carrierId
  // ==========================================================================

  describe('GET /api/v1/shipping/carriers/:carrierId', () => {
    it('should return carrier by ID', async () => {
      const mockCarrier = {
        carrierId: 'carrier-1',
        name: 'FedEx',
        carrierCode: 'FEDEX',
        isActive: true,
      };

      shippingService.getCarrier = jest.fn().mockResolvedValue(mockCarrier as any);

      const response = await request(app)
        .get('/api/v1/shipping/carriers/carrier-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.carrierId).toBe('carrier-1');
      expect(shippingService.getCarrier).toHaveBeenCalledWith('carrier-1');
    });
  });

  // ==========================================================================
  // GET /api/shipping/orders
  // ==========================================================================

  describe('GET /api/v1/shipping/orders', () => {
    it('should return shipped orders with pagination', async () => {
      const mockOrders = {
        orders: [
          {
            id: 'ORD-001',
            orderId: 'ORD-001',
            customerName: 'John Doe',
            status: 'SHIPPED',
            priority: 'NORMAL',
            itemCount: 3,
            totalValue: 150,
            shippedAt: '2024-01-01T00:00:00Z',
            trackingNumber: '1Z999AA10123456784',
            carrier: 'FEDEX',
            shippingAddress: '{"street":"123 Main St"}',
            shippedBy: 'user-123',
          },
        ],
        stats: {
          totalShipped: 1,
          totalValue: 150,
          delivered: 0,
          pendingDelivery: 1,
        },
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      shippingService.getShippedOrders = jest.fn().mockResolvedValue(mockOrders as any);

      const response = await request(app)
        .get('/api/v1/shipping/orders')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.orders).toHaveLength(1);
      expect(response.body.total).toBe(1);
      expect(shippingService.getShippedOrders).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 })
      );
    });

    it('should filter orders by status', async () => {
      shippingService.getShippedOrders = jest
        .fn()
        .mockResolvedValue({ orders: [], total: 0 } as any);

      await request(app)
        .get('/api/v1/shipping/orders?status=SHIPPED')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(shippingService.getShippedOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'SHIPPED' })
      );
    });
  });

  // ==========================================================================
  // GET /api/shipping/orders/export
  // ==========================================================================

  describe('GET /api/v1/shipping/orders/export', () => {
    it('should export shipped orders to CSV', async () => {
      const csvData = 'Order ID,Customer Name,Status\nORD-001,John Doe,SHIPPED';

      shippingService.exportShippedOrdersToCSV = jest.fn().mockResolvedValue(csvData);

      const response = await request(app)
        .get('/api/v1/shipping/orders/export?orderIds=ORD-001,ORD-002')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.text).toContain('Order ID');
      expect(response.headers['content-type']).toContain('text/csv');
      expect(shippingService.exportShippedOrdersToCSV).toHaveBeenCalledWith(['ORD-001', 'ORD-002']);
    });

    it('should return 400 when orderIds is missing', async () => {
      await request(app)
        .get('/api/v1/shipping/orders/export')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(shippingService.exportShippedOrdersToCSV).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // POST /api/shipping/shipments
  // ==========================================================================

  describe('POST /api/v1/shipping/shipments', () => {
    it('should create a new shipment', async () => {
      const shipmentData = {
        orderId: 'ORD-001',
        carrierId: 'carrier-1',
        serviceType: 'GROUND',
        shippingMethod: 'STANDARD',
        shipFromAddress: { street: '123 From St' },
        shipToAddress: { street: '456 To St' },
        totalWeight: 10,
        totalPackages: 1,
      };

      const mockShipment = {
        shipmentId: 'SHIP-001',
        orderId: 'ORD-001',
        status: 'PENDING',
        trackingNumber: '1Z999AA10123456784',
        createdAt: '2024-01-01T00:00:00Z',
      };

      shippingService.createShipment = jest.fn().mockResolvedValue(mockShipment as any);

      const response = await request(app)
        .post('/api/v1/shipping/shipments')
        .set('Authorization', 'Bearer valid-token')
        .send(shipmentData)
        .expect(201);

      expect(response.body.shipmentId).toBe('SHIP-001');
      expect(shippingService.createShipment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'ORD-001',
          carrierId: 'carrier-1',
          createdBy: 'user-123',
        })
      );
    });

    it('should return 400 when orderId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/shipping/shipments')
        .set('Authorization', 'Bearer valid-token')
        .send({
          carrierId: 'carrier-1',
          serviceType: 'GROUND',
          shippingMethod: 'STANDARD',
          shipFromAddress: { street: '123 From St' },
          shipToAddress: { street: '456 To St' },
          totalWeight: 10,
          totalPackages: 1,
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(shippingService.createShipment).not.toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/shipping/shipments')
        .set('Authorization', 'Bearer valid-token')
        .send({
          orderId: 'ORD-001',
          carrierId: 'carrier-1',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(shippingService.createShipment).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET /api/shipping/shipments/:shipmentId
  // ==========================================================================

  describe('GET /api/v1/shipping/shipments/:shipmentId', () => {
    it('should return shipment by ID', async () => {
      const mockShipment = {
        shipmentId: 'SHIP-001',
        orderId: 'ORD-001',
        status: 'SHIPPED',
        trackingNumber: '1Z999AA10123456784',
        carrierId: 'carrier-1',
      };

      shippingService.getShipment = jest.fn().mockResolvedValue(mockShipment as any);

      const response = await request(app)
        .get('/api/v1/shipping/shipments/SHIP-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.shipmentId).toBe('SHIP-001');
      expect(response.body.status).toBe('SHIPPED');
      expect(shippingService.getShipment).toHaveBeenCalledWith('SHIP-001');
    });
  });

  // ==========================================================================
  // GET /api/shipping/shipments
  // ==========================================================================

  describe('GET /api/v1/shipping/shipments', () => {
    it('should return shipments with pagination', async () => {
      const mockShipments = [
        {
          shipmentId: 'SHIP-001',
          orderId: 'ORD-001',
          status: 'SHIPPED',
        },
        {
          shipmentId: 'SHIP-002',
          orderId: 'ORD-002',
          status: 'PENDING',
        },
      ];

      shippingService.getAllShipments = jest.fn().mockResolvedValue({
        shipments: mockShipments,
        total: 2,
      } as any);

      const response = await request(app)
        .get('/api/v1/shipping/shipments')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.shipments).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(shippingService.getAllShipments).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, offset: 0 })
      );
    });

    it('should filter shipments by status', async () => {
      shippingService.getAllShipments = jest.fn().mockResolvedValue({
        shipments: [],
        total: 0,
      } as any);

      await request(app)
        .get('/api/v1/shipping/shipments?status=SHIPPED')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(shippingService.getAllShipments).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'SHIPPED',
        })
      );
    });

    it('should filter shipments by carrier', async () => {
      shippingService.getAllShipments = jest.fn().mockResolvedValue({
        shipments: [],
        total: 0,
      } as any);

      await request(app)
        .get('/api/v1/shipping/shipments?carrierId=carrier-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(shippingService.getAllShipments).toHaveBeenCalledWith(
        expect.objectContaining({
          carrierId: 'carrier-1',
        })
      );
    });
  });

  // ==========================================================================
  // GET /api/shipping/orders/:orderId/shipment
  // ==========================================================================

  describe('GET /api/v1/shipping/orders/:orderId/shipment', () => {
    it('should return shipment by order ID', async () => {
      const mockShipment = {
        shipmentId: 'SHIP-001',
        orderId: 'ORD-001',
        status: 'SHIPPED',
        trackingNumber: '1Z999AA10123456784',
      };

      shippingService.getShipmentByOrderId = jest.fn().mockResolvedValue(mockShipment as any);

      const response = await request(app)
        .get('/api/v1/shipping/orders/ORD-001/shipment')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.shipmentId).toBe('SHIP-001');
      expect(shippingService.getShipmentByOrderId).toHaveBeenCalledWith('ORD-001');
    });

    it('should return 404 when shipment not found for order', async () => {
      shippingService.getShipmentByOrderId = jest.fn().mockResolvedValue(null);

      await request(app)
        .get('/api/v1/shipping/orders/ORD-NONEXISTENT/shipment')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });
  });

  // ==========================================================================
  // PATCH /api/shipping/shipments/:shipmentId/status
  // ==========================================================================

  describe('PATCH /api/v1/shipping/shipments/:shipmentId/status', () => {
    it('should update shipment status', async () => {
      const updatedShipment = {
        shipmentId: 'SHIP-001',
        status: 'SHIPPED',
      };

      shippingService.updateShipmentStatus = jest.fn().mockResolvedValue(updatedShipment as any);

      const response = await request(app)
        .patch('/api/v1/shipping/shipments/SHIP-001/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'SHIPPED' })
        .expect(200);

      expect(response.body.status).toBe('SHIPPED');
      expect(shippingService.updateShipmentStatus).toHaveBeenCalledWith(
        'SHIP-001',
        'SHIPPED',
        'user-123'
      );
    });

    it('should return 400 when status is missing', async () => {
      const response = await request(app)
        .patch('/api/v1/shipping/shipments/SHIP-001/status')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(shippingService.updateShipmentStatus).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // POST /api/shipping/shipments/:shipmentId/tracking
  // ==========================================================================

  describe('POST /api/v1/shipping/shipments/:shipmentId/tracking', () => {
    it('should add tracking number to shipment', async () => {
      const updatedShipment = {
        shipmentId: 'SHIP-001',
        trackingNumber: '1Z999AA10123456784',
        trackingUrl: 'https://track.example.com/1Z999AA10123456784',
      };

      shippingService.addTrackingNumber = jest.fn().mockResolvedValue(updatedShipment as any);

      const response = await request(app)
        .post('/api/v1/shipping/shipments/SHIP-001/tracking')
        .set('Authorization', 'Bearer valid-token')
        .send({
          trackingNumber: '1Z999AA10123456784',
          trackingUrl: 'https://track.example.com/1Z999AA10123456784',
        })
        .expect(200);

      expect(response.body.trackingNumber).toBe('1Z999AA10123456784');
      expect(shippingService.addTrackingNumber).toHaveBeenCalledWith(
        'SHIP-001',
        '1Z999AA10123456784',
        'https://track.example.com/1Z999AA10123456784'
      );
    });

    it('should return 400 when trackingNumber is missing', async () => {
      const response = await request(app)
        .post('/api/v1/shipping/shipments/SHIP-001/tracking')
        .set('Authorization', 'Bearer valid-token')
        .send({ trackingUrl: 'https://track.example.com' })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(shippingService.addTrackingNumber).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // POST /api/shipping/labels
  // ==========================================================================

  describe('POST /api/v1/shipping/labels', () => {
    it('should create shipping label', async () => {
      const labelRequest = {
        shipmentId: 'SHIP-001',
        packageNumber: 1,
        packageWeight: 10.5,
        packageDimensions: { length: 12, width: 10, height: 8 },
      };

      const mockLabel = {
        labelId: 'LABEL-001',
        shipmentId: 'SHIP-001',
        packageNumber: 1,
        packageWeight: 10.5,
        createdAt: '2024-01-01T00:00:00Z',
      };

      shippingService.createShippingLabel = jest.fn().mockResolvedValue(mockLabel as any);

      const response = await request(app)
        .post('/api/v1/shipping/labels')
        .set('Authorization', 'Bearer valid-token')
        .send(labelRequest)
        .expect(201);

      expect(response.body.labelId).toBe('LABEL-001');
      expect(shippingService.createShippingLabel).toHaveBeenCalledWith(
        expect.objectContaining({
          shipmentId: 'SHIP-001',
          packageNumber: 1,
          createdBy: 'user-123',
        })
      );
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/shipping/labels')
        .set('Authorization', 'Bearer valid-token')
        .send({
          shipmentId: 'SHIP-001',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(shippingService.createShippingLabel).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // POST /api/shipping/labels/:labelId/print
  // ==========================================================================

  describe('POST /api/v1/shipping/labels/:labelId/print', () => {
    it('should mark label as printed', async () => {
      const mockLabel = {
        labelId: 'LABEL-001',
        printedAt: '2024-01-01T12:00:00Z',
      };

      shippingService.markLabelPrinted = jest.fn().mockResolvedValue(mockLabel as any);

      const response = await request(app)
        .post('/api/v1/shipping/labels/LABEL-001/print')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.labelId).toBe('LABEL-001');
      expect(shippingService.markLabelPrinted).toHaveBeenCalledWith('LABEL-001');
    });
  });

  // ==========================================================================
  // GET /api/shipping/shipments/:shipmentId/tracking/events
  // ==========================================================================

  describe('GET /api/v1/shipping/shipments/:shipmentId/tracking/events', () => {
    it('should return tracking events for shipment', async () => {
      const mockEvents = [
        {
          eventId: 'TEV-001',
          shipmentId: 'SHIP-001',
          eventCode: 'PICKED_UP',
          eventDescription: 'Package picked up',
          eventDate: '2024-01-01T10:00:00Z',
        },
        {
          eventId: 'TEV-002',
          shipmentId: 'SHIP-001',
          eventCode: 'IN_TRANSIT',
          eventDescription: 'Package in transit',
          eventDate: '2024-01-02T08:00:00Z',
        },
      ];

      shippingService.getTrackingEvents = jest.fn().mockResolvedValue(mockEvents as any);

      const response = await request(app)
        .get('/api/v1/shipping/shipments/SHIP-001/tracking/events')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].eventCode).toBe('PICKED_UP');
      expect(shippingService.getTrackingEvents).toHaveBeenCalledWith('SHIP-001');
    });
  });

  // ==========================================================================
  // POST /api/shipping/tracking/events
  // ==========================================================================

  describe('POST /api/v1/shipping/tracking/events', () => {
    it('should add tracking event', async () => {
      const eventRequest = {
        shipmentId: 'SHIP-001',
        eventCode: 'DELIVERED',
        eventDescription: 'Package delivered',
        eventLocation: 'Front door',
        eventDate: '2024-01-03T10:00:00Z',
      };

      const mockEvent = {
        eventId: 'TEV-003',
        shipmentId: 'SHIP-001',
        eventCode: 'DELIVERED',
        eventDescription: 'Package delivered',
        eventDate: '2024-01-03T10:00:00Z',
      };

      shippingService.addTrackingEvent = jest.fn().mockResolvedValue(mockEvent as any);

      const response = await request(app)
        .post('/api/v1/shipping/tracking/events')
        .set('Authorization', 'Bearer valid-token')
        .send(eventRequest)
        .expect(201);

      expect(response.body.eventId).toBe('TEV-003');
      expect(response.body.eventCode).toBe('DELIVERED');
      expect(shippingService.addTrackingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          shipmentId: 'SHIP-001',
          eventCode: 'DELIVERED',
        })
      );
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/shipping/tracking/events')
        .set('Authorization', 'Bearer valid-token')
        .send({
          shipmentId: 'SHIP-001',
          eventCode: 'DELIVERED',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(shippingService.addTrackingEvent).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Authentication
  // ==========================================================================

  describe('Authentication', () => {
    it('should allow access with valid authentication', async () => {
      shippingService.getActiveCarriers = jest.fn().mockResolvedValue([]);

      await request(app)
        .get('/api/v1/shipping/carriers')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      shippingService.getActiveCarriers = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/shipping/carriers')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });
});
