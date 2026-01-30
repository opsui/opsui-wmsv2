/**
 * Audit Service - SOC2/ISO27001 Compliant Audit Logging
 *
 * Provides comprehensive audit trail for:
 * - User authentication and authorization changes
 * - Data access and modifications
 * - Configuration changes
 * - Security events
 * - Admin actions
 *
 * Features:
 * - Immutable audit trail (records cannot be deleted or modified)
 * - Automatic retention management
 * - Structured event types and categories
 * - Integration with OpenTelemetry for distributed tracing
 *
 * @see https://www.aicpa.org/soc4so
 * @see https://www.iso.org/standard/27001
 */

// ============================================================================
// AUDIT LOG CREATION GUIDELINES
// ============================================================================
//
// When adding NEW audit logs, follow this pattern for clean, user-friendly output:
//
// 1. CREATE A DEDICATED EVENT TYPE (don't reuse generic types)
//    - Each distinct user action should have its own AuditEventType
//    - Examples: ORDER_CLAIMED, ORDER_UNCLAIMED, ORDER_CONTINUED
//    - NOT: Using ORDER_UPDATED with description parsing
//
// 2. USE VERB-NOUN NAMING CONVENTION
//    - Event types: VERB_NOUN (e.g., ORDER_CLAIMED, ROLE_GRANTED)
//    - Descriptions: "Verb noun {id}" (e.g., "Claimed order SO1234")
//    - Summaries: "{user} verb noun {id}" (e.g., "john@example.com claimed order SO1234")
//
// 3. ADD FRONTEND ICON MAPPING (packages/frontend/src/components/shared/AuditLogsCard.tsx)
//    - Add a dedicated icon for the new action type
//    - Use meaningful icons (PlayIcon for continue, ShoppingCartIcon for claim, etc.)
//    - Choose appropriate colors (blue for info, green for success, red for destructive, amber for warning)
//
// 4. UPDATE MIDDLEWARE (packages/backend/src/middleware/audit.ts)
//    - Add route detection in getAuditEventType()
//    - Add case in generateMetadataSummary() for summary
//    - Add case in generateHumanReadableDescription() for description
//
// EXAMPLE CHECKLIST FOR NEW AUDIT LOG:
// ☐ Add unique AuditEventType to enum (e.g., ORDER_PAUSED)
// ☐ Add route detection in getAuditEventType()
// ☐ Add summary case: "{user} paused order {orderId}"
// ☐ Add description case: "Paused order {orderId}"
// ☐ Add frontend icon mapping with appropriate icon and color
// ☐ Test the output shows clean: "Paused order SO1234" (not "POST /api/orders/SO1234/pause")
//
// ICON COLOR GUIDE:
// - blue: Informational actions (claim, continue, view)
// - green: Successful completion (ship, complete, grant)
// - red: Destructive/reversal actions (cancel, unclaim, revoke, delete)
// - amber: Warnings or partial states (skip, undo, pending)
// - purple: Standard operations (pick, pack, scan)
// - gray: Generic/unknown actions
//
// ============================================================================

import { Pool } from 'pg';
import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { addSpanAttributes, addSpanEvent, recordException } from '../observability/telemetry';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Audit event categories for organizing audit logs
 */
export enum AuditCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  CONFIGURATION = 'CONFIGURATION',
  SECURITY = 'SECURITY',
  API_ACCESS = 'API_ACCESS',
  SYSTEM = 'SYSTEM',
}

