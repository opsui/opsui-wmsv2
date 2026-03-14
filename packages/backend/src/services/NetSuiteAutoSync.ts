/**
 * NetSuite Auto-Sync Service
 *
 * Periodically syncs orders from NetSuite to WMS for all enabled
 * NetSuite integrations. Runs as a background interval in the backend.
 *
 * Syncs both:
 * - Sales Orders (_pendingFulfillment) → PENDING status (picking queue)
 * - Item Fulfillments (not shipped) → PICKED status (packing queue)
 */

import { IntegrationsRepository } from '../repositories/IntegrationsRepository';
import { NetSuiteOrderSyncService } from './NetSuiteOrderSyncService';
import { NetSuiteClient } from './NetSuiteClient';
import { IntegrationProvider, IntegrationStatus, SyncStatus } from '@opsui/shared';
import { logger } from '../config/logger';
import { getPool } from '../db/client';
import { tenantPoolManager } from '../db/tenantContext';
import { v4 as uuidv4 } from 'uuid';

// Fast sync interval for near real-time order updates
const DEFAULT_SYNC_INTERVAL_MS = 30 * 1000; // 30 seconds for faster order updates
const SYNC_PAGE_SIZE = 100; // Increased page size for faster sync
const STALE_SYNC_JOB_MINUTES = parseInt(process.env.NETSUITE_SYNC_JOB_STALE_MINUTES || '15', 10);
const FULL_DISCOVERY_INTERVAL_MINUTES = Math.max(
  parseInt(process.env.NETSUITE_FULL_DISCOVERY_INTERVAL_MINUTES || '5', 10),
  1
);

export class NetSuiteAutoSync {
  private interval: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private repository: IntegrationsRepository | null = null;
  private readonly processStartedAt = new Date();

  private getRepository(): IntegrationsRepository {
    if (!this.repository) {
      this.repository = new IntegrationsRepository(getPool());
    }
    return this.repository;
  }

  private getAutoSyncMetadata(integration: any): {
    config: Record<string, any>;
    autoSync: Record<string, any>;
    lastFullDiscoveryAt: Date | null;
  } {
    const config =
      integration.configuration && typeof integration.configuration === 'object'
        ? { ...integration.configuration }
        : {};
    const autoSync =
      config.autoSync && typeof config.autoSync === 'object' ? { ...config.autoSync } : {};
    const lastFullDiscoveryAt =
      autoSync.lastFullDiscoveryAt && !Number.isNaN(Date.parse(autoSync.lastFullDiscoveryAt))
        ? new Date(autoSync.lastFullDiscoveryAt)
        : null;

    return { config, autoSync, lastFullDiscoveryAt };
  }

  private determineSyncMode(integration: any, now: Date): 'full' | 'incremental' {
    const { lastFullDiscoveryAt } = this.getAutoSyncMetadata(integration);
    if (!lastFullDiscoveryAt) {
      return 'full';
    }

    const elapsedMs = now.getTime() - lastFullDiscoveryAt.getTime();
    const fullDiscoveryIntervalMs = FULL_DISCOVERY_INTERVAL_MINUTES * 60 * 1000;
    return elapsedMs >= fullDiscoveryIntervalMs ? 'full' : 'incremental';
  }

  private async recoverOrSkipRunningJobs(
    tenantPool: ReturnType<typeof getPool>,
    integration: any
  ): Promise<boolean> {
    const staleCutoffMinutes = Math.max(STALE_SYNC_JOB_MINUTES, 2);
    const autoRunningResult = await tenantPool.query(
      `UPDATE sync_jobs
       SET status = $1,
           completed_at = NOW(),
           error_message = COALESCE(
             error_message,
             $2
           )
       WHERE integration_id = $3
         AND sync_type = 'ORDER_SYNC'
         AND started_by = 'auto-sync'
         AND status = $4
         AND job_id <> COALESCE($5, '')
       RETURNING job_id, started_at`,
      [
        SyncStatus.FAILED,
        'Auto-marked failed because a newer auto-sync cycle was starting',
        integration.integrationId,
        SyncStatus.RUNNING,
        null,
      ]
    );

    if (autoRunningResult.rows.length > 0) {
      logger.warn('Recovered leftover auto-sync jobs before starting a new cycle', {
        integrationId: integration.integrationId,
        count: autoRunningResult.rows.length,
        jobIds: autoRunningResult.rows.map((row: any) => row.job_id),
        processStartedAt: this.processStartedAt.toISOString(),
        staleCutoffMinutes,
      });
    }

    const activeResult = await tenantPool.query(
      `SELECT job_id, started_at
       FROM sync_jobs
       WHERE integration_id = $1
         AND sync_type = 'ORDER_SYNC'
         AND started_by = 'auto-sync'
         AND status = $2
         AND started_at >= NOW() - ($3::text || ' minutes')::interval
       ORDER BY started_at DESC`,
      [integration.integrationId, SyncStatus.RUNNING, staleCutoffMinutes]
    );

    if (activeResult.rows.length > 0) {
      logger.warn('Skipping NetSuite sync because an active sync job already exists', {
        integrationId: integration.integrationId,
        activeJobIds: activeResult.rows.map((row: any) => row.job_id),
      });
      return false;
    }

    return true;
  }

