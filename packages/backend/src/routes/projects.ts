/**
 * Projects API Routes
 *
 * REST API for project management operations
 * Handles projects, tasks, milestones, time entries, expenses, billing, resources, and issues
 */

import { Router, Response } from 'express';
import { projectsService } from '../services/ProjectsService';
import { projectsRepository } from '../repositories/ProjectsRepository';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@opsui/shared';
import type { ProjectStatus, ProjectType, ExpenseCategory } from '@opsui/shared';

const router = Router();

// All projects routes require authentication
router.use(authenticate);

// Project management requires Admin, Supervisor, or Sales access
const projectManagementAuth = authorize(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SALES);

// Time entries can be accessed by a broader set of roles
const timeEntryAuth = authorize(
  UserRole.ADMIN,
  UserRole.SUPERVISOR,
  UserRole.SALES,
  UserRole.PICKER,
  UserRole.PACKER
);

// Analytics and reporting
const analyticsAuth = authorize(
  UserRole.ADMIN,
  UserRole.SUPERVISOR,
  UserRole.SALES,
  UserRole.ACCOUNTING
);

// ============================================================================
// PROJECTS
// ============================================================================

/**
 * GET /api/projects
 * Get all projects with optional filters
 * Query params: status, type, customer_id, project_manager_id, entity_id, search, date_from, date_to, tags
 */
router.get(
  '/',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters: any = {
      project_status: req.query.status as ProjectStatus | undefined,
      project_type: req.query.type as ProjectType | undefined,
      customer_id: req.query.customer_id as string | undefined,
      project_manager_id: req.query.project_manager_id as string | undefined,
      entity_id: req.query.entity_id as string | undefined,
      search: req.query.search as string | undefined,
      date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    };

    const projects = await projectsService.getProjects(filters);
    res.json(projects);
  })
);

/**
 * GET /api/projects/dashboard/metrics
 * Get dashboard metrics
 */
router.get(
  '/dashboard/metrics',
  analyticsAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters: any = {
      project_status: req.query.status as ProjectStatus | undefined,
      project_type: req.query.type as ProjectType | undefined,
      customer_id: req.query.customer_id as string | undefined,
      project_manager_id: req.query.project_manager_id as string | undefined,
      entity_id: req.query.entity_id as string | undefined,
      search: req.query.search as string | undefined,
      date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    };

    const metrics = await projectsService.getProjectDashboardMetrics(filters);
    res.json(metrics);
  })
);

/**
 * GET /api/projects/:id
 * Get project by ID with full details
 */
router.get(
  '/:id',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const project = await projectsService.getProjectById(req.params.id);
    res.json(project);
  })
);

/**
 * GET /api/projects/:id/summary
 * Get project summary with financials
 */
router.get(
  '/:id/summary',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const summary = await projectsService.getProjectSummary(req.params.id);
    res.json(summary);
  })
);

/**
 * GET /api/projects/:id/profitability
 * Get project profitability report
 */
router.get(
  '/:id/profitability',
  analyticsAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const report = await projectsService.getProjectProfitabilityReport(req.params.id);
    res.json(report);
  })
);

/**
 * POST /api/projects
 * Create new project
 */
router.post(
  '/',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const project = await projectsService.createProject(req.body, req.user?.userId || '');
    res.status(201).json(project);
  })
);

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put(
  '/:id',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const project = await projectsService.updateProject(
      req.params.id,
      req.body,
      req.user?.userId || ''
    );
    res.json(project);
  })
);

/**
 * DELETE /api/projects/:id
 * Delete project (soft delete)
 */
router.delete(
  '/:id',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const deleted = await projectsService.deleteProject(req.params.id, req.user?.userId || '');
    res.json({ success: deleted });
  })
);

// ============================================================================
// TASKS
// ============================================================================

/**
 * GET /api/projects/:id/tasks
 * Get tasks for a project
 */
router.get(
  '/:id/tasks',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tasks = await projectsService.getTasks(req.params.id);
    res.json(tasks);
  })
);

/**
 * GET /api/projects/:id/tasks/gantt
 * Get Gantt chart data for a project
 */
router.get(
  '/:id/tasks/gantt',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const ganttData = await projectsService.getGanttChartData(req.params.id);
    res.json(ganttData);
  })
);

