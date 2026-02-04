/**
 * Unit tests for IntegrationsService
 * @covers src/services/IntegrationsService.ts
 */

import { IntegrationsService } from '../IntegrationsService';
import {
  IntegrationType,
  IntegrationProvider,
  IntegrationStatus,
  SyncStatus,
  WebhookEventType,
  SyncDirection,
  SyncFrequency,
  ApiAuthType,
} from '@opsui/shared';

// Mock the repository
jest.mock('../../repositories/IntegrationsRepository', () => {
  return {
    IntegrationsRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      createSyncJob: jest.fn(),
      updateSyncJob: jest.fn(),
      createSyncLogEntry: jest.fn(),
      createWebhookEvent: jest.fn(),
      updateWebhookEvent: jest.fn(),
      findWebhookEvents: jest.fn(),
      createCarrierAccount: jest.fn(),
      updateCarrierAccount: jest.fn(),
      deleteCarrierAccount: jest.fn(),
    })),
  };
});

import { IntegrationsRepository } from '../../repositories/IntegrationsRepository';

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let mockRepository: any;

  const mockIntegration = {
    integrationId: 'int-001',
    name: 'Shopify Integration',
    description: 'Shopify store sync',
    type: IntegrationType.ECOMMERCE,
    provider: IntegrationProvider.SHOPIFY,
    status: IntegrationStatus.CONNECTED,
    configuration: {
      auth: {
        type: ApiAuthType.API_KEY,
        shopDomain: 'test.myshopify.com',
        accessToken: 'test-token',
      },
    },
    syncSettings: {
      direction: SyncDirection.INBOUND,
      frequency: SyncFrequency.HOURLY,
      syncInventory: true,
      syncOrders: true,
      syncProducts: true,
      syncShipments: false,
      syncTracking: false,
      fieldMappings: [],
    },
    webhookSettings: {
      enabled: true,
      endpointUrl: 'https://example.com/webhooks',
      secretKey: 'secret',
      subscribedEvents: [WebhookEventType.ORDER_CREATED],
    },
    enabled: true,
    createdBy: 'user-001',
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a mock repository instance directly without calling constructor
    mockRepository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      createSyncJob: jest.fn(),
      updateSyncJob: jest.fn(),
      createSyncLogEntry: jest.fn(),
      createWebhookEvent: jest.fn(),
      updateWebhookEvent: jest.fn(),
      findWebhookEvents: jest.fn(),
      createCarrierAccount: jest.fn(),
      updateCarrierAccount: jest.fn(),
      deleteCarrierAccount: jest.fn(),
    };
    service = new IntegrationsService(mockRepository as any);
  });

  // ==========================================================================
  // INTEGRATION MANAGEMENT
  // ==========================================================================

  describe('createIntegration', () => {
    it('should create an integration with valid configuration', async () => {
      const newIntegration = {
        ...mockIntegration,
        integrationId: undefined as any,
        createdAt: undefined as any,
      };

      mockRepository.create.mockResolvedValue(mockIntegration);
      // findById is called when creating sync job after integration creation
      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.createSyncJob.mockResolvedValue({
        jobId: 'job-001',
      } as any);

      const result = await service.createIntegration(newIntegration);

      expect(result).toEqual(mockIntegration);
      expect(mockRepository.create).toHaveBeenCalledWith(newIntegration);
      expect(mockRepository.createSyncJob).toHaveBeenCalled();
    });

    it('should throw error for missing required auth fields', async () => {
      const invalidIntegration = {
        ...mockIntegration,
        integrationId: undefined as any,
        createdAt: undefined as any,
        configuration: {
          auth: {
            type: ApiAuthType.API_KEY,
            // Missing shopDomain and accessToken
          },
        },
      };

      await expect(service.createIntegration(invalidIntegration)).rejects.toThrow(
        'Missing required auth configuration fields'
      );
    });

    it('should require webhook settings for carrier integrations', async () => {
      const carrierIntegration = {
        ...mockIntegration,
        type: IntegrationType.CARRIER,
        provider: IntegrationProvider.FEDEX,
        integrationId: undefined as any,
        createdAt: undefined as any,
        webhookSettings: undefined,
        // Provide valid auth config to pass validation
        configuration: {
          auth: {
            type: ApiAuthType.API_KEY,
            apiKey: 'test-key',
            secretKey: 'test-secret',
            accountNumber: '123456',
          },
        },
      };

      await expect(service.createIntegration(carrierIntegration)).rejects.toThrow(
        'Carrier integrations require webhook settings'
      );
    });

    it('should validate SAP configuration', async () => {
      const sapIntegration = {
        ...mockIntegration,
        provider: IntegrationProvider.SAP,
        type: IntegrationType.ERP,
        integrationId: undefined as any,
        createdAt: undefined as any,
        configuration: {
          auth: {
            type: ApiAuthType.BASIC_AUTH,
            username: 'user',
            // Missing host, port, client
          },
        },
      };

      await expect(service.createIntegration(sapIntegration)).rejects.toThrow(
        'Missing required auth configuration fields'
      );
    });

    it('should validate Oracle configuration', async () => {
      const oracleIntegration = {
        ...mockIntegration,
        provider: IntegrationProvider.ORACLE,
        type: IntegrationType.ERP,
        integrationId: undefined as any,
        createdAt: undefined as any,
        configuration: {
          auth: {
            type: ApiAuthType.BASIC_AUTH,
            host: 'localhost',
            port: 1521,
            username: 'user',
            // Missing service
          },
        },
      };

      await expect(service.createIntegration(oracleIntegration)).rejects.toThrow(
        'Missing required auth configuration fields'
      );
    });
  });

  describe('updateIntegration', () => {
    it('should update an existing integration', async () => {
      const updates = { name: 'Updated Integration' };
      const updated = { ...mockIntegration, ...updates };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.update.mockResolvedValue(updated);

      const result = await service.updateIntegration('int-001', updates);

      expect(result).toEqual(updated);
      expect(mockRepository.update).toHaveBeenCalledWith('int-001', updates);
    });

    it('should throw error when integration not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.updateIntegration('int-999', {})).rejects.toThrow(
        'Integration not found'
      );
    });

    it('should validate configuration when updating config and provider', async () => {
      mockRepository.findById.mockResolvedValue(mockIntegration);

      const updates = {
        provider: IntegrationProvider.WOOCOMMERCE,
        configuration: {
          auth: {
            type: ApiAuthType.API_KEY,
            // Missing required fields
          },
        },
      };

      await expect(service.updateIntegration('int-001', updates)).rejects.toThrow(
        'Missing required auth configuration fields'
      );
    });
  });

  describe('deleteIntegration', () => {
    it('should delete an integration', async () => {
      mockRepository.delete.mockResolvedValue(true);

      const result = await service.deleteIntegration('int-001');

      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith('int-001');
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      mockRepository.findById.mockResolvedValue(mockIntegration);

      const result = await service.testConnection('int-001');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return error for invalid credentials', async () => {
      const invalidIntegration = {
        ...mockIntegration,
        configuration: {
          auth: { ...mockIntegration.configuration.auth, apiKey: 'invalid' },
        },
      };
      mockRepository.findById.mockResolvedValue(invalidIntegration);

      const result = await service.testConnection('int-001');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid API credentials');
    });

    it('should throw error when integration not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.testConnection('int-999')).rejects.toThrow('Integration not found');
    });
  });

  // ==========================================================================
  // SYNC JOB MANAGEMENT
  // ==========================================================================

  describe('createSyncJob', () => {
    it('should create a sync job for connected integration', async () => {
      const syncJob = {
        jobId: 'job-001',
        integrationId: 'int-001',
        syncType: 'FULL' as const,
        direction: SyncDirection.INBOUND,
        status: SyncStatus.PENDING,
        startedAt: new Date(),
        startedBy: 'user-001',
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        logEntries: [],
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.createSyncJob.mockResolvedValue(syncJob as any);
      mockRepository.updateSyncJob.mockResolvedValue(undefined);
      mockRepository.createSyncLogEntry.mockResolvedValue(undefined);
      mockRepository.update.mockResolvedValue(undefined);

      const result = await service.createSyncJob('int-001', 'FULL', 'user-001');

      expect(result).toEqual(syncJob);
      expect(mockRepository.createSyncJob).toHaveBeenCalledWith({
        integrationId: 'int-001',
        syncType: 'FULL',
        direction: SyncDirection.INBOUND,
        status: SyncStatus.PENDING,
        startedAt: expect.any(Date),
        startedBy: 'user-001',
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
      });
    });

    it('should throw error when integration not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.createSyncJob('int-999', 'FULL', 'user-001')).rejects.toThrow(
        'Integration not found'
      );
    });

    it('should throw error when integration not connected', async () => {
      const disconnectedIntegration = {
        ...mockIntegration,
        status: IntegrationStatus.DISCONNECTED,
      };

      mockRepository.findById.mockResolvedValue(disconnectedIntegration);

      await expect(service.createSyncJob('int-001', 'FULL', 'user-001')).rejects.toThrow(
        'Integration must be connected to run sync jobs'
      );
    });
  });

  // ==========================================================================
  // WEBHOOK HANDLING
  // ==========================================================================

  describe('handleWebhook', () => {
    it('should create and process a webhook event', async () => {
      const webhookEvent = {
        eventId: 'event-001',
        integrationId: 'int-001',
        eventType: WebhookEventType.ORDER_CREATED,
        payload: { orderId: 'order-123' },
        receivedAt: new Date(),
        status: 'PENDING' as const,
        processingAttempts: 0,
      };

      mockRepository.findById.mockResolvedValue(mockIntegration);
      mockRepository.createWebhookEvent.mockResolvedValue(webhookEvent as any);
      mockRepository.findWebhookEvents.mockResolvedValue([webhookEvent] as any);
      mockRepository.updateWebhookEvent.mockResolvedValue(undefined);

      const result = await service.handleWebhook('int-001', WebhookEventType.ORDER_CREATED, {
        orderId: 'order-123',
      });

      expect(result).toEqual(webhookEvent);
      expect(mockRepository.createWebhookEvent).toHaveBeenCalled();
    });

    it('should throw error when integration not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.handleWebhook('int-999', WebhookEventType.ORDER_CREATED, {})
      ).rejects.toThrow('Integration not found');
    });
  });

  // ==========================================================================
  // CARRIER ACCOUNT MANAGEMENT
  // ==========================================================================

  describe('createCarrierAccount', () => {
    const mockCarrierAccount = {
      accountId: 'carrier-001',
      carrier: IntegrationProvider.FEDEX,
      accountNumber: '123456789',
      accountName: 'FedEx Account',
      isActive: true,
      services: [],
      configuredServices: [],
      createdAt: new Date(),
    };

    const newCarrierAccountInput = {
      carrier: IntegrationProvider.FEDEX,
      accountNumber: '123456789',
      accountName: 'FedEx Account',
      isActive: true,
      services: [],
      configuredServices: [],
    };

    it('should create carrier account for carrier integration', async () => {
      const carrierIntegration = {
        ...mockIntegration,
        type: IntegrationType.CARRIER,
        provider: IntegrationProvider.FEDEX,
      };

      mockRepository.findById.mockResolvedValue(carrierIntegration);
      mockRepository.createCarrierAccount.mockResolvedValue(mockCarrierAccount as any);

      const result = await service.createCarrierAccount('int-001', newCarrierAccountInput);

      expect(result).toEqual(mockCarrierAccount);
    });

    it('should throw error when integration not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.createCarrierAccount('int-999', newCarrierAccountInput)).rejects.toThrow(
        'Integration not found'
      );
    });

    it('should throw error when integration is not a carrier', async () => {
      mockRepository.findById.mockResolvedValue(mockIntegration);

      await expect(service.createCarrierAccount('int-001', newCarrierAccountInput)).rejects.toThrow(
        'Carrier accounts can only be added to carrier integrations'
      );
    });
  });

  describe('updateCarrierAccount', () => {
    it('should update a carrier account', async () => {
      const updates = { accountName: 'Updated Account' };
      const updated = { accountId: 'carrier-001', ...updates };

      mockRepository.updateCarrierAccount.mockResolvedValue(updated as any);

      const result = await service.updateCarrierAccount('carrier-001', updates);

      expect(result).toEqual(updated);
    });
  });

  describe('deleteCarrierAccount', () => {
    it('should delete a carrier account', async () => {
      mockRepository.deleteCarrierAccount.mockResolvedValue(true);

      const result = await service.deleteCarrierAccount('carrier-001');

      expect(result).toBe(true);
    });
  });
});
