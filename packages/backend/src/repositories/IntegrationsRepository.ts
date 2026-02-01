/**
 * Integrations Repository
 *
 * Handles database operations for external integrations (ERP, e-commerce, carriers)
 */

import { Pool } from 'pg';
import { nanoid } from 'nanoid';
import {
  Integration,
  IntegrationType,
  IntegrationProvider,
  IntegrationStatus,
  SyncJob,
  SyncLogEntry,
  WebhookEvent,
  WebhookEventType,
  CarrierAccount,
} from '@opsui/shared';

// ============================================================================
// INTEGRATIONS REPOSITORY
// ============================================================================

export class IntegrationsRepository {
  constructor(private pool: Pool) {}

  // ========================================================================
  // INTEGRATIONS CRUD
  // ========================================================================

  async findAll(filters?: {
    type?: IntegrationType;
    provider?: IntegrationProvider;
    status?: IntegrationStatus;
  }): Promise<Integration[]> {
    let query = `
      SELECT
        i.integration_id,
        i.name,
        i.description,
        i.type,
        i.provider,
        i.status,
        i.configuration,
        i.sync_settings,
        i.webhook_settings,
        i.enabled,
        i.created_by,
        i.updated_by,
        i.last_sync_at,
        i.last_error,
        i.created_at,
        i.updated_at,
        json_agg(
          json_build_object(
            'carrierAccountId', ca.carrier_account_id,
            'carrierName', ca.account_name,
            'accountNumber', ca.account_number,
            'isActive', ca.is_active
          ) ORDER BY ca.created_at
        ) FILTER (WHERE ca.carrier_account_id IS NOT NULL) as carrier_accounts
      FROM integrations i
      LEFT JOIN carrier_accounts ca ON ca.integration_id = i.integration_id
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.type) {
      conditions.push(`i.type = $${paramIndex++}`);
      params.push(filters.type);
    }
    if (filters?.provider) {
      conditions.push(`i.provider = $${paramIndex++}`);
      params.push(filters.provider);
    }
    if (filters?.status) {
      conditions.push(`i.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY i.integration_id
      ORDER BY i.created_at DESC
    `;

    const result = await this.pool.query(query, params);
    return result.rows.map(this.mapRowToIntegration);
  }

  async findById(integrationId: string): Promise<Integration | null> {
    const query = `
      SELECT
        i.integration_id,
        i.name,
        i.description,
        i.type,
        i.provider,
        i.status,
        i.configuration,
        i.sync_settings,
        i.webhook_settings,
        i.enabled,
        i.created_by,
        i.updated_by,
        i.last_sync_at,
        i.last_error,
        i.created_at,
        i.updated_at,
        json_agg(
          json_build_object(
            'carrierAccountId', ca.carrier_account_id,
            'carrierName', ca.account_name,
            'accountNumber', ca.account_number,
            'isActive', ca.is_active
          ) ORDER BY ca.created_at
        ) FILTER (WHERE ca.carrier_account_id IS NOT NULL) as carrier_accounts
      FROM integrations i
      LEFT JOIN carrier_accounts ca ON ca.integration_id = i.integration_id
      WHERE i.integration_id = $1
      GROUP BY i.integration_id
    `;

    const result = await this.pool.query(query, [integrationId]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToIntegration(result.rows[0]);
  }

  async create(
    integration: Omit<Integration, 'integrationId' | 'createdAt' | 'updatedAt'>
  ): Promise<Integration> {
    const query = `
      INSERT INTO integrations (
        name,
        description,
        type,
        provider,
        status,
        configuration,
        sync_settings,
        webhook_settings,
        enabled,
        created_by,
        last_sync_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      integration.name,
      integration.description || '',
      integration.type,
      integration.provider,
      integration.status,
      JSON.stringify(integration.configuration),
      JSON.stringify(integration.syncSettings),
      integration.webhookSettings ? JSON.stringify(integration.webhookSettings) : null,
      integration.enabled ?? true,
      integration.createdBy,
      integration.lastSyncAt || null,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToIntegration(result.rows[0]);
  }

  async update(
    integrationId: string,
    updates: Partial<
      Omit<Integration, 'integrationId' | 'createdAt' | 'updatedAt' | 'type' | 'provider'>
    >
  ): Promise<Integration | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.configuration !== undefined) {
      setClauses.push(`configuration = $${paramIndex++}`);
      values.push(JSON.stringify(updates.configuration));
    }
    if (updates.syncSettings !== undefined) {
      setClauses.push(`sync_settings = $${paramIndex++}`);
      values.push(JSON.stringify(updates.syncSettings));
    }
    if (updates.webhookSettings !== undefined) {
      setClauses.push(`webhook_settings = $${paramIndex++}`);
      values.push(JSON.stringify(updates.webhookSettings));
    }
    if (updates.lastSyncAt !== undefined) {
      setClauses.push(`last_sync_at = $${paramIndex++}`);
      values.push(updates.lastSyncAt);
    }