/**
 * POST /api/projects/:id/tasks
 * Create task for a project
 */
router.post(
  '/:id/tasks',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = { ...req.body, project_id: req.params.id };
    const task = await projectsService.createTask(dto, req.user?.userId || '');
    res.status(201).json(task);
  })
);

/**
 * PUT /api/projects/tasks/:id
 * Update task
 */
router.put(
  '/tasks/:id',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const task = await projectsService.updateTask(req.params.id, req.body, req.user?.userId || '');
    res.json(task);
  })
);

/**
 * DELETE /api/projects/tasks/:id
 * Delete task
 */
router.delete(
  '/tasks/:id',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const deleted = await projectsService.deleteTask(req.params.id);
    res.json({ success: deleted });
  })
);

// ============================================================================
// TIME ENTRIES
// ============================================================================

/**
 * GET /api/projects/:id/time-entries
 * Get time entries for a project
 * Query params: task_id, employee_id, date_from, date_to, billable, approved
 */
router.get(
  '/:id/time-entries',
  timeEntryAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters = {
      project_id: req.params.id,
      task_id: req.query.task_id as string | undefined,
      employee_id: req.query.employee_id as string | undefined,
      date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
      billable:
        req.query.billable === 'true' ? true : req.query.billable === 'false' ? false : undefined,
      approved:
        req.query.approved === 'true' ? true : req.query.approved === 'false' ? false : undefined,
    };

    const timeEntries = await projectsService.getTimeEntries(filters);
    res.json(timeEntries);
  })
);

/**
 * POST /api/projects/time-entries
 * Create time entry
 */
router.post(
  '/time-entries',
  timeEntryAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const timeEntry = await projectsService.createTimeEntry(req.body, req.user?.userId || '');
    res.status(201).json(timeEntry);
  })
);

/**
 * POST /api/projects/time-entries/approve
 * Approve or reject time entries
 * Body: { time_entry_ids: string[], approved: boolean }
 */
router.post(
  '/time-entries/approve',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await projectsService.approveTimeEntries(req.body, req.user?.userId || '');
    res.json({ success: true });
  })
);

// ============================================================================
// EXPENSES
// ============================================================================

/**
 * GET /api/projects/:id/expenses
 * Get expenses for a project
 * Query params: category, date_from, date_to, approved, reimbursed
 */
router.get(
  '/:id/expenses',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters: any = {
      project_id: req.params.id,
      category: req.query.category as ExpenseCategory | undefined,
      date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
      approved:
        req.query.approved === 'true' ? true : req.query.approved === 'false' ? false : undefined,
      reimbursed:
        req.query.reimbursed === 'true'
          ? true
          : req.query.reimbursed === 'false'
            ? false
            : undefined,
    };

    const expenses = await projectsService.getExpenses(filters);
    res.json(expenses);
  })
);

/**
 * POST /api/projects/expenses
 * Create expense
 */
router.post(
  '/expenses',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const expense = await projectsService.createExpense(req.body, req.user?.userId || '');
    res.status(201).json(expense);
  })
);

/**
 * POST /api/projects/expenses/approve
 * Approve or reject expenses
 * Body: { expense_ids: string[], approved: boolean, rejection_reason?: string }
 */
router.post(
  '/expenses/approve',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { expense_ids, approved, rejection_reason } = req.body;
    await projectsService.batchApproveExpenses(
      expense_ids,
      approved,
      req.user?.userId || '',
      rejection_reason
    );
    res.json({ success: true });
  })
);

// ============================================================================
// MILESTONES
// ============================================================================

/**
 * GET /api/projects/:id/milestones
 * Get milestones for a project
 */
router.get(
  '/:id/milestones',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const milestones = await projectsService.getMilestones(req.params.id);
    res.json(milestones);
  })
);

/**
 * POST /api/projects/milestones
 * Create milestone
 */
router.post(
  '/milestones',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const milestone = await projectsService.createMilestone(req.body, req.user?.userId || '');
    res.status(201).json(milestone);
  })
);

/**
 * PUT /api/projects/milestones/:id
 * Update milestone
 */
router.put(
  '/milestones/:id',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const milestone = await projectsService.updateMilestone(req.params.id, req.body);
    res.json(milestone);
  })
);

