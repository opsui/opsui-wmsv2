/**
 * NetSuite Auto-Sync Service
 *
 * Periodically syncs orders from NetSuite to WMS for all enabled
 * NetSuite integrations. Runs as a background interval in the backend.
 */

import { IntegrationsRepository } from '../repositories/IntegrationsRepository';
import { NetSuiteOrderSyncService } from './NetSuiteOrderSyncService';
import { NetSuiteClient } from './NetSuiteClient';
import { IntegrationProvider } from '@opsui/shared';
import { logger } from '../config/logger';
import { getPool } from '../db/client';

const DEFAULT_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const SYNC_PAGE_SIZE = 50;

export class NetSuiteAutoSync {
  private interval: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private repository: IntegrationsRepository | null = null;

  private getRepository(): IntegrationsRepository {
    if (!this.repository) {
      this.repository = new IntegrationsRepository(getPool());
    }
    return this.repository;
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
      intervalMinutes: Math.round(intervalMs / 60000),
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
      // Find all enabled NetSuite integrations
      const integrations = await this.getRepository().findAll({
        provider: IntegrationProvider.NETSUITE,
      });

      const enabledIntegrations = integrations.filter(i => i.enabled);

      if (enabledIntegrations.length === 0) {
        logger.debug('No enabled NetSuite integrations found');
        return;
      }

      logger.info('NetSuite auto-sync starting', {
        integrationCount: enabledIntegrations.length,
      });

      for (const integration of enabledIntegrations) {
        try {
          await this.syncIntegration(integration);
        } catch (err: any) {
          logger.error('NetSuite auto-sync failed for integration', {
            integrationId: integration.integrationId,
            name: integration.name,
            error: err.message,
          });
        }
      }

      const elapsed = Date.now() - startTime;
      logger.info('NetSuite auto-sync cycle complete', {
        durationMs: elapsed,
        integrationCount: enabledIntegrations.length,
      });
    } catch (err: any) {
      logger.error('NetSuite auto-sync cycle error', { error: err.message });
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
      });
      return;
    }

    const client = new NetSuiteClient({
      accountId: authConfig.accountId,
      tokenId: authConfig.tokenId,
      tokenSecret: authConfig.tokenSecret,
      consumerKey: authConfig.consumerKey,
      consumerSecret: authConfig.consumerSecret,
    });

    const syncService = new NetSuiteOrderSyncService(client);

    const result = await syncService.syncOrders(integration.integrationId, {
      limit: SYNC_PAGE_SIZE,
      lastSyncAt: integration.lastSyncAt ? new Date(integration.lastSyncAt) : undefined,
    });

    // Update last_sync_at on the integration
    try {
      await this.getRepository().update(integration.integrationId, {
        lastSyncAt: new Date(),
        lastError: result.failed > 0 ? `${result.failed} orders failed to sync` : undefined,
      });
    } catch (err: any) {
      logger.warn('Failed to update integration sync timestamp', { error: err.message });
    }

    logger.info('NetSuite integration sync complete', {
      integrationId: integration.integrationId,
      name: integration.name,
      totalProcessed: result.totalProcessed,
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
    });
  }
}

// Singleton instance
export const netSuiteAutoSync = new NetSuiteAutoSync();