    if (setClauses.length === 0) {
      return this.findById(integrationId);
    }

    setClauses.push(`updated_at = NOW()`);

    values.push(integrationId);
    const query = `
      UPDATE integrations
      SET ${setClauses.join(', ')}
      WHERE integration_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToIntegration(result.rows[0]);
  }

  async delete(integrationId: string): Promise<boolean> {
    const query = 'DELETE FROM integrations WHERE integration_id = $1';
    const result = await this.pool.query(query, [integrationId]);
    return (result.rowCount || 0) > 0;
  }

  // ========================================================================
  // SYNC JOBS
  // ========================================================================

  async createSyncJob(job: Omit<SyncJob, 'jobId' | 'logEntries'>): Promise<SyncJob> {
    const query = `
      INSERT INTO sync_jobs (
        integration_id,
        sync_type,
        direction,
        status,
        started_at,
        started_by,
        records_processed,
        records_succeeded,
        records_failed,
        error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      job.integrationId,
      job.syncType,
      job.direction,
      job.status,
      job.startedAt || new Date(),
      job.startedBy,
      job.recordsProcessed || 0,
      job.recordsSucceeded || 0,
      job.recordsFailed || 0,
      job.errorMessage || null,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToSyncJob(result.rows[0]);
  }

  async findSyncJobs(integrationId?: string, limit = 50): Promise<SyncJob[]> {
    const query = `
      SELECT * FROM sync_jobs
      WHERE ($1::text IS NULL OR integration_id = $1)
      ORDER BY started_at DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [integrationId || null, limit]);
    return result.rows.map(this.mapRowToSyncJob);
  }

  async findSyncJobById(jobId: string): Promise<SyncJob | null> {
    const query = 'SELECT * FROM sync_jobs WHERE job_id = $1';
    const result = await this.pool.query(query, [jobId]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToSyncJob(result.rows[0]);
  }

  async updateSyncJob(
    jobId: string,
    updates: Partial<
      Omit<
        SyncJob,
        'jobId' | 'integrationId' | 'jobType' | 'createdAt' | 'startedAt' | 'triggeredBy'
      >
    >
  ): Promise<SyncJob | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.recordsProcessed !== undefined) {
      setClauses.push(`records_processed = $${paramIndex++}`);
      values.push(updates.recordsProcessed);
    }
    if (updates.recordsSucceeded !== undefined) {
      setClauses.push(`records_succeeded = $${paramIndex++}`);
      values.push(updates.recordsSucceeded);
    }
    if (updates.recordsFailed !== undefined) {
      setClauses.push(`records_failed = $${paramIndex++}`);
      values.push(updates.recordsFailed);
    }
    if (updates.errorMessage !== undefined) {
      setClauses.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }
    if (updates.completedAt !== undefined) {
      setClauses.push(`completed_at = $${paramIndex++}`);
      values.push(updates.completedAt);
    }

    if (setClauses.length === 0) {
      return this.findSyncJobById(jobId);
    }

    values.push(jobId);
    const query = `
      UPDATE sync_jobs
      SET ${setClauses.join(', ')}
      WHERE job_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToSyncJob(result.rows[0]);
  }

