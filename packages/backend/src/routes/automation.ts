/**
 * Automation routes
 *
 * Endpoints for ASRS, robots, drones, and other automation systems integration
 */

import { Router } from 'express';
import { automationService } from '../services/AutomationService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, AutomationTaskType } from '@opsui/shared';

const router = Router();

// All automation routes require authentication
router.use(authenticate);

/**
 * POST /api/automation/tasks
 * Create an automation task
 */
router.post(
  '/tasks',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STOCK_CONTROLLER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { taskType, assignedTo, priority, location, sku, quantity, metadata } = req.body;

    // Validate required fields
    if (!taskType || !assignedTo || priority === undefined || !location) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const task = await automationService.createAutomationTask({
      taskType,
      assignedTo,
      priority: parseInt(priority),
      location,
      sku,
      quantity: quantity ? parseInt(quantity) : undefined,
      metadata,
      createdBy: req.user!.userId,
    });

    res.status(201).json(task);
  })
);

/**
 * GET /api/automation/tasks/:taskId
 * Get automation task by ID
 */
router.get(
  '/tasks/:taskId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { taskId } = req.params;
    const task = await automationService.getAutomationTask(taskId);
    res.json(task);
  })
);

/**
 * GET /api/automation/tasks/pending/:assignedTo
 * Get pending tasks for a robot/system
 */
router.get(
  '/tasks/pending/:assignedTo',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { assignedTo } = req.params;
    const taskType = req.query.taskType as AutomationTaskType | undefined;

    const tasks = await automationService.getPendingTasks(assignedTo, taskType);
    res.json(tasks);
  })
);

/**
 * PATCH /api/automation/tasks/:taskId/result
 * Update task status and result
 */
router.patch(
  '/tasks/:taskId/result',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { taskId } = req.params;
    const { status, countedQuantity, variance, notes } = req.body;

    if (!status) {
      res.status(400).json({
        error: 'Status is required',
        code: 'MISSING_STATUS',
      });
      return;
    }

    const task = await automationService.updateTaskResult(taskId, status, {
      countedQuantity,
      variance,
      notes,
    });

    res.json(task);
  })
);

/**
 * POST /api/automation/rfid/scan
 * Process RFID scan results
 */
router.post(
  '/rfid/scan',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { tags, scanDuration, scanLocation } = req.body;

    // Validate required fields
    if (!tags || !Array.isArray(tags) || !scanLocation) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const scanResult = await automationService.processRFIDScan({
      tags,
      scanDuration: scanDuration || 0,
      scanLocation,
      scannedBy: req.user!.userId,
      scannedAt: new Date(),
    });

    res.json(scanResult);
  })
);

/**
 * GET /api/automation/rfid/summary/:location
 * Get RFID scan summary for a location
 */
router.get(
  '/rfid/summary/:location',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { location } = req.params;
    const summary = await automationService.getRFIDScanSummary(location);
    res.json(summary);
  })
);

export default router;
