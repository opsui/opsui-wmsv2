/**
 * Routes index
 *
 * Exports all route modules
 */

import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { organizationContext } from '../middleware/organizationContext';
import accountingRoutes from './accounting';
import advancedInventoryRoutes from './advancedInventory';
import authRoutes from './auth';
import searchRoutes from './search';
import binLocationsRoutes from './binLocations';
import businessRulesRoutes from './businessRules';
import customRolesRoutes from './customRoles';
import cycleCountRoutes from './cycleCount';
import cycleCountKPIRoutes from './cycleCountKPI';
import ecommerceRoutes from './ecommerce';
import exceptionRoutes from './exceptions';
import healthRoutes from './health';
import hrRoutes from './hr';
import inboundRoutes from './inbound';
import integrationsRoutes from './integrations';
import interleavedCountRoutes from './interleavedCount';
import inventoryRoutes from './inventory';
import locationCapacityRoutes from './locationCapacity';
import maintenanceRoutes from './maintenance';
import manufacturingRoutes from './manufacturing';
import metricsRoutes from './metrics';
import multiEntityRoutes from './multi-entity';
import nzcRoutes from './nzc';
import orderRoutes from './orders';
import organizationRoutes from './organizations';
import productionRoutes from './production';
import projectsRoutes from './projects';
import purchasingRoutes from './purchasing';
import qualityControlRoutes from './qualityControl';
import reportsRoutes from './reports';
import rmaRoutes from './rma';
import roleAssignmentRoutes from './roleAssignments';
import salesRoutes from './sales';
import shippingRoutes from './shipping';
import skuRoutes from './skus';
import stockControlRoutes from './stockControl';
import userRoutes from './users';
import { nzcService } from '../services/NZCService';
import { isPublicV1Route } from './publicRouteMatchers';

// New enhanced routes
import auditRoutes from './audit';
import automationRoutes from './automation';
import barcodeRoutes from './barcode';
import developerRoutes from './developer';
import moduleRoutes from './modules';
import notificationRoutes from './notifications';
import recurringScheduleRoutes from './recurringSchedules';
import rootCauseRoutes from './rootCauseAnalysis';
import routeOptimizationRoutes from './routeOptimization';
import slottingRoutes from './slotting';
import varianceSeverityRoutes from './varianceSeverity';
import waveRoutes from './waves';
import zoneRoutes from './zones';

const router = Router();

// Health check routes (no auth required)
router.use('/health', healthRoutes);

// API v1 routes (require auth)
const v1Router = Router();
v1Router.use('/auth', authRoutes);

// Tenant database routing - authenticate first, then resolve org and route to dedicated DB
v1Router.use((req, res, next) => {
  // Public routes handle their own access rules.
  if (isPublicV1Route(req.path)) return next();

  // Authenticate to get req.user, then set org context for tenant routing
  authenticate(req as any, res, (err?: any) => {
    if (err) return next(err);
    if (!(req as any).user) return next();
    organizationContext(req as any, res, next).catch(next);
  });
});

// Register NZC tracking directly on the v1 router.
// Production has intermittently fallen through the mounted NZC sub-router for this path,
// while sibling NZC routes such as labels still match correctly.
v1Router.get(
  '/nzc/tracking/:connote',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!nzcService.isConfigured()) {
      res.status(503).json({
        error: 'NZC is not configured on this backend',
        code: 'NZC_NOT_CONFIGURED',
      });
      return;
    }

    const { connote } = req.params;
    const result = await nzcService.getTracking(connote);
    res.json(result);
  })
);

