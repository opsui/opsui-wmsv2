/**
 * HR & Payroll API Routes
 *
 * REST API for employee management, timesheets, payroll processing,
 * and leave management with NZ tax compliance
 */

import { Router } from 'express';
import { hrService } from '../services/HRService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@opsui/shared';

const router = Router();

// All HR routes require authentication
router.use(authenticate);

// HR routes require HR Manager, HR Admin, or Admin access
const hrAuth = authorize(UserRole.HR_MANAGER, UserRole.HR_ADMIN, UserRole.ADMIN);

// Employees can view their own data and submit timesheets
const employeeAuth = authorize(
  UserRole.HR_MANAGER,
  UserRole.HR_ADMIN,
  UserRole.ADMIN,
  UserRole.PICKER,
  UserRole.PACKER,
  UserRole.STOCK_CONTROLLER
);

// ============================================================================
// EMPLOYEES
// ============================================================================

/**
 * GET /api/hr/employees
 * Get all employees with optional filters
 */
router.get(
  '/employees',
  hrAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const status = req.query.status as string | undefined;
    const department = req.query.department as string | undefined;
    const search = req.query.search as string | undefined;

    const employees = await hrService.getEmployees({ status, department, search });

    res.json(employees);
  })
);

/**
 * GET /api/hr/employees/:id
 * Get employee by ID with all details
 */
router.get(
  '/employees/:id',
  hrAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const employee = await hrService.getEmployeeById(req.params.id);
    res.json(employee);
  })
);

/**
 * POST /api/hr/employees
 * Create a new employee
 */
router.post(
  '/employees',
  hrAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const employee = await hrService.createEmployee(req.body, req.user?.userId || '');
    res.status(201).json(employee);
  })
);

/**
 * PUT /api/hr/employees/:id
 * Update an existing employee
 */
router.put(
  '/employees/:id',
  hrAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const employee = await hrService.updateEmployee(req.params.id, req.body);
    res.json(employee);
  })
);

/**
 * DELETE /api/hr/employees/:id
 * Delete (soft delete) an employee
 */
router.delete(
  '/employees/:id',
  hrAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const deleted = await hrService.deleteEmployee(req.params.id);
    res.json({ success: deleted });
  })
);

// ============================================================================
// TIMESHEETS
// ============================================================================

/**
 * GET /api/hr/timesheets
 * Get timesheets with optional filters
 */
router.get(
  '/timesheets',
  employeeAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const status = req.query.status as string | undefined;
    const employeeId = req.query.employeeId as string | undefined;

    let timesheets: unknown[];
    if (status) {
      timesheets = await hrService.getTimesheetsByStatus(status as any);
    } else if (employeeId) {
      timesheets = await hrService.getEmployeeTimesheets(employeeId);
    } else {
      timesheets = [];
    }

    res.json(timesheets);
  })
);

/**
 * GET /api/hr/timesheets/:id
 * Get timesheet by ID with entries
 */
router.get(
  '/timesheets/:id',
  employeeAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const timesheet = await hrService.getTimesheet(req.params.id);
    res.json(timesheet);
  })
);

/**
 * GET /api/hr/my-timesheets
 * Get current user's timesheets
 */
router.get(
  '/my-timesheets',
  employeeAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // Find employee by user ID
    const employees = await hrService.getEmployees({ search: req.user?.email || '' });
    if (employees.length === 0) {
      res.json([]);
      return;
    }

    const employeeId = employees[0].employeeId;
    const timesheets = await hrService.getEmployeeTimesheets(employeeId, 20);

    res.json(timesheets);
  })
);

/**
 * POST /api/hr/timesheets
 * Submit a timesheet
 */
router.post(
  '/timesheets',
  employeeAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const timesheet = await hrService.submitTimesheet(req.body, req.user?.userId || '');
    res.status(201).json(timesheet);
  })
);

/**
 * PUT /api/hr/timesheets/:id/approve
 * Approve a timesheet
 */
router.put(
  '/timesheets/:id/approve',
  hrAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const timesheet = await hrService.approveTimesheet(req.params.id, req.user?.userId || '');
    res.json(timesheet);
  })
);

/**
 * PUT /api/hr/timesheets/:id/reject
 * Reject a timesheet
 */
router.put(
  '/timesheets/:id/reject',
  hrAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { reason } = req.body;
    const timesheet = await hrService.rejectTimesheet(
      req.params.id,
      reason,
      req.user?.userId || ''
    );
    res.json(timesheet);
  })
);

