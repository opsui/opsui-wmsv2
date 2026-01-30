/**
 * Location Capacity Service
 *
 * Manages location capacity rules, utilization tracking, and alerts
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';
import {
  LocationCapacity,
  CapacityRule,
  CapacityAlert,
  CreateCapacityRuleDTO,
  AcknowledgeCapacityAlertDTO,
  CapacityType,
  CapacityUnit,
  CapacityRuleStatus,
  BinType,
} from '@opsui/shared';

// ============================================================================
// LOCATION CAPACITY SERVICE
// ============================================================================

export class LocationCapacityService {
  // ==========================================================================
  // CAPACITY RULE METHODS
  // ==========================================================================

  /**
   * Create a new capacity rule
   */
  async createCapacityRule(dto: CreateCapacityRuleDTO): Promise<CapacityRule> {
    const client = await getPool();

    const ruleId = `CRULE-${nanoid(10)}`.toUpperCase();

    const result = await client.query(
      `INSERT INTO capacity_rules
        (rule_id, rule_name, description, capacity_type, capacity_unit, applies_to,
         zone, location_type, specific_location, maximum_capacity, warning_threshold,
         allow_overfill, overfill_threshold, is_active, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14)
       RETURNING *`,
      [
        ruleId,
        dto.ruleName,
        dto.description || null,
        dto.capacityType,
        dto.capacityUnit,
        dto.appliesTo,
        dto.zone || null,
        dto.locationType || null,
        dto.specificLocation || null,
        dto.maximumCapacity,
        dto.warningThreshold,
        dto.allowOverfill,
        dto.overfillThreshold || null,
        dto.priority,
      ]
    );

    logger.info('Capacity rule created', { ruleId, ruleName: dto.ruleName });

    // Apply rule to matching locations
    await this.applyCapacityRuleToLocations(ruleId);

    return this.mapRowToCapacityRule(result.rows[0]);
  }

  /**
   * Get all capacity rules
   */
  async getAllCapacityRules(): Promise<CapacityRule[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM capacity_rules ORDER BY priority DESC, rule_name`
    );

    return result.rows.map(row => this.mapRowToCapacityRule(row));
  }

  /**
   * Get capacity rule by ID
   */
  async getCapacityRule(ruleId: string): Promise<CapacityRule> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM capacity_rules WHERE rule_id = $1`, [ruleId]);

    if (result.rows.length === 0) {
      throw new Error(`Capacity rule ${ruleId} not found`);
    }

    return this.mapRowToCapacityRule(result.rows[0]);
  }

  /**
   * Update capacity rule
   */
  async updateCapacityRule(
    ruleId: string,
    updates: Partial<CreateCapacityRuleDTO> & { isActive?: boolean }
  ): Promise<CapacityRule> {
    const client = await getPool();

    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let paramCount = 1;

    if (updates.ruleName !== undefined) {
      updateFields.push(`rule_name = $${paramCount}`);
      updateParams.push(updates.ruleName);
      paramCount++;
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      updateParams.push(updates.description);
      paramCount++;
    }

    if (updates.maximumCapacity !== undefined) {
      updateFields.push(`maximum_capacity = $${paramCount}`);
      updateParams.push(updates.maximumCapacity);
      paramCount++;
    }

    if (updates.warningThreshold !== undefined) {
      updateFields.push(`warning_threshold = $${paramCount}`);
      updateParams.push(updates.warningThreshold);
      paramCount++;
    }

    if (updates.allowOverfill !== undefined) {
      updateFields.push(`allow_overfill = $${paramCount}`);
      updateParams.push(updates.allowOverfill);
      paramCount++;
    }

    if (updates.priority !== undefined) {
      updateFields.push(`priority = $${paramCount}`);
      updateParams.push(updates.priority);
      paramCount++;
    }

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      updateParams.push(updates.isActive);
      paramCount++;
    }

    updateFields.push('updated_at = NOW()');
    updateParams.push(ruleId);

    const result = await client.query(
      `UPDATE capacity_rules
       SET ${updateFields.join(', ')}
       WHERE rule_id = $${paramCount}
       RETURNING *`,
      updateParams
    );

    if (result.rows.length === 0) {
      throw new Error(`Capacity rule ${ruleId} not found`);
    }

    logger.info('Capacity rule updated', { ruleId });

    // Reapply rule to locations
    await this.applyCapacityRuleToLocations(ruleId);

    return await this.getCapacityRule(ruleId);
  }

  /**
   * Delete capacity rule
   */
  async deleteCapacityRule(ruleId: string): Promise<void> {
    const client = await getPool();

    await client.query(`DELETE FROM capacity_rules WHERE rule_id = $1`, [ruleId]);

    logger.info('Capacity rule deleted', { ruleId });
  }

  // ==========================================================================
  // LOCATION CAPACITY METHODS
  // ==========================================================================

  /**
   * Get capacity for a specific location
   */
  async getLocationCapacity(binLocation: string): Promise<LocationCapacity> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM location_capacities WHERE bin_location = $1`, [
      binLocation,
    ]);

    if (result.rows.length === 0) {
      throw new Error(`Location capacity for ${binLocation} not found`);
    }

    return this.mapRowToLocationCapacity(result.rows[0]);
  }

  /**
   * Get all location capacities with optional filters
   */
  async getAllLocationCapacities(filters?: {
    capacityType?: CapacityType;
    status?: CapacityRuleStatus;
    showAlertsOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ capacities: LocationCapacity[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.capacityType) {
      conditions.push(`capacity_type = $${paramCount}`);
      params.push(filters.capacityType);
      paramCount++;
    }

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.showAlertsOnly) {
      conditions.push(`status IN ('WARNING', 'EXCEEDED')`);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM location_capacities WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM location_capacities
       WHERE ${whereClause}
       ORDER BY utilization_percent DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const capacities = result.rows.map(row => this.mapRowToLocationCapacity(row));

    return { capacities, total };
  }

  /**
   * Recalculate capacity utilization for a location
   */
  async recalculateLocationCapacity(binLocation: string): Promise<LocationCapacity> {
    const client = await getPool();

    // Get current inventory for this location
    const inventoryResult = await client.query(
      `SELECT COALESCE(SUM(quantity), 0) as total_quantity FROM inventory_units WHERE bin_location = $1`,
      [binLocation]
    );

    const currentQuantity = parseFloat(inventoryResult.rows[0].total_quantity);

    // Get capacity rule for this location
    const capacityRules = await this.getApplicableCapacityRules(binLocation);

    // For each capacity type, update or create capacity record
    for (const rule of capacityRules) {
      await this.updateLocationCapacityForRule(binLocation, currentQuantity, rule);
    }

    // Get the primary capacity (usually quantity) for return
    const result = await client.query(
      `SELECT * FROM location_capacities
       WHERE bin_location = $1 AND capacity_type = 'QUANTITY'
       ORDER BY priority DESC LIMIT 1`,
      [binLocation]
    );

    if (result.rows.length > 0) {
      return this.mapRowToLocationCapacity(result.rows[0]);
    }

    // If no capacity record exists, create a default one
    return await this.createDefaultLocationCapacity(binLocation, currentQuantity);
  }

  /**
   * Update location capacity for a specific rule
   */
  private async updateLocationCapacityForRule(
    binLocation: string,
    currentUtilization: number,
    rule: CapacityRule
  ): Promise<void> {
    const client = await getPool();

    const maximumCapacity = rule.maximumCapacity;
    const availableCapacity = Math.max(0, maximumCapacity - currentUtilization);
    const utilizationPercent = (currentUtilization / maximumCapacity) * 100;

    // Determine status
    let status = CapacityRuleStatus.ACTIVE;
    if (utilizationPercent >= 100) {
      status = CapacityRuleStatus.EXCEEDED;
    } else if (utilizationPercent >= rule.warningThreshold) {
      status = CapacityRuleStatus.WARNING;
    }

    // Check if capacity record exists
    const existingResult = await client.query(
      `SELECT * FROM location_capacities
       WHERE bin_location = $1 AND capacity_type = $2`,
      [binLocation, rule.capacityType]
    );

    if (existingResult.rows.length > 0) {
      // Update existing
      await client.query(
        `UPDATE location_capacities
         SET current_utilization = $1,
             available_capacity = $2,
             utilization_percent = $3,
             status = $4,
             exceeded_at = CASE WHEN $5 = 'EXCEEDED' AND status != 'EXCEEDED' THEN NOW() ELSE exceeded_at END,
             last_updated = NOW(),
             updated_at = NOW()
         WHERE bin_location = $6 AND capacity_type = $7`,
        [
          currentUtilization,
          availableCapacity,
          utilizationPercent,
          status,
          status,
          binLocation,
          rule.capacityType,
        ]
      );

      // Create alert if needed
      if (status === CapacityRuleStatus.EXCEEDED || status === CapacityRuleStatus.WARNING) {
        await this.createCapacityAlert(
          binLocation,
          rule.capacityType,
          currentUtilization,
          maximumCapacity,
          utilizationPercent,
          status
        );
      }
    } else {
      // Create new
      const capacityId = `LCAP-${nanoid(10)}`.toUpperCase();
      await client.query(
        `INSERT INTO location_capacities
          (capacity_id, bin_location, capacity_type, maximum_capacity, current_utilization,
           available_capacity, utilization_percent, capacity_unit, status, warning_threshold, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          capacityId,
          binLocation,
          rule.capacityType,
          maximumCapacity,
          currentUtilization,
          availableCapacity,
          utilizationPercent,
          rule.capacityUnit,
          status,
          rule.warningThreshold,
        ]
      );

      // Create alert if needed
      if (status === CapacityRuleStatus.EXCEEDED || status === CapacityRuleStatus.WARNING) {
        await this.createCapacityAlert(
          binLocation,
          rule.capacityType,
          currentUtilization,
          maximumCapacity,
          utilizationPercent,
          status
        );
      }
    }
  }

  /**
   * Create default location capacity
   */
  private async createDefaultLocationCapacity(
    binLocation: string,
    currentQuantity: number
  ): Promise<LocationCapacity> {
    const client = await getPool();

    const capacityId = `LCAP-${nanoid(10)}`.toUpperCase();
    const defaultCapacity = 100; // Default capacity
    const utilizationPercent = (currentQuantity / defaultCapacity) * 100;

    await client.query(
      `INSERT INTO location_capacities
        (capacity_id, bin_location, capacity_type, maximum_capacity, current_utilization,
         available_capacity, utilization_percent, capacity_unit, status, warning_threshold, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        capacityId,
        binLocation,
        CapacityType.QUANTITY,
        defaultCapacity,
        currentQuantity,
        Math.max(0, defaultCapacity - currentQuantity),
        utilizationPercent,
        CapacityUnit.UNITS,
        CapacityRuleStatus.ACTIVE,
        80,
      ]
    );

    return await this.getLocationCapacity(binLocation);
  }

  // ==========================================================================
  // CAPACITY ALERT METHODS
  // ==========================================================================

  /**
   * Get all capacity alerts
   */
  async getAllCapacityAlerts(filters?: {
    acknowledged?: boolean;
    alertType?: 'WARNING' | 'EXCEEDED' | 'CRITICAL';
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: CapacityAlert[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.acknowledged !== undefined) {
      conditions.push(`acknowledged = $${paramCount}`);
      params.push(filters.acknowledged);
      paramCount++;
    }

    if (filters?.alertType) {
      conditions.push(`alert_type = $${paramCount}`);
      params.push(filters.alertType);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM capacity_alerts WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM capacity_alerts
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const alerts = result.rows.map(row => this.mapRowToCapacityAlert(row));

    return { alerts, total };
  }

  /**
   * Acknowledge a capacity alert
   */
  async acknowledgeCapacityAlert(dto: AcknowledgeCapacityAlertDTO): Promise<CapacityAlert> {
    const client = await getPool();

    const result = await client.query(
      `UPDATE capacity_alerts
       SET acknowledged = true,
           acknowledged_by = $1,
           acknowledged_at = NOW()
       WHERE alert_id = $2
       RETURNING *`,
      [dto.acknowledgedBy, dto.alertId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Capacity alert ${dto.alertId} not found`);
    }

    logger.info('Capacity alert acknowledged', { alertId: dto.alertId });

    return this.mapRowToCapacityAlert(result.rows[0]);
  }

  /**
   * Create a capacity alert
   */
  private async createCapacityAlert(
    binLocation: string,
    capacityType: CapacityType,
    currentUtilization: number,
    maximumCapacity: number,
    utilizationPercent: number,
    status: CapacityRuleStatus
  ): Promise<void> {
    const client = await getPool();

    // Check if unacknowledged alert already exists
    const existingAlert = await client.query(
      `SELECT * FROM capacity_alerts
       WHERE bin_location = $1 AND capacity_type = $2 AND acknowledged = false
       ORDER BY created_at DESC LIMIT 1`,
      [binLocation, capacityType]
    );

    if (existingAlert.rows.length > 0) {
      // Update existing alert
      await client.query(
        `UPDATE capacity_alerts
         SET current_utilization = $1,
             utilization_percent = $2,
             alert_message = $3,
             updated_at = NOW()
         WHERE alert_id = $4`,
        [
          currentUtilization,
          utilizationPercent,
          `Location ${binLocation} is at ${utilizationPercent.toFixed(1)}% capacity`,
          existingAlert.rows[0].alert_id,
        ]
      );
      return;
    }

    // Create new alert
    const alertId = `CALT-${nanoid(10)}`.toUpperCase();
    const alertType = status === CapacityRuleStatus.EXCEEDED ? 'EXCEEDED' : 'WARNING';

    await client.query(
      `INSERT INTO capacity_alerts
        (alert_id, bin_location, capacity_type, current_utilization, maximum_capacity,
         utilization_percent, alert_type, alert_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        alertId,
        binLocation,
        capacityType,
        currentUtilization,
        maximumCapacity,
        utilizationPercent,
        alertType,
        `Location ${binLocation} is at ${utilizationPercent.toFixed(1)}% capacity`,
      ]
    );

    logger.info('Capacity alert created', { alertId, binLocation, utilizationPercent });
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Apply capacity rule to matching locations
   */
  private async applyCapacityRuleToLocations(ruleId: string): Promise<void> {
    const client = await getPool();

    const rule = await this.getCapacityRule(ruleId);
    if (!rule.isActive) return;

    // Get matching locations based on rule's applies_to
    let locationQuery = 'SELECT DISTINCT bin_id FROM bin_locations WHERE active = true';
    const params: any[] = [];
    let paramCount = 1;

    if (rule.appliesTo === 'ZONE' && rule.zone) {
      locationQuery += ` AND zone = $${paramCount}`;
      params.push(rule.zone);
      paramCount++;
    } else if (rule.appliesTo === 'LOCATION_TYPE' && rule.locationType) {
      locationQuery += ` AND type = $${paramCount}`;
      params.push(rule.locationType);
      paramCount++;
    } else if (rule.appliesTo === 'SPECIFIC_LOCATION' && rule.specificLocation) {
      locationQuery += ` AND bin_id = $${paramCount}`;
      params.push(rule.specificLocation);
      paramCount++;
    }

    const locationsResult = await client.query(locationQuery, params);

    // Recalculate capacity for each matching location
    for (const row of locationsResult.rows) {
      await this.recalculateLocationCapacity(row.bin_id);
    }
  }

  /**
   * Get applicable capacity rules for a location
   */
  private async getApplicableCapacityRules(binLocation: string): Promise<CapacityRule[]> {
    const client = await getPool();

    // Get location details
    const locationResult = await client.query(`SELECT * FROM bin_locations WHERE bin_id = $1`, [
      binLocation,
    ]);

    if (locationResult.rows.length === 0) {
      return [];
    }

    const location = locationResult.rows[0];
    const zone = location.zone;
    const type = location.type;

    // Get applicable rules in priority order
    const result = await client.query(
      `SELECT * FROM capacity_rules
       WHERE is_active = true
       AND (
         applies_to = 'ALL'
         OR (applies_to = 'ZONE' AND zone = $1)
         OR (applies_to = 'LOCATION_TYPE' AND location_type = $2)
         OR (applies_to = 'SPECIFIC_LOCATION' AND specific_location = $3)
       )
       ORDER BY priority DESC`,
      [zone, type, binLocation]
    );

    return result.rows.map(row => this.mapRowToCapacityRule(row));
  }

  // ==========================================================================
  // MAPPING METHODS
  // ==========================================================================

  private mapRowToCapacityRule(row: any): CapacityRule {
    return {
      ruleId: row.rule_id,
      ruleName: row.rule_name,
      description: row.description,
      capacityType: row.capacity_type,
      capacityUnit: row.capacity_unit,
      appliesTo: row.applies_to,
      zone: row.zone,
      locationType: row.location_type,
      specificLocation: row.specific_location,
      maximumCapacity: parseFloat(row.maximum_capacity),
      warningThreshold: parseFloat(row.warning_threshold),
      allowOverfill: row.allow_overfill,
      overfillThreshold: row.overfill_threshold ? parseFloat(row.overfill_threshold) : undefined,
      isActive: row.is_active,
      priority: parseInt(row.priority, 10),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToLocationCapacity(row: any): LocationCapacity {
    return {
      capacityId: row.capacity_id,
      binLocation: row.bin_location,
      capacityType: row.capacity_type,
      maximumCapacity: parseFloat(row.maximum_capacity),
      currentUtilization: parseFloat(row.current_utilization),
      availableCapacity: parseFloat(row.available_capacity),
      utilizationPercent: parseFloat(row.utilization_percent),
      capacityUnit: row.capacity_unit,
      status: row.status,
      warningThreshold: parseFloat(row.warning_threshold),
      exceededAt: row.exceeded_at ? new Date(row.exceeded_at) : undefined,
      lastUpdated: new Date(row.last_updated),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToCapacityAlert(row: any): CapacityAlert {
    return {
      alertId: row.alert_id,
      binLocation: row.bin_location,
      capacityType: row.capacity_type,
      currentUtilization: parseFloat(row.current_utilization),
      maximumCapacity: parseFloat(row.maximum_capacity),
      utilizationPercent: parseFloat(row.utilization_percent),
      alertType: row.alert_type,
      alertMessage: row.alert_message,
      acknowledged: row.acknowledged,
      acknowledgedBy: row.acknowledged_by,
      acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      createdAt: new Date(row.created_at),
    };
  }
}

// Singleton instance
export const locationCapacityService = new LocationCapacityService();
