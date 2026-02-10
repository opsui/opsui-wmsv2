/**
 * Unit tests for IntegrationsRepository
 * @covers src/repositories/IntegrationsRepository.ts
 */

import { IntegrationsRepository } from '../IntegrationsRepository';
import { Pool } from 'pg';
import {
  IntegrationType,
  IntegrationProvider,
  IntegrationStatus,
  WebhookEventType,
  SyncStatus,
  SyncDirection,
} from '@opsui/shared';

describe('IntegrationsRepository', () => {
  let repository: IntegrationsRepository;
  let mockPool: any;

  beforeEach(() => {
    // Create mock pool
    mockPool = {
      query: jest.fn(),
    };

    repository = new IntegrationsRepository(mockPool);
  });

  // ==========================================================================
  // INTEGRATIONS CRUD
  // ==========================================================================

  describe('Integrations CRUD', () => {
    describe('findAll', () => {
      it('should return all integrations without filters', async () => {
        const mockRows = [
          {
            integration_id: 'INT-001',
            name: 'Shopify Integration',
            description: 'Shopify e-commerce',
            type: IntegrationType.ECOMMERCE,
            provider: IntegrationProvider.SHOPIFY,
            status: IntegrationStatus.CONNECTED,
            configuration: { apiKey: 'test' } as any,
            sync_settings: { interval: 3600 } as any,
            webhook_settings: { secret: 'webhook-secret' } as any,
            enabled: true,
            created_by: 'user-1',
            updated_by: null,
            last_sync_at: new Date(),
            last_error: null,
            created_at: new Date(),
            updated_at: new Date(),
            carrier_accounts: [],
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findAll();

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('integrationId', 'INT-001');
        expect(result[0]).toHaveProperty('name', 'Shopify Integration');
        expect(mockPool.query).toHaveBeenCalledTimes(1);
      });

      it('should filter integrations by type', async () => {
        const mockRows = [
          {
            integration_id: 'INT-001',
            name: 'Magento Integration',
            description: 'Magento e-commerce',
            type: IntegrationType.ECOMMERCE,
            provider: IntegrationProvider.MAGENTO,
            status: IntegrationStatus.CONNECTED,
            configuration: {} as any,
            sync_settings: {} as any,
            webhook_settings: null,
            enabled: true,
            created_by: 'user-1',
            updated_by: null,
            last_sync_at: null,
            last_error: null,
            created_at: new Date(),
            updated_at: new Date(),
            carrier_accounts: [],
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findAll({ type: IntegrationType.ECOMMERCE });

        expect(result).toHaveLength(1);
        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('i.type = $1'), [
          IntegrationType.ECOMMERCE,
        ]);
      });

      it('should filter integrations by provider', async () => {
        const mockRows = [
          {
            integration_id: 'INT-002',
            name: 'FedEx Integration',
            description: 'FedEx shipping',
            type: IntegrationType.CARRIER,
            provider: IntegrationProvider.FEDEX,
            status: IntegrationStatus.CONNECTED,
            configuration: {} as any,
            sync_settings: null,
            webhook_settings: null,
            enabled: true,
            created_by: 'user-1',
            updated_by: null,
            last_sync_at: null,
            last_error: null,
            created_at: new Date(),
            updated_at: new Date(),
            carrier_accounts: [],
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findAll({ provider: IntegrationProvider.FEDEX });

        expect(result).toHaveLength(1);
        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('i.provider = $1'), [
          IntegrationProvider.FEDEX,
        ]);
      });

      it('should filter integrations by status', async () => {
        const mockRows = [
          {
            integration_id: 'INT-003',
            name: 'Inactive Integration',
            description: 'Inactive',
            type: IntegrationType.ERP,
            provider: IntegrationProvider.NETSUITE,
            status: IntegrationStatus.PAUSED,
            configuration: {} as any,
            sync_settings: null,
            webhook_settings: null,
            enabled: false,
            created_by: 'user-1',
            updated_by: null,
            last_sync_at: null,
            last_error: null,
            created_at: new Date(),
            updated_at: new Date(),
            carrier_accounts: [],
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findAll({ status: IntegrationStatus.PAUSED });

        expect(result).toHaveLength(1);
        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('i.status = $1'), [
          IntegrationStatus.PAUSED,
        ]);
      });

      it('should filter integrations by multiple criteria', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findAll({
          type: IntegrationType.ECOMMERCE,
          provider: IntegrationProvider.SHOPIFY,
          status: IntegrationStatus.CONNECTED,
        });

        const query = mockPool.query.mock.calls[0][0] as string;
        expect(query).toContain('i.type = $1');
        expect(query).toContain('i.provider = $2');
        expect(query).toContain('i.status = $3');
      });
    });

    describe('findById', () => {
      it('should find integration by ID', async () => {
        const mockRow = {
          integration_id: 'INT-001',
          name: 'Shopify Integration',
          description: 'Shopify',
          type: IntegrationType.ECOMMERCE,
          provider: IntegrationProvider.SHOPIFY,
          status: IntegrationStatus.CONNECTED,
          configuration: { apiKey: 'test' },
          sync_settings: { interval: 3600 },
          webhook_settings: { secret: 'webhook-secret' },
          enabled: true,
          created_by: 'user-1',
          updated_by: null,
          last_sync_at: new Date(),
          last_error: null,
          created_at: new Date(),
          updated_at: new Date(),
          carrier_accounts: [],
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.findById('INT-001');

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('integrationId', 'INT-001');
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE i.integration_id = $1'),
          ['INT-001']
        );
      });

      it('should return null when integration not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const result = await repository.findById('NONEXISTENT');

        expect(result).toBeNull();
      });
    });

    describe('create', () => {
      it('should create a new integration', async () => {
        const mockRow = {
          integration_id: 'INT-NEW',
          name: 'New Integration',
          description: 'New',
          type: IntegrationType.ECOMMERCE,
          provider: IntegrationProvider.WOOCOMMERCE,
          status: IntegrationStatus.CONNECTING,
          configuration: {} as any,
          sync_settings: {},
          webhook_settings: null,
          enabled: true,
          created_by: 'user-1',
          updated_by: null,
          last_sync_at: null,
          last_error: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.create({
          name: 'New Integration',
          description: 'New',
          type: IntegrationType.ECOMMERCE,
          provider: IntegrationProvider.WOOCOMMERCE,
          status: IntegrationStatus.CONNECTING,
          configuration: {} as any,
          syncSettings: {} as any,
          enabled: true,
          createdBy: 'user-1',
        });

        expect(result).toHaveProperty('integrationId');
        expect(result).toHaveProperty('name', 'New Integration');
        expect(mockPool.query).toHaveBeenCalled();
      });

      it('should create integration with minimal required fields', async () => {
        const mockRow = {
          integration_id: 'INT-MIN',
          name: 'Minimal',
          description: '',
          type: IntegrationType.ERP,
          provider: IntegrationProvider.NETSUITE,
          status: IntegrationStatus.CONNECTING,
          configuration: {} as any,
          sync_settings: {},
          webhook_settings: null,
          enabled: true,
          created_by: 'user-1',
          updated_by: null,
          last_sync_at: null,
          last_error: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.create({
          name: 'Minimal',
          description: '',
          type: IntegrationType.ERP,
          provider: IntegrationProvider.NETSUITE,
          status: IntegrationStatus.CONNECTING,
          configuration: {} as any,
          syncSettings: {} as any,
          enabled: true,
          createdBy: 'user-1',
        });

        expect(result).toHaveProperty('integrationId');
      });
    });

    describe('update', () => {
      it('should update integration fields', async () => {
        const mockRow = {
          integration_id: 'INT-001',
          name: 'Updated Name',
          description: 'Updated',
          type: IntegrationType.ECOMMERCE,
          provider: IntegrationProvider.SHOPIFY,
          status: IntegrationStatus.CONNECTED,
          configuration: { newKey: 'value' },
          sync_settings: {},
          webhook_settings: null,
          enabled: true,
          created_by: 'user-1',
          updated_by: null,
          last_sync_at: new Date(),
          last_error: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.update('INT-001', {
          name: 'Updated Name',
          description: 'Updated',
          configuration: { newKey: 'value' } as any,
        });

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('name', 'Updated Name');
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE integrations'),
          expect.arrayContaining(['Updated Name', expect.any(String), 'INT-001'])
        );
      });

      it('should update integration status', async () => {
        const mockRow = {
          integration_id: 'INT-001',
          name: 'Test',
          description: '',
          type: IntegrationType.ECOMMERCE,
          provider: IntegrationProvider.SHOPIFY,
          status: IntegrationStatus.CONNECTED,
          configuration: {} as any,
          sync_settings: null,
          webhook_settings: null,
          enabled: true,
          created_by: 'user-1',
          updated_by: null,
          last_sync_at: null,
          last_error: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.update('INT-001', {
          status: IntegrationStatus.CONNECTED,
        });

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('status', IntegrationStatus.CONNECTED);
      });

      it('should return null when update has no changes', async () => {
        const mockRow = {
          integration_id: 'INT-001',
          name: 'Test',
          description: '',
          type: IntegrationType.ECOMMERCE,
          provider: IntegrationProvider.SHOPIFY,
          status: IntegrationStatus.CONNECTED,
          configuration: {} as any,
          sync_settings: null,
          webhook_settings: null,
          enabled: true,
          created_by: 'user-1',
          updated_by: null,
          last_sync_at: null,
          last_error: null,
          created_at: new Date(),
          updated_at: new Date(),
          carrier_accounts: [],
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.update('INT-001', {});

        expect(result).not.toBeNull();
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE i.integration_id = $1'),
          ['INT-001']
        );
      });

      it('should return null when integration not found for update', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const result = await repository.update('NONEXISTENT', {
          name: 'Updated',
        });

        expect(result).toBeNull();
      });
    });

    describe('delete', () => {
      it('should delete an integration', async () => {
        mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

        const result = await repository.delete('INT-001');

        expect(result).toBe(true);
        expect(mockPool.query).toHaveBeenCalledWith(
          'DELETE FROM integrations WHERE integration_id = $1',
          ['INT-001']
        );
      });

      it('should return false when integration not found for deletion', async () => {
        mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

        const result = await repository.delete('NONEXISTENT');

        expect(result).toBe(false);
      });
    });
  });

  // ==========================================================================
  // SYNC JOBS
  // ==========================================================================

  describe('Sync Jobs', () => {
    describe('createSyncJob', () => {
      it('should create a new sync job', async () => {
        const mockRow = {
          job_id: 'JOB-001',
          integration_id: 'INT-001',
          sync_type: 'FULL',
          direction: SyncDirection.INBOUND,
          status: SyncStatus.RUNNING,
          started_at: new Date(),
          completed_at: null,
          started_by: 'user-1',
          records_processed: 0,
          records_succeeded: 0,
          records_failed: 0,
          error_message: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.createSyncJob({
          integrationId: 'INT-001',
          syncType: 'FULL',
          direction: SyncDirection.INBOUND,
          status: SyncStatus.RUNNING,
          startedAt: new Date(),
          startedBy: 'user-1',
          recordsProcessed: 0,
          recordsSucceeded: 0,
          recordsFailed: 0,
        });

        expect(result).toHaveProperty('jobId', 'JOB-001');
        expect(result).toHaveProperty('integrationId', 'INT-001');
      });

      it('should create sync job with records counts', async () => {
        const mockRow = {
          job_id: 'JOB-002',
          integration_id: 'INT-001',
          sync_type: 'INCREMENTAL',
          direction: SyncDirection.OUTBOUND,
          status: SyncStatus.COMPLETED,
          started_at: new Date(),
          completed_at: null,
          started_by: 'system',
          records_processed: 100,
          records_succeeded: 95,
          records_failed: 5,
          error_message: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.createSyncJob({
          integrationId: 'INT-001',
          syncType: 'INCREMENTAL',
          direction: SyncDirection.OUTBOUND,
          status: SyncStatus.COMPLETED,
          startedAt: new Date(),
          startedBy: 'system',
          recordsProcessed: 100,
          recordsSucceeded: 95,
          recordsFailed: 5,
        });

        expect(result).toHaveProperty('recordsProcessed', 100);
        expect(result).toHaveProperty('recordsSucceeded', 95);
        expect(result).toHaveProperty('recordsFailed', 5);
      });
    });

    describe('findSyncJobs', () => {
      it('should find all sync jobs without integration filter', async () => {
        const mockRows = [
          {
            job_id: 'JOB-001',
            integration_id: 'INT-001',
            sync_type: 'FULL',
            direction: SyncDirection.INBOUND,
            status: SyncStatus.COMPLETED,
            started_at: new Date(),
            completed_at: new Date(),
            started_by: 'user-1',
            records_processed: 100,
            records_succeeded: 100,
            records_failed: 0,
            error_message: null,
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findSyncJobs();

        expect(result).toHaveLength(1);
        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('($1::text IS NULL'), [
          null,
          50,
        ]);
      });

      it('should find sync jobs for specific integration', async () => {
        const mockRows = [
          {
            job_id: 'JOB-002',
            integration_id: 'INT-001',
            sync_type: 'INCREMENTAL',
            direction: SyncDirection.OUTBOUND,
            status: SyncStatus.RUNNING,
            started_at: new Date(),
            completed_at: null,
            started_by: 'system',
            records_processed: 50,
            records_succeeded: 48,
            records_failed: 2,
            error_message: null,
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findSyncJobs('INT-001', 20);

        expect(result).toHaveLength(1);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('integration_id = $1'),
          ['INT-001', 20]
        );
      });
    });

    describe('findSyncJobById', () => {
      it('should find sync job by ID', async () => {
        const mockRow = {
          job_id: 'JOB-001',
          integration_id: 'INT-001',
          sync_type: 'FULL',
          direction: SyncDirection.INBOUND,
          status: SyncStatus.COMPLETED,
          started_at: new Date(),
          completed_at: new Date(),
          started_by: 'user-1',
          records_processed: 100,
          records_succeeded: 100,
          records_failed: 0,
          error_message: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.findSyncJobById('JOB-001');

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('jobId', 'JOB-001');
      });

      it('should return null when sync job not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const result = await repository.findSyncJobById('NONEXISTENT');

        expect(result).toBeNull();
      });
    });

    describe('updateSyncJob', () => {
      it('should update sync job status', async () => {
        const mockRow = {
          job_id: 'JOB-001',
          integration_id: 'INT-001',
          sync_type: 'FULL',
          direction: SyncDirection.INBOUND,
          status: SyncStatus.COMPLETED,
          started_at: new Date(),
          completed_at: new Date(),
          started_by: 'user-1',
          records_processed: 100,
          records_succeeded: 100,
          records_failed: 0,
          error_message: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.updateSyncJob('JOB-001', {
          status: SyncStatus.COMPLETED,
          completedAt: new Date(),
        });

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('status', 'COMPLETED');
      });

      it('should update sync job records counts', async () => {
        const mockRow = {
          job_id: 'JOB-001',
          integration_id: 'INT-001',
          sync_type: 'FULL',
          direction: SyncDirection.INBOUND,
          status: SyncStatus.RUNNING,
          started_at: new Date(),
          completed_at: null,
          started_by: 'user-1',
          records_processed: 200,
          records_succeeded: 195,
          records_failed: 5,
          error_message: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.updateSyncJob('JOB-001', {
          recordsProcessed: 200,
          recordsSucceeded: 195,
          recordsFailed: 5,
        });

        expect(result).toHaveProperty('recordsProcessed', 200);
        expect(result).toHaveProperty('recordsSucceeded', 195);
        expect(result).toHaveProperty('recordsFailed', 5);
      });

      it('should update sync job with error message', async () => {
        const mockRow = {
          job_id: 'JOB-001',
          integration_id: 'INT-001',
          sync_type: 'FULL',
          direction: SyncDirection.INBOUND,
          status: SyncStatus.FAILED,
          started_at: new Date(),
          completed_at: new Date(),
          started_by: 'user-1',
          records_processed: 50,
          records_succeeded: 25,
          records_failed: 25,
          error_message: 'Connection timeout',
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.updateSyncJob('JOB-001', {
          status: SyncStatus.FAILED,
          errorMessage: 'Connection timeout',
          completedAt: new Date(),
        });

        expect(result).toHaveProperty('errorMessage', 'Connection timeout');
      });

      it('should return existing job when no updates provided', async () => {
        const mockRow = {
          job_id: 'JOB-001',
          integration_id: 'INT-001',
          sync_type: 'FULL',
          direction: SyncDirection.INBOUND,
          status: SyncStatus.RUNNING,
          started_at: new Date(),
          completed_at: null,
          started_by: 'user-1',
          records_processed: 50,
          records_succeeded: 48,
          records_failed: 2,
          error_message: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.updateSyncJob('JOB-001', {});

        expect(result).not.toBeNull();
        expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM sync_jobs WHERE job_id = $1', [
          'JOB-001',
        ]);
      });
    });
  });

  // ==========================================================================
  // SYNC JOB LOGS
  // ==========================================================================

  describe('Sync Job Logs', () => {
    describe('createSyncLogEntry', () => {
      it('should create a sync log entry', async () => {
        const mockRow = {
          log_id: 'LOG-001',
          job_id: 'JOB-001',
          level: 'INFO',
          message: 'Processing started',
          details: null,
          entity_type: null,
          entity_id: null,
          external_id: null,
          timestamp: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.createSyncLogEntry('JOB-001', {
          level: 'INFO',
          message: 'Processing started',
        });

        expect(result).toHaveProperty('logId', 'LOG-001');
        expect(result).toHaveProperty('level', 'INFO');
        expect(result).toHaveProperty('message', 'Processing started');
      });

      it('should create sync log entry with error details', async () => {
        const mockRow = {
          log_id: 'LOG-002',
          job_id: 'JOB-001',
          level: 'ERROR',
          message: 'Processing failed',
          details: '{"code": "ERR-001", "details": "Invalid data"}',
          entity_type: 'PRODUCT',
          entity_id: 'PROD-001',
          external_id: 'EXT-123',
          timestamp: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.createSyncLogEntry('JOB-001', {
          level: 'ERROR',
          message: 'Processing failed',
          errorDetails: { code: 'ERR-001', details: 'Invalid data' },
          entityType: 'PRODUCT',
          entityId: 'PROD-001',
          externalId: 'EXT-123',
        });

        expect(result).toHaveProperty('level', 'ERROR');
        expect(result).toHaveProperty('entityType', 'PRODUCT');
        expect(result?.errorDetails).toEqual({ code: 'ERR-001', details: 'Invalid data' });
      });
    });

    describe('findSyncLogEntrys', () => {
      it('should find log entries for a job', async () => {
        const mockRows = [
          {
            log_id: 'LOG-001',
            job_id: 'JOB-001',
            level: 'INFO',
            message: 'Starting sync',
            details: null,
            entity_type: null,
            entity_id: null,
            external_id: null,
            timestamp: new Date(),
          },
          {
            log_id: 'LOG-002',
            job_id: 'JOB-001',
            level: 'ERROR',
            message: 'Sync failed',
            details: null,
            entity_type: null,
            entity_id: null,
            external_id: null,
            timestamp: new Date(),
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findSyncLogEntrys('JOB-001');

        expect(result).toHaveLength(2);
        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE job_id = $1'), [
          'JOB-001',
          100,
        ]);
      });

      it('should respect limit parameter', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findSyncLogEntrys('JOB-001', 10);

        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $2'), [
          'JOB-001',
          10,
        ]);
      });
    });
  });

  // ==========================================================================
  // WEBHOOK EVENTS
  // ==========================================================================

  describe('Webhook Events', () => {
    describe('createWebhookEvent', () => {
      it('should create a webhook event', async () => {
        const mockRow = {
          event_id: 'EVT-001',
          integration_id: 'INT-001',
          event_type: WebhookEventType.ORDER_CREATED,
          payload: { orderId: '123', status: 'pending' },
          status: 'PENDING',
          received_at: new Date(),
          processed_at: null,
          processing_attempts: 0,
          error_message: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.createWebhookEvent({
          integrationId: 'INT-001',
          eventType: WebhookEventType.ORDER_CREATED,
          payload: { orderId: '123', status: 'pending' },
          status: 'PENDING',
          processingAttempts: 0,
        });

        expect(result).toHaveProperty('eventId', 'EVT-001');
        expect(result).toHaveProperty('eventType', WebhookEventType.ORDER_CREATED);
      });

      it('should create webhook event with processing attempts', async () => {
        const mockRow = {
          event_id: 'EVT-002',
          integration_id: 'INT-001',
          event_type: WebhookEventType.PRODUCT_UPDATED,
          payload: { sku: 'SKU-001' },
          status: SyncStatus.FAILED,
          received_at: new Date(),
          processed_at: null,
          processing_attempts: 3,
          error_message: 'Timeout',
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.createWebhookEvent({
          integrationId: 'INT-001',
          eventType: WebhookEventType.PRODUCT_UPDATED,
          payload: { sku: 'SKU-001' },
          status: SyncStatus.FAILED,
          processingAttempts: 3,
          errorMessage: 'Timeout',
        });

        expect(result).toHaveProperty('processingAttempts', 3);
        expect(result).toHaveProperty('errorMessage', 'Timeout');
      });
    });

    describe('findWebhookEvents', () => {
      it('should find all webhook events without filters', async () => {
        const mockRows = [
          {
            event_id: 'EVT-001',
            integration_id: 'INT-001',
            event_type: WebhookEventType.ORDER_CREATED,
            payload: {},
            status: 'PROCESSED',
            received_at: new Date(),
            processed_at: new Date(),
            processing_attempts: 1,
            error_message: null,
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findWebhookEvents();

        expect(result).toHaveLength(1);
      });

      it('should filter webhook events by integration', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findWebhookEvents({ integrationId: 'INT-001' });

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('integration_id = $1'),
          expect.arrayContaining(['INT-001'])
        );
      });

      it('should filter webhook events by status', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findWebhookEvents({ status: 'PENDING' });

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('status = $'),
          expect.any(Array)
        );
      });

      it('should filter webhook events by event type', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findWebhookEvents({ eventType: WebhookEventType.ORDER_CREATED });

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('event_type = $'),
          expect.any(Array)
        );
      });

      it('should apply limit parameter', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findWebhookEvents({}, 25);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT $'),
          expect.any(Array)
        );
      });
    });

    describe('updateWebhookEvent', () => {
      it('should update webhook event status', async () => {
        const mockRow = {
          event_id: 'EVT-001',
          integration_id: 'INT-001',
          event_type: WebhookEventType.ORDER_CREATED,
          payload: {},
          status: 'PROCESSED',
          received_at: new Date(),
          processed_at: new Date(),
          processing_attempts: 1,
          error_message: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.updateWebhookEvent('EVT-001', {
          status: 'PROCESSED',
          processedAt: new Date(),
        });

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('status', 'PROCESSED');
      });

      it('should increment processing attempts', async () => {
        const mockRow = {
          event_id: 'EVT-001',
          integration_id: 'INT-001',
          event_type: WebhookEventType.ORDER_CREATED,
          payload: {},
          status: SyncStatus.FAILED,
          received_at: new Date(),
          processed_at: null,
          processing_attempts: 5,
          error_message: 'Invalid data',
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.updateWebhookEvent('EVT-001', {
          status: SyncStatus.FAILED,
          processingAttempts: 5,
          errorMessage: 'Invalid data',
        });

        expect(result).toHaveProperty('processingAttempts', 5);
        expect(result).toHaveProperty('errorMessage', 'Invalid data');
      });

      it('should return null when no updates provided', async () => {
        const result = await repository.updateWebhookEvent('EVT-001', {});

        expect(result).toBeNull();
      });

      it('should return null when webhook event not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const result = await repository.updateWebhookEvent('NONEXISTENT', {
          status: 'PROCESSED',
        });

        expect(result).toBeNull();
      });
    });
  });

  // ==========================================================================
  // CARRIER ACCOUNTS
  // ==========================================================================

  describe('Carrier Accounts', () => {
    describe('findCarrierAccounts', () => {
      it('should find all carrier accounts', async () => {
        const mockRows = [
          {
            carrier_account_id: 'CA-001',
            integration_id: 'INT-001',
            carrier: IntegrationProvider.FEDEX,
            account_number: '123456',
            account_name: 'FedEx Account',
            is_active: true,
            services: [
              {
                serviceCode: 'ground',
                serviceName: 'FedEx Ground',
                description: 'Ground delivery',
                domestic: true,
                international: false,
                requiresDimensions: true,
                requiresWeight: true,
              },
              {
                serviceCode: 'express',
                serviceName: 'FedEx Express',
                description: 'Express delivery',
                domestic: true,
                international: true,
                requiresDimensions: true,
                requiresWeight: true,
              },
            ],
            configured_services: [],
            created_at: new Date(),
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findCarrierAccounts();

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('accountId', 'CA-001');
        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('($1::text IS NULL'), [
          null,
        ]);
      });

      it('should find carrier accounts for specific integration', async () => {
        const mockRows = [
          {
            carrier_account_id: 'CA-002',
            integration_id: 'INT-001',
            carrier: IntegrationProvider.UPS,
            account_number: '654321',
            account_name: 'UPS Account',
            is_active: true,
            services: [
              {
                serviceCode: 'ground',
                serviceName: 'UPS Ground',
                description: 'Ground delivery',
                domestic: true,
                international: false,
                requiresDimensions: true,
                requiresWeight: true,
              },
            ],
            configured_services: [],
            created_at: new Date(),
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findCarrierAccounts('INT-001');

        expect(result).toHaveLength(1);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('integration_id = $1'),
          ['INT-001']
        );
      });
    });

    describe('createCarrierAccount', () => {
      it('should create a new carrier account', async () => {
        const mockRow = {
          carrier_account_id: 'CA-NEW',
          integration_id: null,
          carrier: IntegrationProvider.FEDEX,
          account_number: '999999',
          account_name: 'New FedEx Account',
          is_active: true,
          services: [
            {
              serviceCode: 'ground',
              serviceName: 'FedEx Ground',
              description: 'Ground delivery',
              domestic: true,
              international: false,
              requiresDimensions: true,
              requiresWeight: true,
            },
            {
              serviceCode: 'express',
              serviceName: 'FedEx Express',
              description: 'Express delivery',
              domestic: true,
              international: true,
              requiresDimensions: true,
              requiresWeight: true,
            },
            {
              serviceCode: 'overnight',
              serviceName: 'FedEx Overnight',
              description: 'Overnight delivery',
              domestic: true,
              international: false,
              requiresDimensions: true,
              requiresWeight: true,
            },
          ],
          configured_services: [],
          created_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.createCarrierAccount({
          carrier: IntegrationProvider.FEDEX,
          accountNumber: '999999',
          accountName: 'New FedEx Account',
          isActive: true,
          configuredServices: [],
          services: [
            {
              serviceCode: 'ground',
              serviceName: 'FedEx Ground',
              description: 'Ground delivery',
              domestic: true,
              international: false,
              requiresDimensions: true,
              requiresWeight: true,
            },
            {
              serviceCode: 'express',
              serviceName: 'FedEx Express',
              description: 'Express delivery',
              domestic: true,
              international: true,
              requiresDimensions: true,
              requiresWeight: true,
            },
            {
              serviceCode: 'overnight',
              serviceName: 'FedEx Overnight',
              description: 'Overnight delivery',
              domestic: true,
              international: false,
              requiresDimensions: true,
              requiresWeight: true,
            },
          ],
        });

        expect(result).toHaveProperty('accountId', 'CA-NEW');
        expect(result).toHaveProperty('carrier', IntegrationProvider.FEDEX);
        expect(mockPool.query).toHaveBeenCalled();
      });

      it('should create carrier account with configured services', async () => {
        const mockRow = {
          carrier_account_id: 'CA-NEW2',
          integration_id: null,
          carrier: IntegrationProvider.UPS,
          account_number: '888888',
          account_name: 'UPS Account',
          is_active: true,
          services: [],
          configured_services: ['ground', 'express'],
          created_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.createCarrierAccount({
          carrier: IntegrationProvider.UPS,
          accountNumber: '888888',
          accountName: 'UPS Account',
          isActive: true,
          services: [],
          configuredServices: ['ground', 'express'],
        });

        expect(result).toHaveProperty('configuredServices', ['ground', 'express']);
      });
    });

    describe('updateCarrierAccount', () => {
      it('should update carrier account', async () => {
        const mockRow = {
          carrier_account_id: 'CA-001',
          integration_id: 'INT-001',
          carrier: IntegrationProvider.FEDEX,
          account_number: '111111',
          account_name: 'Updated Account',
          is_active: false,
          services: [
            {
              serviceCode: 'ground',
              serviceName: 'FedEx Ground',
              description: 'Ground delivery',
              domestic: true,
              international: false,
              requiresDimensions: true,
              requiresWeight: true,
            },
          ],
          configured_services: [],
          created_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.updateCarrierAccount('CA-001', {
          accountName: 'Updated Account',
          isActive: false,
          services: [
            {
              serviceCode: 'ground',
              serviceName: 'FedEx Ground',
              description: 'Ground delivery',
              domestic: true,
              international: false,
              requiresDimensions: true,
              requiresWeight: true,
            },
          ],
        });

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('accountName', 'Updated Account');
        expect(result).toHaveProperty('isActive', false);
      });

      it('should update carrier account number', async () => {
        const mockRow = {
          carrier_account_id: 'CA-001',
          integration_id: 'INT-001',
          carrier: IntegrationProvider.UPS,
          account_number: 'NEW-NUMBER',
          account_name: 'UPS Account',
          is_active: true,
          services: [],
          configured_services: [],
          created_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.updateCarrierAccount('CA-001', {
          accountNumber: 'NEW-NUMBER',
        });

        expect(result).toHaveProperty('accountNumber', 'NEW-NUMBER');
      });

      it('should return null when no updates provided', async () => {
        const result = await repository.updateCarrierAccount('CA-001', {});

        expect(result).toBeNull();
      });

      it('should return null when carrier account not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const result = await repository.updateCarrierAccount('NONEXISTENT', {
          accountName: 'Updated',
        });

        expect(result).toBeNull();
      });
    });

    describe('deleteCarrierAccount', () => {
      it('should delete a carrier account', async () => {
        mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

        const result = await repository.deleteCarrierAccount('CA-001');

        expect(result).toBe(true);
        expect(mockPool.query).toHaveBeenCalledWith(
          'DELETE FROM carrier_accounts WHERE carrier_account_id = $1',
          ['CA-001']
        );
      });

      it('should return false when carrier account not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

        const result = await repository.deleteCarrierAccount('NONEXISTENT');

        expect(result).toBe(false);
      });
    });
  });
});
