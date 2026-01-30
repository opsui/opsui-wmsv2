/**
 * Feature Flag Service
 *
 * Manages feature flags for enabling/disabling application features
 */

import { getPool } from '../db/client';

export interface FeatureFlag {
  flag_id: string;
  flag_key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  category: 'picking' | 'packing' | 'inventory' | 'shipping' | 'experimental';
  created_at: Date;
  updated_at: Date;
}

export interface CreateFlagDTO {
  flag_key: string;
  name: string;
  description?: string;
  category: 'picking' | 'packing' | 'inventory' | 'shipping' | 'experimental';
  is_enabled?: boolean;
}

// In-memory cache for feature flags
const flagCache = new Map<string, FeatureFlag>();
let cacheInitialized = false;

/**
 * Initialize the flag cache from database
 */
async function initializeCache(): Promise<void> {
  if (cacheInitialized) return;

  const pool = getPool();
  const result = await pool.query('SELECT * FROM feature_flags ORDER BY category, name');

  flagCache.clear();
  for (const row of result.rows) {
    flagCache.set(row.flag_key, row as FeatureFlag);
  }

  cacheInitialized = true;
}

/**
 * Invalidate cache (call after database updates)
 */
export function invalidateFlagCache(): void {
  cacheInitialized = false;
  flagCache.clear();
}

/**
 * Get a single feature flag by key
 */
export async function getFlag(key: string): Promise<FeatureFlag | null> {
  await initializeCache();

  const flag = flagCache.get(key);
  return flag || null;
}

/**
 * Check if a feature flag is enabled
 */
export async function isFlagEnabled(key: string): Promise<boolean> {
  const flag = await getFlag(key);
  return flag?.is_enabled ?? false;
}

/**
 * Get all feature flags
 */
export async function getAllFlags(): Promise<FeatureFlag[]> {
  await initializeCache();
  return Array.from(flagCache.values()).sort((a, b) => {
    // Sort by category first, then by name
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get feature flags by category
 */
export async function getFlagsByCategory(category: string): Promise<FeatureFlag[]> {
  await initializeCache();
  return Array.from(flagCache.values())
    .filter(flag => flag.category === category)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Set a feature flag's enabled state
 */
export async function setFlag(key: string, enabled: boolean): Promise<FeatureFlag> {
  const pool = getPool();

  const result = await pool.query(
    `UPDATE feature_flags
     SET is_enabled = $1
     WHERE flag_key = $2
     RETURNING *`,
    [enabled, key]
  );

  if (result.rows.length === 0) {
    throw new Error(`Feature flag '${key}' not found`);
  }

  invalidateFlagCache();
  return result.rows[0] as FeatureFlag;
}

/**
 * Create a new feature flag
 */
export async function createFlag(data: CreateFlagDTO): Promise<FeatureFlag> {
  const pool = getPool();

  // Check if flag key already exists
  const existing = await pool.query('SELECT flag_key FROM feature_flags WHERE flag_key = $1', [
    data.flag_key,
  ]);
  if (existing.rows.length > 0) {
    throw new Error(`Feature flag with key '${data.flag_key}' already exists`);
  }

  const result = await pool.query(
    `INSERT INTO feature_flags (flag_key, name, description, is_enabled, category)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.flag_key, data.name, data.description || null, data.is_enabled ?? false, data.category]
  );

  invalidateFlagCache();
  return result.rows[0] as FeatureFlag;
}

/**
 * Delete a feature flag
 */
export async function deleteFlag(key: string): Promise<void> {
  const pool = getPool();

  const result = await pool.query(
    'DELETE FROM feature_flags WHERE flag_key = $1 RETURNING flag_key',
    [key]
  );

  if (result.rows.length === 0) {
    throw new Error(`Feature flag '${key}' not found`);
  }

  invalidateFlagCache();
}

/**
 * Get flag categories with counts
 */
export async function getCategorySummary(): Promise<
  Array<{ category: string; count: number; enabled: number }>
> {
  const pool = getPool();

  const result = await pool.query(`
    SELECT
      category,
      COUNT(*) as count,
      SUM(CASE WHEN is_enabled THEN 1 ELSE 0 END) as enabled
    FROM feature_flags
    GROUP BY category
    ORDER BY category
  `);

  return result.rows;
}
