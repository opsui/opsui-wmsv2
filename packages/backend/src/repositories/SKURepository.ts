/**
 * SKU repository
 *
 * Handles all database operations for SKU catalog
 */

import { BaseRepository } from './BaseRepository';
import { SKU } from '@opsui/shared';
import { query } from '../db/client';
import { NotFoundError, ConflictError } from '@opsui/shared';

// ============================================================================
// SKU REPOSITORY
// ============================================================================

export class SKURepository extends BaseRepository<SKU> {
  constructor() {
    super('skus', 'sku');
  }

  // --------------------------------------------------------------------------
  // FIND BY CATEGORY
  // --------------------------------------------------------------------------

  async findByCategory(category: string, activeOnly: boolean = true): Promise<SKU[]> {
    const result = await query<SKU>(
      `SELECT * FROM skus
       WHERE category = $1 ${activeOnly ? 'AND active = true' : ''}
       ORDER BY name`,
      [category]
    );

    return result.rows;
  }

  // --------------------------------------------------------------------------
  // GET ALL SKUS
  // --------------------------------------------------------------------------

  async getAllSKUs(activeOnly: boolean = true, limit: number = 100): Promise<SKU[]> {
    const result = await query<SKU>(
      `SELECT * FROM skus
       ${activeOnly ? 'WHERE active = true' : ''}
       ORDER BY name
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  // --------------------------------------------------------------------------
  // SEARCH SKUS
  // --------------------------------------------------------------------------

  async search(searchTerm: string, activeOnly: boolean = true): Promise<SKU[]> {
    const result = await query<SKU>(
      `SELECT * FROM skus
       WHERE (sku ILIKE $1 OR name ILIKE $1 OR description ILIKE $1)
       ${activeOnly ? 'AND active = true' : ''}
       ORDER BY name
       LIMIT 50`,
      [`%${searchTerm}%`]
    );

    return result.rows;
  }

  // --------------------------------------------------------------------------
  // GET CATEGORIES
  // --------------------------------------------------------------------------

  async getCategories(): Promise<string[]> {
    const result = await query<{ category: string }>(
      `SELECT DISTINCT category FROM skus WHERE active = true ORDER BY category`
    );

    return result.rows.map(row => row.category);
  }

  // --------------------------------------------------------------------------
  // CREATE SKU
  // --------------------------------------------------------------------------

  async createSKU(data: {
    sku: string;
    name: string;
    description: string;
    image?: string;
    category: string;
    binLocations: string[];
  }): Promise<SKU> {
    // Check if SKU already exists
    const existing = await this.findById(data.sku);
    if (existing) {
      throw new ConflictError('SKU already exists');
    }

    return this.withTransaction(async client => {
      // Create SKU
      await client.query(
        `INSERT INTO skus (sku, name, description, image, category, bin_locations, active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING *`,
        [
          data.sku,
          data.name,
          data.description,
          data.image || null,
          data.category,
          data.binLocations,
        ]
      );

      // Create inventory units for each bin location
      for (const binLocation of data.binLocations) {
        await client.query(
          `INSERT INTO inventory_units (unit_id, sku, bin_location, quantity, reserved)
           VALUES ($1, $2, $3, 0, 0)
           ON CONFLICT (unit_id) DO NOTHING`,
          [`IU-${data.sku}-${binLocation}`, data.sku, binLocation]
        );
      }

      return this.findByIdOrThrow(data.sku);
    });
  }

  // --------------------------------------------------------------------------
  // UPDATE SKU
  // --------------------------------------------------------------------------

  async updateSKU(
    sku: string,
    data: {
      name?: string;
      description?: string;
      image?: string;
      category?: string;
      binLocations?: string[];
      active?: boolean;
    }
  ): Promise<SKU> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }

    if (data.image !== undefined) {
      updates.push(`image = $${paramIndex++}`);
      params.push(data.image);
    }

    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(data.category);
    }

    if (data.binLocations !== undefined) {
      updates.push(`bin_locations = $${paramIndex++}`);
      params.push(data.binLocations);
    }

    if (data.active !== undefined) {
      updates.push(`active = $${paramIndex++}`);
      params.push(data.active);
    }

    if (updates.length === 0) {
      return this.findByIdOrThrow(sku);
    }

    updates.push(`updated_at = NOW()`);
    params.push(sku);

    const result = await query(
      `UPDATE skus SET ${updates.join(', ')} WHERE sku = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('SKU', sku);
    }

    return result.rows[0] as SKU;
  }

  // --------------------------------------------------------------------------
  // DEACTIVATE SKU
  // --------------------------------------------------------------------------

  async deactivateSKU(sku: string): Promise<SKU> {
    return this.updateSKU(sku, { active: false });
  }

  // --------------------------------------------------------------------------
  // ACTIVATE SKU
  // --------------------------------------------------------------------------

  async activateSKU(sku: string): Promise<SKU> {
    return this.updateSKU(sku, { active: true });
  }

  // --------------------------------------------------------------------------
  // GET SKU WITH INVENTORY
  // --------------------------------------------------------------------------

  async getSKUWithInventory(
    sku: string
  ): Promise<
    SKU & { inventory: Array<{ binLocation: string; quantity: number; available: number }> }
  > {
    const skuData = await this.findByIdOrThrow(sku);

    const inventoryResult = await query(
      `SELECT bin_location, quantity, available
       FROM inventory_units
       WHERE sku = $1
       ORDER BY bin_location`,
      [sku]
    );

    return {
      ...skuData,
      inventory: inventoryResult.rows,
    } as any;
  }
}

// Singleton instance
export const skuRepository = new SKURepository();
