/**
 * NetSuite Webhook Service
 *
 * Handles incoming webhooks from NetSuite for real-time order updates.
 * Provides immediate sync triggers instead of polling.
 */

import { Pool } from 'pg';
import crypto from 'crypto';
import { logger } from '../config/logger';
import { NetSuiteOrderSyncService } from './NetSuiteOrderSyncService';
import { NetSuiteClient } from './NetSuiteClient';

// Webhook event types from NetSuite
export type NetSuiteEventType =
  | 'SALES_ORDER_CREATED'
  | 'SALES_ORDER_UPDATED'
  | 'SALES_ORDER_READY_TO_SHIP'
  | 'ITEM_FULFILLMENT_CREATED'
  | 'ITEM_FULFILLMENT_SHIPPED'
  | 'ITEM_FULFILLMENT_UPDATED';

export interface NetSuiteWebhookPayload {
  eventType: NetSuiteEventType;
  internalId: string;
  tranId?: string;
  recordType: 'salesOrder' | 'itemFulfillment' | 'inventoryItem';
  timestamp: string;
  // Additional data from NetSuite
  data?: Record<string, any>;
}

export interface WebhookProcessingResult {
  success: boolean;
  eventId: string;
  message?: string;
  error?: string;
}

/**
 * NetSuite Webhook Service
 */
