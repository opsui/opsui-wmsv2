/**
 * Cycle Count KPI Service
 *
 * Aggregates cycle count data for dashboards and analytics
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CycleCountKPI {
  totalCounts: number;
  completedCounts: number;
  inProgressCounts: number;
  scheduledCounts: number;
  completionRate: number;
  averageAccuracy: number;
  totalItemsCounted: number;
  totalVariances: number;
  pendingVariances: number;
  highValueVarianceCount: number;
}

export interface AccuracyTrend {
  period: string;
  accuracy: number;
  totalCounts: number;
}

export interface TopDiscrepancySKU {
  sku: string;
  name: string;
  varianceCount: number;
  totalVariance: number;
  averageVariancePercent: number;
}

export interface CountByUser {
  userId: string;
  name: string;
  countsCompleted: number;
  itemsCounted: number;
  averageAccuracy: number;
}

export interface ZonePerformance {
  zone: string;
  countsCompleted: number;
  itemsCounted: number;
  averageAccuracy: number;
  totalVariance: number;
}

export interface CountTypeEffectiveness {
  countType: string;
  countsCompleted: number;
  averageAccuracy: number;
  averageDuration: number; // in hours
  varianceDetectionRate: number;
}

export interface DailyStats {
  date: string;
  countsCompleted: number;
  itemsCounted: number;
  variancesFound: number;
  accuracyRate: number;
}

// ============================================================================
// CYCLE COUNT KPI SERVICE
// ============================================================================

export class CycleCountKPIService {
  /**
   * Get overall KPIs for cycle counting
   */
  async getOverallKPIs(filters?: {
    startDate?: Date;
    endDate?: Date;
    location?: string;
    countType?: string;
  }): Promise<CycleCountKPI> {
    const client = await getPool();

    let dateFilter = '';
    const params: any[] = [];

    if (filters?.startDate) {
      dateFilter += ` AND ccp.created_at >= $${params.length + 1}`;
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      dateFilter += ` AND ccp.created_at <= $${params.length + 1}`;
      params.push(filters.endDate);
    }
    if (filters?.location) {
      dateFilter += ` AND ccp.location = $${params.length + 1}`;
      params.push(filters.location);
    }
    if (filters?.countType) {
      dateFilter += ` AND ccp.count_type = $${params.length + 1}`;
      params.push(filters.countType);
    }

    const result = await client.query(
      `SELECT
        COUNT(*) as total_counts,
        SUM(CASE WHEN ccp.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_counts,
        SUM(CASE WHEN ccp.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress_counts,
        SUM(CASE WHEN ccp.status = 'SCHEDULED' THEN 1 ELSE 0 END) as scheduled_counts,
        SUM(CASE WHEN ccp.status = 'COMPLETED' THEN
          COALESCE((SELECT COUNT(*) FROM cycle_count_entries WHERE plan_id = ccp.plan_id), 0)
        ELSE 0 END) as total_items_counted
       FROM cycle_count_plans ccp
       WHERE 1=1 ${dateFilter}`,
      params
    );

    const row = result.rows[0];
    const totalCounts = parseInt(row.total_counts) || 0;
    const completedCounts = parseInt(row.completed_counts) || 0;
    const completionRate = totalCounts > 0 ? (completedCounts / totalCounts) * 100 : 0;

    // Get accuracy and variance data
    const varianceResult = await client.query(
      `SELECT
        COUNT(*) as total_variances,
        SUM(CASE WHEN cce.variance_status = 'PENDING' AND cce.variance != 0 THEN 1 ELSE 0 END) as pending_variances,
        SUM(CASE WHEN ABS(cce.variance_percent) > 10 THEN 1 ELSE 0 END) as high_value_variance_count,
        AVG(CASE WHEN cce.variance = 0 THEN 100 ELSE
          100 - LEAST(ABS(cce.variance_percent), 100) END) as average_accuracy
       FROM cycle_count_entries cce
       INNER JOIN cycle_count_plans ccp ON cce.plan_id = ccp.plan_id
       WHERE 1=1 ${dateFilter}`,
      params
    );

    const varianceRow = varianceResult.rows[0];

    return {
      totalCounts,
      completedCounts,
      inProgressCounts: parseInt(row.in_progress_counts) || 0,
      scheduledCounts: parseInt(row.scheduled_counts) || 0,
      completionRate: Math.round(completionRate * 100) / 100,
      averageAccuracy: Math.round((parseFloat(varianceRow.average_accuracy) || 0) * 100) / 100,
      totalItemsCounted: parseInt(row.total_items_counted) || 0,
      totalVariances: parseInt(varianceRow.total_variances) || 0,
      pendingVariances: parseInt(varianceRow.pending_variances) || 0,
      highValueVarianceCount: parseInt(varianceRow.high_value_variance_count) || 0,
    };
  }

  /**
   * Get accuracy trends over time
   */
  async getAccuracyTrend(days: number = 30): Promise<AccuracyTrend[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT
        DATE(ccp.created_at) as period,
        COUNT(*) as total_counts,
        AVG(CASE
          WHEN EXISTS (
            SELECT 1 FROM cycle_count_entries cce
            WHERE cce.plan_id = ccp.plan_id AND cce.variance = 0
          ) THEN 100
          ELSE COALESCE((
            SELECT 100 - LEAST(ABS(AVG(cce.variance_percent)), 100)
            FROM cycle_count_entries cce
            WHERE cce.plan_id = ccp.plan_id
          ), 0)
        END) as accuracy
       FROM cycle_count_plans ccp
       WHERE ccp.created_at >= NOW() - INTERVAL '${days} days'
         AND ccp.status IN ('COMPLETED', 'RECONCILED')
       GROUP BY DATE(ccp.created_at)
       ORDER BY period ASC`
    );

    return result.rows.map(row => ({
      period: row.period,
      accuracy: Math.round((parseFloat(row.accuracy) || 0) * 100) / 100,
      totalCounts: parseInt(row.total_counts),
    }));
  }

  /**
   * Get SKUs with most discrepancies
   */
  async getTopDiscrepancySKUs(limit: number = 10, days: number = 30): Promise<TopDiscrepancySKU[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT
        cce.sku,
        s.name,
        COUNT(*) as variance_count,
        SUM(ABS(cce.variance)) as total_variance,
        AVG(ABS(cce.variance_percent)) as average_variance_percent
       FROM cycle_count_entries cce
       INNER JOIN skus s ON cce.sku = s.sku
       WHERE cce.counted_at >= NOW() - INTERVAL '${days} days'
         AND cce.variance != 0
       GROUP BY cce.sku, s.name
       ORDER BY variance_count DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => ({
      sku: row.sku,
      name: row.name,
      varianceCount: parseInt(row.variance_count),
      totalVariance: parseFloat(row.total_variance),
      averageVariancePercent: Math.round(parseFloat(row.average_variance_percent) * 100) / 100,
    }));
  }

  /**
   * Get performance by user
   */
  async getCountByUser(days: number = 30): Promise<CountByUser[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT
        u.user_id as userId,
        u.name,
        COUNT(DISTINCT ccp.plan_id) as counts_completed,
        SUM(CASE WHEN ccp.status = 'COMPLETED' THEN
          (SELECT COUNT(*) FROM cycle_count_entries WHERE plan_id = ccp.plan_id)
        ELSE 0 END) as items_counted,
        AVG(CASE
          WHEN EXISTS (
            SELECT 1 FROM cycle_count_entries cce
            WHERE cce.plan_id = ccp.plan_id AND cce.variance = 0
          ) THEN 100
          ELSE COALESCE((
            SELECT 100 - LEAST(ABS(AVG(cce.variance_percent)), 100)
            FROM cycle_count_entries cce
            WHERE cce.plan_id = ccp.plan_id
          ), 0)
        END) as average_accuracy
       FROM cycle_count_plans ccp
       INNER JOIN users u ON ccp.count_by = u.user_id
       WHERE ccp.created_at >= NOW() - INTERVAL '${days} days'
         AND ccp.status IN ('COMPLETED', 'RECONCILED')
       GROUP BY u.user_id, u.name
       ORDER BY counts_completed DESC`
    );

    return result.rows.map(row => ({
      userId: row.userid,
      name: row.name,
      countsCompleted: parseInt(row.counts_completed),
      itemsCounted: parseInt(row.items_counted),
      averageAccuracy: Math.round((parseFloat(row.average_accuracy) || 0) * 100) / 100,
    }));
  }

  /**
   * Get performance by zone
   */
  async getZonePerformance(days: number = 30): Promise<ZonePerformance[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT
        SUBSTRING(ccp.location, 1, 1) as zone,
        COUNT(DISTINCT ccp.plan_id) as counts_completed,
        SUM((SELECT COUNT(*) FROM cycle_count_entries WHERE plan_id = ccp.plan_id)) as items_counted,
        AVG(CASE
          WHEN EXISTS (
            SELECT 1 FROM cycle_count_entries cce
            WHERE cce.plan_id = ccp.plan_id AND cce.variance = 0
          ) THEN 100
          ELSE COALESCE((
            SELECT 100 - LEAST(ABS(AVG(cce.variance_percent)), 100)
            FROM cycle_count_entries cce
            WHERE cce.plan_id = ccp.plan_id
          ), 0)
        END) as average_accuracy,
        SUM((SELECT SUM(ABS(variance)) FROM cycle_count_entries WHERE plan_id = ccp.plan_id)) as total_variance
       FROM cycle_count_plans ccp
       WHERE ccp.created_at >= NOW() - INTERVAL '${days} days'
         AND ccp.status IN ('COMPLETED', 'RECONCILED')
         AND ccp.location IS NOT NULL
       GROUP BY SUBSTRING(ccp.location, 1, 1)
       ORDER BY zone ASC`
    );

    return result.rows.map(row => ({
      zone: row.zone,
      countsCompleted: parseInt(row.counts_completed),
      itemsCounted: parseInt(row.items_counted),
      averageAccuracy: Math.round((parseFloat(row.average_accuracy) || 0) * 100) / 100,
      totalVariance: parseFloat(row.total_variance) || 0,
    }));
  }

  /**
   * Get effectiveness by count type
   */
  async getCountTypeEffectiveness(days: number = 90): Promise<CountTypeEffectiveness[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT
        ccp.count_type as countType,
        COUNT(*) as counts_completed,
        AVG(CASE
          WHEN EXISTS (
            SELECT 1 FROM cycle_count_entries cce
            WHERE cce.plan_id = ccp.plan_id AND cce.variance != 0
          ) THEN 1 ELSE 0
        END) as variance_detection_rate,
        AVG(CASE
          WHEN EXISTS (
            SELECT 1 FROM cycle_count_entries cce
            WHERE cce.plan_id = ccp.plan_id AND cce.variance = 0
          ) THEN 100
          ELSE COALESCE((
            SELECT 100 - LEAST(ABS(AVG(cce.variance_percent)), 100)
            FROM cycle_count_entries cce
            WHERE cce.plan_id = ccp.plan_id
          ), 0)
        END) as average_accuracy,
        AVG(EXTRACT(EPOCH FROM (ccp.completed_at - ccp.started_at)) / 3600) as average_duration
       FROM cycle_count_plans ccp
       WHERE ccp.created_at >= NOW() - INTERVAL '${days} days'
         AND ccp.status IN ('COMPLETED', 'RECONCILED')
         AND ccp.started_at IS NOT NULL
         AND ccp.completed_at IS NOT NULL
       GROUP BY ccp.count_type
       ORDER BY counts_completed DESC`
    );

    return result.rows.map(row => ({
      countType: row.counttype,
      countsCompleted: parseInt(row.counts_completed),
      varianceDetectionRate:
        Math.round((parseFloat(row.variance_detection_rate) || 0) * 10000) / 100,
      averageAccuracy: Math.round((parseFloat(row.average_accuracy) || 0) * 100) / 100,
      averageDuration: Math.round((parseFloat(row.average_duration) || 0) * 100) / 100,
    }));
  }

  /**
   * Get daily statistics for charts
   */
  async getDailyStats(days: number = 30): Promise<DailyStats[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT
        DATE(ccp.created_at) as date,
        COUNT(DISTINCT ccp.plan_id) as counts_completed,
        SUM((SELECT COUNT(*) FROM cycle_count_entries WHERE plan_id = ccp.plan_id)) as items_counted,
        SUM((SELECT COUNT(*) FROM cycle_count_entries WHERE plan_id = ccp.plan_id AND variance != 0)) as variances_found,
        AVG(CASE
          WHEN EXISTS (
            SELECT 1 FROM cycle_count_entries cce
            WHERE cce.plan_id = ccp.plan_id AND cce.variance = 0
          ) THEN 100
          ELSE COALESCE((
            SELECT 100 - LEAST(ABS(AVG(cce.variance_percent)), 100)
            FROM cycle_count_entries cce
            WHERE cce.plan_id = ccp.plan_id
          ), 0)
        END) as accuracy_rate
       FROM cycle_count_plans ccp
       WHERE ccp.created_at >= NOW() - INTERVAL '${days} days'
         AND ccp.status IN ('COMPLETED', 'RECONCILED')
       GROUP BY DATE(ccp.created_at)
       ORDER BY date ASC`
    );

    return result.rows.map(row => ({
      date: row.date,
      countsCompleted: parseInt(row.counts_completed),
      itemsCounted: parseInt(row.items_counted),
      variancesFound: parseInt(row.variances_found),
      accuracyRate: Math.round((parseFloat(row.accuracy_rate) || 0) * 100) / 100,
    }));
  }

  /**
   * Get real-time dashboard data (aggregates all KPIs)
   */
  async getRealTimeDashboard(filters?: {
    startDate?: Date;
    endDate?: Date;
    location?: string;
    countType?: string;
  }) {
    const [
      overallKPIs,
      accuracyTrend,
      topDiscrepancies,
      userPerformance,
      zonePerformance,
      countTypeEffectiveness,
      dailyStats,
    ] = await Promise.all([
      this.getOverallKPIs(filters),
      this.getAccuracyTrend(30),
      this.getTopDiscrepancySKUs(10, 30),
      this.getCountByUser(30),
      this.getZonePerformance(30),
      this.getCountTypeEffectiveness(90),
      this.getDailyStats(30),
    ]);

    return {
      overallKPIs,
      accuracyTrend,
      topDiscrepancies,
      userPerformance,
      zonePerformance,
      countTypeEffectiveness,
      dailyStats,
    };
  }
}

// Singleton instance
export const cycleCountKPIService = new CycleCountKPIService();
