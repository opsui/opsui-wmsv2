/**
 * Module Subscription Service
 *
 * Manages module subscriptions per entity for modular ERP pricing
 */

import { getPool } from '../db/client';
import {
  ModuleId,
  UserTierId,
  ModuleDefinition,
  MODULE_DEFINITIONS,
  USER_TIERS,
  areDependenciesSatisfied,
  getUnsatisfiedDependencies,
  calculateMonthlyPrice,
  calculateAnnualPrice,
} from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

export type BillingCycle = 'MONTHLY' | 'ANNUAL' | 'TRIAL' | 'CUSTOM';
export type SubscriptionStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'TRIAL'
  | 'PENDING_PAYMENT';

export interface ModuleSubscription {
  subscription_id: string;
  entity_id: string;
  module_id: ModuleId;
  billing_cycle: BillingCycle;
  price_per_period: number;
  currency: string;
  discount_percentage: number;
  subscription_status: SubscriptionStatus;
  subscription_start: Date;
  subscription_end: Date | null;
  trial_ends_at: Date | null;
  last_billing_date: Date | null;
  next_billing_date: Date | null;
  billing_day_of_month: number;
  auto_renew: boolean;
  user_count_at_billing: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

export interface EntityUserTier {
  tier_assignment_id: string;
  entity_id: string;
  tier_id: UserTierId;
  monthly_fee: number;
  currency: string;
  effective_date: Date;
  expiry_date: Date | null;
  current_user_count: number;
  max_user_count: number | null;
  last_billing_date: Date | null;
  next_billing_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AddonSubscription {
  addon_subscription_id: string;
  entity_id: string;
  addon_id: string;
  one_time_fee: number;
  monthly_fee: number;
  currency: string;
  is_active: boolean;
  subscription_start: Date;
  subscription_end: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

export interface CreateModuleSubscriptionDTO {
  entityId: string;
  moduleId: ModuleId;
  billingCycle: BillingCycle;
  customPrice?: number;
  discountPercentage?: number;
  startDate?: Date;
  endDate?: Date;
  notes?: string;
  createdBy?: string;
}

export interface UpdateModuleSubscriptionDTO {
  billingCycle?: BillingCycle;
  pricePerPeriod?: number;
  discountPercentage?: number;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionEnd?: Date | null;
  autoRenew?: boolean;
  notes?: string;
}

export interface EntityBillingSummary {
  entityId: string;
  enabledModules: Array<{
    moduleId: ModuleId;
    moduleName: string;
    pricePerPeriod: number;
    billingCycle: BillingCycle;
    status: SubscriptionStatus;
  }>;
  userTier: {
    tierId: UserTierId;
    tierName: string;
    monthlyFee: number;
    currentUserCount: number;
    maxUserCount: number | null;
  };
  addons: Array<{
    addonId: string;
    monthlyFee: number;
    isActive: boolean;
  }>;
  totals: {
    monthly: number;
    annual: number;
    currency: string;
  };
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

// Cache: entityId -> Set of enabled moduleIds
const moduleCache = new Map<string, Set<ModuleId>>();
// Cache: entityId -> user tier
const tierCache = new Map<string, EntityUserTier>();
let cacheInitialized = false;

/**
 * Initialize cache from database
 */
async function initializeCache(): Promise<void> {
  if (cacheInitialized) return;

  const pool = getPool();

  // Load all active module subscriptions
  const modulesResult = await pool.query(`
    SELECT entity_id, module_id
    FROM module_subscriptions
    WHERE subscription_status IN ('ACTIVE', 'TRIAL')
      AND (subscription_end IS NULL OR subscription_end >= CURRENT_DATE)
  `);

  moduleCache.clear();
  for (const row of modulesResult.rows) {
    const entityId = row.entity_id;
    const moduleId = row.module_id as ModuleId;

    if (!moduleCache.has(entityId)) {
      moduleCache.set(entityId, new Set());
    }
    moduleCache.get(entityId)!.add(moduleId);
  }

  // Load all user tiers
  const tiersResult = await pool.query('SELECT * FROM entity_user_tiers');
  tierCache.clear();
  for (const row of tiersResult.rows) {
    tierCache.set(row.entity_id, row as EntityUserTier);
  }

  cacheInitialized = true;
}

/**
 * Invalidate cache (call after database updates)
 */
export function invalidateModuleCache(): void {
  cacheInitialized = false;
  moduleCache.clear();
  tierCache.clear();
}

// ============================================================================
// MODULE CHECKING FUNCTIONS
// ============================================================================

/**
 * Check if a module is enabled for an entity
 */
export async function isModuleEnabled(entityId: string, moduleId: ModuleId): Promise<boolean> {
  await initializeCache();

  const entityModules = moduleCache.get(entityId);
  if (!entityModules) return false;

  return entityModules.has(moduleId);
}

/**
 * Get all enabled modules for an entity
 */
export async function getEnabledModules(entityId: string): Promise<ModuleId[]> {
  await initializeCache();

  const entityModules = moduleCache.get(entityId);
  if (!entityModules) return [];

  return Array.from(entityModules);
}

/**
 * Check if multiple modules are enabled
 */
export async function areModulesEnabled(
  entityId: string,
  moduleIds: ModuleId[]
): Promise<Record<ModuleId, boolean>> {
  await initializeCache();

  const entityModules = moduleCache.get(entityId);

  return moduleIds.reduce(
    (acc, moduleId) => {
      acc[moduleId] = entityModules?.has(moduleId) ?? false;
      return acc;
    },
    {} as Record<ModuleId, boolean>
  );
}

/**
 * Get module definitions with enabled status for an entity
 */
export async function getModulesWithStatus(
  entityId: string
): Promise<Array<ModuleDefinition & { isEnabled: boolean; subscription?: ModuleSubscription }>> {
  const pool = getPool();

  // Get all enabled modules
  const enabledModules = await getEnabledModules(entityId);

  // Get subscription details
  const subscriptionsResult = await pool.query(
    `SELECT * FROM module_subscriptions WHERE entity_id = $1`,
    [entityId]
  );

  const subscriptionMap = new Map<string, ModuleSubscription>();
  for (const row of subscriptionsResult.rows) {
    subscriptionMap.set(row.module_id, row as ModuleSubscription);
  }

  // Build result
  return Object.values(MODULE_DEFINITIONS).map(module => ({
    ...module,
    isEnabled: enabledModules.includes(module.id),
    subscription: subscriptionMap.get(module.id),
  }));
}

// ============================================================================
// USER TIER FUNCTIONS
// ============================================================================

/**
 * Get the user tier for an entity
 */
export async function getEntityUserTier(entityId: string): Promise<EntityUserTier | null> {
  await initializeCache();
  return tierCache.get(entityId) || null;
}

/**
 * Set the user tier for an entity
 */
export async function setEntityUserTier(
  entityId: string,
  tierId: UserTierId,
  userId?: string
): Promise<EntityUserTier> {
  const pool = getPool();
  const tier = USER_TIERS[tierId];

  if (!tier) {
    throw new Error(`Invalid tier ID: ${tierId}`);
  }

  // Check if entity exists
  const entityCheck = await pool.query('SELECT entity_id FROM entities WHERE entity_id = $1', [
    entityId,
  ]);
  if (entityCheck.rows.length === 0) {
    throw new Error(`Entity not found: ${entityId}`);
  }

  // Upsert the tier
  const result = await pool.query(
    `INSERT INTO entity_user_tiers (
      tier_assignment_id, entity_id, tier_id, monthly_fee, effective_date, max_user_count
    )
    VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
    ON CONFLICT (entity_id) DO UPDATE SET
      tier_id = $3,
      monthly_fee = $4,
      effective_date = CURRENT_DATE,
      max_user_count = $5,
      updated_at = NOW()
    RETURNING *`,
    [`UT-${entityId.slice(-5)}`, entityId, tierId, tier.monthlyFee, tier.maxUsers]
  );

  invalidateModuleCache();
  return result.rows[0] as EntityUserTier;
}

/**
 * Update user count for an entity's tier
 */
export async function updateUserCount(entityId: string): Promise<number> {
  const pool = getPool();

  // Count active users for entity
  const countResult = await pool.query(
    `SELECT COUNT(DISTINCT user_id) as count
     FROM entity_users
     WHERE entity_id = $1 AND is_active = true`,
    [entityId]
  );

  const userCount = parseInt(countResult.rows[0].count, 10);

  // Update the tier record
  await pool.query(
    `UPDATE entity_user_tiers
     SET current_user_count = $1, updated_at = NOW()
     WHERE entity_id = $2`,
    [userCount, entityId]
  );

  invalidateModuleCache();
  return userCount;
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Enable a module for an entity
 */
export async function enableModule(dto: CreateModuleSubscriptionDTO): Promise<ModuleSubscription> {
  const pool = getPool();

  // Validate module exists
  const moduleDef = MODULE_DEFINITIONS[dto.moduleId];
  if (!moduleDef) {
    throw new Error(`Invalid module ID: ${dto.moduleId}`);
  }

  // Check dependencies
  const enabledModules = await getEnabledModules(dto.entityId);
  if (!areDependenciesSatisfied(dto.moduleId, enabledModules)) {
    const unsatisfied = getUnsatisfiedDependencies(dto.moduleId, enabledModules);
    throw new Error(
      `Cannot enable module '${dto.moduleId}'. The following dependencies are not satisfied: ${unsatisfied.join(', ')}`
    );
  }

  // Determine price
  const price =
    dto.customPrice ??
    (dto.billingCycle === 'ANNUAL' ? moduleDef.pricing.annual : moduleDef.pricing.monthly);

  // Generate subscription ID
  const subscriptionId = `MS-${Date.now().toString(36).toUpperCase()}`;

  const result = await pool.query(
    `INSERT INTO module_subscriptions (
      subscription_id, entity_id, module_id, billing_cycle, price_per_period,
      discount_percentage, subscription_status, subscription_start, subscription_end,
      notes, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8, $9, $10)
    ON CONFLICT (entity_id, module_id) DO UPDATE SET
      billing_cycle = $4,
      price_per_period = $5,
      discount_percentage = $6,
      subscription_status = 'ACTIVE',
      subscription_start = $7,
      subscription_end = $8,
      notes = $9,
      updated_at = NOW()
    RETURNING *`,
    [
      subscriptionId,
      dto.entityId,
      dto.moduleId,
      dto.billingCycle,
      price,
      dto.discountPercentage ?? 0,
      dto.startDate ?? new Date(),
      dto.endDate ?? null,
      dto.notes ?? null,
      dto.createdBy ?? null,
    ]
  );

  // Log audit
  await pool.query(
    `INSERT INTO module_audit_log (audit_id, entity_id, module_id, action, new_values, user_id)
     VALUES ($1, $2, $3, 'MODULE_ENABLED', $4, $5)`,
    [
      `MAL-${Date.now().toString(36).toUpperCase()}`,
      dto.entityId,
      dto.moduleId,
      JSON.stringify(result.rows[0]),
      dto.createdBy,
    ]
  );

  invalidateModuleCache();
  return result.rows[0] as ModuleSubscription;
}

/**
 * Disable a module for an entity
 */
export async function disableModule(
  entityId: string,
  moduleId: ModuleId,
  userId?: string,
  reason?: string
): Promise<void> {
  const pool = getPool();

  // Check if other modules depend on this one
  const enabledModules = await getEnabledModules(entityId);
  const dependentModules: ModuleId[] = [];

  for (const enabledModuleId of enabledModules) {
    const moduleDef = MODULE_DEFINITIONS[enabledModuleId];
    if (moduleDef?.dependencies?.includes(moduleId)) {
      dependentModules.push(enabledModuleId);
    }
  }

  if (dependentModules.length > 0) {
    throw new Error(
      `Cannot disable module '${moduleId}'. The following modules depend on it: ${dependentModules.join(', ')}. Disable them first.`
    );
  }

  const result = await pool.query(
    `UPDATE module_subscriptions
     SET subscription_status = 'CANCELLED',
         subscription_end = CURRENT_DATE,
         notes = COALESCE($3, notes),
         updated_at = NOW()
     WHERE entity_id = $1 AND module_id = $2
     RETURNING *`,
    [entityId, moduleId, reason]
  );

  if (result.rows.length === 0) {
    throw new Error(`Module subscription not found: ${moduleId} for entity ${entityId}`);
  }

  // Log audit
  await pool.query(
    `INSERT INTO module_audit_log (audit_id, entity_id, module_id, action, old_values, user_id)
     VALUES ($1, $2, $3, 'MODULE_DISABLED', $4, $5)`,
    [
      `MAL-${Date.now().toString(36).toUpperCase()}`,
      entityId,
      moduleId,
      JSON.stringify(result.rows[0]),
      userId,
    ]
  );

  invalidateModuleCache();
}

/**
 * Update a module subscription
 */
export async function updateModuleSubscription(
  entityId: string,
  moduleId: ModuleId,
  updates: UpdateModuleSubscriptionDTO,
  userId?: string
): Promise<ModuleSubscription> {
  const pool = getPool();

  const setClauses: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.billingCycle !== undefined) {
    setClauses.push(`billing_cycle = $${paramIndex++}`);
    values.push(updates.billingCycle);
  }
  if (updates.pricePerPeriod !== undefined) {
    setClauses.push(`price_per_period = $${paramIndex++}`);
    values.push(updates.pricePerPeriod);
  }
  if (updates.discountPercentage !== undefined) {
    setClauses.push(`discount_percentage = $${paramIndex++}`);
    values.push(updates.discountPercentage);
  }
  if (updates.subscriptionStatus !== undefined) {
    setClauses.push(`subscription_status = $${paramIndex++}`);
    values.push(updates.subscriptionStatus);
  }
  if (updates.subscriptionEnd !== undefined) {
    setClauses.push(`subscription_end = $${paramIndex++}`);
    values.push(updates.subscriptionEnd);
  }
  if (updates.autoRenew !== undefined) {
    setClauses.push(`auto_renew = $${paramIndex++}`);
    values.push(updates.autoRenew);
  }
  if (updates.notes !== undefined) {
    setClauses.push(`notes = $${paramIndex++}`);
    values.push(updates.notes);
  }

  values.push(entityId, moduleId);

  const result = await pool.query(
    `UPDATE module_subscriptions
     SET ${setClauses.join(', ')}
     WHERE entity_id = $${paramIndex++} AND module_id = $${paramIndex++}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error(`Module subscription not found: ${moduleId} for entity ${entityId}`);
  }

  // Log audit
  await pool.query(
    `INSERT INTO module_audit_log (audit_id, entity_id, module_id, action, old_values, new_values, user_id)
     VALUES ($1, $2, $3, 'BILLING_UPDATED', $4, $5, $6)`,
    [
      `MAL-${Date.now().toString(36).toUpperCase()}`,
      entityId,
      moduleId,
      JSON.stringify({}),
      JSON.stringify(result.rows[0]),
      userId,
    ]
  );

  invalidateModuleCache();
  return result.rows[0] as ModuleSubscription;
}

// ============================================================================
// BILLING CALCULATIONS
// ============================================================================

/**
 * Get billing summary for an entity
 */
export async function getEntityBillingSummary(entityId: string): Promise<EntityBillingSummary> {
  const pool = getPool();

  // Get enabled modules
  const modules = await getModulesWithStatus(entityId);
  const enabledModules = modules.filter(m => m.isEnabled);

  // Get user tier
  const userTier = await getEntityUserTier(entityId);
  const tierInfo = userTier ? USER_TIERS[userTier.tier_id] : USER_TIERS['tier-1-5'];

  // Get addons
  const addonsResult = await pool.query(
    `SELECT * FROM addon_subscriptions WHERE entity_id = $1 AND is_active = true`,
    [entityId]
  );

  const addons = addonsResult.rows.map(row => ({
    addonId: row.addon_id,
    monthlyFee: parseFloat(row.monthly_fee),
    isActive: row.is_active,
  }));

  // Calculate totals - convert to monthly equivalent
  const monthlyModuleTotal = enabledModules.reduce((sum, m) => {
    let price: number;

    if (m.subscription?.price_per_period) {
      // If there's a subscription, check the billing cycle
      if (m.subscription.billing_cycle === 'ANNUAL') {
        // Annual price - convert to monthly equivalent
        price = m.subscription.price_per_period / 12;
      } else {
        // Monthly price (or TRIAL/CUSTOM)
        price = m.subscription.price_per_period;
      }
    } else {
      // No subscription - use module definition pricing
      price = m.pricing.monthly;
    }

    return sum + price;
  }, 0);

  const addonMonthlyTotal = addons.reduce((sum, a) => sum + a.monthlyFee, 0);
  const totalMonthly = monthlyModuleTotal + tierInfo.monthlyFee + addonMonthlyTotal;

  // Calculate annual total - sum of actual annual prices where applicable
  const annualModuleTotal = enabledModules.reduce((sum, m) => {
    let price: number;

    if (m.subscription?.price_per_period) {
      if (m.subscription.billing_cycle === 'ANNUAL') {
        // Already annual price
        price = m.subscription.price_per_period;
      } else {
        // Monthly price - convert to annual
        price = m.subscription.price_per_period * 12;
      }
    } else {
      // Use annual pricing from definition
      price = m.pricing.annual;
    }

    return sum + price;
  }, 0);

  const annualTierTotal = tierInfo.monthlyFee * 12;
  const annualAddonTotal = addonMonthlyTotal * 12;
  const totalAnnual = annualModuleTotal + annualTierTotal + annualAddonTotal;

  return {
    entityId,
    enabledModules: enabledModules.map(m => ({
      moduleId: m.id,
      moduleName: m.name,
      pricePerPeriod: m.subscription?.price_per_period ?? m.pricing.monthly,
      billingCycle: m.subscription?.billing_cycle ?? 'MONTHLY',
      status: m.subscription?.subscription_status ?? 'ACTIVE',
    })),
    userTier: {
      tierId: userTier?.tier_id ?? 'tier-1-5',
      tierName: tierInfo.name,
      monthlyFee: tierInfo.monthlyFee,
      currentUserCount: userTier?.current_user_count ?? 0,
      maxUserCount: tierInfo.maxUsers,
    },
    addons,
    totals: {
      monthly: Math.round(totalMonthly * 100) / 100,
      annual: Math.round(totalAnnual * 100) / 100,
      currency: 'USD',
    },
  };
}

// ============================================================================
// ADDON MANAGEMENT
// ============================================================================

/**
 * Enable an addon for an entity
 */
export async function enableAddon(
  entityId: string,
  addonId: string,
  userId?: string
): Promise<AddonSubscription> {
  const pool = getPool();

  const addonSubscriptionId = `AS-${Date.now().toString(36).toUpperCase()}`;

  // Get addon pricing from shared types would require importing ADD_ON_SERVICES
  // For now, use placeholder values that should be updated
  const oneTimeFee = 0;
  const monthlyFee = 0;

  const result = await pool.query(
    `INSERT INTO addon_subscriptions (
      addon_subscription_id, entity_id, addon_id, one_time_fee, monthly_fee, is_active
    )
    VALUES ($1, $2, $3, $4, $5, true)
    ON CONFLICT (entity_id, addon_id) DO UPDATE SET
      is_active = true,
      updated_at = NOW()
    RETURNING *`,
    [addonSubscriptionId, entityId, addonId, oneTimeFee, monthlyFee]
  );

  return result.rows[0] as AddonSubscription;
}

/**
 * Disable an addon for an entity
 */
export async function disableAddon(entityId: string, addonId: string): Promise<void> {
  const pool = getPool();

  await pool.query(
    `UPDATE addon_subscriptions
     SET is_active = false, updated_at = NOW()
     WHERE entity_id = $1 AND addon_id = $2`,
    [entityId, addonId]
  );
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Enable multiple modules at once (for bundles)
 */
export async function enableModules(
  dto: Omit<CreateModuleSubscriptionDTO, 'moduleId'> & { moduleIds: ModuleId[] }
): Promise<ModuleSubscription[]> {
  const results: ModuleSubscription[] = [];

  // Sort modules by dependencies
  const sortedModules = sortModulesByDependencies(dto.moduleIds);

  for (const moduleId of sortedModules) {
    const subscription = await enableModule({
      ...dto,
      moduleId,
    });
    results.push(subscription);
  }

  return results;
}

/**
 * Sort modules so dependencies come first
 */
function sortModulesByDependencies(moduleIds: ModuleId[]): ModuleId[] {
  const sorted: ModuleId[] = [];
  const remaining = new Set(moduleIds);

  while (remaining.size > 0) {
    let addedAny = false;

    for (const moduleId of remaining) {
      const moduleDef = MODULE_DEFINITIONS[moduleId];
      const dependencies = moduleDef?.dependencies ?? [];

      // Check if all dependencies are either already sorted or not in the input
      const canAdd = dependencies.every(dep => sorted.includes(dep) || !moduleIds.includes(dep));

      if (canAdd) {
        sorted.push(moduleId);
        remaining.delete(moduleId);
        addedAny = true;
      }
    }

    // If no modules were added, there's a circular dependency or all deps are external
    if (!addedAny && remaining.size > 0) {
      // Add remaining modules anyway
      for (const moduleId of remaining) {
        sorted.push(moduleId);
      }
      break;
    }
  }

  return sorted;
}

/**
 * Get audit log for an entity
 */
export async function getModuleAuditLog(
  entityId: string,
  limit: number = 50
): Promise<
  Array<{
    audit_id: string;
    module_id: string | null;
    action: string;
    old_values: object | null;
    new_values: object | null;
    user_id: string | null;
    created_at: Date;
  }>
> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT audit_id, module_id, action, old_values, new_values, user_id, created_at
     FROM module_audit_log
     WHERE entity_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [entityId, limit]
  );

  return result.rows;
}
