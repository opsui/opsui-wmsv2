/**
 * Module Subscription Routes
 *
 * REST API endpoints for managing module subscriptions and billing
 * Access: ADMIN only for modifications, SUPERVISOR for read access
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole, ModuleId, UserTierId, MODULE_DEFINITIONS, USER_TIERS } from '@opsui/shared';
import * as ModuleService from '../services/ModuleSubscriptionService';
import { getPool } from '../db/client';

const router = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Apply authentication to all routes
router.use(authenticate);

// ============================================================================
// MODULE STATUS & DISCOVERY
// ============================================================================

/**
 * GET /api/modules/definitions
 * Get all available module definitions with pricing
 * Access: All authenticated users
 */
router.get('/definitions', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const definitions = Object.values(MODULE_DEFINITIONS).map(module => ({
      id: module.id,
      name: module.name,
      description: module.description,
      category: module.category,
      pricing: module.pricing,
      features: module.features,
      dependencies: module.dependencies,
      icon: module.icon,
    }));

    res.json({
      modules: definitions,
      categories: [
        { id: 'core-warehouse', name: 'Core Warehouse Operations' },
        { id: 'advanced-warehouse', name: 'Advanced Warehouse Features' },
        { id: 'logistics', name: 'Logistics & Route Optimization' },
        { id: 'quality-compliance', name: 'Quality & Compliance' },
        { id: 'business-automation', name: 'Business Automation' },
        { id: 'analytics-intelligence', name: 'Analytics & Intelligence' },
        { id: 'enterprise-management', name: 'Enterprise Management' },
      ],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/modules/tiers
 * Get all available user tiers with pricing
 * Access: All authenticated users
 */
router.get('/tiers', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tiers = Object.values(USER_TIERS);

    res.json({ tiers });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/modules/status
 * Get module status for current entity
 * Access: All authenticated users
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get entity ID from header or default
    const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';

    const modulesWithStatus = await ModuleService.getModulesWithStatus(entityId);
    const enabledModules = modulesWithStatus.filter(m => m.isEnabled).map(m => m.id);

    res.json({
      entityId,
      enabledModules,
      modulesWithStatus: modulesWithStatus.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        category: m.category,
        pricing: m.pricing,
        isEnabled: m.isEnabled,
        subscription: m.subscription
          ? {
              moduleId: m.subscription.module_id,
              moduleName: m.name,
              pricePerPeriod: m.subscription.price_per_period,
              billingCycle: m.subscription.billing_cycle,
              status: m.subscription.subscription_status,
            }
          : undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/modules/enabled
 * Get list of enabled module IDs for current entity
 * Access: All authenticated users
 */
router.get('/enabled', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';

    const enabledModules = await ModuleService.getEnabledModules(entityId);

    res.json({ enabledModules });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/modules/check/:moduleId
 * Check if a specific module is enabled
 * Access: All authenticated users
 */
router.get('/check/:moduleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';
    const moduleId = req.params.moduleId as ModuleId;

    const isEnabled = await ModuleService.isModuleEnabled(entityId, moduleId);

    res.json({ moduleId, isEnabled });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// BILLING
// ============================================================================

/**
 * GET /api/modules/billing
 * Get billing summary for current entity
 * Access: ADMIN, SUPERVISOR
 */
router.get(
  '/billing',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';

      const summary = await ModuleService.getEntityBillingSummary(entityId);

      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// MODULE MANAGEMENT
// ============================================================================

/**
 * POST /api/modules/enable
 * Enable a module for current entity
 * Access: ADMIN only
 */
router.post(
  '/enable',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';
      const { moduleId, billingCycle, customPrice, discountPercentage, startDate, endDate, notes } =
        req.body;

      if (!moduleId) {
        res.status(400).json({ error: 'moduleId is required' });
        return;
      }

      if (!['MONTHLY', 'ANNUAL'].includes(billingCycle)) {
        res.status(400).json({ error: 'billingCycle must be MONTHLY or ANNUAL' });
        return;
      }

      const userId = (req as any).user?.userId;

      const subscription = await ModuleService.enableModule({
        entityId,
        moduleId: moduleId as ModuleId,
        billingCycle,
        customPrice,
        discountPercentage,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        notes,
        createdBy: userId,
      });

      res.status(201).json(subscription);
    } catch (error: any) {
      if (error.message.includes('dependencies')) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/modules/disable
 * Disable a module for current entity
 * Access: ADMIN only
 */
router.post(
  '/disable',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';
      const { moduleId, reason } = req.body;

      if (!moduleId) {
        res.status(400).json({ error: 'moduleId is required' });
        return;
      }

      const userId = (req as any).user?.userId;

      await ModuleService.disableModule(entityId, moduleId as ModuleId, userId, reason);

      res.json({ success: true, message: `Module ${moduleId} disabled` });
    } catch (error: any) {
      if (error.message.includes('depend on it')) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/modules/enable-bundle
 * Enable multiple modules at once (for bundles)
 * Access: ADMIN only
 */
router.post(
  '/enable-bundle',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';
      const { moduleIds, billingCycle } = req.body;

      if (!moduleIds || !Array.isArray(moduleIds) || moduleIds.length === 0) {
        res.status(400).json({ error: 'moduleIds array is required' });
        return;
      }

      if (!['MONTHLY', 'ANNUAL'].includes(billingCycle)) {
        res.status(400).json({ error: 'billingCycle must be MONTHLY or ANNUAL' });
        return;
      }

      const userId = (req as any).user?.userId;

      const subscriptions = await ModuleService.enableModules({
        entityId,
        moduleIds: moduleIds as ModuleId[],
        billingCycle,
        createdBy: userId,
      });

      res.status(201).json({ subscriptions, count: subscriptions.length });
    } catch (error: any) {
      if (error.message.includes('dependencies')) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
);

/**
 * PATCH /api/modules/:moduleId
 * Update a module subscription
 * Access: ADMIN only
 */
router.patch(
  '/:moduleId',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';
      const moduleId = req.params.moduleId as ModuleId;
      const updates = req.body;

      const userId = (req as any).user?.userId;

      const subscription = await ModuleService.updateModuleSubscription(
        entityId,
        moduleId,
        updates,
        userId
      );

      res.json(subscription);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// USER TIER MANAGEMENT
// ============================================================================

/**
 * GET /api/modules/tier
 * Get current user tier for entity
 * Access: All authenticated users
 */
router.get('/tier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';

    const tier = await ModuleService.getEntityUserTier(entityId);

    if (!tier) {
      res.json({
        tierId: 'tier-1-5',
        tierName: '1-5 Users',
        monthlyFee: 0,
        currentUserCount: 0,
        maxUserCount: 5,
      });
      return;
    }

    const tierInfo = USER_TIERS[tier.tier_id];

    res.json({
      tierId: tier.tier_id,
      tierName: tierInfo?.name ?? tier.tier_id,
      monthlyFee: tier.monthly_fee,
      currentUserCount: tier.current_user_count,
      maxUserCount: tierInfo?.maxUsers ?? null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/modules/tier
 * Set user tier for entity
 * Access: ADMIN only
 */
router.post(
  '/tier',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';
      const { tierId } = req.body;

      if (!tierId) {
        res.status(400).json({ error: 'tierId is required' });
        return;
      }

      const userId = (req as any).user?.userId;

      const tier = await ModuleService.setEntityUserTier(entityId, tierId as UserTierId, userId);

      const tierInfo = USER_TIERS[tier.tier_id];

      res.json({
        tierId: tier.tier_id,
        tierName: tierInfo?.name ?? tier.tier_id,
        monthlyFee: tier.monthly_fee,
      });
    } catch (error: any) {
      if (error.message.includes('Invalid tier')) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/modules/tier/update-count
 * Update user count for current entity
 * Access: ADMIN only
 */
router.post(
  '/tier/update-count',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';

      const userCount = await ModuleService.updateUserCount(entityId);

      res.json({ userCount });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// ADD-ON MANAGEMENT
// ============================================================================

/**
 * GET /api/modules/addons
 * Get active add-ons for entity
 * Access: ADMIN, SUPERVISOR
 */
router.get(
  '/addons',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';
      const pool = getPool();

      const result = await pool.query(`SELECT * FROM addon_subscriptions WHERE entity_id = $1`, [
        entityId,
      ]);

      res.json({ addons: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/modules/addons/enable
 * Enable an add-on for entity
 * Access: ADMIN only
 */
router.post(
  '/addons/enable',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';
      const { addonId } = req.body;

      if (!addonId) {
        res.status(400).json({ error: 'addonId is required' });
        return;
      }

      const userId = (req as any).user?.userId;

      const subscription = await ModuleService.enableAddon(entityId, addonId, userId);

      res.status(201).json(subscription);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/modules/addons/disable
 * Disable an add-on for entity
 * Access: ADMIN only
 */
router.post(
  '/addons/disable',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';
      const { addonId } = req.body;

      if (!addonId) {
        res.status(400).json({ error: 'addonId is required' });
        return;
      }

      await ModuleService.disableAddon(entityId, addonId);

      res.json({ success: true, message: `Add-on ${addonId} disabled` });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// AUDIT LOG
// ============================================================================

/**
 * GET /api/modules/audit
 * Get module audit log for entity
 * Access: ADMIN only
 */
router.get(
  '/audit',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityId = (req.headers['x-entity-id'] as string) || 'ENT-00001';
      const limit = parseInt(req.query.limit as string) || 50;

      const auditLog = await ModuleService.getModuleAuditLog(entityId, limit);

      res.json({ auditLog });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