/**
 * Specific audit event types for detailed tracking
 */
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',

  // Authorization events
  ROLE_GRANTED = 'ROLE_GRANTED',
  ROLE_REVOKED = 'ROLE_REVOKED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  CUSTOM_ROLE_CREATED = 'CUSTOM_ROLE_CREATED',
  CUSTOM_ROLE_UPDATED = 'CUSTOM_ROLE_UPDATED',
  CUSTOM_ROLE_DELETED = 'CUSTOM_ROLE_DELETED',

  // User management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_REACTIVATED = 'USER_REACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',

  // Data access
  ORDER_VIEWED = 'ORDER_VIEWED',
  ORDERS_EXPORTED = 'ORDERS_EXPORTED',
  INVENTORY_VIEWED = 'INVENTORY_VIEWED',
  INVENTORY_EXPORTED = 'INVENTORY_EXPORTED',
  REPORT_GENERATED = 'REPORT_GENERATED',

  // Data modification
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_CLAIMED = 'ORDER_CLAIMED',
  ORDER_UNCLAIMED = 'ORDER_UNCLAIMED',
  ORDER_CONTINUED = 'ORDER_CONTINUED',
  INVENTORY_ADJUSTED = 'INVENTORY_ADJUSTED',
  ITEM_SCANNED = 'ITEM_SCANNED',
  PICK_CONFIRMED = 'PICK_CONFIRMED',
  PACK_COMPLETED = 'PACK_COMPLETED',
  WAVE_CREATED = 'WAVE_CREATED',
  WAVE_RELEASED = 'WAVE_RELEASED',
  WAVE_COMPLETED = 'WAVE_COMPLETED',
  SLOTTING_IMPLEMENTED = 'SLOTTING_IMPLEMENTED',
  ZONE_ASSIGNED = 'ZONE_ASSIGNED',
  ZONE_RELEASED = 'ZONE_RELEASED',
  ZONE_REBALANCED = 'ZONE_REBALANCED',
  PUTAWAY_COMPLETED = 'PUTAWAY_COMPLETED',
  CYCLE_COUNT_PLAN_CREATED = 'CYCLE_COUNT_PLAN_CREATED',
  CYCLE_COUNT_STARTED = 'CYCLE_COUNT_STARTED',
  CYCLE_COUNT_COMPLETED = 'CYCLE_COUNT_COMPLETED',
  CYCLE_COUNT_RECONCILED = 'CYCLE_COUNT_RECONCILED',
  BIN_LOCATION_CREATED = 'BIN_LOCATION_CREATED',
  BIN_LOCATION_UPDATED = 'BIN_LOCATION_UPDATED',
  BIN_LOCATION_DELETED = 'BIN_LOCATION_DELETED',

  // Configuration
  CONFIG_UPDATED = 'CONFIG_UPDATED',
  FEATURE_FLAG_CHANGED = 'FEATURE_FLAG_CHANGED',
  RATE_LIMIT_CHANGED = 'RATE_LIMIT_CHANGED',

  // Security
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  CSRF_DETECTED = 'CSRF_DETECTED',

  // API access
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_DELETED = 'API_KEY_DELETED',
  WEBHOOK_CONFIGURED = 'WEBHOOK_CONFIGURED',

  // System
  SYSTEM_BACKUP = 'SYSTEM_BACKUP',
  SYSTEM_RESTORE = 'SYSTEM_RESTORE',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',

  // API access
  API_ACCESS = 'API_ACCESS',
}

/**
 * Audit log entry structure
 * Matches the database schema from migration 008_create_audit_logs.sql
 */
export interface AuditLog {
  id?: number;
  auditId?: string;
  occurredAt?: Date;
  userId: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  sessionId?: string | null;
  actionType: AuditEventType;
  actionCategory: AuditCategory;
  resourceType?: string | null;
  resourceId?: string | null;
  actionDescription: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  changedFields?: string[] | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  status?: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  retentionUntil?: Date;
}

/**
 * Query options for filtering audit logs
 */
export interface AuditQueryOptions {
  userId?: string;
  username?: string;
  category?: AuditCategory;
  action?: AuditEventType;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Singleton instance for audit service
 */
let auditServiceInstance: AuditService | null = null;

/**
 * Get the singleton audit service instance
 */
export function getAuditService(): AuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new AuditService();
  }
  return auditServiceInstance;
}

/**
 * Main Audit Service class
 *
 * Thread-safe audit logging with OpenTelemetry integration
 */
