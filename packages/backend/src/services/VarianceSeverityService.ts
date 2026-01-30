/**
 * Variance Severity Service
 *
 * Manages configurable variance severity thresholds for cycle counting.
 * Provides severity determination based on variance percentage.
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';

// ============================================================================
// TYPES
// ============================================================================

export interface VarianceSeverityConfig {
  configId: string;
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minVariancePercent: number;
  maxVariancePercent: number;
  requiresApproval: boolean;
  requiresManagerApproval: boolean;
  autoAdjust: boolean;
  colorCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeverityDetermination {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  config: VarianceSeverityConfig;
  requiresApproval: boolean;
  canAutoAdjust: boolean;
  colorCode: string;
}

export interface CreateSeverityConfigDTO {
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minVariancePercent: number;
  maxVariancePercent: number;
  requiresApproval?: boolean;
  requiresManagerApproval?: boolean;
  autoAdjust?: boolean;
  colorCode?: string;
}

export interface UpdateSeverityConfigDTO {
  minVariancePercent?: number;
  maxVariancePercent?: number;
  requiresApproval?: boolean;
  requiresManagerApproval?: boolean;
  autoAdjust?: boolean;
  colorCode?: string;
  isActive?: boolean;
}

// ============================================================================
// VARIANCE SEVERITY SERVICE
// ============================================================================

export class VarianceSeverityService {
  /**
   * Get all active severity configurations
   */
  async getAllSeverityConfigs(includeInactive = false): Promise<VarianceSeverityConfig[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM variance_severity_config
       WHERE $1 OR is_active = true
       ORDER BY min_variance_percent ASC`,
      [includeInactive]
    );

    return result.rows.map(row => this.mapRowToConfig(row));
  }

  /**
   * Get severity configuration by ID
   */
  async getSeverityConfig(configId: string): Promise<VarianceSeverityConfig> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM variance_severity_config WHERE config_id = $1`,
      [configId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Severity config ${configId} not found`);
    }

    return this.mapRowToConfig(result.rows[0]);
  }

  /**
   * Determine severity for a given variance percentage
   */
  async getSeverityForVariance(variancePercent: number): Promise<SeverityDetermination> {
    const client = await getPool();

    const absVariance = Math.abs(variancePercent);

    const result = await client.query(
      `SELECT * FROM variance_severity_config
       WHERE is_active = true
         AND min_variance_percent <= $1
         AND max_variance_percent >= $1
       ORDER BY max_variance_percent ASC
       LIMIT 1`,
      [absVariance]
    );

    if (result.rows.length === 0) {
      // Default to CRITICAL if no matching config found
      logger.warn(
        `No severity config found for variance ${variancePercent}%, defaulting to CRITICAL`
      );
      return {
        severity: 'CRITICAL',
        requiresApproval: true,
        canAutoAdjust: false,
        colorCode: '#EF4444',
        config: this.createDefaultCriticalConfig(),
      };
    }

    const config = this.mapRowToConfig(result.rows[0]);

    return {
      severity: config.severityLevel,
      requiresApproval: config.requiresApproval,
      canAutoAdjust: config.autoAdjust,
      colorCode: config.colorCode,
      config,
    };
  }

  /**
   * Create a new severity configuration
   */
  async createSeverityConfig(dto: CreateSeverityConfigDTO): Promise<VarianceSeverityConfig> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      const configId = `VSC-${nanoid(10)}`.toUpperCase();

      // Validate variance range doesn't overlap with existing
      const overlapResult = await client.query(
        `SELECT COUNT(*) as count FROM variance_severity_config
         WHERE is_active = true
           AND (
             (min_variance_percent <= $1 AND max_variance_percent >= $1) OR
             (min_variance_percent <= $2 AND max_variance_percent >= $2) OR
             (min_variance_percent >= $1 AND max_variance_percent <= $2)
           )`,
        [
          dto.minVariancePercent,
          dto.maxVariancePercent,
          dto.minVariancePercent,
          dto.maxVariancePercent,
        ]
      );

      if (parseInt(overlapResult.rows[0].count) > 0) {
        throw new Error('Variance range overlaps with existing configuration');
      }

      const result = await client.query(
        `INSERT INTO variance_severity_config
          (config_id, severity_level, min_variance_percent, max_variance_percent,
           requires_approval, requires_manager_approval, auto_adjust, color_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          configId,
          dto.severityLevel,
          dto.minVariancePercent,
          dto.maxVariancePercent,
          dto.requiresApproval ?? true,
          dto.requiresManagerApproval ?? false,
          dto.autoAdjust ?? false,
          dto.colorCode || this.getDefaultColorCode(dto.severityLevel),
        ]
      );

      await client.query('COMMIT');

      logger.info('Severity config created', { configId, severityLevel: dto.severityLevel });
      return this.mapRowToConfig(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating severity config', error);
      throw error;
    }
  }

  /**
   * Update an existing severity configuration
   */
  async updateSeverityConfig(
    configId: string,
    dto: UpdateSeverityConfigDTO
  ): Promise<VarianceSeverityConfig> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Get existing config
      const existingResult = await client.query(
        `SELECT * FROM variance_severity_config WHERE config_id = $1`,
        [configId]
      );

      if (existingResult.rows.length === 0) {
        throw new Error(`Severity config ${configId} not found`);
      }

      const existing = this.mapRowToConfig(existingResult.rows[0]);

      // Build update fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (dto.minVariancePercent !== undefined) {
        updates.push(`min_variance_percent = $${paramCount}`);
        values.push(dto.minVariancePercent);
        paramCount++;
      }

      if (dto.maxVariancePercent !== undefined) {
        updates.push(`max_variance_percent = $${paramCount}`);
        values.push(dto.maxVariancePercent);
        paramCount++;
      }

      if (dto.requiresApproval !== undefined) {
        updates.push(`requires_approval = $${paramCount}`);
        values.push(dto.requiresApproval);
        paramCount++;
      }

      if (dto.requiresManagerApproval !== undefined) {
        updates.push(`requires_manager_approval = $${paramCount}`);
        values.push(dto.requiresManagerApproval);
        paramCount++;
      }

      if (dto.autoAdjust !== undefined) {
        updates.push(`auto_adjust = $${paramCount}`);
        values.push(dto.autoAdjust);
        paramCount++;
      }

      if (dto.colorCode !== undefined) {
        updates.push(`color_code = $${paramCount}`);
        values.push(dto.colorCode);
        paramCount++;
      }

      if (dto.isActive !== undefined) {
        updates.push(`is_active = $${paramCount}`);
        values.push(dto.isActive);
        paramCount++;
      }

      updates.push(`updated_at = NOW()`);
      values.push(configId);

      if (updates.length === 1) {
        await client.query('ROLLBACK');
        return existing;
      }

      const result = await client.query(
        `UPDATE variance_severity_config
         SET ${updates.join(', ')}
         WHERE config_id = $${values.length}
         RETURNING *`,
        values
      );

      await client.query('COMMIT');

      logger.info('Severity config updated', { configId });
      return this.mapRowToConfig(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating severity config', error);
      throw error;
    }
  }

  /**
   * Delete a severity configuration (soft delete by setting inactive)
   */
  async deleteSeverityConfig(configId: string): Promise<void> {
    const client = await getPool();

    const result = await client.query(
      `UPDATE variance_severity_config
       SET is_active = false, updated_at = NOW()
       WHERE config_id = $1`,
      [configId]
    );

    if (result.rowCount === 0) {
      throw new Error(`Severity config ${configId} not found`);
    }

    logger.info('Severity config deleted', { configId });
  }

  /**
   * Reset to default severity configurations
   */
  async resetToDefaults(): Promise<void> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Delete all existing configs
      await client.query(`DELETE FROM variance_severity_config`);

      // Insert defaults
      await client.query(
        `INSERT INTO variance_severity_config
          (config_id, severity_level, min_variance_percent, max_variance_percent,
           requires_approval, auto_adjust, color_code) VALUES
          ('severity-low', 'LOW', 0, 2, false, true, '#10B981'),
          ('severity-medium', 'MEDIUM', 2, 5, true, false, '#F59E0B'),
          ('severity-high', 'HIGH', 5, 10, true, false, '#F97316'),
          ('severity-critical', 'CRITICAL', 10, 999999, true, false, '#EF4444')`
      );

      await client.query('COMMIT');

      logger.info('Severity configs reset to defaults');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error resetting severity configs', error);
      throw error;
    }
  }

  /**
   * Initialize default severity configurations
   * Called during system setup
   */
  async createDefaultSeverityConfigs(): Promise<void> {
    const client = await getPool();

    const result = await client.query(`SELECT COUNT(*) as count FROM variance_severity_config`);

    if (parseInt(result.rows[0].count) === 0) {
      await this.resetToDefaults();
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private mapRowToConfig(row: any): VarianceSeverityConfig {
    return {
      configId: row.config_id,
      severityLevel: row.severity_level,
      minVariancePercent: parseFloat(row.min_variance_percent),
      maxVariancePercent: parseFloat(row.max_variance_percent),
      requiresApproval: row.requires_approval,
      requiresManagerApproval: row.requires_manager_approval,
      autoAdjust: row.auto_adjust,
      colorCode: row.color_code,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private createDefaultCriticalConfig(): VarianceSeverityConfig {
    return {
      configId: 'severity-critical-default',
      severityLevel: 'CRITICAL',
      minVariancePercent: 0,
      maxVariancePercent: 999999,
      requiresApproval: true,
      requiresManagerApproval: true,
      autoAdjust: false,
      colorCode: '#EF4444',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getDefaultColorCode(severityLevel: string): string {
    const colors: Record<string, string> = {
      LOW: '#10B981',
      MEDIUM: '#F59E0B',
      HIGH: '#F97316',
      CRITICAL: '#EF4444',
    };
    return colors[severityLevel] || '#000000';
  }
}

// Singleton instance
export const varianceSeverityService = new VarianceSeverityService();
