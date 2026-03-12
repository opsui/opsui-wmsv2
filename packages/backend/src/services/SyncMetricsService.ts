/**
 * Sync Metrics Service
 *
 * Tracks and reports sync operation metrics for monitoring and optimization.
 */

import { Pool } from 'pg';
import { logger } from '../config/logger';

export interface SyncMetricRecord {
  id?: number;
  integrationId: string;
  jobId?: string;

  // Timing
  syncStartTime: Date;
  syncEndTime?: Date;
  durationMs?: number;

  // Counts
  ordersFetched: number;
  ordersProcessed: number;
  ordersCreated: number;
  ordersUpdated: number;
  ordersFailed: number;
  ordersSkipped: number;
  ordersCleaned: number;

  // API metrics
  apiCallsMade: number;
  apiLatencyAvgMs?: number;
  apiLatencyMaxMs?: number;
  apiErrors: number;

  // Database metrics
  dbOperations: number;
  dbLatencyMs?: number;

  // Cache metrics
  cacheHits: number;
  cacheMisses: number;

  // Status
  status: 'running' | 'completed' | 'failed' | 'partial';
  errorMessage?: string;

  // Metadata
  metadata?: Record<string, any>;
}

export interface SyncPerformanceStats {
  integrationId: string;
  totalSyncs: number;
  avgDurationMs: number;
  maxDurationMs: number;
  avgOrdersProcessed: number;
  totalFailures: number;
  avgApiLatencyMs: number;
  totalApiErrors: number;
  cacheHitRate: number;
  lastSyncAt: Date | null;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
}

/**
 * Sync Metrics Collector
 *
 * Collects metrics during a sync operation and persists to database.
 */
export class SyncMetricsCollector {
  private record: SyncMetricRecord;
  private apiLatencies: number[] = [];
  private startTime: number;

