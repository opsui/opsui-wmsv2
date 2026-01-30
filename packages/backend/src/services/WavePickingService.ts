/**
 * Wave Picking Service
 *
 * Implements wave picking optimization for warehouse operations.
 * Wave picking groups orders into "waves" based on criteria like:
 * - Shipping carrier/cutoff
 * - Order priority
 * - SKU compatibility
 * - Zone proximity
 * - Delivery deadlines
 *
 * Benefits:
 * - Reduced travel distance by picking similar orders together
 * - Better warehouse flow management
 * - Improved picker efficiency
 * - Enhanced carrier compliance
 *
 * References:
 * - Wave vs Batch Picking Comparison
 * - Dynamic Order Batching for WMS
 */

import { Pool } from 'pg';
import { getPool, query } from '../db/client';
import { logger } from '../config/logger';
import { routeOptimizationService, PickTask, OptimizedRoute } from './RouteOptimizationService';
import { getAuditService, AuditEventType, AuditCategory } from './AuditService';
import { notifyAll, NotificationType, NotificationPriority } from './NotificationHelper';
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

export enum WaveStrategy {
  CARRIER = 'CARRIER', // Group by shipping carrier
  PRIORITY = 'PRIORITY', // Group by order priority
  ZONE = 'ZONE', // Group by warehouse zone
  DEADLINE = 'DEADLINE', // Group by delivery deadline
  SKU_COMPATIBILITY = 'SKU_COMPATIBILITY', // Group by shared SKUs
  BALANCED = 'BALANCED', // Balance across multiple criteria
}

export enum WaveStatus {
  PLANNED = 'PLANNED',
  RELEASED = 'RELEASED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface WaveCriteria {
  strategy: WaveStrategy;
  maxOrdersPerWave?: number;
  maxOrdersPerPicker?: number;
  carrierCutoff?: Date; // Latest shipping cutoff time
  priority?: ('LOW' | 'NORMAL' | 'HIGH' | 'URGENT')[];
  zones?: string[]; // Specific zones to include
  deadline?: Date; // Delivery deadline
  minSkuOverlap?: number; // Minimum SKU overlap for batching
}

export interface Wave {
  waveId: string;
  name: string;
  status: WaveStatus;
  criteria: WaveCriteria;
  orderIds: string[];
  pickTasks: PickTask[];
  assignedPickers: string[];
  estimatedTime: number; // In seconds
  estimatedDistance: number; // In warehouse units
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}

export interface WaveSummary {
  waveId: string;
  name: string;
  status: WaveStatus;
  orderCount: number;
  itemCount: number;
  pickerCount: number;
  progress: number; // 0-100
  estimatedTimeRemaining: number;
}

// ============================================================================
// WAVE PICKING SERVICE
// ============================================================================

