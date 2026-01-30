/**
 * Zone Picking Service
 *
 * Implements zone-based picking optimization for large warehouses.
 * Zone picking assigns pickers to specific zones to minimize travel
 * and increase throughput.
 *
 * Benefits:
 * - Reduced picker congestion
 * - Specialized picking per zone
 * - Better inventory organization
 * - Improved picker productivity
 *
 * References:
 * - Zone Picking vs Wave vs Batch
 * - Warehouse Zone Optimization
 */

import { Pool } from 'pg';
import { getPool, query } from '../db/client';
import { logger } from '../config/logger';
import { getAuditService, AuditEventType, AuditCategory } from './AuditService';
import { notifyUser, NotificationType, NotificationPriority } from './NotificationHelper';
import wsServer from '../websocket';

// ============================================================================
// TYPES
// ============================================================================

interface UserContext {
  userId?: string | number;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface Zone {
  zoneId: string;
  name: string;
  aisleStart: number;
  aisleEnd: number;
  zoneType:
    | 'FAST_MOVING'
    | 'SLOW_MOVING'
    | 'BULK'
    | 'COLD_STORAGE'
    | 'HAZARDOUS'
    | 'REVERSE_LOGISTICS';
  locationCount: number;
  activePickers: number;
  currentUtilization: number; // 0-100 percentage
}

export interface ZoneAssignment {
  pickerId: string;
  zoneId: string;
  assignedAt: Date;
  assignedBy: string;
  status: 'ACTIVE' | 'ON_BREAK' | 'COMPLETED';
  tasksCompleted: number;
  tasksRemaining: number;
}

export interface ZonePickTask {
  taskId: string;
  orderId: string;
  sku: string;
  quantity: number;
  binLocation: string;
  zone: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  assignedPicker?: string;
}

export interface ZoneStats {
  zoneId: string;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalItems: number;
  estimatedTimeRemaining: number; // In seconds
  activePickers: number;
  averageTimePerTask: number; // In seconds
}

// ============================================================================
// ZONE PICKING SERVICE
// ============================================================================

class ZonePickingService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Get all zones in the warehouse
   */
  async getZones(): Promise<Zone[]> {
    const client = await this.pool.connect();

    try {
      // Query bin_locations with actual schema (bin_id, zone, aisle, shelf, type, active)
      const result = await client.query(`
        SELECT
          zone,
          MIN(aisle) AS aisle_start,
          MAX(aisle) AS aisle_end,
          COUNT(*) AS location_count,
          COUNT(DISTINCT pt.picker_id) AS active_pickers
        FROM bin_locations bl
        LEFT JOIN pick_tasks pt ON bl.bin_id = pt.target_bin AND pt.status = 'IN_PROGRESS'
        WHERE bl.active = true
        GROUP BY zone
        ORDER BY zone
      `);

      return result.rows.map(row => ({
        zoneId: row.zone,
        name: this.getZoneName(row.zone),
        aisleStart: parseInt(row.aisle_start) || 0,
        aisleEnd: parseInt(row.aisle_end) || 0,
        zoneType: this.inferZoneType(row.zone),
        locationCount: parseInt(row.location_count) || 0,
        activePickers: parseInt(row.active_pickers) || 0,
        currentUtilization: 0, // Not tracked in current schema
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get zone statistics
   */
  async getZoneStats(zoneId: string): Promise<ZoneStats | null> {
    const client = await this.pool.connect();

    try {
      // Use actual schema: pick_tasks.target_bin, bin_locations.bin_id
      const result = await client.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE pt.status = 'PENDING') AS pending_tasks,
          COUNT(*) FILTER (WHERE pt.status = 'IN_PROGRESS') AS in_progress_tasks,
          COUNT(*) FILTER (WHERE pt.status = 'COMPLETED') AS completed_tasks,
          SUM(pt.quantity) AS total_items,
          COUNT(DISTINCT pt.picker_id) AS active_pickers
        FROM pick_tasks pt
        JOIN bin_locations bl ON pt.target_bin = bl.bin_id
        WHERE bl.zone = $1
          AND pt.created_at >= CURRENT_DATE
        `,
        [zoneId]
      );

      if (result.rows.length === 0 || !result.rows[0]) {
        return {
          zoneId,
          pendingTasks: 0,
          inProgressTasks: 0,
          completedTasks: 0,
          totalItems: 0,
          estimatedTimeRemaining: 0,
          activePickers: 0,
          averageTimePerTask: 60,
        };
      }

      const row = result.rows[0];

      // Calculate average time per task from historical data
      const avgTimeResult = await client.query(
        `
        SELECT
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) AS avg_time
        FROM pick_tasks
        WHERE completed_at >= CURRENT_DATE - INTERVAL '7 days'
          AND target_bin LIKE $1
        `,
        [`${zoneId}-%`]
      );

      const avgTimePerTask = avgTimeResult.rows[0]?.avg_time || 60; // Default 60 seconds
      const estimatedTimeRemaining =
        ((parseInt(row.pending_tasks) || 0) + (parseInt(row.in_progress_tasks) || 0)) *
        avgTimePerTask;

      return {
        zoneId,
        pendingTasks: parseInt(row.pending_tasks) || 0,
        inProgressTasks: parseInt(row.in_progress_tasks) || 0,
        completedTasks: parseInt(row.completed_tasks) || 0,
        totalItems: parseInt(row.total_items) || 0,
        estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
        activePickers: parseInt(row.active_pickers) || 0,
        averageTimePerTask: Math.round(avgTimePerTask),
      };
    } catch (error) {
      logger.error('Error getting zone stats', { zoneId, error });
      // Return default stats instead of throwing
      return {
        zoneId,
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        totalItems: 0,
        estimatedTimeRemaining: 0,
        activePickers: 0,
        averageTimePerTask: 60,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get all zone statistics
   */
  async getAllZoneStats(): Promise<ZoneStats[]> {
    const zones = await this.getZones();
    const stats: ZoneStats[] = [];

    for (const zone of zones) {
      const zoneStats = await this.getZoneStats(zone.zoneId);
      if (zoneStats) {
        stats.push(zoneStats);
      }
    }

    return stats;
  }

  /**
   * Assign picker to zone
   */
  async assignPickerToZone(
    pickerId: string,
    zoneId: string,
    context: UserContext
  ): Promise<ZoneAssignment> {
    const client = await this.pool.connect();

    try {
      // Check if zone exists
      const zone = await this.getZoneById(zoneId, client);

      if (!zone) {
        throw new Error(`Zone ${zoneId} not found`);
      }

      // Check if picker is already assigned to a zone
      const existingResult = await client.query(
        `
        SELECT * FROM zone_assignments
        WHERE picker_id = $1
          AND status = 'ACTIVE'
        `,
        [pickerId]
      );

      if (existingResult.rows.length > 0) {
        throw new Error(
          `Picker ${pickerId} is already assigned to zone ${existingResult.rows[0].zone_id}`
        );
      }

      // Create zone assignment
      const assignment = {
        pickerId,
        zoneId,
        assignedAt: new Date(),
        assignedBy: String(context.userId || 'SYSTEM'),
        status: 'ACTIVE' as const,
        tasksCompleted: 0,
        tasksRemaining: 0,
      };

      await client.query(
        `
        INSERT INTO zone_assignments (
          picker_id, zone_id, assigned_at, assigned_by, status
        ) VALUES ($1, $2, $3, $4, $5)
        `,
        [
          assignment.pickerId,
          assignment.zoneId,
          assignment.assignedAt,
          assignment.assignedBy,
          assignment.status,
        ]
      );

      // Log the assignment
      const auditSvc = getAuditService();
      await auditSvc.log({
        userId: typeof context.userId === 'number' ? context.userId : null,
        username: context.userEmail || null,
        action: AuditEventType.ORDER_UPDATED,
        category: AuditCategory.DATA_MODIFICATION,
        resourceType: 'Zone',
        resourceId: zoneId,
        details: { description: `Picker ${pickerId} assigned to zone ${zoneId}` },
        oldValues: null,
        newValues: { pickerId, zoneId },
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        traceId: null,
      });

      logger.info('Picker assigned to zone', { pickerId, zoneId });

      // Broadcast zone assignment via WebSocket
      const broadcaster = wsServer.getBroadcaster();
      if (broadcaster) {
        broadcaster.broadcastZoneAssignment({
          zoneId,
          pickerId,
          assigned: true,
        });
      }

      // Send notification to picker
      await notifyUser({
        userId: pickerId,
        type: NotificationType.ZONE_ASSIGNED,
        title: 'Zone Assignment',
        message: `You have been assigned to zone ${zone.name} (${zoneId})`,
        priority: NotificationPriority.NORMAL,
        data: {
          zoneId,
          zoneName: zone.name,
          pickerId,
        },
      });

      return assignment;
    } finally {
      client.release();
    }
  }

  /**
   * Get pick tasks for a zone
   */
  async getZonePickTasks(
    zoneId: string,
    status?: ('PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED')[]
  ): Promise<ZonePickTask[]> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          pt.task_id,
          pt.order_id,
          pt.sku,
          pt.quantity,
          pt.bin_location,
          bl.zone,
          pt.priority,
          pt.status,
          pt.assigned_picker
        FROM pick_tasks pt
        JOIN bin_locations bl ON pt.bin_location = bl.location
        WHERE bl.zone = $1
      `;

      const params: any[] = [zoneId];

      if (status && status.length > 0) {
        query += ` AND pt.status = ANY($2)`;
        params.push(status);
      }

      query += ` ORDER BY pt.priority DESC, pt.bin_location`;

      const result = await client.query(query, params);

      return result.rows.map(row => ({
        taskId: row.task_id,
        orderId: row.order_id,
        sku: row.sku,
        quantity: row.quantity,
        binLocation: row.bin_location,
        zone: row.zone,
        priority: row.priority,
        status: row.status,
        assignedPicker: row.assigned_picker,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Rebalance pickers across zones
   * Assigns pickers to zones with the most pending tasks
   */
  async rebalancePickers(context: UserContext): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Get all zone stats
      const zoneStats = await this.getAllZoneStats();

      // Get all available pickers
      const pickersResult = await client.query(
        `
        SELECT user_id
        FROM users
        WHERE role = 'PICKER'
          AND is_active = true
        `
      );

      const availablePickers = pickersResult.rows.map(row => row.user_id);

      // Sort zones by pending tasks (descending)
      const sortedZones = zoneStats.sort((a, b) => b.pendingTasks - a.pendingTasks);

      // Assign pickers to zones based on workload
      let pickerIndex = 0;

      for (const zone of sortedZones) {
        if (zone.pendingTasks === 0) {
          continue; // Skip zones with no pending tasks
        }

        // Calculate optimal pickers for this zone
        const optimalPickers = Math.ceil(zone.pendingTasks / 50); // 50 tasks per picker
        const currentPickers = zone.activePickers;
        const pickersNeeded = Math.max(0, optimalPickers - currentPickers);

        // Assign additional pickers
        for (let i = 0; i < pickersNeeded && pickerIndex < availablePickers.length; i++) {
          const pickerId = availablePickers[pickerIndex++];

          // Check if picker is already assigned to an active zone
          const existingResult = await client.query(
            `
            SELECT * FROM zone_assignments
            WHERE picker_id = $1
              AND status = 'ACTIVE'
            `,
            [pickerId]
          );

          if (existingResult.rows.length === 0) {
            await this.assignPickerToZone(pickerId, zone.zoneId, context);
          }
        }
      }

      logger.info('Picker rebalancing completed', {
        totalPickers: availablePickers.length,
        zonesRebalanced: sortedZones.filter(z => z.pendingTasks > 0).length,
      });
    } finally {
      client.release();
    }
  }

  /**
   * Get zone by ID
   */
  private async getZoneById(zoneId: string, client: PoolClient): Promise<Zone | null> {
    const result = await client.query(
      `
      SELECT
        zone,
        MIN(aisle) AS aisle_start,
        MAX(aisle) AS aisle_end,
        COUNT(*) AS location_count
      FROM bin_locations
      WHERE zone = $1
      GROUP BY zone
      `,
      [zoneId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      zoneId: row.zone,
      name: this.getZoneName(row.zone),
      aisleStart: row.aisle_start,
      aisleEnd: row.aisle_end,
      zoneType: this.inferZoneType(row.zone),
      locationCount: row.location_count,
      activePickers: 0,
      currentUtilization: 0,
    };
  }

  /**
   * Get human-readable zone name
   */
  private getZoneName(zoneId: string): string {
    const type = this.inferZoneType(zoneId);
    return `${type.replace(/_/g, ' ')} Zone (${zoneId})`;
  }

  /**
   * Infer zone type based on zone ID
   */
  private inferZoneType(zoneId: string): Zone['zoneType'] {
    // This could be configurable or based on actual zone configuration
    const zoneCode = zoneId.charAt(0);

    switch (zoneCode) {
      case 'A':
        return 'FAST_MOVING';
      case 'B':
        return 'FAST_MOVING';
      case 'C':
        return 'SLOW_MOVING';
      case 'D':
        return 'SLOW_MOVING';
      case 'E':
        return 'BULK';
      case 'F':
        return 'COLD_STORAGE';
      case 'G':
        return 'HAZARDOUS';
      case 'H':
        return 'REVERSE_LOGISTICS';
      default:
        return 'SLOW_MOVING';
    }
  }

  /**
   * Release picker from zone
   */
  async releasePickerFromZone(pickerId: string, context: UserContext): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(
        `
        UPDATE zone_assignments
        SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
        WHERE picker_id = $1
          AND status = 'ACTIVE'
        `,
        [pickerId]
      );

      const auditSvc = getAuditService();
      await auditSvc.log({
        userId: typeof context.userId === 'number' ? context.userId : null,
        username: context.userEmail || null,
        action: AuditEventType.ORDER_UPDATED,
        category: AuditCategory.DATA_MODIFICATION,
        resourceType: 'Zone',
        resourceId: pickerId,
        details: { description: `Picker ${pickerId} released from zone` },
        oldValues: null,
        newValues: null,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        traceId: null,
      });

      logger.info('Picker released from zone', { pickerId });
    } finally {
      client.release();
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const zonePickingService = new ZonePickingService();

export default zonePickingService;
