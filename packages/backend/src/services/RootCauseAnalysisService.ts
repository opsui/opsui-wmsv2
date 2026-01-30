/**
 * Root Cause Analysis Service
 *
 * Manages root cause categorization for cycle count variances.
 * Provides Pareto analysis and trending analysis for continuous improvement.
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';

// ============================================================================
// TYPES
// ============================================================================

export interface RootCauseCategory {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface VarianceRootCause {
  rootCauseId: string;
  entryId: string;
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  additionalNotes?: string;
  createdBy: string;
  createdAt: Date;
}

export interface RecordRootCauseDTO {
  entryId: string;
  categoryId: string;
  additionalNotes?: string;
  createdBy: string;
}

export interface RootCauseParetoData {
  category: string;
  categoryCode: string;
  count: number;
  totalVariance: number;
  cumulativePercent: number;
}

export interface CategoryBreakdown {
  category: string;
  categoryCode: string;
  varianceCount: number;
  averageVariancePercent: number;
  totalVariance: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  recentCount: number; // Last 7 days
  previousCount: number; // Previous 7 days
}

export interface TrendingRootCause {
  category: string;
  categoryCode: string;
  currentPeriodCount: number;
  previousPeriodCount: number;
  percentChange: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

export interface RootCauseBySKU {
  sku: string;
  skuName: string;
  rootCauses: Array<{
    category: string;
    count: number;
  }>;
  mostFrequentCategory: string;
  totalVarianceCount: number;
}

export interface RootCauseByZone {
  zone: string;
  rootCauses: Array<{
    category: string;
    count: number;
  }>;
  mostFrequentCategory: string;
  totalVarianceCount: number;
}

// ============================================================================
// ROOT CAUSE ANALYSIS SERVICE
// ============================================================================

export class RootCauseAnalysisService {
  /**
   * Get all root cause categories
   */
  async getAllCategories(): Promise<RootCauseCategory[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM root_cause_categories
       WHERE is_active = true
       ORDER BY display_order ASC`
    );

    return result.rows.map(row => this.mapRowToCategory(row));
  }

  /**
   * Get a specific category
   */
  async getCategory(categoryId: string): Promise<RootCauseCategory> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM root_cause_categories WHERE category_id = $1`,
      [categoryId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Root cause category ${categoryId} not found`);
    }

    return this.mapRowToCategory(result.rows[0]);
  }

  /**
   * Record root cause for a variance entry
   */
  async recordRootCause(dto: RecordRootCauseDTO): Promise<VarianceRootCause> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      const rootCauseId = `VRC-${nanoid(10)}`.toUpperCase();

      // Verify category exists
      const categoryResult = await client.query(
        `SELECT * FROM root_cause_categories WHERE category_id = $1`,
        [dto.categoryId]
      );

      if (categoryResult.rows.length === 0) {
        throw new Error(`Root cause category ${dto.categoryId} not found`);
      }

      const result = await client.query(
        `INSERT INTO variance_root_causes
          (root_cause_id, entry_id, category_id, additional_notes, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          rootCauseId,
          dto.entryId,
          dto.categoryId,
          dto.additionalNotes || null,
          dto.createdBy,
        ]
      );

      await client.query('COMMIT');

      logger.info('Root cause recorded', {
        rootCauseId,
        entryId: dto.entryId,
        categoryId: dto.categoryId,
      });

      const row = result.rows[0];
      return {
        rootCauseId: row.root_cause_id,
        entryId: row.entry_id,
        categoryId: row.category_id,
        categoryName: categoryResult.rows[0].category_name,
        categoryCode: categoryResult.rows[0].category_code,
        additionalNotes: row.additional_notes,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error recording root cause', error);
      throw error;
    }
  }

  /**
   * Get Pareto analysis of root causes (80/20 rule)
   */
  async getRootCausePareto(days: number = 30): Promise<RootCauseParetoData[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT
         rc.category_name as category,
         rc.category_code,
         COUNT(*) as count,
         SUM(ABS(cce.variance)) as total_variance
       FROM variance_root_causes vrc
       INNER JOIN root_cause_categories rc ON vrc.category_id = rc.category_id
       INNER JOIN cycle_count_entries cce ON vrc.entry_id = cce.entry_id
       INNER JOIN cycle_count_plans ccp ON cce.plan_id = ccp.plan_id
       WHERE vrc.created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY rc.category_id, rc.category_name, rc.category_code
       ORDER BY count DESC`
    );

    const data = result.rows.map(row => ({
      category: row.category,
      categoryCode: row.category_code,
      count: parseInt(row.count),
      totalVariance: parseFloat(row.total_variance),
      cumulativePercent: 0, // Will be calculated below
    }));

    // Calculate cumulative percentages
    const totalCount = data.reduce((sum, item) => sum + item.count, 0);
    let cumulativeCount = 0;

    return data.map(item => {
      cumulativeCount += item.count;
      return {
        ...item,
        cumulativePercent: totalCount > 0 ? (cumulativeCount / totalCount) * 100 : 0,
      };
    });
  }

  /**
   * Get breakdown by category with trend analysis
   */
  async getCategoryBreakdown(days: number = 30): Promise<CategoryBreakdown[]> {
    const client = await getPool();

    const result = await client.query(
      `WITH recent AS (
        SELECT
          rc.category_id,
          rc.category_name,
          rc.category_code,
          COUNT(*) as count,
          AVG(ABS(cce.variance_percent)) as avg_variance
        FROM variance_root_causes vrc
        INNER JOIN root_cause_categories rc ON vrc.category_id = rc.category_id
        INNER JOIN cycle_count_entries cce ON vrc.entry_id = cce.entry_id
        WHERE vrc.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY rc.category_id, rc.category_name, rc.category_code
      ),
      previous AS (
        SELECT
          rc.category_id,
          COUNT(*) as count
        FROM variance_root_causes vrc
        INNER JOIN root_cause_categories rc ON vrc.category_id = rc.category_id
        INNER JOIN cycle_count_entries cce ON vrc.entry_id = cce.entry_id
        WHERE vrc.created_at >= NOW() - INTERVAL '14 days'
          AND vrc.created_at < NOW() - INTERVAL '7 days'
        GROUP BY rc.category_id
      )
      SELECT
        recent.category_id as category,
        recent.category_name as category,
        recent.category_code as category_code,
        COALESCE(recent.count, 0) as variance_count,
        COALESCE(recent.avg_variance, 0) as average_variance_percent,
        COALESCE(previous.count, 0) as previous_count
      FROM recent
      LEFT JOIN previous ON recent.category_id = previous.category_id
      ORDER BY recent.count DESC`
    );

    return result.rows.map(row => {
      const recentCount = parseInt(row.variance_count);
      const previousCount = parseInt(row.previous_count);
      const percentChange = previousCount > 0
        ? ((recentCount - previousCount) / previousCount) * 100
        : 0;

      let trend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
      if (percentChange > 20) {
        trend = 'INCREASING';
      } else if (percentChange < -20) {
        trend = 'DECREASING';
      }

      return {
        category: row.category,
        categoryCode: row.category_code,
        varianceCount: recentCount,
        averageVariancePercent: parseFloat(row.average_variance_percent),
        totalVariance: recentCount * parseFloat(row.average_variance_percent),
        trend,
        recentCount,
        previousCount,
      };
    });
  }

  /**
   * Get trending root causes (increasing problems)
   */
  async getTrendingRootCauses(days: number = 30): Promise<TrendingRootCause[]> {
    const client = await getPool();

    const result = await client.query(
      `WITH current_period AS (
        SELECT
          rc.category_id,
          rc.category_name,
          rc.category_code,
          COUNT(*) as count
        FROM variance_root_causes vrc
        INNER JOIN root_cause_categories rc ON vrc.category_id = rc.category_id
        WHERE vrc.created_at >= NOW() - INTERVAL '${Math.floor(days / 2)} days'
        GROUP BY rc.category_id, rc.category_name, rc.category_code
      ),
      previous_period AS (
        SELECT
          rc.category_id,
          COUNT(*) as count
        FROM variance_root_causes vrc
        INNER JOIN root_cause_categories rc ON vrc.category_id = rc.category_id
        WHERE vrc.created_at >= NOW() - INTERVAL '${days} days'
          AND vrc.created_at < NOW() - INTERVAL '${Math.floor(days / 2)} days'
        GROUP BY rc.category_id
      )
      SELECT
        current.category,
        current.category_code,
        COALESCE(current.count, 0) as current_period_count,
        COALESCE(previous.count, 0) as previous_period_count,
        CASE
          WHEN COALESCE(previous.count, 0) = 0 THEN 0
          ELSE ROUND(((current.count - previous.count)::NUMERIC / previous.count) * 100, 2)
        END as percent_change
      FROM current_period current
      LEFT JOIN previous_period previous ON current.category_id = previous.category_id
      ORDER BY percent_change DESC NULLS LAST
      LIMIT 10`
    );

    return result.rows.map(row => {
      let trend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
      const change = parseFloat(row.percent_change);

      if (change > 10) {
        trend = 'INCREASING';
      } else if (change < -10) {
        trend = 'DECREASING';
      }

      return {
        category: row.category,
        categoryCode: row.category_code,
        currentPeriodCount: parseInt(row.current_period_count),
        previousPeriodCount: parseInt(row.previous_period_count),
        percentChange: change,
        trend,
      };
    });
  }

  /**
   * Get root cause analysis by SKU
   */
  async getRootCauseBySKU(sku: string, days: number = 30): Promise<RootCauseBySKU[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT
         cce.sku,
         s.name as sku_name,
         rc.category_name,
         rc.category_code,
         COUNT(*) as count
       FROM variance_root_causes vrc
       INNER JOIN cycle_count_entries cce ON vrc.entry_id = cce.entry_id
       INNER JOIN root_cause_categories rc ON vrc.category_id = rc.category_id
       LEFT JOIN skus s ON cce.sku = s.sku
       WHERE vrc.created_at >= NOW() - INTERVAL '${days} days'
         AND cce.sku = $1
       GROUP BY cce.sku, s.name, rc.category_id, rc.category_name, rc.category_code
       ORDER BY cce.sku, count DESC`,
      [sku]
    );

    // Group by SKU
    const skuMap = new Map<string, RootCauseBySKU>();

    for (const row of result.rows) {
      const skuKey = row.sku;

      if (!skuMap.has(skuKey)) {
        skuMap.set(skuKey, {
          sku: skuKey,
          skuName: row.sku_name || skuKey,
          rootCauses: [],
          mostFrequentCategory: '',
          totalVarianceCount: 0,
        });
      }

      const skuData = skuMap.get(skuKey)!;
      skuData.rootCauses.push({
        category: row.category_name,
        count: parseInt(row.count),
      });
      skuData.totalVarianceCount += parseInt(row.count);
    }

    // Determine most frequent category for each SKU
    for (const [_, skuData] of skuMap) {
      skuData.mostFrequentCategory = skuData.rootCauses[0]?.category || '';
    }

    return Array.from(skuMap.values());
  }

  /**
   * Get root cause analysis by zone
   */
  async getRootCauseByZone(zone: string, days: number = 30): Promise<RootCauseByZone[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT
         SUBSTRING(cce.bin_location, 1, 1) as zone,
         rc.category_name,
         rc.category_code,
         COUNT(*) as count
       FROM variance_root_causes vrc
       INNER JOIN cycle_count_entries cce ON vrc.entry_id = cce.entry_id
       INNER JOIN root_cause_categories rc ON vrc.category_id = rc.category_id
       WHERE vrc.created_at >= NOW() - INTERVAL '${days} days'
         AND SUBSTRING(cce.bin_location, 1, 1) = $1
       GROUP BY SUBSTRING(cce.bin_location, 1, 1), rc.category_id, rc.category_name, rc.category_code
       ORDER BY zone, count DESC`,
      [zone]
    );

    // Group by zone
    const zoneMap = new Map<string, RootCauseByZone>();

    for (const row of result.rows) {
      const zoneKey = row.zone;

      if (!zoneMap.has(zoneKey)) {
        zoneMap.set(zoneKey, {
          zone: zoneKey,
          rootCauses: [],
          mostFrequentCategory: '',
          totalVarianceCount: 0,
        });
      }

      const zoneData = zoneMap.get(zoneKey)!;
      zoneData.rootCauses.push({
        category: row.category_name,
        count: parseInt(row.count),
      });
      zoneData.totalVarianceCount += parseInt(row.count);
    }

    // Determine most frequent category for each zone
    for (const [_, zoneData] of zoneMap) {
      zoneData.mostFrequentCategory = zoneData.rootCauses[0]?.category || '';
    }

    return Array.from(zoneMap.values());
  }

  /**
   * Get root cause for a specific entry
   */
  async getRootCauseForEntry(entryId: string): Promise<VarianceRootCause | null> {
    const client = await getPool();

    const result = await client.query(
      `SELECT vrc.*, rc.category_name, rc.category_code
       FROM variance_root_causes vrc
       INNER JOIN root_cause_categories rc ON vrc.category_id = rc.category_id
       WHERE vrc.entry_id = $1`,
      [entryId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      rootCauseId: row.root_cause_id,
      entryId: row.entry_id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryCode: row.category_code,
      additionalNotes: row.additional_notes,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
    };
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private mapRowToCategory(row: any): RootCauseCategory {
    return {
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryCode: row.category_code,
      description: row.description,
      displayOrder: parseInt(row.display_order),
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
    };
  }
}

// Singleton instance
export const rootCauseAnalysisService = new RootCauseAnalysisService();
