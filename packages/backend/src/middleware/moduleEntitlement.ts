/**
 * Module Entitlement Middleware
 *
 * Checks if a module is enabled for the current entity before allowing access
 * Integrates with the existing auth middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ForbiddenError } from '@opsui/shared';
import { AuthenticatedRequest } from './auth';
import {
  isModuleEnabled,
  areModulesEnabled,
  getEnabledModules,
} from '../services/ModuleSubscriptionService';
import { ModuleId, MODULE_DEFINITIONS, getEnabledRoutes } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface ModuleEntitlementRequest extends AuthenticatedRequest {
  enabledModules?: ModuleId[];
}

// Route-to-module mapping for automatic module detection
const ROUTE_MODULE_MAP: Record<string, ModuleId> = {
  // Core Warehouse
  '/api/orders': 'order-management',
  '/api/customers': 'order-management',
  '/api/inventory': 'inventory-management',
  '/api/skus': 'inventory-management',
  '/api/bins': 'inventory-management',
  '/api/receiving': 'receiving-inbound',
  '/api/asn': 'receiving-inbound',
  '/api/suppliers': 'receiving-inbound',
  '/api/shipping': 'shipping-outbound',
  '/api/packing': 'shipping-outbound',
  '/api/carriers': 'shipping-outbound',

  // Advanced Warehouse
  '/api/cycle-counts': 'cycle-counting',
  '/api/waves': 'wave-picking',
  '/api/pick-tasks': 'wave-picking',
  '/api/zones': 'zone-picking',
  '/api/zone-picking': 'zone-picking',
  '/api/slotting': 'slotting-optimization',

  // Logistics
  '/api/routes': 'route-optimization',
  '/api/optimization': 'route-optimization',

  // Quality & Compliance
  '/api/quality': 'quality-control',
  '/api/inspections': 'quality-control',
  '/api/exceptions': 'exceptions-management',

  // Business Automation
  '/api/business-rules': 'business-rules-engine',
  '/api/rules': 'business-rules-engine',

  // Analytics
  '/api/reports': 'dashboards-reporting',
  '/api/analytics': 'dashboards-reporting',
  '/api/ml': 'ml-ai-predictions',
  '/api/predictions': 'ml-ai-predictions',

  // Enterprise
  '/api/accounting': 'finance-accounting',
  '/api/finance': 'finance-accounting',
  '/api/journals': 'finance-accounting',
  '/api/hr': 'human-resources',
  '/api/employees': 'human-resources',
  '/api/manufacturing': 'production-manufacturing',
  '/api/production': 'production-manufacturing',
  '/api/bom': 'production-manufacturing',
  '/api/procurement': 'procurement',
  '/api/purchase-orders': 'procurement',
  '/api/vendors': 'procurement',
  '/api/maintenance': 'maintenance-management',
  '/api/assets': 'maintenance-management',
  '/api/work-orders': 'maintenance-management',
  '/api/rma': 'returns-management',
  '/api/returns': 'returns-management',
};

// Routes that are always accessible (core system)
const ALWAYS_ACCESSIBLE_ROUTES = [
  '/api/auth',
  '/api/users',
  '/api/modules',
  '/api/health',
  '/api/ping',
  '/api/entities',
  '/api/me',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the module ID for a given route path
 */
function getModuleForRoute(path: string): ModuleId | null {
  // Check for exact match first
  if (ROUTE_MODULE_MAP[path]) {
    return ROUTE_MODULE_MAP[path];
  }

  // Check for prefix match
  for (const [route, moduleId] of Object.entries(ROUTE_MODULE_MAP)) {
    if (path.startsWith(route + '/') || path === route) {
      return moduleId;
    }
  }

  return null;
}

/**
 * Check if a route is always accessible
 */
function isAlwaysAccessible(path: string): boolean {
  return ALWAYS_ACCESSIBLE_ROUTES.some(route => path.startsWith(route + '/') || path === route);
}

/**
 * Get the entity ID from the request
 * This can come from:
 * 1. X-Entity-Id header (explicit entity selection)
 * 2. User's default entity
 * 3. Query parameter (for some operations)
 */
function getEntityIdFromRequest(req: ModuleEntitlementRequest): string | null {
  // Check header first
  const headerEntityId = req.headers['x-entity-id'] as string;
  if (headerEntityId) {
    return headerEntityId;
  }

  // Check query parameter
  const queryEntityId = req.query.entityId as string;
  if (queryEntityId) {
    return queryEntityId;
  }

  // TODO: Get user's default entity from JWT or database
  // For now, return null and rely on default behavior
  return null;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware to check if a specific module is enabled
 */
export function requireModule(moduleId: ModuleId) {
  return async (
    req: ModuleEntitlementRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        return next(new ForbiddenError('User not authenticated'));
      }

      // Get entity ID
      const entityId = getEntityIdFromRequest(req);
      if (!entityId) {
        // If no entity context, allow access (will be handled by entity middleware)
        return next();
      }

      const enabled = await isModuleEnabled(entityId, moduleId);

      if (!enabled) {
        const moduleDef = MODULE_DEFINITIONS[moduleId];
        logger.warn('Module access denied', {
          userId: req.user.userId,
          entityId,
          moduleId,
          moduleName: moduleDef?.name ?? moduleId,
        });

        return next(
          new ForbiddenError(
            `Module '${moduleDef?.name ?? moduleId}' is not enabled for your organization. ` +
              `Please contact your administrator to enable this feature.`
          )
        );
      }

      // Attach enabled modules to request for later use
      req.enabledModules = await getEnabledModules(entityId);
      next();
    } catch (error) {
      logger.error('Error checking module entitlement', { error, moduleId });
      next(error);
    }
  };
}

