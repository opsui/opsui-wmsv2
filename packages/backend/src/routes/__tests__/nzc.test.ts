/**
 * Integration tests for NZC (NZ Couriers) routes
 * @covers src/routes/nzc.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { nzcService } from '../../services/NZCService';
import { UserRole } from '@opsui/shared';

// Mock all dependencies
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      baseRole: UserRole.ADMIN,
      effectiveRole: UserRole.ADMIN,
    };
    next();
  }),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
  asyncHandler: (fn: any) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next),
}));

jest.mock('../../services/NZCService', () => ({
  nzcService: {
    getRates: jest.fn().mockResolvedValue({
      success: true,
      quotes: [
        {
          quoteId: 'quote-001',
          service: 'STANDARD',
          price: 15.5,
          estimatedDays: 2,
        },
        {
          quoteId: 'quote-002',
          service: 'EXPRESS',
          price: 25.0,
          estimatedDays: 1,
        },
      ],
    }),
    createShipment: jest.fn().mockResolvedValue({
      success: true,
      connote: 'CON123456',
      trackingUrl: 'https://track.example.com/CON123456',
      labels: [
        {
          format: 'LABEL_PNG_100X175',
          data: 'base64encodedimage...',
        },
      ],
    }),
    getLabel: jest.fn().mockResolvedValue({
      format: 'LABEL_PNG_100X175',
      contentType: 'image/png',
      data: 'base64encodedimage...',
    }),
    reprintLabel: jest.fn().mockResolvedValue(undefined),
    getPrinters: jest.fn().mockResolvedValue([
      {
        printerName: 'Default Printer',
        location: 'Warehouse',
        isDefault: true,
      },
      {
        printerName: 'Label Printer',
        location: 'Office',
        isDefault: false,
      },
    ]),
    getStockSizes: jest.fn().mockResolvedValue([
      {
        code: 'A4',
        description: 'A4 Stock Size',
        length: 210,
        width: 297,
      },
      {
        code: 'A5',
        description: 'A5 Stock Size',
        length: 148,
        width: 210,
      },
    ]),
  },
}));

describe('NZC Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // POST /api/v1/nzc/rates
  // ==========================================================================

  describe('POST /api/v1/nzc/rates', () => {
    it('should get shipping rates', async () => {
      const rateRequest = {
        destination: {
          name: 'John Doe',
          company: 'Example Company',
          addressLine1: '123 Main Street',
          city: 'Palmerston North',
          state: '',
          postalCode: '4410',
          country: 'NEW ZEALAND',
          phone: '+64 21 123 4567',
          email: 'john@example.com',
        },
        packages: [
          {
            length: 10,
            width: 10,
            height: 10,
            weight: 5,
            units: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/nzc/rates')
        .set('Authorization', 'Bearer valid-token')
        .send(rateRequest)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quotes');
      expect(Array.isArray(response.body.quotes)).toBe(true);
    });

    it('should return 400 for missing destination', async () => {
      const invalidRequest = {
        packages: [
          {
            weight: 5,
            units: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/nzc/rates')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Missing required fields: destination and packages'
      );
    });

    it('should return 400 for incomplete destination address', async () => {
      const invalidRequest = {
        destination: {
          name: 'John Doe',
          // Missing addressLine1, city, postalCode, country
        },
        packages: [
          {
            weight: 5,
            units: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/nzc/rates')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Incomplete destination address');
    });

    it('should return 400 for invalid package weight', async () => {
      const invalidRequest = {
        destination: {
          name: 'John Doe',
          company: 'Example Company',
          addressLine1: '123 Main Street',
          city: 'Palmerston North',
          postalCode: '4410',
          country: 'NEW ZEALAND',
        },
        packages: [
          {
            weight: 0, // Invalid weight
            units: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/nzc/rates')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Package 1: weight must be greater than 0');
    });
  });

  // ==========================================================================
  // POST /api/v1/nzc/shipments
  // ==========================================================================

  describe('POST /api/v1/nzc/shipments', () => {
    it('should create a shipment', async () => {
      const shipmentRequest = {
        destination: {
          name: 'John Doe',
          company: 'Example Company',
          addressLine1: '123 Main Street',
          city: 'Palmerston North',
          postalCode: '4410',
          country: 'NEW ZEALAND',
        },
        packages: [
          {
            length: 10,
            width: 10,
            height: 10,
            weight: 5,
            units: 1,
          },
        ],
        quoteId: 'quote-001',
      };

      const response = await request(app)
        .post('/api/v1/nzc/shipments')
        .set('Authorization', 'Bearer valid-token')
        .send(shipmentRequest)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('connote');
    });

    it('should return 400 for missing quoteId', async () => {
      const invalidRequest = {
        destination: {
          name: 'John Doe',
          company: 'Example Company',
          addressLine1: '123 Main Street',
          city: 'Palmerston North',
          postalCode: '4410',
          country: 'NEW ZEALAND',
        },
        packages: [
          {
            weight: 5,
            units: 1,
          },
        ],
        // Missing quoteId
      };

      const response = await request(app)
        .post('/api/v1/nzc/shipments')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Missing required fields: destination, packages, and quoteId'
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/nzc/labels/:connote
  // ==========================================================================

  describe('GET /api/v1/nzc/labels/:connote', () => {
    it('should get a shipping label', async () => {
      const response = await request(app)
        .get('/api/v1/nzc/labels/CON123456')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('connote', 'CON123456');
      expect(response.body).toHaveProperty('format');
      expect(response.body).toHaveProperty('data');
    });

    it('should use custom format parameter', async () => {
      await request(app)
        .get('/api/v1/nzc/labels/CON123456?format=LABEL_PDF')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(nzcService.getLabel).toHaveBeenCalledWith('CON123456', 'LABEL_PDF');
    });
  });

  // ==========================================================================
  // POST /api/v1/nzc/labels/:connote/reprint
  // ==========================================================================

  describe('POST /api/v1/nzc/labels/:connote/reprint', () => {
    it('should reprint a shipping label', async () => {
      const response = await request(app)
        .post('/api/v1/nzc/labels/CON123456/reprint')
        .set('Authorization', 'Bearer valid-token')
        .send({ copies: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(nzcService.reprintLabel).toHaveBeenCalledWith('CON123456', 1, undefined);
    });

    it('should use custom copies and printer name', async () => {
      const reprintData = {
        copies: 2,
        printerName: 'Label Printer',
      };

      await request(app)
        .post('/api/v1/nzc/labels/CON123456/reprint')
        .set('Authorization', 'Bearer valid-token')
        .send(reprintData)
        .expect(200);

      expect(nzcService.reprintLabel).toHaveBeenCalledWith('CON123456', 2, 'Label Printer');
    });
  });

  // ==========================================================================
  // GET /api/v1/nzc/printers
  // ==========================================================================

  describe('GET /api/v1/nzc/printers', () => {
    it('should get available printers', async () => {
      const response = await request(app)
        .get('/api/v1/nzc/printers')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('printerName');
    });
  });

  // ==========================================================================
  // GET /api/v1/nzc/stocksizes
  // ==========================================================================

  describe('GET /api/v1/nzc/stocksizes', () => {
    it('should get available stock sizes', async () => {
      const response = await request(app)
        .get('/api/v1/nzc/stocksizes')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('code');
      expect(response.body[0]).toHaveProperty('description');
    });
  });
});