v1Router.use('/orders', orderRoutes);
v1Router.use('/inventory', inventoryRoutes);
v1Router.use('/metrics', metricsRoutes);
v1Router.use('/skus', skuRoutes);
v1Router.use('/stock-control', stockControlRoutes);
v1Router.use('/exceptions', exceptionRoutes);
v1Router.use('/inbound', inboundRoutes);
v1Router.use('/shipping', shippingRoutes);
v1Router.use('/nzc', nzcRoutes);
v1Router.use('/cycle-count', cycleCountRoutes);
v1Router.use('/cycle-count/kpi', cycleCountKPIRoutes);
v1Router.use('/cycle-count/severity', varianceSeverityRoutes);
v1Router.use('/cycle-count/schedules', recurringScheduleRoutes);
v1Router.use('/cycle-count/root-causes', rootCauseRoutes);
v1Router.use('/interleaved-count', interleavedCountRoutes);
v1Router.use('/location-capacity', locationCapacityRoutes);
v1Router.use('/bin-locations', binLocationsRoutes);
v1Router.use('/quality-control', qualityControlRoutes);
v1Router.use('/business-rules', businessRulesRoutes);
v1Router.use('/reports', reportsRoutes);
v1Router.use('/integrations', integrationsRoutes);
v1Router.use('/production', productionRoutes);
v1Router.use('/sales', salesRoutes);
v1Router.use('/maintenance', maintenanceRoutes);
v1Router.use('/role-assignments', roleAssignmentRoutes);
v1Router.use('/custom-roles', customRolesRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/accounting', accountingRoutes);
v1Router.use('/rma', rmaRoutes);
v1Router.use('/hr', hrRoutes);
v1Router.use('/multi-entity', multiEntityRoutes);
v1Router.use('/projects', projectsRoutes);
v1Router.use('/purchasing', purchasingRoutes);
v1Router.use('/manufacturing', manufacturingRoutes);
v1Router.use('/ecommerce', ecommerceRoutes);
v1Router.use('/advanced-inventory', advancedInventoryRoutes);
v1Router.use('/audit', auditRoutes);
v1Router.use('/notifications', notificationRoutes);
v1Router.use('/route-optimization', routeOptimizationRoutes);
v1Router.use('/automation', automationRoutes);
v1Router.use('/modules', moduleRoutes);
v1Router.use('/organizations', organizationRoutes);
v1Router.use('/search', searchRoutes);

// Developer tools (development only)
v1Router.use('/developer', developerRoutes);

// Enhanced warehouse operations routes
v1Router.use('/barcode', barcodeRoutes);
v1Router.use('/waves', waveRoutes);
v1Router.use('/zones', zoneRoutes);
v1Router.use('/slotting', slottingRoutes);

// Mount API v1 - app.ts already mounts this router at /api/v1
router.use('/', v1Router);

// Legacy routes (for backward compatibility)
router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/metrics', metricsRoutes);
router.use('/skus', skuRoutes);
router.use('/stock-control', stockControlRoutes);
router.use('/exceptions', exceptionRoutes);
router.use('/inbound', inboundRoutes);
router.use('/shipping', shippingRoutes);
router.use('/nzc', nzcRoutes);
router.use('/cycle-count', cycleCountRoutes);
router.use('/cycle-count/kpi', cycleCountKPIRoutes);
router.use('/cycle-count/severity', varianceSeverityRoutes);
router.use('/cycle-count/schedules', recurringScheduleRoutes);
router.use('/cycle-count/root-causes', rootCauseRoutes);
router.use('/location-capacity', locationCapacityRoutes);
router.use('/bin-locations', binLocationsRoutes);
router.use('/quality-control', qualityControlRoutes);
router.use('/business-rules', businessRulesRoutes);
router.use('/reports', reportsRoutes);
router.use('/integrations', integrationsRoutes);
router.use('/production', productionRoutes);
router.use('/sales', salesRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/role-assignments', roleAssignmentRoutes);
router.use('/custom-roles', customRolesRoutes);
router.use('/users', userRoutes);
router.use('/accounting', accountingRoutes);
router.use('/rma', rmaRoutes);
router.use('/hr', hrRoutes);
router.use('/multi-entity', multiEntityRoutes);
router.use('/projects', projectsRoutes);
router.use('/purchasing', purchasingRoutes);
router.use('/manufacturing', manufacturingRoutes);
router.use('/ecommerce', ecommerceRoutes);
router.use('/advanced-inventory', advancedInventoryRoutes);
router.use('/barcode', barcodeRoutes);
router.use('/waves', waveRoutes);
router.use('/zones', zoneRoutes);
router.use('/slotting', slottingRoutes);
router.use('/audit', auditRoutes);
router.use('/developer', developerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/route-optimization', routeOptimizationRoutes);
router.use('/modules', moduleRoutes);
router.use('/search', searchRoutes);

export default router;