// ============================================================================
// PAYROLL
// ============================================================================

/**
 * GET /api/hr/payroll/periods
 * Get all active payroll periods
 */
router.get(
  '/payroll/periods',
  hrAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const periods = await hrService.getPayrollPeriods();
    res.json(periods);
  })
);

/**
 * GET /api/hr/payroll/current-period
 * Get current payroll period
 */
router.get(
  '/payroll/current-period',
  hrAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const period = await hrService.getCurrentPayrollPeriod();
    res.json(period);
  })
);

/**
 * POST /api/hr/payroll/calculate
 * Calculate payroll for a period (preview)
 */
router.post(
  '/payroll/calculate',
  hrAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { periodId, employeeIds } = req.body;
    const calculation = await hrService.calculatePayroll(periodId, { employeeIds });
    res.json(calculation);
  })
);

/**
 * POST /api/hr/payroll/process
 * Process payroll run
 */
router.post(
  '/payroll/process',
  hrAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { periodId, employeeIds } = req.body;
    const payrollRun = await hrService.processPayrollRun(
      periodId,
      { employeeIds },
      req.user?.userId || ''
    );
    res.status(201).json(payrollRun);
  })
);

/**
 * GET /api/hr/payroll/runs
 * Get payroll runs
 */
router.get(
  '/payroll/runs',
  hrAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const runs = await hrService.getPayrollRuns(limit);
    res.json(runs);
  })
);

/**
 * GET /api/hr/payroll/runs/:id
 * Get payroll run with pay items
 */
router.get(
  '/payroll/runs/:id',
  hrAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const run = await hrService.getPayrollRun(req.params.id);
    res.json(run);
  })
);

// ============================================================================
// LEAVE MANAGEMENT
// ============================================================================

/**
 * GET /api/hr/leave/requests
 * Get leave requests
 */
router.get(
  '/leave/requests',
  employeeAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const status = req.query.status as string | undefined;
    const employeeId = req.query.employeeId as string | undefined;

    const requests = await hrService.getLeaveRequests({
      status: status as any,
      employeeId,
    });

    res.json(requests);
  })
);

/**
 * GET /api/hr/leave/my-requests
 * Get current user's leave requests
 */
router.get(
  '/leave/my-requests',
  employeeAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // Find employee by user ID
    const employees = await hrService.getEmployees({ search: req.user?.email || '' });
    if (employees.length === 0) {
      res.json([]);
      return;
    }

    const employeeId = employees[0].employeeId;
    const requests = await hrService.getLeaveRequests({ employeeId });

    res.json(requests);
  })
);

/**
 * GET /api/hr/leave/balances
 * Get leave balances for employee
 */
router.get(
  '/leave/balances',
  employeeAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const employeeId = req.query.employeeId as string;

    // If no employeeId specified, get current user's balances
    let targetEmployeeId = employeeId;
    if (!targetEmployeeId) {
      const employees = await hrService.getEmployees({ search: req.user?.email || '' });
      if (employees.length > 0) {
        targetEmployeeId = employees[0].employeeId;
      }
    }

    if (!targetEmployeeId) {
      res.json([]);
      return;
    }

    const balances = await hrService.getLeaveBalances(targetEmployeeId);
    res.json(balances);
  })
);

/**
 * POST /api/hr/leave/requests
 * Create a leave request
 */
router.post(
  '/leave/requests',
  employeeAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const request = await hrService.createLeaveRequest(req.body);
    res.status(201).json(request);
  })
);

/**
 * PUT /api/hr/leave/requests/:id/approve
 * Approve a leave request
 */
router.put(
  '/leave/requests/:id/approve',
  hrAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const request = await hrService.approveLeaveRequest(req.params.id, req.user?.userId || '');
    res.json(request);
  })
);

// ============================================================================
// SETTINGS & CONFIGURATION
// ============================================================================

/**
 * GET /api/hr/deduction-types
 * Get all active deduction types
 */
router.get(
  '/deduction-types',
  hrAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const types = await hrService.getDeductionTypes();
    res.json(types);
  })
);

/**
 * GET /api/hr/leave-types
 * Get all active leave types
 */
router.get(
  '/leave-types',
  hrAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const types = await hrService.getLeaveTypes();
    res.json(types);
  })
);

export default router;
