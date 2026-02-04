/**
 * Integration tests for integrations routes
 * @covers src/routes/integrations.ts
 */

import request from 'supertest';

// Mock the logger and db client at the top level
jest.mock('../../config/logger');
jest.mock('../../db/client');

describe('Integrations Routes', () => {
  let app: any;
  let mockRepository: any;
  let mockService: any;

  // Helper function to create a fresh app with isolated modules
  const createTestApp = (): any => {
    // Use a reference to store the app that will be created in the isolated scope
    let createdApp: any;

    jest.isolateModules(() => {
      // Mock the authentication middleware inside the isolated module scope
      jest.mock('../../middleware/auth', () => {
        const actual = jest.requireActual('../../middleware/auth');
        return {
          ...actual,
          authenticate: jest.fn((req: any, res: any, next: any) => {
            req.user = {
              userId: 'user-123',
              email: 'admin@example.com',
              role: 'ADMIN',
              baseRole: 'ADMIN',
              activeRole: null,
              effectiveRole: 'ADMIN',
            };
            next();
          }),
          authorize: jest.fn((...allowedRoles: string[]) => (req: any, res: any, next: any) => {
            const user = req.user || { role: 'ADMIN' };
            if (allowedRoles.includes(user.role)) {
              next();
            } else {
              res.status(403).json({ error: 'Forbidden' });
            }
          }),
        };
      });

      // Create the mock instances
      mockRepository = {
        findAll: jest.fn(),
        findById: jest.fn(),
        findSyncJobs: jest.fn(),
        findSyncJobById: jest.fn(),
        findSyncLogEntrys: jest.fn(),
        findWebhookEvents: jest.fn(),
        findCarrierAccounts: jest.fn(),
      };

      mockService = {
        createIntegration: jest.fn(),
        updateIntegration: jest.fn(),
        deleteIntegration: jest.fn(),
        testConnection: jest.fn(),
        createSyncJob: jest.fn(),
        handleWebhook: jest.fn(),
        createCarrierAccount: jest.fn(),
        updateCarrierAccount: jest.fn(),
        deleteCarrierAccount: jest.fn(),
      };

      // Mock the repository and service classes
      jest.mock('../../repositories/IntegrationsRepository', () => ({
        IntegrationsRepository: jest.fn().mockImplementation(() => mockRepository),
      }));

      jest.mock('../../services/IntegrationsService', () => ({
        IntegrationsService: jest.fn().mockImplementation(() => mockService),
      }));

      // Import and create the app after mocks are set up
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const appModule = require('../../app');
      createdApp = appModule.createApp();
    });

    return createdApp;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  // ==========================================================================
  // GET /api/v1/integrations
  // ==========================================================================

  describe('GET /api/v1/integrations', () => {
    it('should get all integrations', async () => {
      const mockIntegrations = [
        {
          integrationId: 'int-001',
          name: 'Shopify Integration',
          type: 'ECOMMERCE',
          provider: 'SHOPIFY',
          status: 'ACTIVE',
        },
        {
          integrationId: 'int-002',
          name: 'Xero Integration',
          type: 'ACCOUNTING',
          provider: 'XERO',
          status: 'ACTIVE',
        },
      ];

      mockRepository.findAll.mockResolvedValue(mockIntegrations);

      const response = await request(app)
        .get('/api/v1/integrations')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockIntegrations);
      expect(mockRepository.findAll).toHaveBeenCalledWith({});
    });

    it('should filter by type', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/v1/integrations?type=ECOMMERCE')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(mockRepository.findAll).toHaveBeenCalledWith({ type: 'ECOMMERCE' });
    });

    it('should filter by provider', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/v1/integrations?provider=SHOPIFY')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(mockRepository.findAll).toHaveBeenCalledWith({ provider: 'SHOPIFY' });
    });

    it('should filter by status', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/v1/integrations?status=ACTIVE')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(mockRepository.findAll).toHaveBeenCalledWith({ status: 'ACTIVE' });
    });
  });

  // ==========================================================================
  // GET /api/v1/integrations/:integrationId
  // ==========================================================================

  describe('GET /api/v1/integrations/:integrationId', () => {
    it('should get a specific integration', async () => {
      const mockIntegration = {
        integrationId: 'int-001',
        name: 'Shopify Integration',
        type: 'ECOMMERCE',
        status: 'ACTIVE',
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);

      const response = await request(app)
        .get('/api/v1/integrations/int-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockIntegration);
      expect(mockRepository.findById).toHaveBeenCalledWith('int-001');
    });

    it('should return 404 when integration not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/integrations/int-999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Integration not found');
    });
  });

  // ==========================================================================
  // POST /api/v1/integrations
  // ==========================================================================

  describe('POST /api/v1/integrations', () => {
    it('should create a new integration', async () => {
      const newIntegration = {
        name: 'Shopify Integration',
        type: 'ECOMMERCE',
        provider: 'SHOPIFY',
        configuration: {
          apiKey: 'test-key',
          storeUrl: 'https://test.myshopify.com',
        },
      };

      const createdIntegration = {
        integrationId: 'int-003',
        ...newIntegration,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };

      mockService.createIntegration.mockResolvedValue(createdIntegration);

      const response = await request(app)
        .post('/api/v1/integrations')
        .send(newIntegration)
        .set('Authorization', 'Bearer valid-token')
        .expect(201);

      expect(response.body).toEqual(createdIntegration);
      expect(mockService.createIntegration).toHaveBeenCalledWith(newIntegration);
    });

    it('should return 400 for missing configuration', async () => {
      const incompleteIntegration = {
        name: 'Incomplete Integration',
        type: 'ECOMMERCE',
        // Missing configuration and provider
      };

      mockService.createIntegration.mockImplementation(() => {
        throw new Error('Missing required configuration fields');
      });

      const response = await request(app)
        .post('/api/v1/integrations')
        .send(incompleteIntegration)
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ==========================================================================
  // PUT /api/v1/integrations/:integrationId
  // ==========================================================================

  describe('PUT /api/v1/integrations/:integrationId', () => {
    it('should update an integration', async () => {
      const updates = {
        name: 'Updated Shopify Integration',
        configuration: {
          apiKey: 'new-key',
        },
      };

      const updatedIntegration = {
        integrationId: 'int-001',
        name: 'Updated Shopify Integration',
        type: 'ECOMMERCE',
        status: 'ACTIVE',
      };

      mockService.updateIntegration.mockResolvedValue(updatedIntegration);

      const response = await request(app)
        .put('/api/v1/integrations/int-001')
        .send(updates)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(updatedIntegration);
      expect(mockService.updateIntegration).toHaveBeenCalledWith('int-001', updates);
    });

    it('should return 404 when integration to update not found', async () => {
      mockService.updateIntegration.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/v1/integrations/int-999')
        .send({ name: 'Updated' })
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Integration not found');
    });
  });

  // ==========================================================================
  // DELETE /api/v1/integrations/:integrationId
  // ==========================================================================

  describe('DELETE /api/v1/integrations/:integrationId', () => {
    it('should delete an integration', async () => {
      mockService.deleteIntegration.mockResolvedValue(true);

      await request(app)
        .delete('/api/v1/integrations/int-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(204);

      expect(mockService.deleteIntegration).toHaveBeenCalledWith('int-001');
    });

    it('should return 404 when integration to delete not found', async () => {
      mockService.deleteIntegration.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/v1/integrations/int-999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Integration not found');
    });
  });

  // ==========================================================================
  // Sync Jobs
  // ==========================================================================

  describe('POST /api/v1/integrations/:integrationId/sync', () => {
    it('should trigger a FULL_SYNC job', async () => {
      const mockJob = {
        jobId: 'job-001',
        integrationId: 'int-001',
        syncType: 'FULL_SYNC',
        status: 'PENDING',
      };

      mockService.createSyncJob.mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/v1/integrations/int-001/sync?type=FULL_SYNC')
        .set('Authorization', 'Bearer valid-token')
        .expect(201);

      expect(response.body).toEqual(mockJob);
      expect(mockService.createSyncJob).toHaveBeenCalledWith('int-001', 'FULL_SYNC', 'user-123');
    });

    it('should default to FULL_SYNC', async () => {
      const mockJob = {
        jobId: 'job-002',
        integrationId: 'int-001',
        syncType: 'FULL_SYNC',
        status: 'PENDING',
      };

      mockService.createSyncJob.mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/v1/integrations/int-001/sync')
        .set('Authorization', 'Bearer valid-token')
        .expect(201);

      expect(response.body).toEqual(mockJob);
      expect(mockService.createSyncJob).toHaveBeenCalledWith('int-001', 'FULL_SYNC', 'user-123');
    });
  });

  // ==========================================================================
  // Webhooks
  // ==========================================================================

  describe('POST /api/v1/integrations/:integrationId/webhooks', () => {
    it('should handle webhook', async () => {
      const mockEvent = {
        eventId: 'evt-001',
        integrationId: 'int-001',
        eventType: 'order.created',
        payload: { orderId: 'ORD-001' },
      };

      mockRepository.findById.mockResolvedValue({
        integrationId: 'int-001',
        type: 'ECOMMERCE',
        webhookSettings: null,
      });
      mockService.handleWebhook.mockResolvedValue(mockEvent);

      const response = await request(app)
        .post('/api/v1/integrations/int-001/webhooks')
        .set('x-webhook-event', 'order.created')
        .send({ orderId: 'ORD-001' })
        .expect(202);

      expect(response.body).toEqual({
        message: 'Webhook received',
        eventId: 'evt-001',
      });
      expect(mockService.handleWebhook).toHaveBeenCalledWith('int-001', 'order.created', {
        orderId: 'ORD-001',
      });
    });

    it('should return 404 for non-existent integration', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/integrations/int-999/webhooks')
        .set('x-webhook-event', 'order.created')
        .send({})
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Integration not found');
    });

    it('should return 400 for missing event type header', async () => {
      mockRepository.findById.mockResolvedValue({
        integrationId: 'int-001',
        type: 'ECOMMERCE',
        webhookSettings: null,
      });

      const response = await request(app)
        .post('/api/v1/integrations/int-001/webhooks')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing event type header');
    });
  });
});
