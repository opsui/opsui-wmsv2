/**
 * Audit Logs Routes
 *
 * Provides access to comprehensive audit logs for SOC2/ISO27001 compliance
 */

import { Router } from 'express';
import { getAuditService, AuditCategory, AuditEventType } from '../services/AuditService';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@opsui/shared';
import { asyncHandler } from '../middleware';

const router = Router();

/**
 * GET /api/audit/logs
 * Get audit logs with optional filters
 * Requires ADMIN or SUPERVISOR role
 */
router.get(
  '/logs',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req, res) => {
    const auditService = getAuditService();

    // Parse query parameters
    const options: {
      userId?: string;
      username?: string;
      category?: AuditCategory;
      action?: AuditEventType;
      resourceType?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {};

    if (req.query.userId) {
      options.userId = String(req.query.userId);
    }
    if (req.query.username) {
      options.username = req.query.username as string;
    }
    if (req.query.category) {
      options.category = req.query.category as AuditCategory;
    }
    if (req.query.action) {
      options.action = req.query.action as AuditEventType;
    }
    if (req.query.resourceType) {
      options.resourceType = req.query.resourceType as string;
    }
    if (req.query.resourceId) {
      options.resourceId = req.query.resourceId as string;
    }
    if (req.query.startDate) {
      options.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      options.endDate = new Date(req.query.endDate as string);
    }
    if (req.query.limit) {
      options.limit = parseInt(req.query.limit as string);
    }
    if (req.query.offset) {
      options.offset = parseInt(req.query.offset as string);
    }

    const logs = await auditService.query(options);
    res.json(logs);
  })
);

/**
 * GET /api/audit/logs/:id
 * Get a specific audit log by ID
 * Requires ADMIN or SUPERVISOR role
 */
router.get(
  '/logs/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req, res) => {
    const auditService = getAuditService();
    const id = parseInt(req.params.id);

    const log = await auditService.getById(id);

    if (!log) {
      res.status(404).json({ error: 'Audit log not found' });
      return;
    }

    res.json(log);
  })
);

/**
 * GET /api/audit/statistics
 * Get audit log statistics
 * Requires ADMIN or SUPERVISOR role
 */
router.get(
  '/statistics',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req, res) => {
    const auditService = getAuditService();

    // Parse date range (default to last 30 days)
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const stats = await auditService.getStatistics(startDate, endDate);
    res.json(stats);
  })
);

/**
 * GET /api/audit/resource/:resourceType/:resourceId
 * Get audit history for a specific resource
 * Requires ADMIN or SUPERVISOR role
 */
router.get(
  '/resource/:resourceType/:resourceId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req, res) => {
    const auditService = getAuditService();
    const { resourceType, resourceId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const logs = await auditService.getResourceHistory(resourceType, resourceId, limit);
    res.json(logs);
  })
);

/**
 * GET /api/audit/user/:userId
 * Get audit history for a specific user
 * Requires ADMIN or SUPERVISOR role
 */
router.get(
  '/user/:userId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req, res) => {
    const auditService = getAuditService();
    const userId = String(req.params.userId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    const logs = await auditService.getUserActivity(userId, limit);
    res.json(logs);
  })
);

/**
 * GET /api/audit/security-events
 * Get security-related events (failed logins, suspicious activity, etc.)
 * Requires ADMIN or SUPERVISOR role
 */
router.get(
  '/security-events',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req, res) => {
    const auditService = getAuditService();

    // Parse date range (default to last 7 days)
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const logs = await auditService.getSecurityEvents(startDate, endDate);
    res.json(logs);
  })
);

/**
 * GET /api/audit/categories
 * Get all available audit categories
 * Requires ADMIN or SUPERVISOR role
 */
router.get(
  '/categories',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (_req, res) => {
    const categories = Object.values(AuditCategory);
    res.json(categories);
  })
);

/**
 * GET /api/audit/actions
 * Get all available audit event types
 * Requires ADMIN or SUPERVISOR role
 */
router.get(
  '/actions',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (_req, res) => {
    const actions = Object.values(AuditEventType);
    res.json(actions);
  })
);

/**
 * GET /api/audit/users
 * Get all unique user emails from audit logs
 * Requires ADMIN or SUPERVISOR role
 */
router.get(
  '/users',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (_req, res) => {
    const auditService = getAuditService();
    const logs = await auditService.query({ limit: 10000 });

    // Extract unique user emails
    const userEmails = Array.from(new Set(logs.map(log => log.userEmail).filter(Boolean))).sort();

    res.json(userEmails);
  })
);

/**
 * GET /api/audit/resource-types
 * Get all unique resource types from audit logs
 * Requires ADMIN or SUPERVISOR role
 */
router.get(
  '/resource-types',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (_req, res) => {
    const auditService = getAuditService();
    const logs = await auditService.query({ limit: 10000 });

    // Extract unique resource types
    const resourceTypes = Array.from(
      new Set(logs.map(log => log.resourceType).filter(Boolean))
    ).sort();

    res.json(resourceTypes);
  })
);

export default router;
