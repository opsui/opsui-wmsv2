/**
 * Recurring Schedules Routes
 *
 * API endpoints for managing automated recurring cycle count schedules
 */

import { Router } from 'express';
import { recurringScheduleService } from '../services/RecurringScheduleService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { requirePermission } from '../middleware/permissions';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, Permission } from '@opsui/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/cycle-count/schedules
 * Create a new recurring schedule
 */
router.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      scheduleName,
      countType,
      frequencyType,
      frequencyInterval,
      location,
      sku,
      assignedTo,
      notes,
    } = req.body;

    // Validate required fields
    if (!scheduleName || !countType || !frequencyType || !assignedTo) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const schedule = await recurringScheduleService.createRecurringSchedule({
      scheduleName,
      countType,
      frequencyType,
      frequencyInterval,
      location,
      sku,
      assignedTo,
      notes,
      createdBy: req.user!.userId,
    });

    res.status(201).json(schedule);
  })
);

/**
 * GET /api/cycle-count/schedules
 * Get all recurring schedules with optional filters
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      isActive:
        req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      assignedTo: req.query.assignedTo as string | undefined,
      frequencyType: req.query.frequencyType as string | undefined,
      countType: req.query.countType as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const result = await recurringScheduleService.getAllSchedules(filters);
    res.json(result);
  })
);

/**
 * GET /api/cycle-count/schedules/:scheduleId
 * Get a specific recurring schedule
 */
router.get(
  '/:scheduleId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { scheduleId } = req.params;
    const schedule = await recurringScheduleService.getSchedule(scheduleId);
    res.json(schedule);
  })
);

/**
 * PUT /api/cycle-count/schedules/:scheduleId
 * Update a recurring schedule
 */
router.put(
  '/:scheduleId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { scheduleId } = req.params;
    const updates = req.body;

    const schedule = await recurringScheduleService.updateSchedule(scheduleId, updates);
    res.json(schedule);
  })
);

/**
 * DELETE /api/cycle-count/schedules/:scheduleId
 * Delete a recurring schedule
 */
router.delete(
  '/:scheduleId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { scheduleId } = req.params;
    await recurringScheduleService.deleteSchedule(scheduleId);
    res.status(204).send();
  })
);

/**
 * POST /api/cycle-count/schedules/process
 * Process all due schedules and generate cycle count plans
 * Admin only - typically called by cron job
 */
router.post(
  '/process',
  authorize(UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await recurringScheduleService.processDueSchedules();
    res.json(result);
  })
);

export default router;