/**
 * Middleware to check if any of the specified modules are enabled
 */
export function requireAnyModule(...moduleIds: ModuleId[]) {
  return async (
    req: ModuleEntitlementRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        return next(new ForbiddenError('User not authenticated'));
      }

      const entityId = getEntityIdFromRequest(req);
      if (!entityId) {
        return next();
      }

      const modulesStatus = await areModulesEnabled(entityId, moduleIds);
      const hasAny = Object.values(modulesStatus).some(enabled => enabled);

      if (!hasAny) {
        const moduleNames = moduleIds.map(id => MODULE_DEFINITIONS[id]?.name ?? id);
        logger.warn('Module access denied - none enabled', {
          userId: req.user.userId,
          entityId,
          moduleIds,
        });

        return next(
          new ForbiddenError(
            `None of the required modules (${moduleNames.join(', ')}) are enabled for your organization.`
          )
        );
      }

      req.enabledModules = await getEnabledModules(entityId);
      next();
    } catch (error) {
      logger.error('Error checking module entitlements', { error, moduleIds });
      next(error);
    }
  };
}

/**
 * Middleware to check if all specified modules are enabled
 */
export function requireAllModules(...moduleIds: ModuleId[]) {
  return async (
    req: ModuleEntitlementRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        return next(new ForbiddenError('User not authenticated'));
      }

      const entityId = getEntityIdFromRequest(req);
      if (!entityId) {
        return next();
      }

      const modulesStatus = await areModulesEnabled(entityId, moduleIds);
      const missingModules = moduleIds.filter(id => !modulesStatus[id]);

      if (missingModules.length > 0) {
        const missingNames = missingModules.map(id => MODULE_DEFINITIONS[id]?.name ?? id);
        logger.warn('Module access denied - missing modules', {
          userId: req.user.userId,
          entityId,
          missingModules,
        });

        return next(
          new ForbiddenError(
            `The following modules are required but not enabled: ${missingNames.join(', ')}`
          )
        );
      }

      req.enabledModules = await getEnabledModules(entityId);
      next();
    } catch (error) {
      logger.error('Error checking module entitlements', { error, moduleIds });
      next(error);
    }
  };
}

/**
 * Automatic module detection middleware
 * Checks if the module associated with the current route is enabled
 */
export function checkModuleEntitlement(
  req: ModuleEntitlementRequest,
  _res: Response,
  next: NextFunction
): void {
  // Skip if route is always accessible
  if (isAlwaysAccessible(req.path)) {
    return next();
  }

  // Get module for current route
  const moduleId = getModuleForRoute(req.path);
  if (!moduleId) {
    // No module mapping found - allow access (route might not be module-gated)
    return next();
  }

  // Use requireModule middleware
  requireModule(moduleId)(req, _res, next);
}

/**
 * Middleware to attach enabled modules to request without blocking
 * Useful for conditional UI rendering
 */
export async function attachEnabledModules(
  req: ModuleEntitlementRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next();
    }

    const entityId = getEntityIdFromRequest(req);
    if (!entityId) {
      return next();
    }

    req.enabledModules = await getEnabledModules(entityId);
    next();
  } catch (error) {
    // Don't block on error, just log
    logger.error('Error attaching enabled modules', { error });
    next();
  }
}

/**
 * Helper function to check if a module is enabled (for use in routes)
 */
export async function checkModuleAccess(
  entityId: string,
  moduleId: ModuleId
): Promise<{ enabled: boolean; moduleName: string }> {
  const enabled = await isModuleEnabled(entityId, moduleId);
  const moduleDef = MODULE_DEFINITIONS[moduleId];

  return {
    enabled,
    moduleName: moduleDef?.name ?? moduleId,
  };
}

/**
 * Express middleware factory for route-specific module checking
 * Use this when defining routes to automatically gate them by module
 */
export function moduleGate(moduleId: ModuleId) {
  return requireModule(moduleId);
}

// ============================================================================
// ROUTE CONFIGURATION HELPER
// ============================================================================

/**
 * Get the module ID that should be checked for a given path
 * Useful for frontend route configuration
 */
export function getRequiredModuleForPath(path: string): ModuleId | null {
  return getModuleForRoute(path);
}

/**
 * Check which modules are required for a set of routes
 */
export function getRequiredModulesForRoutes(routes: string[]): ModuleId[] {
  const modules = new Set<ModuleId>();

  for (const route of routes) {
    const moduleId = getModuleForRoute(route);
    if (moduleId) {
      modules.add(moduleId);
    }
  }

  return Array.from(modules);
}
