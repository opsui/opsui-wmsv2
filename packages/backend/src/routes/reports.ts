/**
 * Reports API Routes
 *
 * REST API for managing reports, executions, dashboards, and exports.
 */

import { Router, Request, Response } from 'express';
import { reportsRepository } from '../repositories/ReportsRepository';
import { reportsService } from '../services/ReportsService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { ReportType, ReportStatus, ReportFormat, UserRole } from '@opsui/shared';

const router = Router();

// All reports routes require authentication
router.use(authenticate);

// ============================================================================
// REPORTS CRUD
// ============================================================================

/**
 * GET /api/reports
 * Get all reports with optional filtering
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { reportType, status, isPublic } = req.query;
    const userId = (req as any).user?.userId;

    const reports = await reportsRepository.findAll({
      reportType: reportType as ReportType,
      status: status as ReportStatus,
      isPublic: isPublic === 'true' ? true : undefined,
      createdBy: userId,
    });

    res.json({
      success: true,
      data: {
        reports,
        count: reports.length,
      },
    });
  })
);

// ============================================================================
// DASHBOARDS
// ============================================================================
// NOTE: Dashboard routes must be defined BEFORE /:reportId to avoid route conflicts
// (otherwise /dashboards would match /:reportId with reportId="dashboards")

/**
 * GET /api/dashboards
 * Get all dashboards
 */
router.get(
  '/dashboards',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    // Users can see their own dashboards plus public ones
    const dashboards = await reportsRepository.findDashboards({
      owner: userRole === UserRole.ADMIN ? undefined : userId,
      isPublic: userRole === UserRole.ADMIN ? undefined : true,
    });

    res.json({
      success: true,
      data: {
        dashboards,
        count: dashboards.length,
      },
    });
  })
);

/**
 * GET /api/dashboards/:dashboardId
 * Get a specific dashboard
 */
router.get(
  '/dashboards/:dashboardId',
  asyncHandler(async (req: Request, res: Response) => {
    const { dashboardId } = req.params;
    const dashboard = await reportsRepository.findDashboardById(dashboardId);

    if (!dashboard) {
      res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { dashboard },
    });
  })
);

/**
 * POST /api/dashboards
 * Create a new dashboard
 */
router.post(
  '/dashboards',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: Request, res: Response) => {
    const dashboardData = req.body;
    const userId = (req as any).user?.userId;

    const dashboard = await reportsRepository.createDashboard({
      ...dashboardData,
      owner: userId,
      createdBy: userId,
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: { dashboard },
    });
  })
);

/**
 * GET /api/reports/:reportId
 * Get a specific report by ID
 */
router.get(
  '/:reportId',
  asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params;
    const report = await reportsRepository.findById(reportId);

    if (!report) {
      res.status(404).json({
        success: false,
        error: 'Report not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { report },
    });
  })
);

/**
 * POST /api/reports
 * Create a new report (ADMIN/SUPERVISOR only)
 */
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: Request, res: Response) => {
    const reportData = req.body;
    const userId = (req as any).user?.userId;

    const report = await reportsRepository.create({
      ...reportData,
      createdBy: userId,
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: { report },
    });
  })
);

/**
 * PUT /api/reports/:reportId
 * Update a report (ADMIN/SUPERVISOR only)
 */
router.put(
  '/:reportId',
  authorize(UserRole.ADMIN, UserRole.SUPERVISOR),
  asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params;
    const updates = req.body;
    const userId = (req as any).user?.userId;

    const report = await reportsRepository.update(reportId, {
      ...updates,
      updatedBy: userId,
    });

    if (!report) {
      res.status(404).json({
        success: false,
        error: 'Report not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { report },
    });
  })
);

/**
 * DELETE /api/reports/:reportId
 * Delete a report (ADMIN only)
 */
router.delete(
  '/:reportId',
  authorize(UserRole.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params;
    const deleted = await reportsRepository.delete(reportId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Report not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Report deleted successfully',
    });
  })
);

// ============================================================================
// REPORT EXECUTION
// ============================================================================

/**
 * POST /api/reports/:reportId/execute
 * Execute a report and return results
 */
router.post(
  '/:reportId/execute',
  asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params;
    const { format = ReportFormat.JSON, parameters = {} } = req.body;
    const userId = (req as any).user?.userId;

    try {
      const result = await reportsService.executeReport(
        reportId,
        format as ReportFormat,
        parameters,
        userId
      );

      res.json({
        success: true,
        data: {
          execution: result.execution,
          results: result.data,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * GET /api/reports/:reportId/executions
 * Get execution history for a report
 */
router.get(
  '/:reportId/executions',
  asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const executions = await reportsRepository.findExecutionsByReportId(reportId, limit);

    res.json({
      success: true,
      data: {
        executions,
        count: executions.length,
      },
    });
  })
);

// ============================================================================
// EXPORT JOBS
// ============================================================================

/**
 * GET /api/reports/exports
 * Get all export jobs
 */
router.get(
  '/exports',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    // Get export jobs - admins see all, others see their own
    const jobs = await reportsRepository.findAllExportJobs(
      userRole === UserRole.ADMIN ? undefined : userId
    );

    res.json({
      success: true,
      data: {
        jobs,
        count: jobs.length,
      },
    });
  })
);

/**
 * POST /api/reports/export
 * Create and start an export job
 */
router.post(
  '/export',
  asyncHandler(async (req: Request, res: Response) => {
    const { entityType, format = ReportFormat.CSV, fields, filters = [] } = req.body;
    const userId = (req as any).user?.userId;

    if (!entityType || !fields || !Array.isArray(fields)) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: entityType, fields (array)',
      });
      return;
    }

    const job = await reportsService.createExportJob(
      entityType,
      format as ReportFormat,
      fields,
      filters,
      userId
    );

    res.status(201).json({
      success: true,
      data: { job },
    });
  })
);

/**
 * GET /api/reports/export/:jobId
 * Get export job status
 */
router.get(
  '/export/:jobId',
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const job = await reportsRepository.getExportJob(jobId);

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Export job not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { job },
    });
  })
);

export default router;
