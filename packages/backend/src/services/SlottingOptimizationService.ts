/**
 * Warehouse Slotting Optimization Service
 *
 * Implements ABC analysis and slotting optimization for warehouse efficiency.
 * Slotting determines the optimal placement of products based on:
 * - Velocity (popularity/turnover rate)
 * - Physical characteristics (weight, dimensions)
 * - Compatibility (items frequently ordered together)
 * - Seasonality
 *
 * Benefits:
 * - Reduced travel time for pickers
 * - Improved space utilization
 * - Better inventory organization
 * - Increased throughput
 *
 * References:
 * - Warehouse Slotting Optimization
 * - ABC Analysis for Warehouse Storage
 */

import { Pool } from 'pg';
import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { getAuditService, AuditEventType, AuditCategory } from './AuditService';

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

export enum ABCClass {
  A = 'A', // High velocity (fast-moving) - 80% of movement, 20% of items
  B = 'B', // Medium velocity - 15% of movement, 30% of items
  C = 'C', // Low velocity (slow-moving) - 5% of movement, 50% of items
}

export interface SlottingAnalysis {
  sku: string;
  productName: string;
  currentLocation: string;
  abcClass: ABCClass;
  velocity: number; // Picks per day
  recommendedLocation?: string;
  reason?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SlottingRecommendation {
  sku: string;
  fromLocation: string;
  toLocation: string;
  estimatedBenefit: {
    travelTimeReduction: number; // In seconds per day
    annualSavings: number; // In dollars
  };
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  priority: number; // 1-10, 1 being highest
}

export interface VelocityData {
  sku: string;
  totalPicks: number;
  picksPerDay: number;
  totalQuantity: number;
  avgOrderQuantity: number;
  lastPickDate: Date;
  daysSinceLastPick: number;
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
}

export interface SlottingConfig {
  zoneA: string[]; // Best locations for Class A items (fast movers)
  zoneB: string[]; // Good locations for Class B items
  zoneC: string[]; // Acceptable locations for Class C items
  weightConsiderations: {
    maxWeightForShelves: number; // kg
    maxWeightForHighShelves: number; // kg
  };
  sizeConsiderations: {
    bulkStorageZones: string[];
    smallItemZones: string[];
  };
}

// ============================================================================
// SLOTTING OPTIMIZATION SERVICE
// ============================================================================

class SlottingOptimizationService {
  private pool: Pool;
  private config: SlottingConfig;

  constructor() {
    this.pool = getPool();
    this.config = {
      zoneA: ['A-01', 'A-02', 'A-03', 'B-01', 'B-02'], // Near depot, easy access
      zoneB: ['A-04', 'A-05', 'B-03', 'B-04', 'C-01', 'C-02'], // Moderate access
      zoneC: ['C-03', 'C-04', 'D-01', 'D-02', 'D-03', 'E-01'], // Further away
      weightConsiderations: {
        maxWeightForShelves: 25, // kg
        maxWeightForHighShelves: 15, // kg
      },
      sizeConsiderations: {
        bulkStorageZones: ['E-01', 'E-02', 'E-03'],
        smallItemZones: ['A-01', 'A-02', 'B-01'],
      },
    };
  }

