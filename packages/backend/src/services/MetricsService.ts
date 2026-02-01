/**
 * Metrics service
 *
 * Provides dashboard metrics and real-time statistics
 *
 * FIXED: Now properly fetches current_view from database
 */

import { DashboardMetricsResponse } from '@opsui/shared';
import { query } from '../db/client';
import { logger } from '../config/logger';

// ============================================================================
// METRICS SERVICE
// ============================================================================

export class MetricsService {
  // --------------------------------------------------------------------------
  // GET DASHBOARD METRICS
  // --------------------------------------------------------------------------

  async getDashboardMetrics(): Promise<DashboardMetricsResponse> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Active staff - count pickers and packers who are currently active (active = true)
    // This matches the logic in getPickerActivity for determining ACTIVE/PICKING status
    const activeStaffResult = await query(
      `SELECT COUNT(DISTINCT u.user_id) as count
       FROM users u
       WHERE u.active = true
         AND u.role IN ('PICKER', 'PACKER')
         AND u.current_view IS NOT NULL`
    );

    const activeStaff = parseInt(activeStaffResult.rows[0].count, 10);
    const activePickers = activeStaff; // Keep for backward compatibility

    // Orders shipped per hour (last hour)
    const ordersPerHourResult = await query(
      `SELECT COUNT(*) as count
       FROM orders
       WHERE status = 'SHIPPED'
         AND shipped_at >= NOW() - INTERVAL '1 hour'`
    );

    const ordersPickedPerHour = parseInt(ordersPerHourResult.rows[0].count, 10);

    // Queue depth (orders waiting to be picked)
    const queueDepthResult = await query(
      `SELECT COUNT(*) as count
       FROM orders
       WHERE status IN ('PENDING', 'PICKING')`
    );

    const queueDepth = parseInt(queueDepthResult.rows[0].count, 10);

    // Exceptions (skipped items, cancelled orders)
    const exceptionsResult = await query(
      `SELECT COUNT(*) as count
       FROM pick_tasks
       WHERE status = 'SKIPPED'
         AND skipped_at >= NOW() - INTERVAL '24 hours'`
    );

    const exceptions = parseInt(exceptionsResult.rows[0].count, 10);

    // Throughput - today (count SHIPPED orders - completed shipping)
    const todayResult = await query(
      `SELECT COUNT(*) as count
       FROM orders
       WHERE status = 'SHIPPED'
         AND updated_at >= $1`,
      [startOfDay]
    );

    const today = parseInt(todayResult.rows[0].count, 10);

    // Throughput - this week (count SHIPPED orders - completed shipping)
    const weekResult = await query(
      `SELECT COUNT(*) as count
       FROM orders
       WHERE status = 'SHIPPED'
         AND updated_at >= $1`,
      [startOfWeek]
    );

    const week = parseInt(weekResult.rows[0].count, 10);

    // Throughput - this month (count SHIPPED orders - completed shipping)
    const monthResult = await query(
      `SELECT COUNT(*) as count
       FROM orders
       WHERE status = 'SHIPPED'
         AND updated_at >= $1`,
      [startOfMonth]
    );

    const month = parseInt(monthResult.rows[0].count, 10);

