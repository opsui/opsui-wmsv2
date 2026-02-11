/**
 * Advanced Inventory Service
 *
 * Business logic for advanced inventory management features
 * Landed cost, ABC analysis, demand planning, safety stock, cycle count optimization
 */

import { query } from '../db/client';
import {
  LandedCostComponent,
  InventoryLayer,
  ABCAnalysis,
  ABCAnalysisDetail,
  DemandForecast,
  DemandForecastDetail,
  CycleCountOptimization,
  CycleCountSchedule,
  SafetyStockLevel,
  SlowMovingInventory,
  SafetyStockAlert,
  CreateLandedCostComponentDTO,
  CreateABCAnalysisDTO,
  CreateDemandForecastDTO,
  CalculateSafetyStockDTO,
  CreateCycleCountOptimizationDTO,
  InventoryLayerSummary,
  ABCClass,
  AllocationMethod,
  ForecastMethod,
  CycleCountStrategy,
  SafetyStockMethod,
} from '@opsui/shared';

// ============================================================================
// SERVICE
// ============================================================================

export class AdvancedInventoryService {
  // ========================================================================
  // LANDED COST
  // ========================================================================

  /**
   * Add landed cost component to a receipt line
   */
  async addLandedCostComponent(dto: CreateLandedCostComponentDTO): Promise<LandedCostComponent> {
    const componentId = `LC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const result = await query<LandedCostComponent>(
      `INSERT INTO landed_cost_components (
        component_id, receipt_line_id, component_type, amount, currency,
        description, vendor_id, allocation_method, reference_document_id,
        reference_document_number, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        componentId,
        dto.receiptLineId,
        dto.componentType,
        dto.amount,
        dto.currency || 'USD',
        dto.description,
        dto.vendorId,
        dto.allocationMethod || AllocationMethod.PROPORTIONAL,
        dto.referenceDocumentId,
        dto.referenceDocumentNumber,
        dto.createdBy,
      ]
    );