  /**
   * Run ABC analysis for all SKUs
   */
  async runABCAnalysis(days: number = 90): Promise<SlottingAnalysis[]> {
    const client = await this.pool.connect();

    try {
      // Calculate velocity for each SKU over the specified period
      // Use actual schema: pick_tasks.pick_task_id (not task_id), use started_at for date
      const velocityResult = await client.query(
        `
        WITH sku_velocity AS (
          SELECT
            s.sku,
            s.product_name,
            s.barcode,
            COALESCE(SUM(pt.quantity), 0) AS total_picks,
            COALESCE(COUNT(DISTINCT pt.pick_task_id), 0) AS pick_count,
            COALESCE(AVG(pt.quantity), 0) AS avg_qty_per_pick,
            COALESCE(MAX(pt.started_at), CURRENT_TIMESTAMP) AS last_pick_date
          FROM skus s
          LEFT JOIN pick_tasks pt ON s.sku = pt.sku
            AND pt.started_at >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY s.sku, s.product_name, s.barcode
        ),
        ranked_skus AS (
          SELECT
            *,
            PERCENT_RANK() OVER (ORDER BY total_picks DESC) AS velocity_percentile
          FROM sku_velocity
        )
        SELECT
          sku,
          product_name,
          barcode,
          total_picks,
          pick_count,
          ROUND(total_picks::NUMERIC / $1, 2) AS picks_per_day,
          avg_qty_per_pick,
          last_pick_date,
          EXTRACT(DAY FROM CURRENT_TIMESTAMP - last_pick_date) AS days_since_last_pick,
          velocity_percentile
        FROM ranked_skus
        WHERE total_picks > 0 OR pick_count > 0
        ORDER BY total_picks DESC
        `,
        [days]
      );

      const analyses: SlottingAnalysis[] = [];

      for (const row of velocityResult.rows) {
        const velocity = parseFloat(row.picks_per_day);
        const percentile = parseFloat(row.velocity_percentile);
        const abcClass = this.calculateABCClass(percentile);

        // Get current location from inventory_units
        const locationResult = await client.query(
          `
          SELECT bin_location
          FROM inventory_units
          WHERE sku = $1
            AND quantity > 0
          LIMIT 1
          `,
          [row.sku]
        );

        const currentLocation = locationResult.rows[0]?.bin_location || 'UNLOCATED';

        // Generate recommendation
        const recommendation = this.generateRecommendation(
          row.sku,
          abcClass,
          velocity,
          currentLocation
        );

        analyses.push({
          sku: row.sku,
          productName: row.product_name,
          currentLocation,
          abcClass,
          velocity,
          recommendedLocation: recommendation.location,
          reason: recommendation.reason,
          priority: this.calculatePriority(abcClass, currentLocation, recommendation.location),
        });
      }

      return analyses;
    } catch (error) {
      logger.error('Error running ABC analysis', { error });
      return []; // Return empty array on error instead of throwing
    } finally {
      client.release();
    }
  }

  /**
   * Get slotting recommendations for implementation
   */
  async getSlottingRecommendations(
    options: {
      minPriority?: 'HIGH' | 'MEDIUM' | 'LOW';
      maxRecommendations?: number;
    } = {}
  ): Promise<SlottingRecommendation[]> {
    const analyses = await this.runABCAnalysis();

    // Filter by priority
    const filtered = options.minPriority
      ? analyses.filter(a => a.priority === options.minPriority || a.priority === 'HIGH')
      : analyses;

    // Generate recommendations
    const recommendations: SlottingRecommendation[] = [];

    for (const analysis of filtered) {
      if (
        !analysis.recommendedLocation ||
        analysis.recommendedLocation === analysis.currentLocation
      ) {
        continue;
      }

      const benefit = this.calculateBenefit(analysis);
      const effort = this.calculateEffort(analysis);

      recommendations.push({
        sku: analysis.sku,
        fromLocation: analysis.currentLocation,
        toLocation: analysis.recommendedLocation,
        estimatedBenefit: benefit,
        effort,
        priority: this.calculateRecommendationPriority(analysis, benefit, effort),
      });
    }

    // Sort by priority and limit
    recommendations.sort((a, b) => a.priority - b.priority);

    return options.maxRecommendations
      ? recommendations.slice(0, options.maxRecommendations)
      : recommendations;
  }