  constructor(
    private pool: Pool,
    integrationId: string,
    jobId?: string
  ) {
    this.startTime = Date.now();
    this.record = {
      integrationId,
      jobId,
      syncStartTime: new Date(),
      status: 'running',
      ordersFetched: 0,
      ordersProcessed: 0,
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersFailed: 0,
      ordersSkipped: 0,
      ordersCleaned: 0,
      apiCallsMade: 0,
      apiErrors: 0,
      dbOperations: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * Track an API call
   */
  trackApiCall(latencyMs: number, isError: boolean = false): void {
    this.record.apiCallsMade++;
    this.apiLatencies.push(latencyMs);

    if (isError) {
      this.record.apiErrors++;
    }
  }

  /**
   * Track a database operation
   */
  trackDbOperation(latencyMs?: number): void {
    this.record.dbOperations++;
    if (latencyMs !== undefined) {
      this.record.dbLatencyMs = latencyMs;
    }
  }

  /**
   * Track cache hit/miss
   */
  trackCacheHit(): void {
    this.record.cacheHits++;
  }

  trackCacheMiss(): void {
    this.record.cacheMisses++;
  }

  /**
   * Update order counts
   */
  setOrdersFetched(count: number): void {
    this.record.ordersFetched = count;
  }

  incrementOrdersCreated(): void {
    this.record.ordersCreated++;
    this.record.ordersProcessed++;
  }

  incrementOrdersUpdated(): void {
    this.record.ordersUpdated++;
    this.record.ordersProcessed++;
  }

  incrementOrdersFailed(): void {
    this.record.ordersFailed++;
    this.record.ordersProcessed++;
  }

  incrementOrdersSkipped(): void {
    this.record.ordersSkipped++;
    this.record.ordersProcessed++;
  }

  incrementOrdersCleaned(): void {
    this.record.ordersCleaned++;
  }

  /**
   * Set metadata
   */
  setMetadata(key: string, value: any): void {
    if (!this.record.metadata) {
      this.record.metadata = {};
    }
    this.record.metadata[key] = value;
  }

  /**
   * Mark sync as completed
   */
  async complete(): Promise<SyncMetricRecord> {
    this.record.status = this.record.ordersFailed > 0 ? 'partial' : 'completed';
    this.record.syncEndTime = new Date();
    this.record.durationMs = Date.now() - this.startTime;

    // Calculate API latency stats
    if (this.apiLatencies.length > 0) {
      this.record.apiLatencyAvgMs = Math.round(
        this.apiLatencies.reduce((a, b) => a + b, 0) / this.apiLatencies.length
      );
      this.record.apiLatencyMaxMs = Math.max(...this.apiLatencies);
    }

    await this.save();
    return this.record;
  }

  /**
   * Mark sync as failed
   */
  async fail(error: Error): Promise<SyncMetricRecord> {
    this.record.status = 'failed';
    this.record.syncEndTime = new Date();
    this.record.durationMs = Date.now() - this.startTime;
    this.record.errorMessage = error.message;

    if (this.apiLatencies.length > 0) {
      this.record.apiLatencyAvgMs = Math.round(
        this.apiLatencies.reduce((a, b) => a + b, 0) / this.apiLatencies.length
      );
      this.record.apiLatencyMaxMs = Math.max(...this.apiLatencies);
    }

    await this.save();
    return this.record;
  }

  /**
   * Save metrics to database
   */
  private async save(): Promise<void> {
    try {
      const result = await this.pool.query(
        `INSERT INTO sync_metrics (
          integration_id, job_id, sync_start_time, sync_end_time, duration_ms,
          orders_fetched, orders_processed, orders_created, orders_updated,
          orders_failed, orders_skipped, orders_cleaned,
          api_calls_made, api_latency_avg_ms, api_latency_max_ms, api_errors,
          db_operations, db_latency_ms,
          cache_hits, cache_misses,
          status, error_message, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING id`,
        [
          this.record.integrationId,
          this.record.jobId,
          this.record.syncStartTime,
          this.record.syncEndTime,
          this.record.durationMs,
          this.record.ordersFetched,
          this.record.ordersProcessed,
          this.record.ordersCreated,
          this.record.ordersUpdated,
          this.record.ordersFailed,
          this.record.ordersSkipped,
          this.record.ordersCleaned,
          this.record.apiCallsMade,
          this.record.apiLatencyAvgMs,
          this.record.apiLatencyMaxMs,
          this.record.apiErrors,
          this.record.dbOperations,
          this.record.dbLatencyMs,
          this.record.cacheHits,
          this.record.cacheMisses,
          this.record.status,
          this.record.errorMessage,
          JSON.stringify(this.record.metadata || {}),
        ]
      );

      this.record.id = result.rows[0]?.id;

      logger.info('Sync metrics saved', {
        integrationId: this.record.integrationId,
        jobId: this.record.jobId,
        status: this.record.status,
        durationMs: this.record.durationMs,
        ordersProcessed: this.record.ordersProcessed,
        apiCalls: this.record.apiCallsMade,
      });
    } catch (error: any) {
      logger.warn('Failed to save sync metrics', {
        integrationId: this.record.integrationId,
        error: error.message,
      });
    }
  }

  /**
   * Get current metrics (without saving)
   */
  getMetrics(): SyncMetricRecord {
    return { ...this.record };
  }
}

/**
 * Sync Metrics Service
 *
 * Query and analyze sync metrics.
 */
export class SyncMetricsService {
  constructor(private pool: Pool) {}

  /**
   * Get performance stats for an integration
   */
  async getPerformanceStats(
    integrationId: string,
    hours: number = 24
  ): Promise<SyncPerformanceStats | null> {
    const result = await this.pool.query(
      `SELECT
        integration_id,
        COUNT(*) as total_syncs,
        AVG(duration_ms) as avg_duration_ms,
        MAX(duration_ms) as max_duration_ms,
        AVG(orders_processed) as avg_orders_processed,
        SUM(orders_failed) as total_failures,
        AVG(api_latency_avg_ms) as avg_api_latency_ms,
        SUM(api_errors) as total_api_errors,
        SUM(cache_hits) as total_cache_hits,
        SUM(cache_misses) as total_cache_misses,
        CASE
          WHEN SUM(cache_hits + cache_misses) > 0
          THEN ROUND(SUM(cache_hits)::numeric / SUM(cache_hits + cache_misses) * 100, 2)
          ELSE 0
        END as cache_hit_rate,
        MAX(sync_start_time) as last_sync_at
      FROM sync_metrics
      WHERE integration_id = $1
        AND sync_start_time > NOW() - INTERVAL '${hours} hours'
      GROUP BY integration_id`,
      [integrationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const healthStatus = this.determineHealthStatus(
      parseInt(row.total_failures) || 0,
      parseInt(row.total_api_errors) || 0,
      parseInt(row.total_syncs) || 0
    );

    return {
      integrationId: row.integration_id,
      totalSyncs: parseInt(row.total_syncs) || 0,
      avgDurationMs: Math.round(row.avg_duration_ms) || 0,
      maxDurationMs: parseInt(row.max_duration_ms) || 0,
      avgOrdersProcessed: Math.round(row.avg_orders_processed) || 0,
      totalFailures: parseInt(row.total_failures) || 0,
      avgApiLatencyMs: Math.round(row.avg_api_latency_ms) || 0,
      totalApiErrors: parseInt(row.total_api_errors) || 0,
      cacheHitRate: parseFloat(row.cache_hit_rate) || 0,
      lastSyncAt: row.last_sync_at,
      healthStatus,
    };
  }

  /**
   * Get recent sync history
   */
  async getRecentSyncs(integrationId: string, limit: number = 10): Promise<SyncMetricRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM sync_metrics
       WHERE integration_id = $1
       ORDER BY sync_start_time DESC
       LIMIT $2`,
      [integrationId, limit]
    );

    return result.rows.map(this.mapRowToRecord);
  }

  /**
   * Get sync health for all integrations
   */
  async getAllIntegrationHealth(): Promise<
    Array<{
      integrationId: string;
      lastSyncAt: Date | null;
      lastStatus: string;
      healthStatus: string;
      recentFailures: number;
    }>
  > {
    const result = await this.pool.query(
      `SELECT DISTINCT ON (integration_id)
        integration_id,
        sync_start_time as last_sync_at,
        status as last_status,
        orders_failed,
        api_errors
      FROM sync_metrics
      WHERE sync_start_time > NOW() - INTERVAL '1 hour'
      ORDER BY integration_id, sync_start_time DESC`
    );

    return result.rows.map(row => ({
      integrationId: row.integration_id,
      lastSyncAt: row.last_sync_at,
      lastStatus: row.last_status,
      healthStatus: this.determineHealthStatus(row.orders_failed || 0, row.api_errors || 0, 1),
      recentFailures: row.orders_failed || 0,
    }));
  }

  /**
   * Clean old metrics
   */
  async cleanOldMetrics(retentionDays: number = 30): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM sync_metrics
       WHERE sync_start_time < NOW() - INTERVAL '${retentionDays} days'`
    );

    const deleted = result.rowCount || 0;
    if (deleted > 0) {
      logger.info('Cleaned old sync metrics', { deleted, retentionDays });
    }

    return deleted;
  }

  /**
   * Determine health status based on errors
   */
  private determineHealthStatus(
    failures: number,
    apiErrors: number,
    totalSyncs: number
  ): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    if (totalSyncs === 0) return 'unknown';

    const failureRate = failures / totalSyncs;
    const errorRate = apiErrors / totalSyncs;

    if (failureRate > 0.5 || errorRate > 0.5) return 'unhealthy';
    if (failureRate > 0.1 || errorRate > 0.1) return 'degraded';
    return 'healthy';
  }

  /**
   * Map database row to record
   */
  private mapRowToRecord(row: any): SyncMetricRecord {
    return {
      id: row.id,
      integrationId: row.integration_id,
      jobId: row.job_id,
      syncStartTime: row.sync_start_time,
      syncEndTime: row.sync_end_time,
      durationMs: row.duration_ms,
      ordersFetched: row.orders_fetched,
      ordersProcessed: row.orders_processed,
      ordersCreated: row.orders_created,
      ordersUpdated: row.orders_updated,
      ordersFailed: row.orders_failed,
      ordersSkipped: row.orders_skipped,
      ordersCleaned: row.orders_cleaned,
      apiCallsMade: row.api_calls_made,
      apiLatencyAvgMs: row.api_latency_avg_ms,
      apiLatencyMaxMs: row.api_latency_max_ms,
      apiErrors: row.api_errors,
      dbOperations: row.db_operations,
      dbLatencyMs: row.db_latency_ms,
      cacheHits: row.cache_hits,
      cacheMisses: row.cache_misses,
      status: row.status,
      errorMessage: row.error_message,
      metadata: row.metadata,
    };
  }
}
