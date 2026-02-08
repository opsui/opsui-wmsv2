/**
 * Routes index
 *
 * Exports all route modules
 */

import { Router } from 'express';
import authRoutes from './auth';
import orderRoutes from './orders';
import inventoryRoutes from './inventory';
import metricsRoutes from './metrics';
import skuRoutes from './skus';
import healthRoutes from './health';
import stockControlRoutes from './stockControl';
import exceptionRoutes from './exceptions';
import inboundRoutes from './inbound';
import shippingRoutes from './shipping';
import nzcRoutes from './nzc';
import cycleCountRoutes from './cycleCount';
import cycleCountKPIRoutes from './cycleCountKPI';
import interleavedCountRoutes from './interleavedCount';
import locationCapacityRoutes from './locationCapacity';
import binLocationsRoutes from './binLocations';
import qualityControlRoutes from './qualityControl';
import businessRulesRoutes from './businessRules';
import reportsRoutes from './reports';
import integrationsRoutes from './integrations';
import productionRoutes from './production';
import salesRoutes from './sales';
import maintenanceRoutes from './maintenance';
import roleAssignmentRoutes from './roleAssignments';
import customRolesRoutes from './customRoles';
import userRoutes from './users';
import accountingRoutes from './accounting';
import rmaRoutes from './rma';
import hrRoutes from './hr';
import multiEntityRoutes from './multi-entity';

// New enhanced routes
import barcodeRoutes from './barcode';
import waveRoutes from './waves';
import zoneRoutes from './zones';
import slottingRoutes from './slotting';
import auditRoutes from './audit';
import developerRoutes from './developer';
import notificationRoutes from './notifications';
import routeOptimizationRoutes from './routeOptimization';
import automationRoutes from './automation';
import varianceSeverityRoutes from './varianceSeverity';
import recurringScheduleRoutes from './recurringSchedules';
import rootCauseRoutes from './rootCauseAnalysis';

const router = Router();

// Health check routes (no auth required)
router.use('/health', healthRoutes);

// API v1 routes (require auth)
const v1Router = Router();
v1Router.use('/auth', authRoutes);
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
v1Router.use('/audit', auditRoutes);
v1Router.use('/notifications', notificationRoutes);
v1Router.use('/route-optimization', routeOptimizationRoutes);
v1Router.use('/automation', automationRoutes);

// Developer tools (development only)
v1Router.use('/developer', developerRoutes);

// Enhanced warehouse operations routes
v1Router.use('/barcode', barcodeRoutes);
v1Router.use('/waves', waveRoutes);
v1Router.use('/zones', zoneRoutes);
v1Router.use('/slotting', slottingRoutes);

// Mount API v1
router.use('/v1', v1Router);

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
router.use('/barcode', barcodeRoutes);
router.use('/waves', waveRoutes);
router.use('/zones', zoneRoutes);
router.use('/slotting', slottingRoutes);
router.use('/audit', auditRoutes);
router.use('/developer', developerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/route-optimization', routeOptimizationRoutes);

export default router;