/**
 * POST /api/projects/milestones/:id/complete
 * Mark milestone as complete
 */
router.post(
  '/milestones/:id/complete',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const milestone = await projectsService.completeMilestone(req.params.id);
    res.json(milestone);
  })
);

// ============================================================================
// BILLING
// ============================================================================

/**
 * GET /api/projects/:id/billing
 * Get billing schedule for a project
 */
router.get(
  '/:id/billing',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const billingSchedule = await projectsService.getBillingSchedule(req.params.id);
    res.json(billingSchedule);
  })
);

/**
 * POST /api/projects/billing
 * Create billing schedule item
 */
router.post(
  '/billing',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const schedule = await projectsService.createBillingSchedule(req.body, req.user?.userId || '');
    res.status(201).json(schedule);
  })
);

/**
 * POST /api/projects/:id/invoice
 * Generate invoice for a project
 * Body: { schedule_ids?: string[], include_unbilled_time?: boolean, include_unbilled_expenses?: boolean, invoice_date: Date, due_date?: Date }
 */
router.post(
  '/:id/invoice',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dto = { ...req.body, project_id: req.params.id };
    const invoice = await projectsService.generateProjectInvoice(dto, req.user?.userId || '');
    res.status(201).json(invoice);
  })
);

// ============================================================================
// RESOURCES
// ============================================================================

/**
 * GET /api/projects/:id/resources
 * Get project resources (team assignments)
 */
router.get(
  '/:id/resources',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const resources = await projectsService.getProjectResources(req.params.id);
    res.json(resources);
  })
);

/**
 * POST /api/projects/resources
 * Assign resource to project
 */
router.post(
  '/resources',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const resource = await projectsService.assignResource(req.body, req.user?.userId || '');
    res.status(201).json(resource);
  })
);

/**
 * DELETE /api/projects/resources/:id
 * Remove resource from project
 */
router.delete(
  '/resources/:id',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const removed = await projectsService.removeResource(req.params.id);
    res.json({ success: removed });
  })
);

/**
 * GET /api/projects/resources/:userId/utilization
 * Get resource utilization report
 * Query params: user_id (optional - if not provided, returns all users)
 */
router.get(
  '/resources/utilization',
  analyticsAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.query.user_id as string | undefined;
    const utilization = await projectsService.getResourceUtilization(userId);
    res.json(utilization);
  })
);

// ============================================================================
// ISSUES
// ============================================================================

/**
 * GET /api/projects/:id/issues
 * Get issues for a project
 * Query params: status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
 */
router.get(
  '/:id/issues',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const status = req.query.status as string | undefined;
    let issues;

    if (status === 'OPEN') {
      issues = await projectsRepository.issues.findOpen(req.params.id);
    } else {
      issues = await projectsRepository.issues.findByProjectId(req.params.id);
      if (status) {
        issues = issues.filter(i => i.status === status);
      }
    }

    res.json(issues);
  })
);

/**
 * POST /api/projects/issues
 * Create issue
 */
router.post(
  '/issues',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: any) => {
    const issue_id = `ISSUE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date();

    // Validate project exists
    await projectsRepository.projects.findByIdOrThrow(req.body.project_id);

    // Validate task if provided
    if (req.body.task_id) {
      const task = await projectsRepository.tasks.findById(req.body.task_id);
      if (!task || task.project_id !== req.body.project_id) {
        return res.status(404).json({ error: 'Task not found in this project' });
      }
    }

    const issue = {
      ...req.body,
      issue_id,
      reported_by: req.user?.userId || '',
      reported_date: now,
      created_at: now,
      updated_at: now,
      created_by: req.user?.userId || '',
    };

    const created = await projectsRepository.issues.insert(issue);
    res.status(201).json(created);
  })
);

/**
 * PUT /api/projects/issues/:id
 * Update issue
 */
router.put(
  '/issues/:id',
  projectManagementAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const updated = await projectsRepository.issues.update(req.params.id, {
      ...req.body,
      updated_at: new Date(),
    });
    res.json(updated);
  })
);

/**
 * GET /api/projects/issues/critical
 * Get all critical open issues
 */
router.get(
  '/issues/critical',
  projectManagementAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const issues = await projectsRepository.issues.findCritical();
    res.json(issues);
  })
);

// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;