export class NetSuiteWebhookService {
  private processingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private pool: Pool,
    private syncServiceFactory: (client: NetSuiteClient) => NetSuiteOrderSyncService
  ) {}

  /**
   * Handle incoming webhook
   */
  async handleWebhook(
    payload: NetSuiteWebhookPayload,
    signature: string,
    integrationId: string
  ): Promise<WebhookProcessingResult> {
    // Generate event ID for deduplication
    const eventId = this.generateEventId(payload);

    logger.info('Received NetSuite webhook', {
      eventId,
      eventType: payload.eventType,
      internalId: payload.internalId,
      integrationId,
    });

    try {
      // Verify signature
      const isValid = await this.verifySignature(signature, payload, integrationId);
      if (!isValid) {
        logger.warn('Invalid webhook signature', { eventId, integrationId });
        return {
          success: false,
          eventId,
          error: 'Invalid signature',
        };
      }

      // Check for duplicate
      const isDuplicate = await this.isDuplicateEvent(eventId);
      if (isDuplicate) {
        logger.debug('Duplicate webhook event ignored', { eventId });
        return {
          success: true,
          eventId,
          message: 'Duplicate event ignored',
        };
      }

      // Store event for processing
      await this.storeEvent(eventId, payload, integrationId);

      // For high-priority events, process immediately
      if (this.isHighPriority(payload.eventType)) {
        const result = await this.processEvent(eventId);
        return {
          success: result.success,
          eventId,
          message: result.message,
          error: result.error,
        };
      }

      // For other events, queue for background processing
      return {
        success: true,
        eventId,
        message: 'Event queued for processing',
      };
    } catch (error: any) {
      logger.error('Failed to handle webhook', {
        eventId,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        eventId,
        error: error.message,
      };
    }
  }

  /**
   * Start background event processor
   */
  startProcessor(intervalMs: number = 5000): void {
    if (this.processingInterval) {
      logger.warn('Webhook processor already running');
      return;
    }

    logger.info('Starting webhook event processor', {
      intervalMs,
    });

    this.processingInterval = setInterval(() => {
      this.processNextEvent().catch(err => {
        logger.error('Webhook processor error', { error: err.message });
      });
    }, intervalMs);
  }

  /**
   * Stop background event processor
   */
  stopProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info('Webhook processor stopped');
    }
  }

  /**
   * Process the next pending event
   */
  private async processNextEvent(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Get next event with row lock
      const result = await client.query(
        `SELECT id, event_id, event_type, record_type, record_internal_id,
                record_tran_id, payload, integration_id
         FROM netsuite_webhook_events
         WHERE status = 'pending'
           AND (next_retry_at IS NULL OR next_retry_at <= NOW())
         ORDER BY received_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`
      );

      if (result.rows.length === 0) {
        return;
      }

      const event = result.rows[0];
      await this.processEventById(event.id, event, client);
    } finally {
      client.release();
    }
  }

  /**
   * Process a specific event by ID
   */
  private async processEventById(dbId: number, event: any, client: any): Promise<void> {
    logger.info('Processing webhook event', {
      eventId: event.event_id,
      eventType: event.event_type,
    });

    try {
      // Get integration credentials with organization info via junction table
      const integrationResult = await client.query(
        `SELECT i.configuration, io.organization_id
         FROM integrations i
         JOIN integration_organizations io ON i.integration_id = io.integration_id
         WHERE i.integration_id = $1 AND i.enabled = true`,
        [event.integration_id]
      );

      if (integrationResult.rows.length === 0) {
        await this.markEventFailed(client, dbId, 'Integration not found or disabled');
        return;
      }

      const integration = integrationResult.rows[0];
      const authConfig = integration.configuration?.auth || integration.configuration || {};

      // Create NetSuite client
      const nsClient = new NetSuiteClient({
        accountId: authConfig.accountId,
        tokenId: authConfig.tokenId,
        tokenSecret: authConfig.tokenSecret,
        consumerKey: authConfig.consumerKey,
        consumerSecret: authConfig.consumerSecret,
      });

      // Create sync service
      const syncService = this.syncServiceFactory(nsClient);

      // Process based on event type
      await this.processEventByType(event, nsClient, syncService);

      // Mark as completed
      await client.query(
        `UPDATE netsuite_webhook_events
         SET status = 'completed', processed_at = NOW()
         WHERE id = $1`,
        [dbId]
      );

      logger.info('Webhook event processed', {
        eventId: event.event_id,
        eventType: event.event_type,
      });
    } catch (error: any) {
      logger.error('Failed to process webhook event', {
        eventId: event.event_id,
        error: error.message,
      });

      // Increment attempts
      const attemptsResult = await client.query(
        `UPDATE netsuite_webhook_events
         SET attempts = attempts + 1,
             last_error = $1,
             next_retry_at = CASE
               WHEN attempts + 1 < max_attempts
               THEN NOW() + INTERVAL '1 minute' * (attempts + 1)
               ELSE NULL
             END,
             status = CASE
               WHEN attempts + 1 >= max_attempts THEN 'failed'
               ELSE status
             END
         WHERE id = $2
         RETURNING attempts, status`,
        [error.message, dbId]
      );

      if (attemptsResult.rows[0]?.status === 'failed') {
        logger.warn('Webhook event permanently failed', {
          eventId: event.event_id,
          attempts: attemptsResult.rows[0].attempts,
        });
      }
    }
  }

  /**
   * Process event by type
   */
  private async processEventByType(
    event: any,
    client: NetSuiteClient,
    syncService: NetSuiteOrderSyncService
  ): Promise<void> {
    switch (event.event_type) {
      case 'SALES_ORDER_CREATED':
      case 'SALES_ORDER_UPDATED':
      case 'SALES_ORDER_READY_TO_SHIP':
        // Fetch and sync the specific order
        const order = await client.getSalesOrder(event.record_internal_id);
        await syncService.syncSingleOrder(order, event.integration_id);
        break;

      case 'ITEM_FULFILLMENT_CREATED':
      case 'ITEM_FULFILLMENT_UPDATED':
      case 'ITEM_FULFILLMENT_SHIPPED':
        // Fetch and process the fulfillment
        const fulfillment = await client.getItemFulfillment(event.record_internal_id);
        await syncService.syncSingleFulfillment(fulfillment, event.integration_id);
        break;

      default:
        logger.warn('Unknown webhook event type', {
          eventType: event.event_type,
        });
    }
  }

  /**
   * Process a stored event immediately
   */
  private async processEvent(
    eventId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const result = await this.pool.query(
      `SELECT * FROM netsuite_webhook_events WHERE event_id = $1`,
      [eventId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Event not found' };
    }

    const event = result.rows[0];
    const client = await this.pool.connect();

    try {
      await this.processEventById(event.id, event, client);
      return { success: true, message: 'Event processed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * Verify webhook signature
   */
  private async verifySignature(
    signature: string,
    payload: NetSuiteWebhookPayload,
    integrationId: string
  ): Promise<boolean> {
    // Get secret for this integration
    const result = await this.pool.query(
      `SELECT secret_key FROM netsuite_webhook_secrets
       WHERE integration_id = $1 AND is_active = true
       ORDER BY created_at DESC LIMIT 1`,
      [integrationId]
    );

    if (result.rows.length === 0) {
      // If no secret configured, allow (for development)
      logger.warn('No webhook secret configured', { integrationId });
      return true;
    }

    const secret = result.rows[0].secret_key;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Check if event is a duplicate
   */
  private async isDuplicateEvent(eventId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM netsuite_webhook_events
       WHERE event_id = $1 AND status IN ('completed', 'pending')`,
      [eventId]
    );

    return result.rows.length > 0;
  }

  /**
   * Store event for processing
   */
  private async storeEvent(
    eventId: string,
    payload: NetSuiteWebhookPayload,
    integrationId: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO netsuite_webhook_events (
        event_id, event_type, record_type, record_internal_id,
        record_tran_id, payload, status, received_at, integration_id
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), $7)`,
      [
        eventId,
        payload.eventType,
        payload.recordType,
        payload.internalId,
        payload.tranId,
        JSON.stringify(payload.data || {}),
        integrationId,
      ]
    );
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(payload: NetSuiteWebhookPayload): string {
    const data = `${payload.eventType}:${payload.recordType}:${payload.internalId}:${payload.timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  /**
   * Check if event is high priority
   */
  private isHighPriority(eventType: NetSuiteEventType): boolean {
    return ['SALES_ORDER_READY_TO_SHIP', 'ITEM_FULFILLMENT_CREATED'].includes(eventType);
  }

  /**
   * Mark event as failed
   */
  private async markEventFailed(client: any, dbId: number, error: string): Promise<void> {
    await client.query(
      `UPDATE netsuite_webhook_events
       SET status = 'failed', last_error = $1, processed_at = NOW()
       WHERE id = $2`,
      [error, dbId]
    );
  }

  /**
   * Get pending event count
   */
  async getPendingCount(): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM netsuite_webhook_events WHERE status = 'pending'`
    );
    return parseInt(result.rows[0]?.count || '0');
  }

  /**
   * Get failed event count
   */
  async getFailedCount(): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM netsuite_webhook_events WHERE status = 'failed'`
    );
    return parseInt(result.rows[0]?.count || '0');
  }
}
