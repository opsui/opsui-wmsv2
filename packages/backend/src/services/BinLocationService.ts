/**
 * Bin Location Service
 *
 * Manages warehouse bin location CRUD operations
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { BinLocation, CreateBinLocationDTO, UpdateBinLocationDTO, BinType } from '@opsui/shared';

// ============================================================================
// BIN LOCATION SERVICE
// ============================================================================

export class BinLocationService {
  /**
   * Create a new bin location
   */
  async createBinLocation(dto: CreateBinLocationDTO): Promise<BinLocation> {
    const client = await getPool();

    // Validate bin_id format: Z-A-S (e.g., A-12-03)
    const binIdPattern = /^[A-Z]-\d{1,3}-\d{2}$/;
    if (!binIdPattern.test(dto.binId)) {
      throw new Error('Invalid bin ID format. Expected format: Zone-Aisle-Shelf (e.g., A-12-03)');
    }

    // Check if bin location already exists
    const existingResult = await client.query(
      `SELECT bin_id FROM bin_locations WHERE bin_id = $1`,
      [dto.binId]
    );

    if (existingResult.rows.length > 0) {
      throw new Error(`Bin location ${dto.binId} already exists`);
    }

    // Insert new bin location
    await client.query(
      `INSERT INTO bin_locations (bin_id, zone, aisle, shelf, type, active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [dto.binId, dto.zone, dto.aisle, dto.shelf, dto.type]
    );

    logger.info('Bin location created', { binId: dto.binId });

    return await this.getBinLocation(dto.binId);
  }

  /**
   * Get all bin locations
   */
  async getAllBinLocations(filters?: {
    zone?: string;
    type?: BinType;
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ locations: BinLocation[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.zone) {
      conditions.push(`zone = $${paramCount}`);
      params.push(filters.zone);
      paramCount++;
    }

    if (filters?.type) {
      conditions.push(`type = $${paramCount}`);
      params.push(filters.type);
      paramCount++;
    }

    if (filters?.active !== undefined) {
      conditions.push(`active = $${paramCount}`);
      params.push(filters.active);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM bin_locations WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM bin_locations
       WHERE ${whereClause}
       ORDER BY zone, aisle, shelf
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const locations = result.rows.map(row => this.mapRowToBinLocation(row));

    return { locations, total };
  }

  /**
   * Get a specific bin location by ID
   */
  async getBinLocation(binId: string): Promise<BinLocation> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM bin_locations WHERE bin_id = $1`, [binId]);

    if (result.rows.length === 0) {
      throw new Error(`Bin location ${binId} not found`);
    }

    return this.mapRowToBinLocation(result.rows[0]);
  }

  /**
   * Update a bin location
   */
  async updateBinLocation(binId: string, updates: UpdateBinLocationDTO): Promise<BinLocation> {
    const client = await getPool();

    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let paramCount = 1;

    if (updates.zone !== undefined) {
      updateFields.push(`zone = $${paramCount}`);
      updateParams.push(updates.zone);
      paramCount++;
    }

    if (updates.aisle !== undefined) {
      updateFields.push(`aisle = $${paramCount}`);
      updateParams.push(updates.aisle);
      paramCount++;
    }

    if (updates.shelf !== undefined) {
      updateFields.push(`shelf = $${paramCount}`);
      updateParams.push(updates.shelf);
      paramCount++;
    }

    if (updates.type !== undefined) {
      updateFields.push(`type = $${paramCount}`);
      updateParams.push(updates.type);
      paramCount++;
    }

    if (updates.active !== undefined) {
      updateFields.push(`active = $${paramCount}`);
      updateParams.push(updates.active);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return await this.getBinLocation(binId);
    }

    updateParams.push(binId);

    const result = await client.query(
      `UPDATE bin_locations
       SET ${updateFields.join(', ')}
       WHERE bin_id = $${paramCount}
       RETURNING *`,
      updateParams
    );

    if (result.rows.length === 0) {
      throw new Error(`Bin location ${binId} not found`);
    }

    logger.info('Bin location updated', { binId });

    return this.mapRowToBinLocation(result.rows[0]);
  }

  /**
   * Delete a bin location
   */
  async deleteBinLocation(binId: string): Promise<void> {
    const client = await getPool();

    // Check if location has inventory
    const inventoryResult = await client.query(
      `SELECT COUNT(*) as count FROM inventory_units WHERE bin_location = $1`,
      [binId]
    );

    const inventoryCount = parseInt(inventoryResult.rows[0].count, 10);
    if (inventoryCount > 0) {
      throw new Error(
        `Cannot delete bin location ${binId} because it has ${inventoryCount} inventory units`
      );
    }

    await client.query(`DELETE FROM bin_locations WHERE bin_id = $1`, [binId]);

    logger.info('Bin location deleted', { binId });
  }

  /**
   * Batch create bin locations
   */
  async batchCreateBinLocations(dtos: CreateBinLocationDTO[]): Promise<{
    created: BinLocation[];
    failed: Array<{ dto: CreateBinLocationDTO; error: string }>;
  }> {
    const created: BinLocation[] = [];
    const failed: Array<{ dto: CreateBinLocationDTO; error: string }> = [];

    for (const dto of dtos) {
      try {
        const location = await this.createBinLocation(dto);
        created.push(location);
      } catch (error) {
        failed.push({ dto, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    logger.info('Batch bin location creation completed', {
      total: dtos.length,
      created: created.length,
      failed: failed.length,
    });

    return { created, failed };
  }

  /**
   * Get available zones
   */
  async getZones(): Promise<string[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT DISTINCT zone FROM bin_locations WHERE active = true ORDER BY zone`
    );

    return result.rows.map(row => row.zone);
  }

  /**
   * Get bin locations by zone
   */
  async getBinLocationsByZone(zone: string): Promise<BinLocation[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM bin_locations WHERE zone = $1 AND active = true ORDER BY aisle, shelf`,
      [zone]
    );

    return result.rows.map(row => this.mapRowToBinLocation(row));
  }

  // ==========================================================================
  // MAPPING METHODS
  // ==========================================================================

  private mapRowToBinLocation(row: any): BinLocation {
    return {
      binId: row.bin_id,
      zone: row.zone,
      aisle: row.aisle,
      shelf: row.shelf,
      type: row.type,
      active: row.active,
    };
  }
}

// Singleton instance
export const binLocationService = new BinLocationService();
