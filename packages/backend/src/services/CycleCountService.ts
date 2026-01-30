/**
 * Cycle Count Service
 *
 * Handles scheduled and ad-hoc cycle counting for inventory accuracy
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';
import {
  CycleCountPlan,
  CycleCountEntry,
  CycleCountTolerance,
  CreateCycleCountPlanDTO,
  CreateCycleCountEntryDTO,
  UpdateVarianceStatusDTO,
  ReconcileCycleCountDTO,
  CycleCountStatus,
  CycleCountType,
  VarianceStatus,
  TransactionType,
  OrderStatus,
} from '@opsui/shared';
import { notifyAll, NotificationType, NotificationPriority } from './NotificationHelper';

// ============================================================================
// CYCLE COUNT SERVICE
// ============================================================================

export class CycleCountService {
  // ==========================================================================
  // BULK OPERATIONS & ENHANCEMENTS
  // ==========================================================================

  /**
   * Bulk update variance status for all pending variances in a plan
   */
  async bulkUpdateVarianceStatus(dto: {
    planId: string;
    status: VarianceStatus;
    reviewedBy: string;
    notes?: string;
    autoApproveZeroVariance?: boolean;
  }): Promise<{ updated: number; skipped: number; adjustments: any[] }> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Get all entries with pending variances
      const entriesResult = await client.query(
        `SELECT * FROM cycle_count_entries
         WHERE plan_id = $1 AND variance_status = $2`,
        [dto.planId, VarianceStatus.PENDING]
      );

      let updated = 0;
      let skipped = 0;
      const adjustments: any[] = [];

      for (const entry of entriesResult.rows) {
        // Skip zero variance entries unless autoApproveZeroVariance is true
        if (entry.variance === 0 && !dto.autoApproveZeroVariance) {
          skipped++;
          continue;
        }

        // Process variance
        if (dto.status === VarianceStatus.APPROVED && entry.variance !== 0) {
          const transactionId = await this.processVarianceAdjustment(
            entry.entry_id,
            dto.status,
            dto.reviewedBy,
            dto.notes
          );

          // Update entry with transaction ID
          await client.query(
            `UPDATE cycle_count_entries
             SET variance_status = $1,
                 reviewed_by = $2,
                 reviewed_at = NOW(),
                 adjustment_transaction_id = $3,
                 notes = COALESCE($4, notes)
             WHERE entry_id = $5`,
            [dto.status, dto.reviewedBy, transactionId, dto.notes, entry.entry_id]
          );

          if (transactionId) {
            adjustments.push({
              entryId: entry.entry_id,
              sku: entry.sku,
              binLocation: entry.bin_location,
              variance: entry.variance,
              transactionId,
            });
          }
        } else {
          // Just update status for rejected or zero-variance entries
          await client.query(
            `UPDATE cycle_count_entries
             SET variance_status = $1,
                 reviewed_by = $2,
                 reviewed_at = NOW(),
                 notes = COALESCE($3, notes)
             WHERE entry_id = $4`,
            [dto.status, dto.reviewedBy, dto.notes, entry.entry_id]
          );
        }

        updated++;
      }

      await client.query('COMMIT');

      logger.info('Bulk variance status updated', {
        planId: dto.planId,
        status: dto.status,
        updated,
        skipped,
      });

      return { updated, skipped, adjustments };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error bulk updating variance status', error);
      throw error;
    }
  }

  /**
   * Get reconcile summary - shows what inventory adjustments will be made
   */
  async getReconcileSummary(planId: string): Promise<{
    pendingVarianceCount: number;
    totalAdjustmentValue: number;
    skusToAdjust: Array<{
      sku: string;
      binLocation: string;
      systemQuantity: number;
      countedQuantity: number;
      variance: number;
      variancePercent: number;
    }>;
    zeroVarianceEntries: number;
  }> {
    const client = await getPool();

    const result = await client.query(
      `SELECT sku, bin_location, system_quantity, counted_quantity,
              variance, variance_percent
       FROM cycle_count_entries
       WHERE plan_id = $1 AND variance_status = $2
       ORDER BY ABS(variance) DESC`,
      [planId, VarianceStatus.PENDING]
    );

    const entries = result.rows.map(row => ({
      sku: row.sku,
      binLocation: row.bin_location,
      systemQuantity: parseFloat(row.system_quantity),
      countedQuantity: parseFloat(row.counted_quantity),
      variance: parseFloat(row.variance),
      variancePercent: parseFloat(row.variance_percent || 0),
    }));

    const zeroVarianceEntries = entries.filter(e => e.variance === 0).length;
    const entriesWithVariance = entries.filter(e => e.variance !== 0);
    const totalAdjustmentValue = entriesWithVariance.reduce(
      (sum, e) => sum + Math.abs(e.variance),
      0
    );

    return {
      pendingVarianceCount: entriesWithVariance.length,
      totalAdjustmentValue,
      skusToAdjust: entriesWithVariance,
      zeroVarianceEntries,
    };
  }

  /**
   * Cancel a cycle count plan (only SCHEDULED or IN_PROGRESS)
   */
  async cancelCycleCountPlan(dto: {
    planId: string;
    cancelledBy: string;
    reason?: string;
  }): Promise<CycleCountPlan> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Get plan to check status
      const planResult = await client.query(`SELECT * FROM cycle_count_plans WHERE plan_id = $1`, [
        dto.planId,
      ]);

      if (planResult.rows.length === 0) {
        throw new Error(`Cycle count plan ${dto.planId} not found`);
      }

      const plan = planResult.rows[0];

      if (
        plan.status === CycleCountStatus.COMPLETED ||
        plan.status === CycleCountStatus.RECONCILED
      ) {
        throw new Error(`Cannot cancel a ${plan.status} cycle count`);
      }

      // Update plan status
      await client.query(
        `UPDATE cycle_count_plans
         SET status = $1,
             notes = COALESCE(notes || '', '') || $2,
             updated_at = NOW()
         WHERE plan_id = $3`,
        [CycleCountStatus.CANCELLED, `Cancelled: ${dto.reason || 'No reason provided'}`, dto.planId]
      );

      await client.query('COMMIT');

      logger.info('Cycle count plan cancelled', {
        planId: dto.planId,
        cancelledBy: dto.cancelledBy,
        reason: dto.reason,
      });

      return await this.getCycleCountPlan(dto.planId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error cancelling cycle count plan', error);
      throw error;
    }
  }

  /**
   * Check for collisions - other active counts in the same location
   */
  async checkForCollisions(planId: string): Promise<{
    hasCollisions: boolean;
    collidingCounts: Array<{
      planId: string;
      planName: string;
      location: string;
      status: string;
      assignedTo: string;
    }>;
  }> {
    const client = await getPool();

    // Get the current plan
    const planResult = await client.query(`SELECT * FROM cycle_count_plans WHERE plan_id = $1`, [
      planId,
    ]);

    if (planResult.rows.length === 0) {
      throw new Error(`Cycle count plan ${planId} not found`);
    }

    const plan = planResult.rows[0];

    // If no location specified, no collision possible
    if (!plan.location) {
      return { hasCollisions: false, collidingCounts: [] };
    }

    // Find other active counts in the same location
    const collisionResult = await client.query(
      `SELECT ccp.plan_id, ccp.plan_name, ccp.location, ccp.status, ccp.count_by, u.name as assigned_to_name
       FROM cycle_count_plans ccp
       LEFT JOIN users u ON ccp.count_by = u.user_id
       WHERE ccp.location = $1
         AND ccp.plan_id != $2
         AND ccp.status IN ($3, $4)`,
      [plan.location, planId, CycleCountStatus.SCHEDULED, CycleCountStatus.IN_PROGRESS]
    );

    const collidingCounts = collisionResult.rows.map(row => ({
      planId: row.plan_id,
      planName: row.plan_name,
      location: row.location,
      status: row.status,
      assignedTo: row.assigned_to_name || row.count_by,
    }));

    return {
      hasCollisions: collidingCounts.length > 0,
      collidingCounts,
    };
  }

  /**
   * Export cycle count data as CSV
   */
  async exportCycleCountData(planId: string): Promise<string> {
    const client = await getPool();

    // Verify plan exists
    const planResult = await client.query(
      `SELECT plan_id FROM cycle_count_plans WHERE plan_id = $1`,
      [planId]
    );

    if (planResult.rows.length === 0) {
      throw new Error(`Cycle count plan ${planId} not found`);
    }

    // Get all entries
    const entriesResult = await client.query(
      `SELECT cce.sku, cce.bin_location, cce.system_quantity, cce.counted_quantity,
              cce.variance, cce.variance_percent, cce.variance_status,
              cce.counted_at, cce.counted_by, cce.reviewed_at, cce.reviewed_by,
              cce.notes, u1.name as counter_name, u2.name as reviewer_name
       FROM cycle_count_entries cce
       LEFT JOIN users u1 ON cce.counted_by = u1.user_id
       LEFT JOIN users u2 ON cce.reviewed_by = u2.user_id
       WHERE cce.plan_id = $1
       ORDER BY cce.sku, cce.bin_location`,
      [planId]
    );

    // Build CSV
    const headers = [
      'SKU',
      'Bin Location',
      'System Quantity',
      'Counted Quantity',
      'Variance',
      'Variance %',
      'Status',
      'Counted At',
      'Counted By',
      'Reviewed At',
      'Reviewed By',
      'Notes',
    ];

    const rows = entriesResult.rows.map(row => [
      row.sku,
      row.bin_location,
      row.system_quantity,
      row.counted_quantity,
      row.variance,
      row.variance_percent ? `${row.variance_percent}%` : '',
      row.variance_status,
      row.counted_at ? new Date(row.counted_at).toISOString() : '',
      row.counter_name || row.counted_by,
      row.reviewed_at ? new Date(row.reviewed_at).toISOString() : '',
      row.reviewer_name || row.reviewed_by,
      row.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Get audit log for a cycle count plan
   */
  async getCycleCountAuditLog(planId: string): Promise<
    Array<{
      timestamp: Date;
      action: string;
      userId: string;
      userName: string;
      details: any;
    }>
  > {
    const client = await getPool();

    // Get audit logs for this plan
    const result = await client.query(
      `SELECT al.*, u.name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.user_id
       WHERE al.resource_type = 'cycle_count_plan'
         AND al.resource_id = $1
       ORDER BY al.occurred_at ASC`,
      [planId]
    );

    return result.rows.map(row => ({
      timestamp: new Date(row.occurred_at),
      action: row.action_description,
      userId: row.user_id,
      userName: row.user_name || row.user_email || row.user_id,
      details: {
        actionType: row.action_type,
        actionCategory: row.action_category,
        oldValues: row.old_values,
        newValues: row.new_values,
        changedFields: row.changed_fields,
        metadata: row.metadata,
      },
    }));
  }

  // ==========================================================================
  // CYCLE COUNT PLAN METHODS
  // ==========================================================================

  /**
   * Create a new cycle count plan
   */
  async createCycleCountPlan(dto: CreateCycleCountPlanDTO): Promise<CycleCountPlan> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      const planId = `CCP-${nanoid(10)}`.toUpperCase();

      const result = await client.query(
        `INSERT INTO cycle_count_plans
          (plan_id, plan_name, count_type, scheduled_date, location, sku, count_by, created_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          planId,
          dto.planName,
          dto.countType,
          dto.scheduledDate,
          dto.location || null,
          dto.sku || null,
          dto.countBy,
          dto.createdBy,
          dto.notes || null,
        ]
      );

      await client.query('COMMIT');

      logger.info('Cycle count plan created', { planId, planName: dto.planName });
      return await this.getCycleCountPlan(planId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating cycle count plan', error);
      throw error;
    }
  }

  /**
   * Get cycle count plan by ID
   */
  async getCycleCountPlan(planId: string): Promise<CycleCountPlan> {
    const client = await getPool();

    const result = await client.query(
      `SELECT ccp.*, u.name as assigned_to_name
       FROM cycle_count_plans ccp
       LEFT JOIN users u ON ccp.count_by = u.user_id
       WHERE ccp.plan_id = $1`,
      [planId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Cycle count plan ${planId} not found`);
    }

    const plan = this.mapRowToCycleCountPlan(result.rows[0]);

    // Add assigned user name if available
    if (result.rows[0].assigned_to_name) {
      (plan as any).assignedToName = result.rows[0].assigned_to_name;
    }

    // Get count entries
    const entriesResult = await client.query(
      `SELECT * FROM cycle_count_entries WHERE plan_id = $1 ORDER BY counted_at ASC`,
      [planId]
    );

    plan.countEntries = entriesResult.rows.map(row => this.mapRowToCycleCountEntry(row));

    return plan;
  }

  /**
   * Get all cycle count plans with optional filters
   * Access control:
   * - PICKER, PACKER: Can only see plans where count_by = their userId
   * - STOCK_CONTROLLER: Can see plans where count_by = their userId OR created_by = their userId
   * - SUPERVISOR, ADMIN: Can see all plans
   */
  async getAllCycleCountPlans(filters?: {
    status?: CycleCountStatus;
    countType?: CycleCountType;
    location?: string;
    countBy?: string;
    limit?: number;
    offset?: number;
    requestingUserRole?: string;
    requestingUserId?: string;
  }): Promise<{ plans: CycleCountPlan[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    // Apply role-based access control
    // Pickers, Packers: Can only see plans where count_by = their userId
    if (
      filters?.requestingUserRole &&
      (filters.requestingUserRole === 'PICKER' || filters.requestingUserRole === 'PACKER')
    ) {
      // Force filter to only show their assigned counts
      conditions.push(`count_by = $${paramCount}`);
      params.push(filters.requestingUserId);
      paramCount++;
    }
    // Stock Controllers can see plans assigned to them OR created by them
    else if (filters?.requestingUserRole === 'STOCK_CONTROLLER') {
      conditions.push(`(count_by = $${paramCount} OR created_by = $${paramCount + 1})`);
      params.push(filters.requestingUserId, filters.requestingUserId);
      paramCount += 2;
    }

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.countType) {
      conditions.push(`count_type = $${paramCount}`);
      params.push(filters.countType);
      paramCount++;
    }

    if (filters?.location) {
      conditions.push(`location = $${paramCount}`);
      params.push(filters.location);
      paramCount++;
    }

    // Note: countBy filter is only available to SUPERVISOR and ADMIN roles
    // STOCK_CONTROLLER, PICKER, and PACKER are filtered by requestingUserId above
    if (
      filters?.countBy &&
      (filters.requestingUserRole === 'SUPERVISOR' || filters.requestingUserRole === 'ADMIN')
    ) {
      conditions.push(`count_by = $${paramCount}`);
      params.push(filters.countBy);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM cycle_count_plans WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT ccp.*, u.name as assigned_to_name
       FROM cycle_count_plans ccp
       LEFT JOIN users u ON ccp.count_by = u.user_id
       WHERE ${whereClause}
       ORDER BY ccp.scheduled_date DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const plans = await Promise.all(
      result.rows.map(async row => {
        const plan = this.mapRowToCycleCountPlan(row);
        // Add assigned user name if available
        if (row.assigned_to_name) {
          (plan as any).assignedToName = row.assigned_to_name;
        }
        // Get entries for each plan
        const entriesResult = await client.query(
          `SELECT * FROM cycle_count_entries WHERE plan_id = $1 ORDER BY counted_at ASC`,
          [plan.planId]
        );
        plan.countEntries = entriesResult.rows.map(r => this.mapRowToCycleCountEntry(r));
        return plan;
      })
    );

    return { plans, total };
  }

  /**
   * Start a cycle count plan
   * For BLANKET, ABC, SPOT_CHECK, RECEIVING, and SHIPPING types, automatically generate count entries
   */
  async startCycleCountPlan(planId: string, startedBy?: string): Promise<CycleCountPlan> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Get the plan first to check its type
      const planResult = await client.query(`SELECT * FROM cycle_count_plans WHERE plan_id = $1`, [
        planId,
      ]);

      if (planResult.rows.length === 0) {
        throw new Error(`Cycle count plan ${planId} not found`);
      }

      const plan = planResult.rows[0];

      // Update plan status to IN_PROGRESS
      await client.query(
        `UPDATE cycle_count_plans
         SET status = $1, started_at = NOW(), updated_at = NOW()
         WHERE plan_id = $2`,
        [CycleCountStatus.IN_PROGRESS, planId]
      );

      // Generate count entries based on count type
      await this.generateCountEntriesForType(plan, startedBy || plan.count_by, client);

      await client.query('COMMIT');

      logger.info('Cycle count plan started', { planId, countType: plan.count_type });
      return await this.getCycleCountPlan(planId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error starting cycle count plan', error);
      throw error;
    }
  }

  /**
   * Complete a cycle count plan
   */
  async completeCycleCountPlan(planId: string): Promise<CycleCountPlan> {
    const client = await getPool();

    const result = await client.query(
      `UPDATE cycle_count_plans
       SET status = $1, completed_at = NOW(), updated_at = NOW()
       WHERE plan_id = $2
       RETURNING *`,
      [CycleCountStatus.COMPLETED, planId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Cycle count plan ${planId} not found`);
    }

    logger.info('Cycle count plan completed', { planId });
    return await this.getCycleCountPlan(planId);
  }

  /**
   * Reconcile a cycle count plan (approve all variances)
   */
  async reconcileCycleCountPlan(dto: ReconcileCycleCountDTO): Promise<CycleCountPlan> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Update plan status
      await client.query(
        `UPDATE cycle_count_plans
         SET status = $1, reconciled_at = NOW(), updated_at = NOW()
         WHERE plan_id = $2`,
        [CycleCountStatus.RECONCILED, dto.planId]
      );

      // Get all pending variances for this plan
      const entriesResult = await client.query(
        `SELECT * FROM cycle_count_entries
         WHERE plan_id = $1 AND variance_status = $2`,
        [dto.planId, VarianceStatus.PENDING]
      );

      // Process each pending variance
      for (const entry of entriesResult.rows) {
        if (entry.variance !== 0) {
          await this.processVarianceAdjustment(
            entry.entry_id,
            VarianceStatus.APPROVED,
            dto.reconciledBy,
            dto.notes
          );
        }
      }

      await client.query('COMMIT');

      logger.info('Cycle count plan reconciled', { planId: dto.planId });
      return await this.getCycleCountPlan(dto.planId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error reconciling cycle count plan', error);
      throw error;
    }
  }

  /**
   * Generate count entries automatically based on count type
   * Called when starting a cycle count plan
   */
  private async generateCountEntriesForType(plan: any, userId: string, client: any): Promise<void> {
    const countType = plan.count_type;
    const location = plan.location;
    const sku = plan.sku;
    const planId = plan.plan_id;

    switch (countType) {
      case CycleCountType.BLANKET:
        // Generate entries for ALL SKUs in the specified location
        await this.generateBlanketCountEntries(planId, location, userId, client);
        break;

      case CycleCountType.ABC:
        // Generate entries for high-value (ABC category A) items
        await this.generateABCCountEntries(planId, location, sku, userId, client);
        break;

      case CycleCountType.SPOT_CHECK:
        // Generate entries for random sample of items
        await this.generateSpotCheckEntries(planId, location, userId, client);
        break;

      case CycleCountType.RECEIVING:
        // Generate entries for recent receiving items
        await this.generateReceivingCountEntries(planId, location, userId, client);
        break;

      case CycleCountType.SHIPPING:
        // Generate entries for items in orders ready to ship
        await this.generateShippingCountEntries(planId, location, userId, client);
        break;

      case CycleCountType.AD_HOC:
      default:
        // If SKUs are specified for AD_HOC count, generate entries for those SKUs
        if (sku) {
          await this.generateAdHocCountEntries(planId, location, sku, userId, client);
        } else {
          logger.info('AD_HOC count: entries will be entered manually', { planId });
        }
        break;
    }
  }

  /**
   * BLANKET count: Generate entries for ALL SKUs in the location
   */
  private async generateBlanketCountEntries(
    planId: string,
    location: string,
    userId: string,
    client: any
  ): Promise<void> {
    if (!location) {
      logger.warn('BLANKET count requires a location', { planId });
      return;
    }

    // Get all inventory in the location
    const inventoryResult = await client.query(
      `SELECT sku, bin_location, quantity
       FROM inventory_units
       WHERE bin_location = $1 AND quantity > 0
       ORDER BY sku`,
      [location]
    );

    logger.info(`BLANKET count: Found ${inventoryResult.rows.length} SKUs in location ${location}`);

    // Create count entries for each SKU
    for (const row of inventoryResult.rows) {
      const entryId = `CCE-${nanoid(10)}`.toUpperCase();
      const systemQuantity = parseFloat(row.quantity);
      const countedQuantity = 0; // Will be filled in by user

      await client.query(
        `INSERT INTO cycle_count_entries
          (entry_id, plan_id, sku, bin_location, system_quantity, counted_quantity,
           variance, variance_percent, variance_status, counted_at, counted_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)`,
        [
          entryId,
          planId,
          row.sku,
          row.bin_location,
          systemQuantity,
          countedQuantity,
          -systemQuantity, // variance = counted - system (0 - system = -system)
          systemQuantity > 0 ? 100 : 0, // percent variance
          VarianceStatus.PENDING,
          userId,
          'BLANKET count: Entry auto-generated, awaiting physical count',
        ]
      );
    }

    logger.info(`BLANKET count: Created ${inventoryResult.rows.length} entries`, {
      planId,
      location,
    });
  }

  /**
   * ABC count: Generate entries for high-value items (ABC category A)
   */
  private async generateABCCountEntries(
    planId: string,
    location: string | null,
    sku: string | null,
    userId: string,
    client: any
  ): Promise<void> {
    // Build query for ABC category A items
    let whereClause = 'cct.abc_category = $1 AND cct.is_active = true';
    const params: any[] = ['A'];
    let paramCount = 2;

    // If location specified, filter by location zone
    if (location) {
      const zone = location.split('-')[0];
      whereClause += ` AND (cct.location_zone = $${paramCount} OR cct.location_zone IS NULL)`;
      params.push(zone);
      paramCount++;
    }

    // If SKU specified, include it even without tolerance rule
    if (sku) {
      whereClause += ` OR inv.sku = $${paramCount}`;
      params.push(sku);
      paramCount++;
    }

    // Get SKUs that qualify for ABC counting
    const abcResult = await client.query(
      `SELECT DISTINCT inv.sku, inv.bin_location, inv.quantity
       FROM inventory_units inv
       LEFT JOIN cycle_count_tolerances cct ON inv.sku = cct.sku
       WHERE (${whereClause}) AND inv.quantity > 0
       ${location ? `AND inv.bin_location = $${paramCount}` : ''}
       ORDER BY inv.sku`,
      [...params, location]
    );

    logger.info(`ABC count: Found ${abcResult.rows.length} ABC category A items`);

    // Create count entries
    for (const row of abcResult.rows) {
      const entryId = `CCE-${nanoid(10)}`.toUpperCase();
      const systemQuantity = parseFloat(row.quantity);

      await client.query(
        `INSERT INTO cycle_count_entries
          (entry_id, plan_id, sku, bin_location, system_quantity, counted_quantity,
           variance, variance_percent, variance_status, counted_at, counted_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)`,
        [
          entryId,
          planId,
          row.sku,
          row.bin_location,
          systemQuantity,
          0,
          -systemQuantity,
          systemQuantity > 0 ? 100 : 0,
          VarianceStatus.PENDING,
          userId,
          'ABC count: High-value item (Category A), awaiting physical count',
        ]
      );
    }

    logger.info(`ABC count: Created ${abcResult.rows.length} entries`, { planId });
  }

  /**
   * SPOT_CHECK count: Random sample of items in location(s)
   */
  private async generateSpotCheckEntries(
    planId: string,
    location: string | null,
    userId: string,
    client: any
  ): Promise<void> {
    // Sample 10-20% of items, or at least 5 items
    const samplePercent = 15; // 15% sample rate
    const minSampleSize = 5;
    const maxSampleSize = 50;

    // Get available inventory
    let inventoryQuery = `SELECT sku, bin_location, quantity FROM inventory_units WHERE quantity > 0`;
    const params: any[] = [];

    if (location) {
      inventoryQuery += ` AND bin_location = $1`;
      params.push(location);
    }

    inventoryQuery += ` ORDER BY RANDOM()`; // Random ordering

    const inventoryResult = await client.query(
      `SELECT COUNT(*) as total FROM inventory_units WHERE quantity > 0 ${location ? 'AND bin_location = $1' : ''}`,
      params
    );

    const totalItems = parseInt(inventoryResult.rows[0].total, 10);
    let sampleSize = Math.ceil(totalItems * (samplePercent / 100));
    sampleSize = Math.max(minSampleSize, Math.min(maxSampleSize, sampleSize));

    const sampleResult = await client.query(`${inventoryQuery} LIMIT $${params.length + 1}`, [
      ...params,
      sampleSize,
    ]);

    logger.info(
      `SPOT_CHECK count: Sampling ${sampleResult.rows.length} items from ${totalItems} total`
    );

    // Create count entries
    for (const row of sampleResult.rows) {
      const entryId = `CCE-${nanoid(10)}`.toUpperCase();
      const systemQuantity = parseFloat(row.quantity);

      await client.query(
        `INSERT INTO cycle_count_entries
          (entry_id, plan_id, sku, bin_location, system_quantity, counted_quantity,
           variance, variance_percent, variance_status, counted_at, counted_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)`,
        [
          entryId,
          planId,
          row.sku,
          row.bin_location,
          systemQuantity,
          0,
          -systemQuantity,
          systemQuantity > 0 ? 100 : 0,
          VarianceStatus.PENDING,
          userId,
          'SPOT CHECK: Random sample verification',
        ]
      );
    }

    logger.info(`SPOT_CHECK count: Created ${sampleResult.rows.length} entries`, {
      planId,
      sampleSize,
    });
  }

  /**
   * RECEIVING count: Items from recent receipts (last 7 days)
   */
  private async generateReceivingCountEntries(
    planId: string,
    location: string | null,
    userId: string,
    client: any
  ): Promise<void> {
    // Get SKUs from recent inventory transactions (RECEIPT type, last 7 days)
    const receivingResult = await client.query(
      `SELECT DISTINCT it.sku, inv.bin_location, inv.quantity
       FROM inventory_transactions it
       INNER JOIN inventory_units inv ON it.sku = inv.sku
       WHERE it.type = $1
         AND it.timestamp > NOW() - INTERVAL '7 days'
         ${location ? `AND inv.bin_location = $2` : ''}
         AND inv.quantity > 0
       ORDER BY it.timestamp DESC`,
      [TransactionType.RECEIPT, location]
    );

    logger.info(`RECEIVING count: Found ${receivingResult.rows.length} items from recent receipts`);

    // Create count entries
    for (const row of receivingResult.rows) {
      const entryId = `CCE-${nanoid(10)}`.toUpperCase();
      const systemQuantity = parseFloat(row.quantity);

      await client.query(
        `INSERT INTO cycle_count_entries
          (entry_id, plan_id, sku, bin_location, system_quantity, counted_quantity,
           variance, variance_percent, variance_status, counted_at, counted_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)`,
        [
          entryId,
          planId,
          row.sku,
          row.bin_location,
          systemQuantity,
          0,
          -systemQuantity,
          systemQuantity > 0 ? 100 : 0,
          VarianceStatus.PENDING,
          userId,
          'RECEIVING count: Verifying recently received items',
        ]
      );
    }

    logger.info(`RECEIVING count: Created ${receivingResult.rows.length} entries`, { planId });
  }

  /**
   * SHIPPING count: Items in orders ready to ship
   */
  private async generateShippingCountEntries(
    planId: string,
    location: string | null,
    userId: string,
    client: any
  ): Promise<void> {
    // Get SKUs from orders in PICKING, PICKED, or PACKED status
    const shippingResult = await client.query(
      `SELECT DISTINCT oi.sku, oi.bin_location, inv.quantity
       FROM order_items oi
       INNER JOIN orders o ON oi.order_id = o.order_id
       INNER JOIN inventory_units inv ON oi.sku = inv.sku
       WHERE o.status IN ($1, $2, $3)
         AND oi.bin_location IS NOT NULL
         ${location ? `AND oi.bin_location = $4` : ''}
       ORDER BY o.priority DESC, o.created_at ASC`,
      [OrderStatus.PICKING, OrderStatus.PICKED, OrderStatus.PACKED, location]
    );

    logger.info(
      `SHIPPING count: Found ${shippingResult.rows.length} unique SKUs in orders to ship`
    );

    // Create count entries
    for (const row of shippingResult.rows) {
      const entryId = `CCE-${nanoid(10)}`.toUpperCase();
      const systemQuantity = parseFloat(row.quantity);

      await client.query(
        `INSERT INTO cycle_count_entries
          (entry_id, plan_id, sku, bin_location, system_quantity, counted_quantity,
           variance, variance_percent, variance_status, counted_at, counted_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)`,
        [
          entryId,
          planId,
          row.sku,
          row.bin_location,
          systemQuantity,
          0,
          -systemQuantity,
          systemQuantity > 0 ? 100 : 0,
          VarianceStatus.PENDING,
          userId,
          'SHIPPING count: Verifying items before shipment',
        ]
      );
    }

    logger.info(`SHIPPING count: Created ${shippingResult.rows.length} entries`, { planId });
  }

  /**
   * AD_HOC count: Generate entries for specified SKUs (comma-separated)
   * If location is also specified, only include SKUs in that location
   */
  private async generateAdHocCountEntries(
    planId: string,
    location: string | null,
    sku: string,
    userId: string,
    client: any
  ): Promise<void> {
    // Parse comma-separated SKUs
    const skus = sku
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (skus.length === 0) {
      logger.warn('AD_HOC count: No valid SKUs provided', { planId, sku });
      return;
    }

    logger.info(`AD_HOC count: Generating entries for ${skus.length} SKU(s)`, { planId, skus });

    // Build query for specified SKUs
    const placeholders = skus.map((_, i) => `$${i + 2}`).join(',');
    const query = location
      ? `SELECT sku, bin_location, quantity
         FROM inventory_units
         WHERE sku IN (${placeholders}) AND bin_location = $1 AND quantity > 0
         ORDER BY sku`
      : `SELECT sku, bin_location, quantity
         FROM inventory_units
         WHERE sku IN (${placeholders}) AND quantity > 0
         ORDER BY sku`;

    const params = location ? [location, ...skus] : [...skus];

    const inventoryResult = await client.query(query, params);

    logger.info(
      `AD_HOC count: Found ${inventoryResult.rows.length} inventory records for specified SKUs`
    );

    // Create count entries
    for (const row of inventoryResult.rows) {
      const entryId = `CCE-${nanoid(10)}`.toUpperCase();
      const systemQuantity = parseFloat(row.quantity);

      await client.query(
        `INSERT INTO cycle_count_entries
          (entry_id, plan_id, sku, bin_location, system_quantity, counted_quantity,
           variance, variance_percent, variance_status, counted_at, counted_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)`,
        [
          entryId,
          planId,
          row.sku,
          row.bin_location,
          systemQuantity,
          0,
          -systemQuantity,
          systemQuantity > 0 ? 100 : 0,
          VarianceStatus.PENDING,
          userId,
          'AD_HOC count: Entry for specified SKU, awaiting physical count',
        ]
      );
    }

    logger.info(`AD_HOC count: Created ${inventoryResult.rows.length} entries`, { planId });
  }

  // ==========================================================================
  // CYCLE COUNT ENTRY METHODS
  // ==========================================================================

  /**
   * Create a cycle count entry (record counted quantity)
   */
  async createCycleCountEntry(dto: CreateCycleCountEntryDTO): Promise<CycleCountEntry> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      const entryId = `CCE-${nanoid(10)}`.toUpperCase();

      // Get current system quantity
      const inventoryResult = await client.query(
        `SELECT quantity FROM inventory_units WHERE sku = $1 AND bin_location = $2`,
        [dto.sku, dto.binLocation]
      );

      const systemQuantity =
        inventoryResult.rows.length > 0 ? parseFloat(inventoryResult.rows[0].quantity) : 0;

      const countedQuantity = dto.countedQuantity;
      const variance = countedQuantity - systemQuantity;
      const variancePercent = systemQuantity > 0 ? (Math.abs(variance) / systemQuantity) * 100 : 0;

      // Check tolerance rules
      const tolerance = await this.getApplicableTolerance(dto.sku, dto.binLocation);
      let varianceStatus = VarianceStatus.PENDING;

      if (Math.abs(variancePercent) <= tolerance.autoAdjustThreshold) {
        // Auto-adjust within tolerance
        varianceStatus = VarianceStatus.AUTO_ADJUSTED;

        // Create inventory transaction
        const transactionId = await this.createAdjustmentTransaction(
          dto.sku,
          dto.binLocation,
          variance,
          `Cycle count auto-adjustment - Entry ${entryId}`,
          dto.countedBy
        );

        // Update inventory
        if (variance > 0) {
          await this.adjustInventoryUp(dto.sku, dto.binLocation, variance);
        } else if (variance < 0) {
          await this.adjustInventoryDown(dto.sku, dto.binLocation, Math.abs(variance));
        }

        const result = await client.query(
          `INSERT INTO cycle_count_entries
            (entry_id, plan_id, sku, bin_location, system_quantity, counted_quantity,
             variance, variance_percent, variance_status, counted_at, counted_by,
             adjustment_transaction_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12)
           RETURNING *`,
          [
            entryId,
            dto.planId,
            dto.sku,
            dto.binLocation,
            systemQuantity,
            countedQuantity,
            variance,
            variancePercent,
            varianceStatus,
            dto.countedBy,
            transactionId,
            dto.notes || null,
          ]
        );

        await client.query('COMMIT');

        logger.info('Cycle count entry created (auto-adjusted)', {
          entryId,
          variance,
          variancePercent,
        });

        return this.mapRowToCycleCountEntry(result.rows[0]);
      } else {
        // Pending approval - create exception record
        const result = await client.query(
          `INSERT INTO cycle_count_entries
            (entry_id, plan_id, sku, bin_location, system_quantity, counted_quantity,
             variance, variance_percent, variance_status, counted_at, counted_by, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)
           RETURNING *`,
          [
            entryId,
            dto.planId,
            dto.sku,
            dto.binLocation,
            systemQuantity,
            countedQuantity,
            variance,
            variancePercent,
            varianceStatus,
            dto.countedBy,
            dto.notes || null,
          ]
        );

        await client.query('COMMIT');

        logger.info('Cycle count entry created (pending review)', {
          entryId,
          variance,
          variancePercent,
        });

        // Send notification for significant variances
        if (Math.abs(variancePercent) > tolerance.autoAdjustThreshold * 2) {
          // High variance - notify all users
          await notifyAll({
            type: NotificationType.EXCEPTION_REPORTED,
            title: 'Significant Cycle Count Variance',
            message: `Large variance detected for ${dto.sku} at ${dto.binLocation}: ${variance > 0 ? '+' : ''}${variance} units (${variancePercent.toFixed(1)}%)`,
            priority:
              Math.abs(variancePercent) > 10
                ? NotificationPriority.URGENT
                : NotificationPriority.HIGH,
            data: {
              entryId,
              sku: dto.sku,
              binLocation: dto.binLocation,
              systemQuantity,
              countedQuantity,
              variance,
              variancePercent,
            },
          });
        }

        return this.mapRowToCycleCountEntry(result.rows[0]);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating cycle count entry', error);
      throw error;
    }
  }

  /**
   * Update variance status (approve/reject)
   */
  async updateVarianceStatus(dto: UpdateVarianceStatusDTO): Promise<CycleCountEntry> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Get entry
      const entryResult = await client.query(
        `SELECT * FROM cycle_count_entries WHERE entry_id = $1`,
        [dto.entryId]
      );

      if (entryResult.rows.length === 0) {
        throw new Error(`Cycle count entry ${dto.entryId} not found`);
      }

      const entry = entryResult.rows[0];
      let adjustmentTransactionId = entry.adjustment_transaction_id;

      // Process variance if approved
      if (
        dto.status === VarianceStatus.APPROVED &&
        entry.variance !== 0 &&
        !entry.adjustment_transaction_id
      ) {
        adjustmentTransactionId = await this.processVarianceAdjustment(
          dto.entryId,
          dto.status,
          dto.reviewedBy,
          dto.notes
        );
      }

      // Update entry
      const result = await client.query(
        `UPDATE cycle_count_entries
         SET variance_status = $1,
             reviewed_by = $2,
             reviewed_at = NOW(),
             adjustment_transaction_id = $3
         WHERE entry_id = $4
         RETURNING *`,
        [dto.status, dto.reviewedBy, adjustmentTransactionId || null, dto.entryId]
      );

      await client.query('COMMIT');

      logger.info('Variance status updated', {
        entryId: dto.entryId,
        status: dto.status,
      });

      return this.mapRowToCycleCountEntry(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating variance status', error);
      throw error;
    }
  }

  /**
   * Process variance adjustment (create transaction and update inventory)
   */
  private async processVarianceAdjustment(
    entryId: string,
    status: VarianceStatus,
    reviewedBy: string,
    notes?: string
  ): Promise<string> {
    const client = await getPool();

    // Get entry details
    const entryResult = await client.query(
      `SELECT * FROM cycle_count_entries WHERE entry_id = $1`,
      [entryId]
    );

    if (entryResult.rows.length === 0) {
      throw new Error(`Cycle count entry ${entryId} not found`);
    }

    const entry = entryResult.rows[0];
    const { sku, bin_location, variance } = entry;

    if (variance === 0) {
      return null;
    }

    // Create inventory transaction
    const transactionId = await this.createAdjustmentTransaction(
      sku,
      bin_location,
      variance,
      `Cycle count adjustment reviewed by ${reviewedBy}${notes ? ': ' + notes : ''}`,
      reviewedBy
    );

    // Update inventory
    if (variance > 0) {
      await this.adjustInventoryUp(sku, bin_location, variance);
    } else {
      await this.adjustInventoryDown(sku, bin_location, Math.abs(variance));
    }

    return transactionId;
  }

  // ==========================================================================
  // TOLERANCE METHODS
  // ==========================================================================

  /**
   * Get all tolerance rules
   */
  async getAllTolerances(): Promise<CycleCountTolerance[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM cycle_count_tolerances WHERE is_active = true ORDER BY abc_category, sku`
    );

    return result.rows.map(row => this.mapRowToTolerance(row));
  }

  /**
   * Get applicable tolerance for an SKU/location
   */
  private async getApplicableTolerance(
    sku: string,
    binLocation: string
  ): Promise<CycleCountTolerance> {
    const client = await getPool();

    // Try SKU-specific tolerance first
    let result = await client.query(
      `SELECT * FROM cycle_count_tolerances
       WHERE sku = $1 AND is_active = true
       LIMIT 1`,
      [sku]
    );

    // If no SKU-specific, try zone-specific
    if (result.rows.length === 0) {
      const zone = binLocation.split('-')[0];
      result = await client.query(
        `SELECT * FROM cycle_count_tolerances
         WHERE location_zone = $1 AND is_active = true
         LIMIT 1`,
        [zone]
      );
    }

    // If no zone-specific, use default
    if (result.rows.length === 0) {
      result = await client.query(
        `SELECT * FROM cycle_count_tolerances
         WHERE tolerance_name = 'Default Tolerance' AND is_active = true
         LIMIT 1`
      );
    }

    // If still no tolerance found, use a hardcoded default
    if (result.rows.length === 0) {
      return {
        toleranceId: 'default',
        toleranceName: 'Default Tolerance',
        sku: undefined,
        abcCategory: undefined,
        locationZone: undefined,
        allowableVariancePercent: 10,
        allowableVarianceAmount: 5,
        autoAdjustThreshold: 5, // 5% variance auto-adjust threshold
        requiresApprovalThreshold: 10, // 10% variance threshold for approval
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return this.mapRowToTolerance(result.rows[0]);
  }

  // ==========================================================================
  // INVENTORY ADJUSTMENT METHODS
  // ==========================================================================

  /**
   * Create inventory transaction for adjustment
   */
  private async createAdjustmentTransaction(
    sku: string,
    binLocation: string,
    quantity: number,
    reason: string,
    userId: string
  ): Promise<string> {
    const client = await getPool();

    const transactionId = `TXN-${nanoid(10)}`.toUpperCase();

    await client.query(
      `INSERT INTO inventory_transactions
        (transaction_id, type, sku, quantity, bin_location, user_id, timestamp, reason)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [transactionId, TransactionType.ADJUSTMENT, sku, quantity, binLocation, userId, reason]
    );

    return transactionId;
  }

  /**
   * Adjust inventory up (increase quantity)
   */
  private async adjustInventoryUp(
    sku: string,
    binLocation: string,
    quantity: number
  ): Promise<void> {
    const client = await getPool();

    // Check if inventory unit exists
    const existingResult = await client.query(
      `SELECT * FROM inventory_units WHERE sku = $1 AND bin_location = $2`,
      [sku, binLocation]
    );

    if (existingResult.rows.length > 0) {
      // Update existing (available is auto-computed as quantity - reserved)
      await client.query(
        `UPDATE inventory_units
         SET quantity = quantity + $1,
             last_updated = NOW()
         WHERE sku = $2 AND bin_location = $3`,
        [quantity, sku, binLocation]
      );
    } else {
      // Insert new
      const unitId = `INV-${nanoid(10)}`.toUpperCase();
      await client.query(
        `INSERT INTO inventory_units
          (unit_id, sku, bin_location, quantity, reserved, last_updated)
         VALUES ($1, $2, $3, $4, 0, NOW())`,
        [unitId, sku, binLocation, quantity]
      );
    }
  }

  /**
   * Adjust inventory down (decrease quantity)
   */
  private async adjustInventoryDown(
    sku: string,
    binLocation: string,
    quantity: number
  ): Promise<void> {
    const client = await getPool();

    // available is auto-computed as quantity - reserved
    await client.query(
      `UPDATE inventory_units
       SET quantity = GREATEST(0, quantity - $1),
           last_updated = NOW()
       WHERE sku = $2 AND bin_location = $3`,
      [quantity, sku, binLocation]
    );
  }

  // ==========================================================================
  // MAPPING METHODS
  // ==========================================================================

  private mapRowToCycleCountPlan(row: any): CycleCountPlan {
    return {
      planId: row.plan_id,
      planName: row.plan_name,
      countType: row.count_type,
      status: row.status,
      scheduledDate: new Date(row.scheduled_date),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      reconciledAt: row.reconciled_at ? new Date(row.reconciled_at) : undefined,
      location: row.location,
      sku: row.sku,
      countBy: row.count_by,
      createdBy: row.created_by,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToCycleCountEntry(row: any): CycleCountEntry {
    return {
      entryId: row.entry_id,
      planId: row.plan_id,
      sku: row.sku,
      binLocation: row.bin_location,
      systemQuantity: parseFloat(row.system_quantity),
      countedQuantity: parseFloat(row.counted_quantity),
      variance: parseFloat(row.variance),
      variancePercent: row.variance_percent ? parseFloat(row.variance_percent) : undefined,
      varianceStatus: row.variance_status,
      countedAt: new Date(row.counted_at),
      countedBy: row.counted_by,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      adjustmentTransactionId: row.adjustment_transaction_id,
      notes: row.notes,
    };
  }

  private mapRowToTolerance(row: any): CycleCountTolerance {
    return {
      toleranceId: row.tolerance_id,
      toleranceName: row.tolerance_name,
      sku: row.sku,
      abcCategory: row.abc_category,
      locationZone: row.location_zone,
      allowableVariancePercent: parseFloat(row.allowable_variance_percent),
      allowableVarianceAmount: parseFloat(row.allowable_variance_amount),
      autoAdjustThreshold: parseFloat(row.auto_adjust_threshold),
      requiresApprovalThreshold: parseFloat(row.requires_approval_threshold),
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Singleton instance
export const cycleCountService = new CycleCountService();