class WavePickingService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Create a new wave based on criteria
   */
  async createWave(criteria: WaveCriteria, context: UserContext): Promise<Wave> {
    const client = await this.pool.connect();

    try {
      // Get orders that match the criteria
      const orders = await this.fetchOrdersForWave(criteria, client);

      if (orders.length === 0) {
        throw new Error('No orders found matching the wave criteria');
      }

      // Limit orders per wave
      const maxOrders = criteria.maxOrdersPerWave || 50;
      const selectedOrders = orders.slice(0, maxOrders);

      // Extract unique pick tasks from all orders
      const pickTasks = await this.extractPickTasks(selectedOrders, client);

      // Optimize picking route for the wave
      const optimizedRoute = routeOptimizationService.optimizeRoute(pickTasks);

      // Assign pickers (round-robin or based on availability)
      const pickerCount = Math.ceil(pickTasks.length / (criteria.maxOrdersPerPicker || 20));
      const assignedPickers = await this.assignPickers(pickerCount, client);

      // Create wave record
      const waveId = this.generateWaveId();
      const waveName = this.generateWaveName(criteria, new Date());

      const wave: Wave = {
        waveId,
        name: waveName,
        status: WaveStatus.PLANNED,
        criteria,
        orderIds: selectedOrders.map(o => o.order_id),
        pickTasks: optimizedRoute.tasks,
        assignedPickers,
        estimatedTime: optimizedRoute.estimatedTime,
        estimatedDistance: optimizedRoute.totalDistance,
        createdAt: new Date(),
        createdBy: context.userId || 'SYSTEM',
      };

      // Store wave in database
      await this.saveWave(wave, client);

      logger.info('Wave created successfully', {
        waveId,
        waveName,
        orderCount: selectedOrders.length,
        itemCount: pickTasks.length,
        strategy: criteria.strategy,
      });

      // Broadcast wave creation via WebSocket
      const broadcaster = wsServer.getBroadcaster();
      if (broadcaster) {
        // Broadcast to all users that a new wave was created
        broadcaster.broadcastGlobalNotification({
          notificationId: `WAVE-${waveId}`,
          title: 'New Wave Created',
          message: `Wave ${waveName} created with ${selectedOrders.length} orders`,
          type: 'INFO',
          createdAt: new Date(),
        });
      }

      // Send notification to all users about new wave
      await notifyAll({
        type: NotificationType.WAVE_CREATED,
        title: 'New Wave Created',
        message: `Wave ${waveName} (${waveId}) has been created with ${selectedOrders.length} orders and ${pickTasks.length} items`,
        priority: NotificationPriority.NORMAL,
        data: {
          waveId,
          waveName,
          orderCount: selectedOrders.length,
          itemCount: pickTasks.length,
          assignedPickers,
        },
      });

      return wave;
    } finally {
      client.release();
    }
  }

  /**
   * Release a wave (make it active for picking)
   */
  async releaseWave(waveId: string, context: UserContext): Promise<Wave> {
    const client = await this.pool.connect();

    try {
      // Get wave
      const wave = await this.getWave(waveId, client);

      if (!wave) {
        throw new Error(`Wave ${waveId} not found`);
      }

      if (wave.status !== WaveStatus.PLANNED) {
        throw new Error(`Wave ${waveId} is not in PLANNED status`);
      }

      // Update wave status
      wave.status = WaveStatus.RELEASED;
      wave.startedAt = new Date();

      await this.updateWave(wave, client);

      // Assign pick tasks to pickers
      await this.assignTasksToPickers(wave, client);

      // Log the release
      const auditSvc = getAuditService();
      await auditSvc.log({
        userId: typeof context.userId === 'number' ? context.userId : null,
        username: context.userEmail || null,
        action: AuditEventType.ORDER_UPDATED,
        category: AuditCategory.DATA_MODIFICATION,
        resourceType: 'Wave',
        resourceId: waveId,
        details: { description: `Wave picking released: ${wave.name}` },
        oldValues: null,
        newValues: {
          waveId,
          orderCount: wave.orderIds.length,
          pickerCount: wave.assignedPickers.length,
        },
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        traceId: null,
      });

      logger.info('Wave released successfully', { waveId, waveName: wave.name });

      return wave;
    } finally {
      client.release();
    }
  }

  /**
   * Get wave status and progress
   */
  async getWaveStatus(waveId: string): Promise<WaveSummary | null> {
    const client = await this.pool.connect();

    try {
      const wave = await this.getWave(waveId, client);

      if (!wave) {
        return null;
      }

      // Calculate progress based on completed picks
      const totalPicks = wave.pickTasks.length;
      const completedPicks = await this.getCompletedPickCount(waveId, client);
      const progress = totalPicks > 0 ? (completedPicks / totalPicks) * 100 : 0;

      // Estimate remaining time
      const timePerPick = wave.estimatedTime / totalPicks;
      const remainingPicks = totalPicks - completedPicks;
      const estimatedTimeRemaining = Math.round(timePerPick * remainingPicks);

      return {
        waveId: wave.waveId,
        name: wave.name,
        status: wave.status,
        orderCount: wave.orderIds.length,
        itemCount: totalPicks,
        pickerCount: wave.assignedPickers.length,
        progress: Math.round(progress),
        estimatedTimeRemaining,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get active waves for a picker
   */
  async getActiveWavesForPicker(pickerId: string): Promise<WaveSummary[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
        SELECT DISTINCT
          w.wave_id,
          w.name,
          w.status,
          array_length(w.order_ids, 1) AS order_count,
          COUNT(DISTINCT pt.sku) AS item_count
        FROM waves w
        LEFT JOIN wave_pick_tasks wpt ON w.wave_id = wpt.wave_id
        LEFT JOIN pick_tasks pt ON wpt.task_id = pt.pick_task_id
        WHERE w.status IN ('RELEASED', 'IN_PROGRESS')
          AND $1 = ANY(w.assigned_pickers)
        GROUP BY w.wave_id, w.name, w.status
        ORDER BY w.created_at DESC
        `,
        [pickerId]
      );

      return result.rows.map(row => ({
        waveId: row.wave_id,
        name: row.name,
        status: row.status,
        orderCount: row.order_count || 0,
        itemCount: row.item_count || 0,
        pickerCount: 0, // Would need to join
        progress: 0, // Would need to calculate
        estimatedTimeRemaining: 0, // Would need to calculate
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Complete a wave
   */
  async completeWave(waveId: string, context: UserContext): Promise<void> {
    const client = await this.pool.connect();

    try {
      const wave = await this.getWave(waveId, client);

      if (!wave) {
        throw new Error(`Wave ${waveId} not found`);
      }

      // Update wave status
      wave.status = WaveStatus.COMPLETED;
      wave.completedAt = new Date();

      await this.updateWave(wave, client);

      // Log completion
      const auditSvc = getAuditService();
      await auditSvc.log({
        userId: typeof context.userId === 'number' ? context.userId : null,
        username: context.userEmail || null,
        action: AuditEventType.ORDER_UPDATED,
        category: AuditCategory.DATA_MODIFICATION,
        resourceType: 'Wave',
        resourceId: waveId,
        details: { description: `Wave picking completed: ${wave.name}` },
        oldValues: null,
        newValues: {
          waveId,
          orderCount: wave.orderIds.length,
          duration:
            wave.completedAt.getTime() - (wave.startedAt?.getTime() || wave.createdAt.getTime()),
        },
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        traceId: null,
      });

      logger.info('Wave completed successfully', { waveId, waveName: wave.name });

      // Send notification about wave completion
      await notifyAll({
        type: NotificationType.WAVE_COMPLETED,
        title: 'Wave Completed',
        message: `Wave ${wave.name} (${waveId}) has been completed with ${wave.orderIds.length} orders`,
        priority: NotificationPriority.NORMAL,
        data: {
          waveId,
          waveName: wave.name,
          orderCount: wave.orderIds.length,
          completedAt: wave.completedAt,
        },
      });
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Fetch orders that match wave criteria
   */
  private async fetchOrdersForWave(criteria: WaveCriteria, client: PoolClient): Promise<any[]> {
    let query = `
      SELECT
        o.order_id,
        o.customer_id,
        o.status,
        o.priority,
        o.shipping_carrier,
        o.shipping_method,
        COUNT(oi.sku) AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.status = 'PENDING'
    `;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    // Apply filters based on strategy
    switch (criteria.strategy) {
      case WaveStrategy.CARRIER:
        if (criteria.carrierCutoff) {
          conditions.push(`o.created_at >= $${paramCount++}`);
          values.push(new Date(criteria.carrierCutoff.getTime() - 4 * 60 * 60 * 1000)); // 4 hour window
        }
        break;

      case WaveStrategy.PRIORITY:
        if (criteria.priority && criteria.priority.length > 0) {
          conditions.push(`o.priority = ANY($${paramCount++})`);
          values.push(criteria.priority);
        }
        break;

      case WaveStrategy.ZONE:
        // This would require checking pick zones for items
        if (criteria.zones && criteria.zones.length > 0) {
          query += `
            LEFT JOIN pick_tasks pt ON o.order_id = pt.order_id
          `;
          conditions.push(`pt.target_bin LIKE ANY($${paramCount++})`);
          values.push(criteria.zones.map(z => `${z}-%`));
        }
        break;

      case WaveStrategy.DEADLINE:
        if (criteria.deadline) {
          conditions.push(`o.ship_by_date <= $${paramCount++}`);
          values.push(criteria.deadline);
        }
        break;

      case WaveStrategy.SKU_COMPATIBILITY:
        // This requires more complex analysis
        break;

      case WaveStrategy.BALANCED:
        // Combine multiple criteria
        if (criteria.priority && criteria.priority.length > 0) {
          conditions.push(`o.priority = ANY($${paramCount++})`);
          values.push(criteria.priority);
        }
        if (criteria.deadline) {
          conditions.push(`o.ship_by_date <= $${paramCount++}`);
          values.push(criteria.deadline);
        }
        break;
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    query += `
      GROUP BY o.order_id, o.customer_id, o.status, o.priority, o.shipping_carrier, o.shipping_method
      ORDER BY
        CASE o.priority
          WHEN 'URGENT' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'NORMAL' THEN 3
          WHEN 'LOW' THEN 4
        END ASC,
        o.created_at ASC
      LIMIT $${paramCount++}
    `;

    values.push(criteria.maxOrdersPerWave || 50);

    const result = await client.query(query, values);

    return result.rows;
  }

  /**
   * Extract pick tasks from orders
   */
  private async extractPickTasks(orders: any[], client: PoolClient): Promise<PickTask[]> {
    if (orders.length === 0) {
      return [];
    }

    const orderIds = orders.map(o => o.order_id);

    const result = await client.query(
      `
      SELECT
        pt.pick_task_id as task_id,
        pt.order_id,
        pt.sku,
        pt.quantity,
        pt.target_bin as bin_location,
        o.priority,
        s.product_name,
        s.weight
      FROM pick_tasks pt
      LEFT JOIN orders o ON pt.order_id = o.order_id
      LEFT JOIN skus s ON pt.sku = s.sku
      WHERE pt.order_id = ANY($1)
        AND pt.status = 'PENDING'
      ORDER BY o.priority DESC, pt.target_bin
      `,
      [orderIds]
    );

    return result.rows.map(row => ({
      taskId: row.task_id,
      orderId: row.order_id,
      sku: row.sku,
      quantity: row.quantity,
      binLocation: row.bin_location,
      priority: row.priority || 'NORMAL',
      weight: row.weight,
    }));
  }

  /**
   * Assign pickers to a wave
   */
  private async assignPickers(count: number, client: PoolClient): Promise<string[]> {
    // Get available pickers
    const result = await client.query(
      `
      SELECT user_id
      FROM users
      WHERE role = 'PICKER'
        AND is_active = true
      ORDER BY RANDOM()
      LIMIT $1
      `,
      [count]
    );

    return result.rows.map(row => row.user_id);
  }

  /**
   * Assign tasks to specific pickers
   */
  private async assignTasksToPickers(wave: Wave, client: PoolClient): Promise<void> {
    const tasksPerPicker = Math.ceil(wave.pickTasks.length / wave.assignedPickers.length);

    for (let i = 0; i < wave.assignedPickers.length; i++) {
      const pickerId = wave.assignedPickers[i];
      const startIndex = i * tasksPerPicker;
      const endIndex = Math.min(startIndex + tasksPerPicker, wave.pickTasks.length);
      const tasks = wave.pickTasks.slice(startIndex, endIndex);

      // Update pick_tasks table with assigned picker
      for (const task of tasks) {
        await client.query(
          `
          UPDATE pick_tasks
          SET picker_id = $1, started_at = CURRENT_TIMESTAMP
          WHERE pick_task_id = $2
          `,
          [pickerId, task.taskId]
        );
      }
    }
  }

  /**
   * Get completed pick count for a wave
   */
  private async getCompletedPickCount(waveId: string, client: PoolClient): Promise<number> {
    const result = await client.query(
      `
      SELECT COUNT(*) AS count
      FROM wave_pick_tasks wpt
      JOIN pick_tasks pt ON wpt.task_id = pt.pick_task_id
      WHERE wpt.wave_id = $1
        AND pt.status IN ('COMPLETED', 'SKIPPED')
      `,
      [waveId]
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get wave from database
   */
  private async getWave(waveId: string, client: PoolClient): Promise<Wave | null> {
    const result = await client.query('SELECT * FROM waves WHERE wave_id = $1', [waveId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      waveId: row.wave_id,
      name: row.name,
      status: row.status,
      criteria: row.criteria,
      orderIds: row.order_ids,
      pickTasks: row.pick_tasks || [],
      assignedPickers: row.assigned_pickers,
      estimatedTime: row.estimated_time,
      estimatedDistance: row.estimated_distance,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      createdBy: row.created_by,
    };
  }

  /**
   * Save wave to database
   */
  private async saveWave(wave: Wave, client: PoolClient): Promise<void> {
    await client.query(
      `
      INSERT INTO waves (
        wave_id,
        name,
        status,
        criteria,
        order_ids,
        pick_tasks,
        assigned_pickers,
        estimated_time,
        estimated_distance,
        created_at,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        wave.waveId,
        wave.name,
        wave.status,
        JSON.stringify(wave.criteria),
        wave.orderIds,
        JSON.stringify(wave.pickTasks),
        wave.assignedPickers,
        wave.estimatedTime,
        wave.estimatedDistance,
        wave.createdAt,
        wave.createdBy,
      ]
    );

    // Create wave_pick_tasks records
    for (const task of wave.pickTasks) {
      await client.query(
        `
        INSERT INTO wave_pick_tasks (wave_id, task_id, sequence)
        VALUES ($1, $2, $3)
        `,
        [wave.waveId, task.taskId, task.sequence]
      );
    }
  }

  /**
   * Update wave in database
   */
  private async updateWave(wave: Wave, client: PoolClient): Promise<void> {
    await client.query(
      `
      UPDATE waves
      SET
        status = $2,
        started_at = $3,
        completed_at = $4
      WHERE wave_id = $1
      `,
      [wave.waveId, wave.status, wave.startedAt, wave.completedAt]
    );
  }

  /**
   * Generate a unique wave ID
   */
  private generateWaveId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `WAVE-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate a human-readable wave name
   */
  private generateWaveName(criteria: WaveCriteria, date: Date): string {
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const strategy = criteria.strategy.replace('_', ' ').toLowerCase();
    return `${strategy} wave - ${time}`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const wavePickingService = new WavePickingService();

export default wavePickingService;