    return {
      activePickers,
      ordersPickedPerHour,
      queueDepth,
      exceptions,
      throughput: {
        today,
        week,
        month,
      },
    };
  }

  // --------------------------------------------------------------------------
  // GET PICKER PERFORMANCE
  // --------------------------------------------------------------------------

  async getPickerPerformance(
    pickerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    tasksCompleted: number;
    tasksTotal: number;
    averageTimePerTask: number;
    totalItemsPicked: number;
    ordersCompleted: number;
  }> {
    const result = await query(
      `SELECT
         COUNT(*) FILTER (WHERE pt.status = 'COMPLETED') as tasks_completed,
         COUNT(*) as tasks_total,
         COALESCE(AVG(EXTRACT(EPOCH FROM (pt.completed_at - pt.started_at))), 0) as avg_time,
         COALESCE(SUM(pt.picked_quantity) FILTER (WHERE pt.status = 'COMPLETED'), 0) as total_picked,
         COUNT(DISTINCT o.order_id) FILTER (WHERE o.status = 'SHIPPED') as orders_completed
       FROM pick_tasks pt
       INNER JOIN orders o ON pt.order_id = o.order_id
       WHERE pt.picker_id = $1
         AND pt.started_at >= $2
         AND pt.started_at <= $3`,
      [pickerId, startDate, endDate]
    );

    const row = result.rows[0];

    return {
      tasksCompleted: parseInt(row.tasks_completed, 10),
      tasksTotal: parseInt(row.tasks_total, 10),
      averageTimePerTask: parseFloat(row.avg_time),
      totalItemsPicked: parseInt(row.total_picked, 10),
      ordersCompleted: parseInt(row.orders_completed, 10),
    };
  }

  // --------------------------------------------------------------------------
  // GET ALL PICKERS PERFORMANCE
  // --------------------------------------------------------------------------

  async getAllPickersPerformance(
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      pickerId: string;
      pickerName: string;
      tasksCompleted: number;
      ordersCompleted: number;
      totalItemsPicked: number;
      averageTimePerTask: number;
    }>
  > {
    logger.info('getAllPickersPerformance called with dates', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startDateValid: !isNaN(startDate.getTime()),
      endDateValid: !isNaN(endDate.getTime()),
    });

    const result = await query(
      `SELECT
         u.user_id as picker_id,
         u.name as picker_name,
         COUNT(*) FILTER (WHERE pt.status = 'COMPLETED') as tasks_completed,
         COUNT(DISTINCT o.order_id) FILTER (WHERE o.status IN ('PICKED', 'PACKING', 'PACKED', 'SHIPPED')) as orders_completed,
         COALESCE(SUM(pt.picked_quantity) FILTER (WHERE pt.status = 'COMPLETED'), 0) as total_picked,
         COALESCE(AVG(EXTRACT(EPOCH FROM (pt.completed_at - pt.started_at))), 0) as avg_time
       FROM users u
       INNER JOIN pick_tasks pt ON u.user_id = pt.picker_id
       INNER JOIN orders o ON pt.order_id = o.order_id
       WHERE pt.started_at >= $1 AND pt.started_at <= $2
       GROUP BY u.user_id, u.name
       ORDER BY tasks_completed DESC`,
      [startDate, endDate]
    );

    logger.info('getAllPickersPerformance query result', {
      rowCount: result.rowCount,
      rows: result.rows,
    });

    return result.rows.map(row => ({
      pickerId: row.pickerId,
      pickerName: row.pickerName,
      tasksCompleted: parseInt(row.tasksCompleted, 10),
      ordersCompleted: parseInt(row.ordersCompleted, 10),
      totalItemsPicked: parseInt(row.totalPicked, 10),
      averageTimePerTask: parseFloat(row.avgTime),
    }));
  }

  // --------------------------------------------------------------------------
  // GET ALL PACKERS PERFORMANCE
  // --------------------------------------------------------------------------

  async getAllPackersPerformance(
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      packerId: string;
      packerName: string;
      tasksCompleted: number;
      ordersCompleted: number;
      totalItemsProcessed: number;
      averageTimePerTask: number;
    }>
  > {
    logger.info('getAllPackersPerformance called with dates', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const result = await query(
      `SELECT
         u.user_id as packer_id,
         u.name as packer_name,
         COUNT(*) FILTER (WHERE pt.status = 'COMPLETED') as tasks_completed,
         COUNT(DISTINCT o.order_id) FILTER (WHERE o.status IN ('PACKED', 'SHIPPED')) as orders_completed,
         COALESCE(SUM(pt.packed_quantity) FILTER (WHERE pt.status = 'COMPLETED'), 0) as total_packed,
         COALESCE(AVG(EXTRACT(EPOCH FROM (pt.completed_at - pt.started_at))), 0) as avg_time
       FROM users u
       INNER JOIN pack_tasks pt ON u.user_id = pt.packer_id
       INNER JOIN orders o ON pt.order_id = o.order_id
       WHERE pt.started_at >= $1 AND pt.started_at <= $2
       GROUP BY u.user_id, u.name
       ORDER BY tasks_completed DESC`,
      [startDate, endDate]
    );

    logger.info('getAllPackersPerformance query result', {
      rowCount: result.rowCount,
    });

    return result.rows.map(row => ({
      packerId: row.packerId,
      packerName: row.packerName,
      tasksCompleted: parseInt(row.tasksCompleted, 10),
      ordersCompleted: parseInt(row.ordersCompleted, 10),
      totalItemsProcessed: parseInt(row.totalPacked, 10),
      averageTimePerTask: parseFloat(row.avgTime),
    }));
  }

  // --------------------------------------------------------------------------
  // GET ALL STOCK CONTROLLERS PERFORMANCE
  // --------------------------------------------------------------------------

  async getAllStockControllersPerformance(
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      controllerId: string;
      controllerName: string;
      tasksCompleted: number;
      transactionsCompleted: number;
      totalItemsProcessed: number;
      averageTimePerTask: number;
    }>
  > {
    logger.info('getAllStockControllersPerformance called with dates', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const result = await query(
      `SELECT
         u.user_id as controller_id,
         u.name as controller_name,
         COUNT(*) as transactions_completed,
         COALESCE(SUM(COALESCE(th.quantity_adjusted, 0) + COALESCE(th.quantity_received, 0)), 0) as total_processed,
         COALESCE(AVG(EXTRACT(EPOCH FROM (th.completed_at - th.started_at))), 0) as avg_time
       FROM users u
       INNER JOIN transaction_history th ON u.user_id = th.performed_by
       WHERE th.started_at >= $1 AND th.started_at <= $2
         AND th.completed_at IS NOT NULL
       GROUP BY u.user_id, u.name
       ORDER BY transactions_completed DESC`,
      [startDate, endDate]
    );

    logger.info('getAllStockControllersPerformance query result', {
      rowCount: result.rowCount,
    });

    return result.rows.map(row => ({
      controllerId: row.controllerId,
      controllerName: row.controllerName,
      tasksCompleted: parseInt(row.transactionsCompleted, 10),
      transactionsCompleted: parseInt(row.transactionsCompleted, 10),
      totalItemsProcessed: parseInt(row.totalProcessed, 10),
      averageTimePerTask: parseFloat(row.avgTime),
    }));
  }

  // --------------------------------------------------------------------------
  // GET PICKER ACTIVITY (real-time)
  // --------------------------------------------------------------------------

  async getPickerActivity(): Promise<
    Array<{
      pickerId: string;
      pickerName: string;
      currentOrderId: string | null;
      orderProgress: number;
      currentTask: string | null;
      lastViewedAt: Date | null;
      status: 'ACTIVE' | 'IDLE' | 'PICKING' | 'INACTIVE';
      currentView: string | null;
    }>
  > {
    // Step 1: Get ALL pickers (filter by role), not just active ones
    // The database client will map snake_case to camelCase automatically
    const activePickers = await query(`
      SELECT user_id, name, active
      FROM users
      WHERE role = 'PICKER'
      ORDER BY user_id
    `);

    // Log raw data to diagnose the issue
    logger.info('Active pickers found:', {
      count: activePickers.rows.length,
      pickers: activePickers.rows.map(r => ({ userId: r.userId, name: r.name })),
      pickerIds: activePickers.rows.map(r => r.userId),
      rowKeys: activePickers.rows.length > 0 ? Object.keys(activePickers.rows[0]) : [],
      rawRows: JSON.stringify(activePickers.rows, null, 2),
    });

    if (activePickers.rows.length === 0) {
      return [];
    }

    // Step 2: Build picker activity data - one entry per picker
    // Use camelCase property names from query
    const pickerIds = activePickers.rows.map(r => r.userId);
    const activityPromises = pickerIds.map(async pickerId => {
      // Get most recent PICKING order for this picker
      const activeOrder = await query(
        `
        SELECT order_id, status, progress, updated_at
        FROM orders
        WHERE picker_id = $1 AND status = 'PICKING'
        ORDER BY updated_at DESC
        LIMIT 1
      `,
        [pickerId]
      );

      // Get most recent ANY order for this picker (regardless of status)
      const recentOrder = await query(
        `
        SELECT order_id, status, progress, updated_at
        FROM orders
        WHERE picker_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `,
        [pickerId]
      );

      // Get all recent orders (last 5) for this picker to handle order switching
      const allRecentOrders = await query(
        `
        SELECT order_id, status, progress, updated_at
        FROM orders
        WHERE picker_id = $1
        ORDER BY updated_at DESC
        LIMIT 5
      `,
        [pickerId]
      );

      // Get most recent task for this picker
      const recentTask = await query(
        `
        SELECT pick_task_id, started_at, completed_at
        FROM pick_tasks
        WHERE picker_id = $1
        ORDER BY COALESCE(completed_at, started_at) DESC
        LIMIT 1
      `,
        [pickerId]
      );

      // Get user data including current_view, is_active, and last login
      // The database client will map snake_case to camelCase automatically
      const userResult = await query(
        `
        SELECT
          last_login_at,
          current_view,
          current_view_updated_at,
          active
        FROM users
        WHERE user_id = $1
      `,
        [pickerId]
      );

      return {
        pickerId,
        activeOrder: activeOrder.rows.length > 0 ? activeOrder.rows[0] : null,
        recentOrder: recentOrder.rows.length > 0 ? recentOrder.rows[0] : null,
        allRecentOrders: allRecentOrders.rows,
        recentTask: recentTask.rows.length > 0 ? recentTask.rows[0] : null,
        userData: userResult.rows.length > 0 ? userResult.rows[0] : null,
      };
    });

    const activityData = await Promise.all(activityPromises);

    // Step 3: Map to response format
    const result = activityData.map(data => {
      logger.info('Mapping picker:', {
        dataPickerId: data.pickerId,
        activePickersRows: activePickers.rows,
        foundPicker: activePickers.rows.find(p => p.user_id === data.pickerId),
      });

      let status: 'ACTIVE' | 'IDLE' | 'PICKING' | 'INACTIVE' = 'IDLE';
      let currentOrderId: string | null = null;
      let orderProgress: number = 0;
      let currentTask: string | null = null;
      let lastViewedAt: Date | null = null;

      // Find picker name from activePickers (using userId from quoted AS alias)
      const pickerInfo = activePickers.rows.find(p => p.userId === data.pickerId);

      // Use currentView and isActive to determine accurate status and page
      // Database client maps snake_case to camelCase automatically
      const currentView = data.userData?.currentView || null;
      const currentViewUpdated = data.userData?.currentViewUpdatedAt;
      const isActive = data.userData?.active !== false; // Default to true if undefined

      // Set lastViewedAt to current view update time if available
      if (currentViewUpdated) {
        lastViewedAt = new Date(currentViewUpdated);
      }

      // Determine if picker is on a picking page
      const isOnPickingPage =
        currentView &&
        (currentView.includes('Picking Order') ||
          currentView.includes('/pick/') ||
          (currentView.includes('/orders/') && currentView.includes('ORD-')));

      // Status determination logic
      // A picker is INACTIVE if their account active flag is false
      // A picker is ACTIVE/PICKING only if:
      // 1. is_active is true (tab is open/focused)
      // 2. AND they have a current_view (not NULL)
      const hasCurrentView = currentView !== null && currentView !== undefined;

      if (!isActive) {
        // User account is inactive (logged out/disabled)
        status = 'INACTIVE';
        currentOrderId = null;
        orderProgress = 0;
      } else if (hasCurrentView) {
        // Picker is active and viewing a page
        if (isOnPickingPage) {
          status = 'PICKING'; // Actively picking an order
        } else {
          status = 'ACTIVE'; // Active but not picking (e.g., on Order Queue)
        }
      } else {
        // Not active OR no current view - picker is IDLE (OUT OF WINDOW)
        status = 'IDLE';
        // Clear order info when IDLE - picker is not actively working
        currentOrderId = null;
        orderProgress = 0;
      }

      // Only extract order info if picker is ACTIVE or PICKING
      if (status !== 'IDLE') {
        // Extract order ID from current_view if it contains an order
        // Support both SO#### format and ORD-YYYYMMDD-#### format
        if (currentView && (currentView.includes('ORD-') || currentView.includes('SO'))) {
          const soMatch = currentView.match(/SO\d{4}/);
          const ordMatch = currentView.match(/ORD-\d{8}-\d{4}/);
          if (soMatch) {
            currentOrderId = soMatch[0];
          } else if (ordMatch) {
            currentOrderId = ordMatch[0];
          }
        }

        // Get order progress ONLY if we have a currentOrderId from the view
        // This ensures we only show progress when actively viewing a specific order
        if (currentOrderId && data.allRecentOrders && data.allRecentOrders.length > 0) {
          const foundOrder = data.allRecentOrders.find(order => order.orderId === currentOrderId);
          if (foundOrder) {
            orderProgress = foundOrder.progress || 0;
          }
        }
        // If no currentOrderId (e.g., on Order Queue), leave currentOrderId as null and progress as 0
      }

      return {
        pickerId: data.pickerId,
        pickerName: pickerInfo?.name || 'Unknown',
        currentOrderId: currentOrderId,
        orderProgress,
        currentTask,
        lastViewedAt,
        status,
        currentView,
      };
    });

    logger.info('Picker activity result:', {
      count: result.length,
      pickers: result,
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // GET ORDER STATUS BREAKDOWN
  // --------------------------------------------------------------------------

  async getOrderStatusBreakdown(): Promise<Array<{ status: string; count: number }>> {
    const result = await query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY
        CASE
          WHEN status = 'PENDING' THEN 0
          WHEN status = 'PICKING' THEN 1
          WHEN status = 'PICKED' THEN 2
          WHEN status = 'PACKING' THEN 3
          WHEN status = 'PACKED' THEN 4
          WHEN status = 'SHIPPED' THEN 5
          ELSE 6
        END
    `);

    return result.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count, 10),
    }));
  }

  // --------------------------------------------------------------------------
  // GET HOURLY THROUGHPUT
  // --------------------------------------------------------------------------

  async getHourlyThroughput(): Promise<Array<{ hour: string; picked: number; shipped: number }>> {
    const result = await query(`
      SELECT
        TO_CHAR(updated_at, 'YYYY-MM-DD HH24:00') as hour,
        COUNT(*) FILTER (WHERE status = 'PICKED') as picked,
        COUNT(*) FILTER (WHERE status = 'SHIPPED') as shipped
      FROM orders
      WHERE updated_at >= NOW() - INTERVAL '24 hours'
      GROUP BY TO_CHAR(updated_at, 'YYYY-MM-DD HH24:00')
      ORDER BY hour DESC
    `);

    return result.rows.map(row => ({
      hour: row.hour,
      picked: parseInt(row.picked || 0, 10),
      shipped: parseInt(row.shipped || 0, 10),
    }));
  }

  // --------------------------------------------------------------------------
  // GET THROUGHPUT BY TIME RANGE
  // --------------------------------------------------------------------------

  async getThroughputByRange(
    range: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  ): Promise<Array<{ period: string; picked: number; shipped: number }>> {
    let interval: string;
    let dateFormat: string;

    switch (range) {
      case 'daily':
        interval = '30 days';
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        interval = '90 days';
        dateFormat = 'IYYY-"W"IW'; // ISO week
        break;
      case 'monthly':
        interval = '12 months';
        dateFormat = 'YYYY-MM';
        break;
      case 'quarterly':
        interval = '24 months';
        dateFormat = 'YYYY-"Q"Q'; // Quarter
        break;
      case 'yearly':
        interval = '60 months';
        dateFormat = 'YYYY';
        break;
      default:
        interval = '30 days';
        dateFormat = 'YYYY-MM-DD';
    }

    const result = await query(`
      SELECT
        TO_CHAR(updated_at, '${dateFormat}') as period,
        COUNT(*) FILTER (WHERE status = 'PICKED') as picked,
        COUNT(*) FILTER (WHERE status = 'SHIPPED') as shipped
      FROM orders
      WHERE updated_at >= NOW() - INTERVAL '${interval}'
      GROUP BY TO_CHAR(updated_at, '${dateFormat}')
      ORDER BY period DESC
    `);

    return result.rows.map(row => ({
      period: row.period,
      picked: parseInt(row.picked || 0, 10),
      shipped: parseInt(row.shipped || 0, 10),
    }));
  }

  // --------------------------------------------------------------------------
  // GET TOP SKUS BY PICK FREQUENCY
  // --------------------------------------------------------------------------

  async getTopSKUsByPickFrequency(
    limit: number = 10
  ): Promise<Array<{ sku: string; name: string; picks: number }>> {
    const result = await query(
      `
      SELECT
        pt.sku,
        s.name,
        COUNT(*) as picks
      FROM pick_tasks pt
      INNER JOIN skus s ON pt.sku = s.sku
      WHERE pt.started_at >= NOW() - INTERVAL '30 days'
      GROUP BY pt.sku, s.name
      ORDER BY picks DESC
      LIMIT $1
    `,
      [limit]
    );

    return result.rows.map(row => ({
      sku: row.sku,
      name: row.name,
      picks: parseInt(row.picks, 10),
    }));
  }

  // --------------------------------------------------------------------------
  // GET TOP SKUS BY SCAN TYPE
  // --------------------------------------------------------------------------

  /**
   * Get the interval string for the given time period
   */
  private getTimePeriodInterval(timePeriod: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
    const intervals: Record<string, string> = {
      daily: '1 day',
      weekly: '7 days',
      monthly: '30 days',
      yearly: '365 days',
    };
    return intervals[timePeriod] || '30 days';
  }

  async getTopSKUsByScanType(
    scanType: 'pick' | 'pack' | 'verify' | 'all',
    limit: number = 10,
    timePeriod: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
  ): Promise<
    Array<{ sku: string; name: string; picks: number; scans?: number; packVerifies?: number }>
  > {
    const interval = this.getTimePeriodInterval(timePeriod);
    console.log(
      '[MetricsService] getTopSKUsByScanType - scanType:',
      scanType,
      'timePeriod:',
      timePeriod,
      'interval:',
      interval
    );

    if (scanType === 'pick') {
      // Pick frequency - count pick_tasks
      const result = await query(
        `
        SELECT
          pt.sku,
          s.name,
          COUNT(*) as picks
        FROM pick_tasks pt
        INNER JOIN skus s ON pt.sku = s.sku
        WHERE pt.started_at >= NOW() - INTERVAL '${interval}'
        GROUP BY pt.sku, s.name
        ORDER BY picks DESC
        LIMIT $1
        `,
        [limit]
      );

      return result.rows.map(row => ({
        sku: row.sku,
        name: row.name,
        picks: parseInt(row.picks, 10),
        scans: 0,
        packVerifies: 0,
      }));
    }

    if (scanType === 'pack') {
      // Pack verifies - count orders where status is PACKING or PACKED
      const result = await query(
        `
        SELECT
          oi.sku,
          s.name,
          COUNT(DISTINCT oi.order_id) as pack_verifies
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.order_id
        INNER JOIN skus s ON oi.sku = s.sku
        WHERE o.status IN ('PACKING', 'PACKED', 'SHIPPED')
          AND o.updated_at >= NOW() - INTERVAL '${interval}'
        GROUP BY oi.sku, s.name
        ORDER BY pack_verifies DESC
        LIMIT $1
        `,
        [limit]
      );

      return result.rows.map(row => ({
        sku: row.sku,
        name: row.name,
        picks: 0,
        scans: 0,
        packVerifies: parseInt(row.packVerifies, 10),
      }));
    }

    if (scanType === 'verify') {
      // Verify scans - sum of verified_quantity from order_items
      const result = await query(
        `
        SELECT
          oi.sku,
          s.name,
          COALESCE(SUM(oi.verified_quantity), 0) as scans
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.order_id
        INNER JOIN skus s ON oi.sku = s.sku
        WHERE oi.verified_quantity > 0
          AND o.updated_at >= NOW() - INTERVAL '${interval}'
        GROUP BY oi.sku, s.name
        ORDER BY scans DESC
        LIMIT $1
        `,
        [limit]
      );

      return result.rows.map(row => ({
        sku: row.sku,
        name: row.name,
        picks: 0,
        scans: parseInt(row.scans, 10),
        packVerifies: 0,
      }));
    }

    // 'all' - combine picks, verifies, and pack operations
    const result = await query(
      `
      SELECT
        COALESCE(pick_data.sku, verify_data.sku, pack_data.sku) as sku,
        COALESCE(pick_data.name, verify_data.name, pack_data.name) as name,
        COALESCE(pick_data.picks, 0) as picks,
        COALESCE(verify_data.scans, 0) as scans,
        COALESCE(pack_data.pack_verifies, 0) as pack_verifies,
        COALESCE(pick_data.picks, 0) + COALESCE(verify_data.scans, 0) + COALESCE(pack_data.pack_verifies, 0) as total
      FROM (
        SELECT pt.sku, s.name, COUNT(*) as picks
        FROM pick_tasks pt
        INNER JOIN skus s ON pt.sku = s.sku
        WHERE pt.started_at >= NOW() - INTERVAL '${interval}'
        GROUP BY pt.sku, s.name
      ) pick_data
      FULL OUTER JOIN (
        SELECT oi.sku, s.name, SUM(oi.verified_quantity) as scans
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.order_id
        INNER JOIN skus s ON oi.sku = s.sku
        WHERE oi.verified_quantity > 0
          AND o.updated_at >= NOW() - INTERVAL '${interval}'
        GROUP BY oi.sku, s.name
      ) verify_data ON pick_data.sku = verify_data.sku
      FULL OUTER JOIN (
        SELECT oi.sku, s.name, COUNT(DISTINCT oi.order_id) as pack_verifies
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.order_id
        INNER JOIN skus s ON oi.sku = s.sku
        WHERE o.status IN ('PACKING', 'PACKED', 'SHIPPED')
          AND o.updated_at >= NOW() - INTERVAL '${interval}'
        GROUP BY oi.sku, s.name
      ) pack_data ON pick_data.sku = pack_data.sku
      ORDER BY total DESC
      LIMIT $1
      `,
      [limit]
    );

    return result.rows.map(row => ({
      sku: row.sku,
      name: row.name,
      picks: parseInt(row.picks, 10),
      scans: parseInt(row.scans, 10),
      packVerifies: parseInt(row.packVerifies, 10),
    }));
  }

  // --------------------------------------------------------------------------
  // GET PICKER ORDERS
  // --------------------------------------------------------------------------

  async getPickerOrders(pickerId: string): Promise<
    Array<{
      orderId: string;
      status: string;
      progress: number;
      customerName: string;
      priority: string;
      itemCount: number;
      items: Array<{
        sku: string;
        name: string;
        quantity: number;
        pickedQuantity: number;
        binLocation: string;
        status: string;
      }>;
    }>
  > {
    // Get orders for this picker
    const ordersResult = await query(
      `
      SELECT
        o.order_id,
        o.status,
        COALESCE(o.progress, 0) as progress,
        o.customer_name,
        o.priority,
        COALESCE(COUNT(pt.pick_task_id), 0) as item_count
      FROM orders o
      LEFT JOIN pick_tasks pt ON o.order_id = pt.order_id
      WHERE o.picker_id = $1
      GROUP BY o.order_id, o.status, o.progress, o.customer_name, o.priority
      ORDER BY
        CASE
          WHEN o.status = 'PICKING' THEN 0
          WHEN o.status = 'PENDING' THEN 1
          WHEN o.status = 'PICKED' THEN 2
          WHEN o.status = 'SHIPPED' THEN 3
          ELSE 4
        END,
        o.updated_at DESC
    `,
      [pickerId]
    );

    const orders = ordersResult.rows.map(row => ({
      orderId: row.orderId,
      status: row.status,
      progress: parseInt(row.progress || 0, 10),
      customerName: row.customerName,
      priority: row.priority,
      itemCount: parseInt(row.itemCount || 0, 10),
      items: [] as any[],
    }));

    // Get order items for each order
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.orderId);

      const itemsResult = await query(
        `
        SELECT
          oi.order_id,
          oi.sku,
          oi.name,
          oi.quantity,
          oi.picked_quantity,
          oi.bin_location,
          oi.status
        FROM order_items oi
        WHERE oi.order_id = ANY($1)
        ORDER BY oi.order_id, oi.order_item_id
      `,
        [orderIds]
      );

      // Group items by order and calculate status dynamically
      const itemsByOrder: Record<string, any[]> = {};
      for (const item of itemsResult.rows) {
        if (!itemsByOrder[item.orderId]) {
          itemsByOrder[item.orderId] = [];
        }

        const quantity = parseInt(item.quantity, 10);
        const pickedQuantity = parseInt(item.pickedQuantity || 0, 10);

        // Calculate item status dynamically based on picked quantity
        let calculatedStatus = 'PENDING';
        if (pickedQuantity >= quantity) {
          calculatedStatus = 'FULLY_PICKED';
        } else if (pickedQuantity > 0) {
          calculatedStatus = 'PARTIAL_PICKED';
        }

        itemsByOrder[item.orderId].push({
          sku: item.sku,
          name: item.name,
          quantity: quantity,
          pickedQuantity: pickedQuantity,
          binLocation: item.binLocation,
          status: calculatedStatus, // Use dynamically calculated status
        });
      }

      // Attach items to orders
      for (const order of orders) {
        order.items = itemsByOrder[order.orderId] || [];
      }
    }

    return orders;
  }

  // --------------------------------------------------------------------------
  // GET PACKER ACTIVITY (real-time)
  // --------------------------------------------------------------------------

  async getPackerActivity(): Promise<
    Array<{
      packerId: string;
      packerName: string;
      currentOrderId: string | null;
      orderProgress: number;
      currentTask: string | null;
      lastViewedAt: Date | null;
      status: 'ACTIVE' | 'IDLE' | 'PACKING' | 'INACTIVE';
      currentView: string | null;
    }>
  > {
    // Step 1: Get ALL packers (filter by role), not just active ones
    // The database client will map snake_case to camelCase automatically
    const activePackers = await query(`
      SELECT user_id, name, active
      FROM users
      WHERE role = 'PACKER'
      ORDER BY user_id
    `);

    logger.info('Active packers found:', {
      count: activePackers.rows.length,
      packers: activePackers.rows.map(r => ({ userId: r.userId, name: r.name })),
    });

    if (activePackers.rows.length === 0) {
      return [];
    }

    // Step 2: Build packer activity data - one entry per packer
    const packerIds = activePackers.rows.map(r => r.userId);
    const activityPromises = packerIds.map(async packerId => {
      // Get most recent PACKING order for this packer
      const activeOrder = await query(
        `
        SELECT order_id, status, progress, updated_at
        FROM orders
        WHERE packer_id = $1 AND status = 'PACKING'
        ORDER BY updated_at DESC
        LIMIT 1
      `,
        [packerId]
      );

      // Get most recent ANY order for this packer (regardless of status)
      const recentOrder = await query(
        `
        SELECT order_id, status, progress, updated_at
        FROM orders
        WHERE packer_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `,
        [packerId]
      );

      // Get all recent orders (last 5) for this packer to handle order switching
      const allRecentOrders = await query(
        `
        SELECT order_id, status, progress, updated_at
        FROM orders
        WHERE packer_id = $1
        ORDER BY updated_at DESC
        LIMIT 5
      `,
        [packerId]
      );

      // Get user data including current_view and last login
      // The database client will map snake_case to camelCase automatically
      const userResult = await query(
        `
        SELECT
          last_login_at,
          current_view,
          current_view_updated_at,
          active
        FROM users
        WHERE user_id = $1
      `,
        [packerId]
      );

      return {
        packerId,
        activeOrder: activeOrder.rows.length > 0 ? activeOrder.rows[0] : null,
        recentOrder: recentOrder.rows.length > 0 ? recentOrder.rows[0] : null,
        allRecentOrders: allRecentOrders.rows,
        userData: userResult.rows.length > 0 ? userResult.rows[0] : null,
      };
    });

    const activityData = await Promise.all(activityPromises);

    // Step 3: Map to response format
    const result = activityData.map(data => {
      let status: 'ACTIVE' | 'IDLE' | 'PACKING' | 'INACTIVE' = 'IDLE';
      let currentOrderId: string | null = null;
      let orderProgress: number = 0;
      let currentTask: string | null = null;
      let lastViewedAt: Date | null = null;

      // Find packer name from activePackers
      const packerInfo = activePackers.rows.find(p => p.userId === data.packerId);

      // Use currentView and isActive to determine accurate status and page
      // Database client maps snake_case to camelCase automatically
      const currentView = data.userData?.currentView || null;
      const currentViewUpdated = data.userData?.currentViewUpdatedAt;
      const isActive = data.userData?.active !== false; // Default to true if undefined

      // Set lastViewedAt to current view update time if available
      if (currentViewUpdated) {
        lastViewedAt = new Date(currentViewUpdated);
      }

      // Determine if packer is on a packing page
      const isOnPackingPage =
        currentView &&
        (currentView.includes('Packing Order') ||
          currentView.includes('/pack/') ||
          (currentView.includes('/orders/') && currentView.includes('ORD-')));

      // Status determination logic
      // A packer is INACTIVE if their account active flag is false
      // A packer is ACTIVE/PACKING only if:
      // 1. is_active is true (tab is open/focused)
      // 2. AND they have a current_view (not NULL)
      const hasCurrentView = currentView !== null && currentView !== undefined;

      if (!isActive) {
        // User account is inactive (logged out/disabled)
        status = 'INACTIVE';
        currentOrderId = null;
        orderProgress = 0;
      } else if (hasCurrentView) {
        if (isOnPackingPage) {
          status = 'PACKING';
        } else {
          status = 'ACTIVE';
        }
      } else {
        status = 'IDLE';
        currentOrderId = null;
        orderProgress = 0;
      }

      // Only extract order info if packer is ACTIVE or PACKING
      if (status !== 'IDLE') {
        // Extract order ID from current_view if it contains an order
        // Support both SO#### format and ORD-YYYYMMDD-#### format
        if (currentView && (currentView.includes('ORD-') || currentView.includes('SO'))) {
          const soMatch = currentView.match(/SO\d{4}/);
          const ordMatch = currentView.match(/ORD-\d{8}-\d{4}/);
          if (soMatch) {
            currentOrderId = soMatch[0];
          } else if (ordMatch) {
            currentOrderId = ordMatch[0];
          }
        }

        // Get order progress ONLY if we have a currentOrderId from the view
        if (currentOrderId && data.allRecentOrders && data.allRecentOrders.length > 0) {
          const foundOrder = data.allRecentOrders.find(order => order.orderId === currentOrderId);
          if (foundOrder) {
            orderProgress = foundOrder.progress || 0;
          }
        }
      }

      return {
        packerId: data.packerId,
        packerName: packerInfo?.name || 'Unknown',
        currentOrderId,
        orderProgress,
        currentTask,
        lastViewedAt,
        status,
        currentView,
      };
    });

    logger.info('Packer activity result:', {
      count: result.length,
      packers: result,
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // GET PACKER ORDERS
  // --------------------------------------------------------------------------

  async getPackerOrders(packerId: string): Promise<
    Array<{
      orderId: string;
      status: string;
      progress: number;
      customerName: string;
      priority: string;
      itemCount: number;
    }>
  > {
    // Query: Get orders for a packer - includes:
    // 1. Orders assigned to THIS packer (any status - show their actual status)
    // 2. Orders in queue NOT yet assigned to any packer (status = PICKED AND packer_id IS NULL)
    const result = await query(
      `
      SELECT
        o.order_id,
        o.status,
        COALESCE(o.progress, 0) as progress,
        o.customer_name,
        o.priority,
        COALESCE(COUNT(pt.pick_task_id), 0) as item_count
      FROM orders o
      LEFT JOIN pick_tasks pt ON o.order_id = pt.order_id
      WHERE (o.packer_id = $1 OR (o.status = 'PICKED' AND o.packer_id IS NULL))
      GROUP BY o.order_id, o.status, o.progress, o.customer_name, o.priority
      ORDER BY
        CASE
          WHEN o.status = 'PACKING' THEN 0
          WHEN o.status = 'PICKED' THEN 1
          WHEN o.status = 'PACKED' THEN 2
          WHEN o.status = 'SHIPPED' THEN 3
          ELSE 4
        END,
        o.updated_at DESC
    `,
      [packerId]
    );

    const orders = result.rows.map(row => ({
      orderId: row.orderId,
      status: row.status,
      progress: parseInt(row.progress || 0, 10),
      customerName: row.customerName,
      priority: row.priority,
      itemCount: parseInt(row.itemCount || 0, 10),
    }));

    logger.info('Packer orders returned:', {
      packerId,
      count: orders.length,
      orders: orders.map(o => ({ orderId: o.orderId, status: o.status })),
    });

    return orders;
  }

  // --------------------------------------------------------------------------
  // GET STOCK CONTROLLER ACTIVITY (real-time)
  // --------------------------------------------------------------------------

  async getStockControllerActivity(): Promise<
    Array<{
      controllerId: string;
      controllerName: string;
      lastViewedAt: Date | null;
      status: 'ACTIVE' | 'IDLE' | 'INACTIVE';
      currentView: string | null;
    }>
  > {
    // Step 1: Get ALL stock controllers (filter by role), not just active ones
    // The database client will map snake_case to camelCase automatically
    const activeControllers = await query(`
      SELECT user_id, name, active
      FROM users
      WHERE role = 'STOCK_CONTROLLER'
      ORDER BY user_id
    `);

    logger.info('Active stock controllers found:', {
      count: activeControllers.rows.length,
      controllers: activeControllers.rows.map(r => ({ userId: r.userId, name: r.name })),
    });

    if (activeControllers.rows.length === 0) {
      return [];
    }

    // Step 2: Build stock controller activity data - one entry per controller
    const controllerIds = activeControllers.rows.map(r => r.userId);
    const activityPromises = controllerIds.map(async controllerId => {
      // Get user data including current_view and last login
      // The database client will map snake_case to camelCase automatically
      const userResult = await query(
        `
        SELECT
          last_login_at,
          current_view,
          current_view_updated_at,
          active
        FROM users
        WHERE user_id = $1
      `,
        [controllerId]
      );

      return {
        controllerId,
        userData: userResult.rows.length > 0 ? userResult.rows[0] : null,
      };
    });

    const activityData = await Promise.all(activityPromises);

    // Step 3: Map to response format
    const result = activityData.map(data => {
      let status: 'ACTIVE' | 'IDLE' | 'INACTIVE' = 'IDLE';
      let lastViewedAt: Date | null = null;

      // Find controller name from activeControllers
      const controllerInfo = activeControllers.rows.find(p => p.userId === data.controllerId);

      // Use currentView and isActive to determine accurate status and page
      // Database client maps snake_case to camelCase automatically
      const currentView = data.userData?.currentView || null;
      const currentViewUpdated = data.userData?.currentViewUpdatedAt;
      const isActive = data.userData?.active !== false; // Default to true if undefined

      // Set lastViewedAt to current view update time if available
      if (currentViewUpdated) {
        lastViewedAt = new Date(currentViewUpdated);
      }

      // Status determination logic
      // A stock controller is INACTIVE if their account active flag is false
      // A stock controller is ACTIVE only if:
      // 1. is_active is true (tab is open/focused)
      // 2. AND they have a current_view (not NULL)
      const hasCurrentView = currentView !== null && currentView !== undefined;

      if (!isActive) {
        status = 'INACTIVE';
      } else if (hasCurrentView) {
        status = 'ACTIVE';
      } else {
        status = 'IDLE';
      }

      return {
        controllerId: data.controllerId,
        controllerName: controllerInfo?.name || 'Unknown',
        lastViewedAt,
        status,
        currentView,
      };
    });

    logger.info('Stock controller activity result:', {
      count: result.length,
      controllers: result,
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // GET STOCK CONTROLLER TRANSACTIONS
  // --------------------------------------------------------------------------

  async getStockControllerTransactions(
    controllerId: string,
    limit: number = 50
  ): Promise<
    Array<{
      transactionId: string;
      sku: string;
      binLocation: string;
      type: string;
      quantityChange: number;
      reason: string;
      createdAt: Date;
    }>
  > {
    const result = await query(
      `
      SELECT
        t.transaction_id AS "transactionId",
        t.sku,
        t.bin_location AS "binLocation",
        t.type,
        t.quantity_change AS "quantityChange",
        t.reason,
        t.created_at AS "createdAt"
      FROM inventory_transactions t
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2
    `,
      [controllerId, limit]
    );

    return result.rows.map(row => ({
      transactionId: row.transactionId,
      sku: row.sku,
      binLocation: row.binLocation,
      type: row.type,
      quantityChange: parseInt(row.quantityChange, 10),
      reason: row.reason,
      createdAt: new Date(row.createdAt),
    }));
  }
}

// Singleton instance
export const metricsService = new MetricsService();