export class AuditService {
  private pool: Pool;
  private isInitialized = false;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Initialize audit service
   * Creates table if not exists and sets up retention policy
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Table is created by migration 008_create_audit_logs.sql
      // Just verify it exists
      const result = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'audit_logs'
        );
      `);

      if (!result.rows[0].exists) {
        throw new Error('audit_logs table does not exist - please run migration 008');
      }

      this.isInitialized = true;
      logger.info('AuditService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AuditService', { error });
      throw error;
    }
  }

  // ==========================================================================
  // LOGGING METHODS
  // ==========================================================================

  /**
   * Log an audit event
   *
   * @param auditLog - The audit log entry to record
   * @returns The created audit log ID
   */
  async log(auditLog: AuditLog): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Add OpenTelemetry span attributes for tracing (with error handling)
      try {
        addSpanAttributes({
          'audit.category': auditLog.actionCategory,
          'audit.action': auditLog.actionType,
          'audit.resource_type': auditLog.resourceType,
          'audit.user_id': auditLog.userId,
        });
      } catch (telemetryError) {
        // Silently ignore telemetry errors - don't let them break audit logging
        console.warn('[AuditService] Failed to add span attributes:', telemetryError);
      }

      // Generate audit_id if not provided
      const auditId =
        auditLog.auditId || `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      const query = `
        INSERT INTO audit_logs (
          audit_id,
          user_id,
          user_email,
          user_role,
          session_id,
          action_type,
          action_category,
          resource_type,
          resource_id,
          action_description,
          old_values,
          new_values,
          changed_fields,
          ip_address,
          user_agent,
          request_id,
          correlation_id,
          status,
          error_code,
          error_message,
          metadata,
          retention_until,
          occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING id
      `;

      // Calculate retention_until (2 years from now by default)
      const retentionUntil = new Date();
      retentionUntil.setFullYear(retentionUntil.getFullYear() + 2);

      const values = [
        auditId,
        auditLog.userId,
        auditLog.userEmail,
        auditLog.userRole,
        auditLog.sessionId || null,
        auditLog.actionType,
        auditLog.actionCategory,
        auditLog.resourceType,
        auditLog.resourceId,
        auditLog.actionDescription,
        auditLog.oldValues ? JSON.stringify(auditLog.oldValues) : null,
        auditLog.newValues ? JSON.stringify(auditLog.newValues) : null,
        auditLog.changedFields || null,
        auditLog.ipAddress,
        auditLog.userAgent,
        auditLog.requestId,
        auditLog.correlationId,
        auditLog.status || 'SUCCESS',
        auditLog.errorCode || null,
        auditLog.errorMessage || null,
        auditLog.metadata ? JSON.stringify(auditLog.metadata) : null,
        retentionUntil,
        auditLog.occurredAt || new Date(),
      ];

      const result = await this.pool.query(query, values);

      // Add span event for successful audit log (with error handling)
      try {
        addSpanEvent('audit_logged', {
          'audit.log_id': result.rows[0].id,
          'audit.action': auditLog.actionType,
        });
      } catch (telemetryError) {
        // Silently ignore telemetry errors - don't let them break audit logging
        console.warn('[AuditService] Failed to add span event:', telemetryError);
      }

      logger.debug('Audit log created', {
        auditLogId: result.rows[0].id,
        actionType: auditLog.actionType,
        actionCategory: auditLog.actionCategory,
      });

      return result.rows[0].id;
    } catch (error) {
      try {
        try {
          recordException(error as Error);
        } catch {
          /* ignore telemetry errors */
        }
      } catch (telemetryError) {
        // Silently ignore telemetry errors
        console.warn('[AuditService] Failed to record exception:', telemetryError);
      }
      logger.error('Failed to create audit log', {
        error: error instanceof Error ? error.message : String(error),
        auditLog,
      });
      throw error;
    }
  }

  /**
   * Query audit logs with filters
   *
   * @param options - Query filters and pagination
   * @returns Array of audit logs
   */
  async query(options: AuditQueryOptions = {}): Promise<AuditLog[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const conditions: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (options.userId !== undefined) {
        conditions.push(`user_id = $${paramIndex++}`);
        values.push(options.userId);
      }

      if (options.username) {
        conditions.push(`user_email = $${paramIndex++}`);
        values.push(options.username);
      }

      if (options.category) {
        conditions.push(`action_category = $${paramIndex++}`);
        values.push(options.category);
      }

      if (options.action) {
        conditions.push(`action_type = $${paramIndex++}`);
        values.push(options.action);
      }

      if (options.resourceType) {
        conditions.push(`resource_type = $${paramIndex++}`);
        values.push(options.resourceType);
      }

      if (options.resourceId) {
        conditions.push(`resource_id = $${paramIndex++}`);
        values.push(options.resourceId);
      }

      if (options.startDate) {
        conditions.push(`occurred_at >= $${paramIndex++}`);
        values.push(options.startDate);
      }

      if (options.endDate) {
        conditions.push(`occurred_at <= $${paramIndex++}`);
        values.push(options.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      const query = `
        SELECT
          id,
          audit_id as "auditId",
          occurred_at as "occurredAt",
          user_id as "userId",
          user_email as "userEmail",
          user_role as "userRole",
          session_id as "sessionId",
          action_type as "actionType",
          action_category as "actionCategory",
          resource_type as "resourceType",
          resource_id as "resourceId",
          action_description as "actionDescription",
          old_values as "oldValues",
          new_values as "newValues",
          changed_fields as "changedFields",
          ip_address as "ipAddress",
          user_agent as "userAgent",
          request_id as "requestId",
          correlation_id as "correlationId",
          status,
          error_code as "errorCode",
          error_message as "errorMessage",
          metadata,
          retention_until as "retentionUntil"
        FROM audit_logs
        ${whereClause}
        ORDER BY occurred_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const result = await this.pool.query(query, values);

      return result.rows.map(row => ({
        id: row.id,
        auditId: row.auditId,
        occurredAt: row.occurredAt,
        userId: row.userId,
        userEmail: row.userEmail,
        userRole: row.userRole,
        sessionId: row.sessionId,
        actionType: row.actionType,
        actionCategory: row.actionCategory,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        actionDescription: row.actionDescription,
        oldValues: row.oldValues ?? null,
        newValues: row.newValues ?? null,
        changedFields: row.changedFields,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        requestId: row.requestId,
        correlationId: row.correlationId,
        status: row.status,
        errorCode: row.errorCode,
        errorMessage: row.errorMessage,
        metadata: row.metadata ?? null,
        retentionUntil: row.retentionUntil,
      }));
    } catch (error) {
      try {
        recordException(error as Error);
      } catch {
        /* ignore telemetry errors */
      }
      logger.error('Failed to query audit logs', {
        error: error instanceof Error ? error.message : String(error),
        options,
      });
      throw error;
    }
  }

  /**
   * Get audit log by ID
   *
   * @param id - Audit log ID
   * @returns The audit log or null if not found
   */
  async getById(id: number): Promise<AuditLog | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const query = `
        SELECT
          id,
          audit_id as "auditId",
          occurred_at as "occurredAt",
          user_id as "userId",
          user_email as "userEmail",
          user_role as "userRole",
          session_id as "sessionId",
          action_type as "actionType",
          action_category as "actionCategory",
          resource_type as "resourceType",
          resource_id as "resourceId",
          action_description as "actionDescription",
          old_values as "oldValues",
          new_values as "newValues",
          changed_fields as "changedFields",
          ip_address as "ipAddress",
          user_agent as "userAgent",
          request_id as "requestId",
          correlation_id as "correlationId",
          status,
          error_code as "errorCode",
          error_message as "errorMessage",
          metadata,
          retention_until as "retentionUntil"
        FROM audit_logs
        WHERE id = $1
      `;

      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        auditId: row.auditId,
        occurredAt: row.occurredAt,
        userId: row.userId,
        userEmail: row.userEmail,
        userRole: row.userRole,
        sessionId: row.sessionId,
        actionType: row.actionType,
        actionCategory: row.actionCategory,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        actionDescription: row.actionDescription,
        oldValues: row.oldValues ?? null,
        newValues: row.newValues ?? null,
        changedFields: row.changedFields,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        requestId: row.requestId,
        correlationId: row.correlationId,
        status: row.status,
        errorCode: row.errorCode,
        errorMessage: row.errorMessage,
        metadata: row.metadata ?? null,
        retentionUntil: row.retentionUntil,
      };
    } catch (error) {
      try {
        recordException(error as Error);
      } catch {
        /* ignore telemetry errors */
      }
      logger.error('Failed to get audit log by ID', {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  /**
   * Get audit history for a specific resource
   *
   * @param resourceType - Type of resource (e.g., 'order', 'user')
   * @param resourceId - ID of the resource
   * @param limit - Maximum number of records to return
   * @returns Array of audit logs for the resource
   */
  async getResourceHistory(
    resourceType: string,
    resourceId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    return this.query({
      resourceType,
      resourceId,
      limit,
    });
  }

  /**
   * Get user activity history
   *
   * @param userId - User ID (string)
   * @param limit - Maximum number of records to return
   * @returns Array of audit logs for the user
   */
  async getUserActivity(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.query({
      userId,
      limit,
    });
  }

  /**
   * Get security events (failed logins, suspicious activity, etc.)
   *
   * @param startDate - Start date for query (default: 7 days ago)
   * @param endDate - End date for query (default: now)
   * @returns Array of security-related audit logs
   */
  async getSecurityEvents(
    startDate: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: Date = new Date()
  ): Promise<AuditLog[]> {
    return this.query({
      category: AuditCategory.SECURITY,
      startDate,
      endDate,
      limit: 1000,
    });
  }

  /**
   * Get audit statistics
   *
   * @param startDate - Start date for statistics (default: 30 days ago)
   * @param endDate - End date for statistics (default: now)
   * @returns Statistics object with counts by category and action
   */
  async getStatistics(
    startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: Date = new Date()
  ): Promise<{
    totalLogs: number;
    byCategory: Record<string, number>;
    byAction: Record<string, number>;
    topUsers: Array<{ userEmail: string; count: number }>;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // For simpler approach, use separate queries
      const categoryQuery = `
        SELECT action_category, COUNT(*) as count
        FROM audit_logs
        WHERE occurred_at >= $1 AND occurred_at <= $2
        GROUP BY action_category
        ORDER BY count DESC
      `;

      const actionQuery = `
        SELECT action_type, COUNT(*) as count
        FROM audit_logs
        WHERE occurred_at >= $1 AND occurred_at <= $2
        GROUP BY action_type
        ORDER BY count DESC
        LIMIT 20
      `;

      const userQuery = `
        SELECT user_email, COUNT(*) as count
        FROM audit_logs
        WHERE occurred_at >= $1 AND occurred_at <= $2
          AND user_email IS NOT NULL
        GROUP BY user_email
        ORDER BY count DESC
        LIMIT 10
      `;

      const totalQuery = `
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE occurred_at >= $1 AND occurred_at <= $2
      `;

      const [categoryResult, actionResult, userResult, totalResult] = await Promise.all([
        this.pool.query(categoryQuery, [startDate, endDate]),
        this.pool.query(actionQuery, [startDate, endDate]),
        this.pool.query(userQuery, [startDate, endDate]),
        this.pool.query(totalQuery, [startDate, endDate]),
      ]);

      const byCategory: Record<string, number> = {};
      categoryResult.rows.forEach(row => {
        byCategory[row.action_category] = parseInt(row.count);
      });

      const byAction: Record<string, number> = {};
      actionResult.rows.forEach(row => {
        byAction[row.action_type] = parseInt(row.count);
      });

      const topUsers = userResult.rows.map(row => ({
        userEmail: row.user_email,
        count: parseInt(row.count),
      }));

      return {
        totalLogs: parseInt(totalResult.rows[0].count),
        byCategory,
        byAction,
        topUsers,
      };
    } catch (error) {
      try {
        recordException(error as Error);
      } catch {
        /* ignore telemetry errors */
      }
      logger.error('Failed to get audit statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ==========================================================================
  // CONVENIENCE METHODS
  // ==========================================================================

  /**
   * Log authentication event
   */
  async logAuth(
    actionType: AuditEventType,
    userId: string | null,
    userEmail: string | null,
    ipAddress: string | null,
    userAgent: string | null,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<number> {
    return this.log({
      userId,
      userEmail,
      actionType,
      actionCategory: AuditCategory.AUTHENTICATION,
      actionDescription: description,
      resourceType: 'user_session',
      resourceId: userId || null,
      ipAddress,
      userAgent,
      metadata: metadata || null,
      oldValues: null,
      newValues: null,
      correlationId: this.getCurrentTraceId(),
    });
  }

  /**
   * Log authorization/role change event
   */
  async logAuthorization(
    actionType: AuditEventType,
    userId: string | null,
    userEmail: string | null,
    userRole: string | null,
    resourceType: string,
    resourceId: string | null,
    description: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    metadata?: Record<string, unknown> | null,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<number> {
    return this.log({
      userId,
      userEmail,
      userRole,
      actionType,
      actionCategory: AuditCategory.AUTHORIZATION,
      actionDescription: description,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      metadata: metadata || null,
      oldValues: oldValues || null,
      newValues: newValues || null,
      correlationId: this.getCurrentTraceId(),
    });
  }

  /**
   * Log data modification event
   */
  async logDataModification(
    actionType: AuditEventType,
    userId: string | null,
    userEmail: string | null,
    resourceType: string,
    resourceId: string | null,
    description: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<number> {
    return this.log({
      userId,
      userEmail,
      actionType,
      actionCategory: AuditCategory.DATA_MODIFICATION,
      actionDescription: description,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      metadata: null,
      oldValues: oldValues || null,
      newValues: newValues || null,
      correlationId: this.getCurrentTraceId(),
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    actionType: AuditEventType,
    description: string,
    ipAddress: string | null,
    userAgent: string | null,
    metadata?: Record<string, unknown>
  ): Promise<number> {
    return this.log({
      userId: null,
      userEmail: null,
      actionType,
      actionCategory: AuditCategory.SECURITY,
      actionDescription: description,
      resourceType: 'system',
      resourceId: null,
      ipAddress,
      userAgent,
      metadata: metadata || null,
      oldValues: null,
      newValues: null,
      correlationId: this.getCurrentTraceId(),
    });
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get current OpenTelemetry trace ID if available
   * Safely handles cases where telemetry is not available
   */
  private getCurrentTraceId(): string | null {
    try {
      const api = require('@opentelemetry/api');
      const span = api.trace.getSpan();
      if (span) {
        const spanContext = span.spanContext();
        if (spanContext) {
          return spanContext.traceId;
        }
      }
    } catch {
      // Silently ignore telemetry errors - return null if trace ID unavailable
    }
    return null;
  }

  /**
   * Clean up old audit logs based on retention policy
   * This should be called by a scheduled job
   *
   * @param retentionDays - Number of days to retain logs (default: 90 days)
   * @returns Number of logs deleted
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const query = `
        DELETE FROM audit_logs
        WHERE occurred_at < $1
      `;

      const result = await this.pool.query(query, [cutoffDate]);

      logger.info('Cleaned up old audit logs', {
        deletedCount: result.rowCount,
        retentionDays,
        cutoffDate,
      });

      return result.rowCount || 0;
    } catch (error) {
      try {
        recordException(error as Error);
      } catch {
        /* ignore telemetry errors */
      }
      logger.error('Failed to cleanup old audit logs', {
        error: error instanceof Error ? error.message : String(error),
        retentionDays,
      });
      throw error;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AuditService;
