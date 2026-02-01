/**
 * Interleaved Count Service
 *
 * Handles micro-counts performed during picking and other operations
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';
import {
  MicroCount,
  CreateMicroCountDTO,
  CycleCountStatus,
  CycleCountType,
  VarianceStatus,
} from '@opsui/shared';

export class InterleavedCountService {
  /**
   * Create a micro-count (quick count during picking)
   * This can create a new cycle count plan on-the-fly or add to an existing one
   */
  async createMicroCount(dto: CreateMicroCountDTO): Promise<MicroCount> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      const microCountId = `MC-${nanoid(10)}`.toUpperCase();

      // Get system quantity for the SKU/location
      const inventoryResult = await client.query(
        `SELECT quantity FROM inventory_units WHERE sku = $1 AND bin_location = $2`,
        [dto.sku, dto.binLocation]
      );

      const systemQuantity =
        inventoryResult.rows.length > 0 ? parseFloat(inventoryResult.rows[0].quantity) : 0;
      const countedQuantity = dto.countedQuantity;
      const variance = countedQuantity - systemQuantity;
      const variancePercent = systemQuantity > 0 ? (Math.abs(variance) / systemQuantity) * 100 : 0;

      // Check if there's an existing ad-hoc cycle count plan for this user/location
      const existingPlanResult = await client.query(
        `SELECT ccp.plan_id
         FROM cycle_count_plans ccp
         WHERE ccp.count_by = $1
           AND ccp.location = $2
           AND ccp.status = $3
           AND ccp.count_type = $4
         ORDER BY ccp.created_at DESC
         LIMIT 1`,
        [dto.userId, dto.binLocation, CycleCountStatus.IN_PROGRESS, CycleCountType.AD_HOC]
      );

      let planId: string;

      if (existingPlanResult.rows.length > 0) {
        // Use existing plan
        planId = existingPlanResult.rows[0].plan_id;
        logger.info('Using existing interleaved count plan', { planId, microCountId });
      } else {
        // Create a new ad-hoc cycle count plan for interleaved counting
        planId = `CCP-${nanoid(10)}`.toUpperCase();

        await client.query(
          `INSERT INTO cycle_count_plans
            (plan_id, plan_name, count_type, scheduled_date, location, count_by, created_by, notes, status, started_at, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, NOW(), NOW(), NOW())`,
          [
            planId,
            `Interleaved Count - ${dto.binLocation}`,
            CycleCountType.AD_HOC,
            dto.binLocation,
            dto.userId,
            dto.userId,
            'Auto-generated from micro-count during picking',
            CycleCountStatus.IN_PROGRESS,
          ]
        );

        logger.info('Created new interleaved count plan', { planId, microCountId });
      }

      // Check if this SKU/location already has a count entry in this plan
      const existingEntryResult = await client.query(
        `SELECT entry_id, counted_quantity
         FROM cycle_count_entries
         WHERE plan_id = $1 AND sku = $2 AND bin_location = $3`,
        [planId, dto.sku, dto.binLocation]
      );

      let cycleCountEntryId: string;
      let isNewEntry = false;

      if (existingEntryResult.rows.length > 0) {
        // Update existing entry (this is a recount)
        cycleCountEntryId = existingEntryResult.rows[0].entry_id;

        await client.query(
          `UPDATE cycle_count_entries
           SET counted_quantity = $1,
               variance = $2,
               variance_percent = $3,
               counted_at = NOW(),
               counted_by = $4,
               notes = COALESCE(notes || '') || '. Micro-count recount.'
           WHERE entry_id = $5`,
          [countedQuantity, variance, variancePercent, dto.userId, cycleCountEntryId]
        );

        logger.info('Updated existing interleaved count entry', { entryId: cycleCountEntryId });
      } else {
        // Create new cycle count entry
        cycleCountEntryId = `CCE-${nanoid(10)}`.toUpperCase();
        isNewEntry = true;

        // Check tolerance for auto-adjust
        const tolerance = await this.getApplicableTolerance(dto.sku, dto.binLocation);
        let varianceStatus = VarianceStatus.PENDING;

        if (Math.abs(variancePercent) <= tolerance.autoAdjustThreshold) {
          // Auto-adjust within tolerance
          varianceStatus = VarianceStatus.AUTO_ADJUSTED;

          // Create inventory transaction
          const transactionId = `TXN-${nanoid(10)}`.toUpperCase();
          await client.query(
            `INSERT INTO inventory_transactions
              (transaction_id, type, sku, quantity, bin_location, user_id, timestamp, reason)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
            [
              transactionId,
              'ADJUSTMENT',
              dto.sku,
              variance,
              dto.binLocation,
              dto.userId,
              `Interleaved micro-count auto-adjustment - ${microCountId}`,
            ]
          );

          // Update inventory
          if (variance > 0) {
            await client.query(
              `UPDATE inventory_units
               SET quantity = quantity + $1, last_updated = NOW()
               WHERE sku = $2 AND bin_location = $3`,
              [variance, dto.sku, dto.binLocation]
            );
          } else if (variance < 0) {
            await client.query(
              `UPDATE inventory_units
               SET quantity = GREATEST(0, quantity - $1), last_updated = NOW()
               WHERE sku = $2 AND bin_location = $3`,
              [Math.abs(variance), dto.sku, dto.binLocation]
            );
          }

          await client.query(
            `INSERT INTO cycle_count_entries
              (entry_id, plan_id, sku, bin_location, system_quantity, counted_quantity,
               variance, variance_percent, variance_status, counted_at, counted_by,
               adjustment_transaction_id, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12)`,
            [
              cycleCountEntryId,
              planId,
              dto.sku,
              dto.binLocation,
              systemQuantity,
              countedQuantity,
              variance,
              variancePercent,
              varianceStatus,
              dto.userId,
              transactionId,
              'Micro-count during picking - auto-adjusted within tolerance',
            ]
          );
        } else {
          // Pending approval
          await client.query(
            `INSERT INTO cycle_count_entries
              (entry_id, plan_id, sku, bin_location, system_quantity, counted_quantity,
               variance, variance_percent, variance_status, counted_at, counted_by, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)`,
            [
              cycleCountEntryId,
              planId,
              dto.sku,
              dto.binLocation,
              systemQuantity,
              countedQuantity,
              variance,
              variancePercent,
              varianceStatus,
              dto.userId,
              'Micro-count during picking - variance requires review',
            ]
          );
        }

        logger.info('Created new interleaved count entry', {
          entryId: cycleCountEntryId,
          isNewEntry,
        });
      }

      await client.query('COMMIT');

      // Return micro-count result
      const result: MicroCount = {
        microCountId,
        planId,
        cycleCountEntryId,
        sku: dto.sku,
        binLocation: dto.binLocation,
        systemQuantity,
        countedQuantity,
        variance,
        variancePercent,
        varianceStatus:
          variance === 0
            ? 'MATCHED'
            : Math.abs(variancePercent) <= 2
              ? 'WITHIN_TOLERANCE'
              : 'REQUIRES_REVIEW',
        autoAdjusted: variance !== 0 && Math.abs(variancePercent) <= 2,
        createdAt: new Date(),
      };

      logger.info('Micro-count completed', result);
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating micro-count', error);
      throw error;
    }
  }

  /**
   * Get micro-count statistics for a user
   */
  async getMicroCountStats(userId: string, days: number = 30) {
    const client = await getPool();

    const result = await client.query(
      `SELECT
        COUNT(*) as total_micro_counts,
        SUM(CASE WHEN cce.variance = 0 THEN 1 ELSE 0 END) as accurate_counts,
        SUM(CASE WHEN cce.variance != 0 THEN 1 ELSE 0 END) as variance_counts,
        SUM(CASE WHEN cce.variance_status = 'AUTO_ADJUSTED' THEN 1 ELSE 0 END) as auto_adjusted_counts,
        AVG(CASE WHEN cce.variance = 0 THEN 100 ELSE 100 - LEAST(ABS(cce.variance_percent), 100) END) as average_accuracy
       FROM cycle_count_entries cce
       INNER JOIN cycle_count_plans ccp ON cce.plan_id = ccp.plan_id
       WHERE cce.counted_by = $1
         AND cce.notes LIKE '%Micro-count during picking%'
         AND cce.counted_at >= NOW() - INTERVAL '${days} days'`,
      [userId]
    );

    const row = result.rows[0];

    return {
      totalMicroCounts: parseInt(row.total_micro_counts) || 0,
      accurateCounts: parseInt(row.accurate_counts) || 0,
      varianceCounts: parseInt(row.variance_counts) || 0,
      autoAdjustedCounts: parseInt(row.auto_adjusted_counts) || 0,
      averageAccuracy: parseFloat(row.average_accuracy) || 0,
    };
  }

  /**
   * Get applicable tolerance for an SKU/location
   */
  private async getApplicableTolerance(
    sku: string,
    binLocation: string
  ): Promise<{ autoAdjustThreshold: number; requiresApprovalThreshold: number }> {
    const client = await getPool();

    // Try SKU-specific tolerance first
    let result = await client.query(
      `SELECT auto_adjust_threshold, requires_approval_threshold
       FROM cycle_count_tolerances
       WHERE sku = $1 AND is_active = true
       LIMIT 1`,
      [sku]
    );

    // If no SKU-specific, try zone-specific
    if (result.rows.length === 0) {
      const zone = binLocation.split('-')[0];
      result = await client.query(
        `SELECT auto_adjust_threshold, requires_approval_threshold
         FROM cycle_count_tolerances
         WHERE location_zone = $1 AND is_active = true
         LIMIT 1`,
        [zone]
      );
    }

    // If no zone-specific, use default (2% auto-adjust, 5% requires approval)
    if (result.rows.length === 0) {
      return {
        autoAdjustThreshold: 2,
        requiresApprovalThreshold: 5,
      };
    }

    return {
      autoAdjustThreshold: parseFloat(result.rows[0].auto_adjust_threshold) || 2,
      requiresApprovalThreshold: parseFloat(result.rows[0].requires_approval_threshold) || 5,
    };
  }
}

// Singleton instance
export const interleavedCountService = new InterleavedCountService();