  /**
   * Start the auto-sync scheduler
   */
  start(intervalMs: number = DEFAULT_SYNC_INTERVAL_MS): void {
    if (this.interval) {
      logger.warn('NetSuite auto-sync already running');
      return;
    }

    logger.info('Starting NetSuite auto-sync', {
      intervalSeconds: Math.round(intervalMs / 1000),
    });

    // Run immediately on startup, then on interval
    this.runSync().catch(err => {
      logger.error('NetSuite auto-sync initial run failed', { error: err.message });
    });

    this.interval = setInterval(() => {
      this.runSync().catch(err => {
        logger.error('NetSuite auto-sync run failed', { error: err.message });
      });
    }, intervalMs);
  }

  /**
   * Stop the auto-sync scheduler
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('NetSuite auto-sync stopped');
    }
  }

  /**
   * Run a single sync cycle for all enabled NetSuite integrations
   */
  private async runSync(): Promise<void> {
    if (this.running) {
      logger.debug('NetSuite auto-sync already in progress, skipping');
      return;
    }

    this.running = true;
    const startTime = Date.now();

    try {
      // Find all NetSuite integrations (filter by provider only, check status in code)
      const integrations = await this.getRepository().findAll({
        provider: IntegrationProvider.NETSUITE,
      });

      // Filter to enabled AND active/connected integrations
      const activeIntegrations = integrations.filter(i => {
        const isEnabled = i.enabled !== false;
        // Accept both CONNECTED and ACTIVE status (some integrations use ACTIVE)
        const isActive =
          i.status === IntegrationStatus.CONNECTED || (i.status as string) === 'ACTIVE';

        if (!isEnabled) {
          logger.debug('Skipping disabled NetSuite integration', {
            integrationId: i.integrationId,
            name: i.name,
            enabled: i.enabled,
          });
        }
        if (!isActive) {
          logger.debug('Skipping inactive NetSuite integration', {
            integrationId: i.integrationId,
            name: i.name,
            status: i.status,
          });
        }

        return isEnabled && isActive;
      });

      if (activeIntegrations.length === 0) {
        logger.debug('No active NetSuite integrations found', {
          totalIntegrations: integrations.length,
          statuses: integrations.map(i => ({ name: i.name, status: i.status, enabled: i.enabled })),
          hint: 'Ensure integration has enabled=true AND status=CONNECTED or ACTIVE',
        });
        return;
      }

      logger.info('NetSuite auto-sync starting', {
        integrationCount: activeIntegrations.length,
        integrations: activeIntegrations.map(i => ({
          id: i.integrationId,
          name: i.name,
          lastSync: i.lastSyncAt,
        })),
      });

      for (const integration of activeIntegrations) {
        try {
          await this.syncIntegration(integration);
        } catch (err: any) {
          logger.error('NetSuite auto-sync failed for integration', {
            integrationId: integration.integrationId,
            name: integration.name,
            error: err.message,
            stack: err.stack,
          });
        }
      }

      const elapsed = Date.now() - startTime;
      logger.info('NetSuite auto-sync cycle complete', {
        durationMs: elapsed,
        integrationCount: activeIntegrations.length,
      });
    } catch (err: any) {
      logger.error('NetSuite auto-sync cycle error', {
        error: err.message,
        stack: err.stack,
      });
    } finally {
      this.running = false;
    }
  }