  // ========================================================================
  // SYNC JOB LOGS
  // ========================================================================

  async createSyncLogEntry(
    jobId: string,
    log: Omit<SyncLogEntry, 'logId' | 'timestamp'>
  ): Promise<SyncLogEntry> {
    const query = `
      INSERT INTO sync_job_logs (
        job_id,
        level,
        message,
        details,
        entity_type,
        entity_id,
        external_id,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      jobId,
      log.level,
      log.message,
      log.errorDetails ? JSON.stringify(log.errorDetails) : null,
      log.entityType || null,
      log.entityId || null,
      log.externalId || null,
      new Date(),
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToSyncLogEntry(result.rows[0]);
  }

  async findSyncLogEntrys(jobId: string, limit = 100): Promise<SyncLogEntry[]> {
    const query = `
      SELECT * FROM sync_job_logs
      WHERE job_id = $1
      ORDER BY timestamp ASC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [jobId, limit]);
    return result.rows.map(this.mapRowToSyncLogEntry);
  }

  // ========================================================================
  // WEBHOOK EVENTS
  // ========================================================================

  async createWebhookEvent(
    event: Omit<WebhookEvent, 'eventId' | 'receivedAt' | 'processedAt'>
  ): Promise<WebhookEvent> {
    const query = `
      INSERT INTO webhook_events (
        integration_id,
        event_type,
        payload,
        status,
        received_at,
        processing_attempts,
        error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      event.integrationId,
      event.eventType,
      JSON.stringify(event.payload),
      event.status,
      new Date(),
      event.processingAttempts || 0,
      event.errorMessage || null,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToWebhookEvent(result.rows[0]);
  }

  async findWebhookEvents(
    filters?: { integrationId?: string; status?: string; eventType?: WebhookEventType },
    limit = 50
  ): Promise<WebhookEvent[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.integrationId) {
      conditions.push(`integration_id = $${paramIndex++}`);
      params.push(filters.integrationId);
    }
    if (filters?.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }
    if (filters?.eventType) {
      conditions.push(`event_type = $${paramIndex++}`);
      params.push(filters.eventType);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const query = `
      SELECT * FROM webhook_events
      ${whereClause}
      ORDER BY received_at DESC
      LIMIT $${paramIndex}
    `;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows.map(this.mapRowToWebhookEvent);
  }

  async updateWebhookEvent(
    eventId: string,
    updates: Partial<
      Omit<WebhookEvent, 'eventId' | 'integrationId' | 'eventType' | 'payload' | 'receivedAt'>
    >
  ): Promise<WebhookEvent | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.processedAt !== undefined) {
      setClauses.push(`processed_at = $${paramIndex++}`);
      values.push(updates.processedAt);
    }
    if (updates.processingAttempts !== undefined) {
      setClauses.push(`processing_attempts = $${paramIndex++}`);
      values.push(updates.processingAttempts);
    }
    if (updates.errorMessage !== undefined) {
      setClauses.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }

    if (setClauses.length === 0) {
      return null;
    }

    values.push(eventId);
    const query = `
      UPDATE webhook_events
      SET ${setClauses.join(', ')}
      WHERE event_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToWebhookEvent(result.rows[0]);
  }

  // ========================================================================
  // CARRIER ACCOUNTS
  // ========================================================================

  async findCarrierAccounts(integrationId?: string): Promise<CarrierAccount[]> {
    const query = `
      SELECT * FROM carrier_accounts
      WHERE ($1::text IS NULL OR integration_id = $1)
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [integrationId || null]);
    return result.rows.map(this.mapRowToCarrierAccount);
  }

  async createCarrierAccount(
    account: Omit<CarrierAccount, 'accountId' | 'createdAt'>
  ): Promise<CarrierAccount> {
    const query = `
      INSERT INTO carrier_accounts (
        carrier_account_id,
        integration_id,
        carrier,
        account_number,
        account_name,
        is_active,
        services,
        configured_services,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      `CA-${nanoid(10)}`.toUpperCase(),
      null, // integration_id - can be linked later
      account.carrier,
      account.accountNumber,
      account.accountName,
      account.isActive,
      JSON.stringify(account.services || []),
      JSON.stringify(account.configuredServices || []),
      new Date(),
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToCarrierAccount(result.rows[0]);
  }

  async updateCarrierAccount(
    carrierAccountId: string,
    updates: Partial<Omit<CarrierAccount, 'accountId' | 'createdAt'>>
  ): Promise<CarrierAccount | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.carrier !== undefined) {
      setClauses.push(`carrier = $${paramIndex++}`);
      values.push(updates.carrier);
    }
    if (updates.accountNumber !== undefined) {
      setClauses.push(`account_number = $${paramIndex++}`);
      values.push(updates.accountNumber);
    }
    if (updates.accountName !== undefined) {
      setClauses.push(`account_name = $${paramIndex++}`);
      values.push(updates.accountName);
    }
    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }
    if (updates.services !== undefined) {
      setClauses.push(`services = $${paramIndex++}`);
      values.push(JSON.stringify(updates.services));
    }
    if (updates.configuredServices !== undefined) {
      setClauses.push(`configured_services = $${paramIndex++}`);
      values.push(JSON.stringify(updates.configuredServices));
    }

    if (setClauses.length === 0) {
      return null;
    }

    values.push(carrierAccountId);
    const query = `
      UPDATE carrier_accounts
      SET ${setClauses.join(', ')}
      WHERE carrier_account_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToCarrierAccount(result.rows[0]);
  }

  async deleteCarrierAccount(carrierAccountId: string): Promise<boolean> {
    const query = 'DELETE FROM carrier_accounts WHERE carrier_account_id = $1';
    const result = await this.pool.query(query, [carrierAccountId]);
    return (result.rowCount || 0) > 0;
  }

  // ========================================================================
  // PRIVATE MAPPING METHODS
  // ========================================================================

  private mapRowToIntegration(row: any): Integration {
    return {
      integrationId: row.integration_id,
      name: row.name,
      description: row.description || '',
      type: row.type,
      provider: row.provider,
      status: row.status,
      configuration: row.configuration,
      syncSettings: row.sync_settings,
      webhookSettings: row.webhook_settings,
      enabled: row.enabled ?? true,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
      lastSyncAt: row.last_sync_at,
      lastError: row.last_error,
    };
  }

  private mapRowToSyncJob(row: any): SyncJob {
    return {
      jobId: row.job_id,
      integrationId: row.integration_id,
      syncType: row.sync_type,
      direction: row.direction,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      startedBy: row.started_by,
      recordsProcessed: row.records_processed,
      recordsSucceeded: row.records_succeeded,
      recordsFailed: row.records_failed,
      errorMessage: row.error_message,
      logEntries: [],
    };
  }

  private mapRowToSyncLogEntry(row: any): SyncLogEntry {
    return {
      logId: row.log_id,
      timestamp: row.timestamp,
      level: row.level,
      message: row.message,
      entityType: row.entity_type,
      entityId: row.entity_id,
      externalId: row.external_id,
      errorDetails: row.details ? JSON.parse(row.details) : null,
    };
  }

  private mapRowToWebhookEvent(row: any): WebhookEvent {
    return {
      eventId: row.event_id,
      integrationId: row.integration_id,
      eventType: row.event_type,
      payload: row.payload,
      status: row.status,
      receivedAt: row.received_at,
      processedAt: row.processed_at,
      processingAttempts: row.processing_attempts,
      errorMessage: row.error_message,
    };
  }

  private mapRowToCarrierAccount(row: any): CarrierAccount {
    return {
      accountId: row.carrier_account_id,
      carrier: row.carrier as IntegrationProvider,
      accountNumber: row.account_number,
      accountName: row.account_name,
      isActive: row.is_active,
      services: row.services || [],
      configuredServices: row.configured_services || [],
      createdAt: row.created_at,
    };
  }
}