    return result.rows[0];
  }

  /**
   * Calculate landed cost for a receipt line
   */
  async calculateLandedCost(receiptLineId: string): Promise<number> {
    const result = await query<{ total_cost: number }>(`SELECT * FROM calculate_landed_cost($1)`, [
      receiptLineId,
    ]);

    return result.rows[0]?.total_cost || 0;
  }

  /**
   * Get inventory layers summary for a SKU
   */
  async getInventoryLayersSummary(sku: string): Promise<InventoryLayerSummary | null> {
    const result = await query<InventoryLayerSummary>(
      `SELECT * FROM v_inventory_layers_summary WHERE sku = $1`,
      [sku]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all inventory layers for a SKU
   */
  async getInventoryLayers(sku: string, includeExhausted = false): Promise<InventoryLayer[]> {
    const queryText = includeExhausted
      ? `SELECT * FROM inventory_layers WHERE sku = $1 ORDER BY layer_date ASC`
      : `SELECT * FROM inventory_layers WHERE sku = $1 AND NOT is_exhausted ORDER BY layer_date ASC`;

    const result = await query<InventoryLayer>(queryText, [sku]);
    return result.rows;
  }

  // ========================================================================
  // ABC ANALYSIS
  // ========================================================================

  /**
   * Run ABC analysis on inventory
   */
  async runABCAnalysis(dto: CreateABCAnalysisDTO): Promise<ABCAnalysis> {
    const result = await query<{ analysis_id: string }>(
      `SELECT run_abc_analysis($1, $2, $3, $4, $5, $6) as analysis_id`,
      [
        dto.analysisName,
        dto.periodStartDate,
        dto.periodEndDate,
        dto.aThreshold || 80,
        dto.bThreshold || 95,
        dto.createdBy,
      ]
    );

    const analysisId = result.rows[0].analysis_id;

    const analysis = await query<ABCAnalysis>(`SELECT * FROM abc_analysis WHERE analysis_id = $1`, [
      analysisId,
    ]);

    return analysis.rows[0];
  }

  /**
   * Get ABC analysis with details
   */
  async getABCAnalysis(analysisId: string): Promise<{
    analysis: ABCAnalysis;
    details: ABCAnalysisDetail[];
  } | null> {
    const analysisResult = await query<ABCAnalysis>(
      `SELECT * FROM abc_analysis WHERE analysis_id = $1`,
      [analysisId]
    );

    if (analysisResult.rows.length === 0) {
      return null;
    }

    const detailsResult = await query<ABCAnalysisDetail>(
      `SELECT * FROM abc_analysis_details WHERE analysis_id = $1 ORDER BY annual_usage_value DESC`,
      [analysisId]
    );

    return {
      analysis: analysisResult.rows[0],
      details: detailsResult.rows,
    };
  }

  /**
   * Get latest ABC analysis
   */
  async getLatestABCAnalysis(): Promise<ABCAnalysis | null> {
    const result = await query<ABCAnalysis>(
      `SELECT * FROM abc_analysis ORDER BY analysis_date DESC LIMIT 1`
    );

    return result.rows[0] || null;
  }

  // ========================================================================
  // DEMAND FORECASTING
  // ========================================================================

  /**
   * Create demand forecast
   */
  async createDemandForecast(dto: CreateDemandForecastDTO): Promise<DemandForecast> {
    const forecastId = `DF-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const result = await query<DemandForecast>(
      `INSERT INTO demand_forecasts (
        forecast_id, forecast_name, forecast_type, forecast_method,
        period_type, forecast_horizon_weeks, historical_periods_used,
        confidence_level, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        forecastId,
        dto.forecastName,
        dto.forecastType,
        dto.forecastMethod,
        dto.periodType,
        dto.forecastHorizonWeeks || 12,
        dto.historicalPeriodsUsed || 12,
        dto.confidenceLevel || 0.95,
        dto.createdBy,
      ]
    );

    const forecast = result.rows[0];

    // Generate forecast details based on historical data
    await this.generateForecastDetails(forecast, dto.skus, dto.locationId);

    return forecast;
  }

  /**
   * Generate forecast details using historical data
   */
  private async generateForecastDetails(
    forecast: DemandForecast,
    skus?: string[],
    locationId?: string
  ): Promise<void> {
    // Get SKUs to forecast (either provided or all with demand history)
    const skuResult = await query<{ sku: string }>(
      `SELECT DISTINCT sku FROM demand_history WHERE $1::text[] IS NULL OR sku = ANY($1::text[])`,
      [skus || null]
    );

    const targetSkus = skuResult.rows.map(r => r.sku);

    for (const sku of targetSkus) {
      // Get historical demand data
      const historyResult = await query<{
        period_start: Date;
        quantity_demanded: number;
      }>(
        `SELECT period_start, quantity_demanded
         FROM demand_history
         WHERE sku = $1
           AND ($2::text IS NULL OR location_id = $2)
         ORDER BY period_start DESC
         LIMIT $3`,
        [sku, locationId || null, forecast.historicalPeriodsUsed]
      );

      const history = historyResult.rows.reverse();

      if (history.length < 3) {
        continue; // Not enough data for forecasting
      }

      // Simple moving average forecast
      const avgDemand =
        history.reduce((sum, h) => sum + Number(h.quantity_demanded), 0) / history.length;

      // Calculate standard deviation
      const variance =
        history.reduce((sum, h) => {
          const diff = Number(h.quantity_demanded) - avgDemand;
          return sum + diff * diff;
        }, 0) / history.length;
      const stdDev = Math.sqrt(variance);

      // Generate forecast for each period in horizon
      for (let week = 1; week <= forecast.forecastHorizonWeeks; week++) {
        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() + week * 7);

        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 7);

        const detailId = `DFD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        await query(
          `INSERT INTO demand_forecast_details (
            detail_id, forecast_id, sku, location_id,
            forecast_period_start, forecast_period_end, forecast_quantity,
            lower_bound_quantity, upper_bound_quantity
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            detailId,
            forecast.forecastId,
            sku,
            locationId,
            periodStart,
            periodEnd,
            avgDemand,
            Math.max(0, avgDemand - 1.96 * stdDev), // Lower bound (95% CI)
            avgDemand + 1.96 * stdDev, // Upper bound (95% CI)
          ]
        );
      }
    }
  }

  /**
   * Get demand forecast with details
   */
  async getDemandForecast(forecastId: string): Promise<{
    forecast: DemandForecast;
    details: DemandForecastDetail[];
  } | null> {
    const forecastResult = await query<DemandForecast>(
      `SELECT * FROM demand_forecasts WHERE forecast_id = $1`,
      [forecastId]
    );

    if (forecastResult.rows.length === 0) {
      return null;
    }

    const detailsResult = await query<DemandForecastDetail>(
      `SELECT * FROM demand_forecast_details WHERE forecast_id = $1 ORDER BY forecast_period_start`,
      [forecastId]
    );

    return {
      forecast: forecastResult.rows[0],
      details: detailsResult.rows,
    };
  }

  // ========================================================================
  // SAFETY STOCK
  // ========================================================================

  /**
   * Calculate and set safety stock for an SKU
   */
  async calculateSafetyStock(dto: CalculateSafetyStockDTO): Promise<SafetyStockLevel> {
    // Get historical demand data for calculations
    const demandResult = await query<{
      avg_daily_demand: number;
      demand_std_dev: number;
    }>(
      `SELECT
         AVG(quantity_demanded / EXTRACT(DAY FROM period_end - period_start + 1)) as avg_daily_demand,
         STDDEV(quantity_demanded / EXTRACT(DAY FROM period_end - period_start + 1)) as demand_std_dev
       FROM demand_history
       WHERE sku = $1
         AND ($2::text IS NULL OR location_id = $2)
       GROUP BY sku`,
      [dto.sku, dto.locationId || null]
    );

    const demandData = demandResult.rows[0];

    if (!demandData) {
      throw new Error('No demand history found for SKU');
    }

    const avgDailyDemand = Number(demandData.avg_daily_demand) || 0;
    const demandStdDev = Number(demandData.demand_std_dev) || 0;
    const leadTimeDays = dto.leadTimeDays || 7;
    const serviceLevel = dto.serviceLevelTarget || 0.95;

    // Calculate Z-score (simplified)
    const zScore = this.getZScore(serviceLevel);

    // Calculate safety stock
    const safetyStock = Math.ceil(zScore * demandStdDev * Math.sqrt(leadTimeDays));

    // Calculate reorder point = (daily demand * lead time) + safety stock
    const reorderPoint = Math.ceil(avgDailyDemand * leadTimeDays + safetyStock);

    // Check if safety stock already exists
    const existingResult = await query<SafetyStockLevel>(
      `SELECT * FROM safety_stock_levels WHERE sku = $1 AND ($2::text IS NULL OR location_id = $2)`,
      [dto.sku, dto.locationId || null]
    );

    if (existingResult.rows.length > 0) {
      // Update existing
      const result = await query<SafetyStockLevel>(
        `UPDATE safety_stock_levels
         SET lead_time_days = $1, demand_standard_deviation = $2, service_level_target = $3,
             safety_stock_quantity = $4, reorder_point = $5, min_order_quantity = $6,
             max_order_quantity = $7, calculation_method = $8, calculated_by = $9,
             last_calculated_at = NOW()
         WHERE sku = $10 AND ($11::text IS NULL OR location_id = $11)
         RETURNING *`,
        [
          leadTimeDays,
          demandStdDev,
          serviceLevel,
          safetyStock,
          reorderPoint,
          dto.minOrderQuantity,
          dto.maxOrderQuantity,
          dto.calculationMethod || SafetyStockMethod.SERVICE_LEVEL,
          dto.calculatedBy,
          dto.sku,
          dto.locationId || null,
        ]
      );

      return result.rows[0];
    } else {
      // Create new
      const safetyStockId = `SS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const result = await query<SafetyStockLevel>(
        `INSERT INTO safety_stock_levels (
          safety_stock_id, sku, location_id, calculation_method,
          lead_time_days, demand_standard_deviation, service_level_target,
          safety_stock_quantity, reorder_point, min_order_quantity,
          max_order_quantity, calculated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          safetyStockId,
          dto.sku,
          dto.locationId,
          dto.calculationMethod || SafetyStockMethod.SERVICE_LEVEL,
          leadTimeDays,
          demandStdDev,
          serviceLevel,
          safetyStock,
          reorderPoint,
          dto.minOrderQuantity,
          dto.maxOrderQuantity,
          dto.calculatedBy,
        ]
      );

      return result.rows[0];
    }
  }

  /**
   * Get Z-score for service level (simplified)
   */
  private getZScore(serviceLevel: number): number {
    if (serviceLevel >= 0.99) return 2.33;
    if (serviceLevel >= 0.95) return 1.645;
    if (serviceLevel >= 0.9) return 1.28;
    if (serviceLevel >= 0.85) return 1.04;
    return 0.84;
  }

  /**
   * Get safety stock alerts
   */
  async getSafetyStockAlerts(): Promise<SafetyStockAlert[]> {
    const result = await query<SafetyStockAlert>(`SELECT * FROM v_safety_stock_alerts`);

    return result.rows;
  }

  // ========================================================================
  // CYCLE COUNT OPTIMIZATION
  // ========================================================================

  /**
   * Create cycle count optimization plan
   */
  async createCycleCountOptimization(
    dto: CreateCycleCountOptimizationDTO
  ): Promise<CycleCountOptimization> {
    const optimizationId = `CCOPT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Create optimization header
    const result = await query<CycleCountOptimization>(
      `INSERT INTO cycle_count_optimization (
        optimization_id, optimization_name, optimization_strategy,
        count_frequency_a, count_frequency_b, count_frequency_c,
        target_accuracy, resource_constraints, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        optimizationId,
        dto.optimizationName,
        dto.optimizationStrategy || CycleCountStrategy.ABC_BASED,
        dto.countFrequencyA || 30,
        dto.countFrequencyB || 60,
        dto.countFrequencyC || 90,
        dto.targetAccuracy || 0.98,
        dto.resourceConstraints,
        dto.createdBy,
      ]
    );

    // Generate cycle count schedule
    await this.generateCycleCountSchedule(optimizationId, dto);

    return result.rows[0];
  }

  /**
   * Generate cycle count schedule based on strategy
   */
  private async generateCycleCountSchedule(
    optimizationId: string,
    dto: CreateCycleCountOptimizationDTO
  ): Promise<void> {
    // Get latest ABC analysis for classification
    const abcResult = await query<ABCAnalysis>(
      `SELECT * FROM abc_analysis ORDER BY analysis_date DESC LIMIT 1`
    );

    let abcDetails: ABCAnalysisDetail[] = [];

    if (abcResult.rows.length > 0) {
      const detailsResult = await query<ABCAnalysisDetail>(
        `SELECT * FROM abc_analysis_details WHERE analysis_id = $1`,
        [abcResult.rows[0].analysisId]
      );

      abcDetails = detailsResult.rows;
    }

    // Get all inventory items
    const inventoryResult = await query<{
      sku: string;
      bin_location: string;
      quantity: number;
    }>(`SELECT sku, bin_location, quantity FROM inventory WHERE quantity > 0`);

    const totalItems = inventoryResult.rowCount || 0;

    await query(
      `UPDATE cycle_count_optimization
       SET total_items_to_count = $1
       WHERE optimization_id = $2`,
      [totalItems, optimizationId]
    );

    // Create schedule for each item
    for (const item of inventoryResult.rows) {
      // Get ABC class
      const abcDetail = abcDetails.find(d => d.sku === item.sku);
      const abcClass = abcDetail?.abcClass || ABCClass.C;

      // Determine priority and frequency
      let priority: string;
      let frequency: number;

      switch (abcClass) {
        case ABCClass.A:
          priority = 'HIGH';
          frequency = dto.countFrequencyA || 30;
          break;
        case ABCClass.B:
          priority = 'MEDIUM';
          frequency = dto.countFrequencyB || 60;
          break;
        default:
          priority = 'LOW';
          frequency = dto.countFrequencyC || 90;
      }

      // Calculate planned count date
      const plannedDate = new Date();
      plannedDate.setDate(plannedDate.getDate() + frequency);

      const scheduleId = `CCSCH-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      await query(
        `INSERT INTO cycle_count_schedule (
          schedule_id, optimization_id, sku, location_id,
          priority, planned_count_date, count_frequency_days, abc_class
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          scheduleId,
          optimizationId,
          item.sku,
          item.bin_location,
          priority,
          plannedDate,
          frequency,
          abcClass,
        ]
      );
    }
  }

  /**
   * Get cycle count schedule for a date range
   */
  async getCycleCountSchedule(startDate: Date, endDate: Date): Promise<CycleCountSchedule[]> {
    const result = await query<CycleCountSchedule>(
      `SELECT * FROM cycle_count_schedule
       WHERE planned_count_date >= $1 AND planned_count_date <= $2
         AND status = 'PENDING'
       ORDER BY planned_count_date, priority DESC`,
      [startDate, endDate]
    );

    return result.rows;
  }

  // ========================================================================
  // SLOW MOVING INVENTORY
  // ========================================================================

  /**
   * Get slow moving inventory report
   */
  async getSlowMovingInventory(thresholdDays = 90): Promise<SlowMovingInventory[]> {
    const result = await query<SlowMovingInventory>(
      `SELECT * FROM v_slow_moving_inventory
       WHERE days_since_movement >= $1
       ORDER BY days_since_movement DESC`,
      [thresholdDays]
    );

    return result.rows;
  }

  /**
   * Get inventory investment analysis
   */
  async getInventoryInvestmentAnalysis(periodStart: Date, periodEnd: Date) {
    // This would calculate investment breakdown by velocity
    // For now, return summary data
    const result = await query<{
      total_investment: number;
      fast_moving_investment: number;
      slow_moving_investment: number;
      obsolete_investment: number;
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN velocity_status = 'ACTIVE' THEN inventory_value ELSE 0 END), 0) as total_investment,
         COALESCE(SUM(CASE WHEN velocity_status = 'ACTIVE' THEN inventory_value ELSE 0 END), 0) as fast_moving_investment,
         COALESCE(SUM(CASE WHEN velocity_status = 'SLOW' THEN inventory_value ELSE 0 END), 0) as slow_moving_investment,
         COALESCE(SUM(CASE WHEN velocity_status IN ('OBSOLETE', 'DEAD') THEN inventory_value ELSE 0 END), 0) as obsolete_investment
       FROM v_slow_moving_inventory`
    );

    return result.rows[0];
  }
}

// Export singleton instance
export const advancedInventoryService = new AdvancedInventoryService();