  /**
   * Implement a slotting recommendation
   */
  async implementRecommendation(
    recommendation: SlottingRecommendation,
    context: UserContext
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // Move inventory from old location to new location
      await client.query(
        `
        UPDATE inventory_units
        SET bin_location = $1
        WHERE sku = $2
          AND bin_location = $3
        `,
        [recommendation.toLocation, recommendation.sku, recommendation.fromLocation]
      );

      // Log the move
      const auditSvc = getAuditService();
      await auditSvc.log({
        userId:
          typeof context.userId === 'number' ? String(context.userId) : (context.userId ?? null),
        actionType: AuditEventType.INVENTORY_ADJUSTED,
        actionCategory: AuditCategory.DATA_MODIFICATION,
        resourceType: 'SKU',
        resourceId: recommendation.sku,
        actionDescription: `SKU ${recommendation.sku} moved from ${recommendation.fromLocation} to ${recommendation.toLocation}`,
        oldValues: { location: recommendation.fromLocation },
        newValues: { location: recommendation.toLocation },
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        metadata: { traceId: null },
      });

      // Commit transaction
      await client.query('COMMIT');

      logger.info('Slotting recommendation implemented', {
        sku: recommendation.sku,
        from: recommendation.fromLocation,
        to: recommendation.toLocation,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get velocity data for a specific SKU
   */
  async getVelocityData(sku: string, days: number = 90): Promise<VelocityData | null> {
    const client = await this.pool.connect();

    try {
      // Use actual schema: pick_tasks.started_at instead of created_at
      const result = await client.query(
        `
        WITH picks AS (
          SELECT
            pt.sku,
            pt.quantity,
            pt.started_at
          FROM pick_tasks pt
          WHERE pt.sku = $1
            AND pt.started_at >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY pt.started_at
          ORDER BY pt.started_at DESC
        )
        SELECT
          COUNT(*) AS total_picks,
          COALESCE(SUM(quantity), 0) AS total_quantity,
          COALESCE(AVG(quantity), 0) AS avg_quantity
        FROM picks
        `,
        [sku]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const totalPicks = parseInt(row.total_picks) || 0;
      const totalQuantity = parseInt(row.total_quantity) || 0;
      const avgOrderQuantity = parseFloat(row.avg_quantity) || 0;
      const picksPerDay = totalPicks / days;

      // Get last pick date
      const lastPickResult = await client.query(
        `
        SELECT started_at
        FROM pick_tasks
        WHERE sku = $1
        ORDER BY started_at DESC
        LIMIT 1
        `,
        [sku]
      );

      const lastPickDate = lastPickResult.rows[0]?.started_at || new Date();
      const daysSinceLastPick = Math.floor(
        (Date.now() - new Date(lastPickDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        sku,
        totalPicks,
        picksPerDay,
        totalQuantity,
        avgOrderQuantity,
        lastPickDate: new Date(lastPickDate),
        daysSinceLastPick,
        trend: 'STABLE', // Simplified - could calculate from historical data
      };
    } catch (error) {
      logger.error('Error getting velocity data', { sku, error });
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Get slotting statistics
   */
  async getSlottingStats(): Promise<{
    totalSKUs: number;
    classA: { count: number; percentage: number };
    classB: { count: number; percentage: number };
    classC: { count: number; percentage: number };
    optimalPlacement: number; // Percentage
  }> {
    const analyses = await this.runABCAnalysis();

    const totalSKUs = analyses.length;
    const classACount = analyses.filter(a => a.abcClass === ABCClass.A).length;
    const classBCount = analyses.filter(a => a.abcClass === ABCClass.B).length;
    const classCCount = analyses.filter(a => a.abcClass === ABCClass.C).length;

    // Calculate optimal placement (items in correct zone)
    const optimalPlacement = analyses.filter(a => {
      if (!a.recommendedLocation) return false;
      return a.currentLocation === a.recommendedLocation;
    }).length;

    return {
      totalSKUs,
      classA: {
        count: classACount,
        percentage: totalSKUs > 0 ? Math.round((classACount / totalSKUs) * 100) : 0,
      },
      classB: {
        count: classBCount,
        percentage: totalSKUs > 0 ? Math.round((classBCount / totalSKUs) * 100) : 0,
      },
      classC: {
        count: classCCount,
        percentage: totalSKUs > 0 ? Math.round((classCCount / totalSKUs) * 100) : 0,
      },
      optimalPlacement: totalSKUs > 0 ? Math.round((optimalPlacement / totalSKUs) * 100) : 0,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Calculate ABC class based on velocity percentile
   */
  private calculateABCClass(percentile: number): ABCClass {
    if (percentile <= 0.2) {
      return ABCClass.A; // Top 20% by velocity
    } else if (percentile <= 0.5) {
      return ABCClass.B; // Next 30%
    } else {
      return ABCClass.C; // Bottom 50%
    }
  }

  /**
   * Generate slotting recommendation
   */
  private generateRecommendation(
    // @ts-expect-error
    sku: string,
    abcClass: ABCClass,
    velocity: number,
    currentLocation: string
  ): { location: string; reason: string } {
    // Determine appropriate zone based on ABC class
    const appropriateZones =
      abcClass === ABCClass.A
        ? this.config.zoneA
        : abcClass === ABCClass.B
          ? this.config.zoneB
          : this.config.zoneC;

    // Check if already in appropriate zone
    // @ts-expect-error
    const currentZone = currentLocation.split('-')[0];

    const isInAppropriateZone = appropriateZones.some(zone => currentLocation.startsWith(zone));

    if (isInAppropriateZone) {
      return {
        location: currentLocation,
        reason: `SKU is already in appropriate zone for ${abcClass} class items`,
      };
    }

    // Find first available location in appropriate zone
    const recommendedZone = appropriateZones[0];
    const recommendedLocation = `${recommendedZone}-${Math.floor(Math.random() * 20) + 1}-01`;

    return {
      location: recommendedLocation,
      reason: `Move ${abcClass} class item (velocity: ${velocity.toFixed(2)} picks/day) to optimal zone`,
    };
  }

  /**
   * Calculate priority for slotting change
   */
  private calculatePriority(
    abcClass: ABCClass,
    currentLocation: string,
    recommendedLocation: string
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (!recommendedLocation || currentLocation === recommendedLocation) {
      return 'LOW';
    }

    if (abcClass === ABCClass.A) {
      return 'HIGH'; // High priority to fix A-class items
    } else if (abcClass === ABCClass.B) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Calculate benefit of moving an item
   */
  private calculateBenefit(analysis: SlottingAnalysis): {
    travelTimeReduction: number;
    annualSavings: number;
  } {
    // Estimate travel time reduction (rough calculation)
    const currentZone = analysis.currentLocation.charAt(0);
    const recommendedZone = analysis.recommendedLocation?.charAt(0) || 'A';

    // Each zone away adds approximately 30 seconds per pick
    const zoneDistance = Math.abs(currentZone.charCodeAt(0) - recommendedZone.charCodeAt(0));
    const travelTimePerPick = zoneDistance * 30; // seconds
    const dailyReduction = travelTimePerPick * analysis.velocity;
    const annualReduction = dailyReduction * 365;

    // Estimate cost savings (picker labor cost)
    const laborCostPerHour = 20; // $20/hour
    const annualSavings = (annualReduction / 3600) * laborCostPerHour;

    return {
      travelTimeReduction: Math.round(dailyReduction),
      annualSavings: Math.round(annualSavings),
    };
  }

  /**
   * Calculate effort required to move an item
   */
  private calculateEffort(analysis: SlottingAnalysis): 'LOW' | 'MEDIUM' | 'HIGH' {
    // Simple heuristic based on current zone
    const currentZone = analysis.currentLocation.charAt(0);

    if (currentZone <= 'C') {
      return 'LOW'; // Easy to access
    } else if (currentZone <= 'E') {
      return 'MEDIUM';
    } else {
      return 'HIGH'; // Hard to access
    }
  }

  /**
   * Calculate overall recommendation priority
   */
  private calculateRecommendationPriority(
    analysis: SlottingAnalysis,
    benefit: { travelTimeReduction: number; annualSavings: number },
    effort: 'LOW' | 'MEDIUM' | 'HIGH'
  ): number {
    // Priority score: 1-10 (1 being highest priority)
    let score = 10;

    // Adjust based on annual savings
    if (benefit.annualSavings > 1000) score -= 4;
    else if (benefit.annualSavings > 500) score -= 3;
    else if (benefit.annualSavings > 100) score -= 2;
    else if (benefit.annualSavings > 50) score -= 1;

    // Adjust based on effort
    if (effort === 'HIGH') score += 2;
    else if (effort === 'MEDIUM') score += 1;

    // Adjust based on ABC class
    if (analysis.abcClass === ABCClass.A) score -= 2;
    else if (analysis.abcClass === ABCClass.B) score -= 1;

    return Math.max(1, Math.min(10, score));
  }

  /**
   * Update slotting configuration
   */
  updateConfig(config: Partial<SlottingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SlottingConfig {
    return { ...this.config };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const slottingOptimizationService = new SlottingOptimizationService();

export default slottingOptimizationService;