  /**
   * Sync a single integration
   */
  private async syncIntegration(integration: any): Promise<void> {
    const authConfig = integration.configuration?.auth || integration.configuration || {};

    if (!authConfig.accountId || !authConfig.tokenId || !authConfig.consumerKey) {
      logger.warn('NetSuite integration missing credentials, skipping', {
        integrationId: integration.integrationId,
        hasAccountId: !!authConfig.accountId,
        hasTokenId: !!authConfig.tokenId,
        hasConsumerKey: !!authConfig.consumerKey,
      });
      return;
    }

    const syncMode = this.determineSyncMode(integration, new Date());

    logger.info('Starting sync for NetSuite integration', {
      integrationId: integration.integrationId,
      name: integration.name,
      lastSyncAt: integration.lastSyncAt || 'never',
      mode: syncMode,
      fullDiscoveryIntervalMinutes: FULL_DISCOVERY_INTERVAL_MINUTES,
    });

    // Get tenant database for this integration's organization
    let tenantPool = getPool(); // Default to main pool
    if (integration.organizationId) {
      const mainPool = getPool();
      const orgResult = await mainPool.query(
        `SELECT database_name FROM organizations WHERE organization_id = $1`,
        [integration.organizationId]
      );
      if (orgResult.rows.length > 0 && orgResult.rows[0].database_name) {
        tenantPool = tenantPoolManager.getPool(orgResult.rows[0].database_name);
        logger.info('Sync jobs using tenant database', {
          integrationId: integration.integrationId,
          organizationId: integration.organizationId,
          database: orgResult.rows[0].database_name,
        });
      }
    }

    const canStartSync = await this.recoverOrSkipRunningJobs(tenantPool, integration);
    if (!canStartSync) {
      return;
    }

    // Create sync job record in tenant database
    const jobId = `JOB-${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`;

    try {
      await tenantPool.query(
        `INSERT INTO sync_jobs (
          job_id, integration_id, sync_type, direction, status,
          started_at, started_by, records_processed, records_succeeded, records_failed
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, 0, 0, 0)`,
        [jobId, integration.integrationId, 'ORDER_SYNC', 'INBOUND', SyncStatus.RUNNING, 'auto-sync']
      );
    } catch (err: any) {
      logger.warn('Failed to create sync job record', { error: err.message, jobId });
    }

    const client = new NetSuiteClient({
      accountId: authConfig.accountId,
      tokenId: authConfig.tokenId,
      tokenSecret: authConfig.tokenSecret,
      consumerKey: authConfig.consumerKey,
      consumerSecret: authConfig.consumerSecret,
    });

    const syncService = new NetSuiteOrderSyncService(client);

    let result: any = {
      totalProcessed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      updated: 0,
      cleaned: 0,
      details: {},
    };

    try {
      const syncStartTime = new Date();
      result = await syncService.syncOrders(integration.integrationId, {
        limit: SYNC_PAGE_SIZE,
        lastSyncAt: integration.lastSyncAt ? new Date(integration.lastSyncAt) : undefined,
        syncStartTime,
        mode: syncMode,
      });

      // Update sync job record as completed
      try {
        await tenantPool.query(
          `UPDATE sync_jobs SET
            status = $1,
            records_processed = $2,
            records_succeeded = $3,
            records_failed = $4,
            completed_at = NOW()
          WHERE job_id = $5`,
          [
            SyncStatus.COMPLETED,
            result.totalProcessed,
            result.succeeded + result.updated,
            result.failed,
            jobId,
          ]
        );
      } catch (err: any) {
        logger.warn('Failed to update sync job record', { error: err.message, jobId });
      }

      // Update last_sync_at on the integration
      try {
        const { config, autoSync } = this.getAutoSyncMetadata(integration);
        if (syncMode === 'full') {
          autoSync.lastFullDiscoveryAt = new Date().toISOString();
        }

        await this.getRepository().update(integration.integrationId, {
          lastSyncAt: new Date(),
          lastError: result.failed > 0 ? `${result.failed} orders failed to sync` : undefined,
          configuration:
            syncMode === 'full'
              ? ({
                  ...config,
                  autoSync,
                } as any)
              : undefined,
        });
      } catch (err: any) {
        logger.warn('Failed to update integration sync timestamp', { error: err.message });
      }
    } catch (err: any) {
      // Update sync job record as failed
      try {
        await tenantPool.query(
          `UPDATE sync_jobs SET
            status = $1,
            completed_at = NOW(),
            error_message = $2
          WHERE job_id = $3`,
          [SyncStatus.FAILED, err.message, jobId]
        );
      } catch (updateErr: any) {
        logger.warn('Failed to update failed sync job record', { error: updateErr.message, jobId });
      }

      throw err;
    }

    logger.info('NetSuite integration sync complete', {
      jobId,
      integrationId: integration.integrationId,
      name: integration.name,
      mode: syncMode,
      totalProcessed: result.totalProcessed,
      succeeded: result.succeeded,
      updated: result.updated,
      failed: result.failed,
      skipped: result.skipped,
      cleaned: result.cleaned,
      imported: result.details?.imported?.slice(0, 5),
      updatedOrders: result.details?.updated?.slice(0, 5),
      cleanedOrders: result.details?.cleaned?.slice(0, 5),
    });
  }
}

// Singleton instance
export const netSuiteAutoSync = new NetSuiteAutoSync();
