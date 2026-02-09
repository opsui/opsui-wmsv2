/**
 * Projects Service
 *
 * Business logic for project management operations
 * Handles projects, tasks, milestones, time entries, expenses, billing, and resources
 */

import { projectsRepository } from '../repositories/ProjectsRepository';
import { query, transaction } from '../db/client';
import { NotFoundError } from '@opsui/shared';
import type {
  Project,
  ProjectWithDetails,
  ProjectSummary,
  ProjectTask,
  ProjectTaskWithDetails,
  ProjectMilestone,
  ProjectTimeEntry,
  ProjectTimeEntryWithDetails,
  ProjectExpense,
  ProjectBudgetItem,
  ProjectBillingSchedule,
  ProjectResource,
  ProjectResourceWithDetails,
  ProjectIssue,
  CreateProjectDTO,
  UpdateProjectDTO,
  CreateTaskDTO,
  UpdateTaskDTO,
  CreateMilestoneDTO,
  CreateTimeEntryDTO,
  ApproveTimeEntriesDTO,
  CreateExpenseDTO,
  CreateBillingScheduleDTO,
  GenerateProjectInvoiceDTO,
  GenerateProjectInvoiceResult,
  AssignResourceDTO,
  CreateIssueDTO,
  ProjectQueryFilters,
  TimeEntryQueryFilters,
  ExpenseQueryFilters,
  GanttChartData,
  ProjectDashboardMetrics,
  ProjectProfitabilityReport,
  ResourceUtilizationReport,
  ProjectStatus,
  TaskStatus,
} from '@opsui/shared';

// ============================================================================
// ID GENERATORS
// ============================================================================

function generateProjectId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PRJ-${timestamp}-${random}`;
}

function generateTaskId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TSK-${timestamp}-${random}`;
}

function generateMilestoneId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MLST-${timestamp}-${random}`;
}

function generateTimeEntryId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TIME-${timestamp}-${random}`;
}

function generateExpenseId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EXP-${timestamp}-${random}`;
}

function generateScheduleId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SCH-${timestamp}-${random}`;
}

function generateResourceId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RSRC-${timestamp}-${random}`;
}

function generateIssueId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ISSUE-${timestamp}-${random}`;
}

// ============================================================================
// PROJECTS SERVICE
// ============================================================================

class ProjectsService {
  // ==========================================================================
  // PROJECT MANAGEMENT
  // ==========================================================================

  /**
   * Get all projects with optional filters
   */
  async getProjects(filters: ProjectQueryFilters = {}): Promise<Project[]> {
    return await projectsRepository.projects.queryWithFilters(filters);
  }

  /**
   * Get project by ID
   */
  async getProjectById(projectId: string): Promise<ProjectWithDetails> {
    const project = await projectsRepository.projects.findByIdWithDetails(projectId);
    if (!project) {
      throw new NotFoundError('Project', projectId);
    }
    return project;
  }

  /**
   * Get project summary with financials
   */
  async getProjectSummary(projectId: string): Promise<ProjectSummary> {
    const summary = await projectsRepository.projects.getProjectSummary(projectId);
    if (!summary) {
      throw new NotFoundError('Project', projectId);
    }
    return summary;
  }

  /**
   * Create new project
   */
  async createProject(dto: CreateProjectDTO, createdBy: string): Promise<Project> {
    // Generate project number
    const project_number = `PRJ-${Date.now()}`;

    // Check if project number already exists
    const existingNumber = await projectsRepository.projects.findByNumber(project_number);
    if (existingNumber) {
      throw new Error('Project number already exists');
    }

    // Validate customer if provided
    if (dto.customer_id) {
      const customer = await query('SELECT id FROM customers WHERE id = $1', [dto.customer_id]);
      if (customer.rows.length === 0) {
        throw new NotFoundError('Customer', dto.customer_id);
      }
    }

    // Validate managers if provided
    if (dto.project_manager_id) {
      const manager = await query('SELECT user_id FROM users WHERE user_id = $1', [
        dto.project_manager_id,
      ]);
      if (manager.rows.length === 0) {
        throw new NotFoundError('Project Manager', dto.project_manager_id);
      }
    }

    const project_id = generateProjectId();
    const now = new Date();

    const project: Project = {
      project_id,
      project_number,
      project_name: dto.project_name,
      project_description: dto.project_description || null,
      customer_id: dto.customer_id || null,
      project_type: dto.project_type || ('TIME_MATERIALS' as any),
      project_status: 'DRAFT' as any,
      start_date: dto.start_date,
      end_date: dto.end_date || null,
      actual_start_date: null,
      actual_end_date: null,
      estimated_budget: dto.estimated_budget || 0,
      actual_cost: 0,
      actual_revenue: 0,
      budget_variance: dto.estimated_budget || 0,
      profit_amount: 0,
      progress_percent: 0,
      billing_type: dto.billing_type || ('TIME_MATERIAL' as any),
      advance_payment: dto.advance_payment || 0,
      project_manager_id: dto.project_manager_id || null,
      account_manager_id: dto.account_manager_id || null,
      entity_id: dto.entity_id || null,
      tags: dto.tags || null,
      priority: dto.priority || 'MEDIUM',
      quote_id: dto.quote_id || null,
      contract_number: dto.contract_number || null,
      purchase_order_number: dto.purchase_order_number || null,
      created_at: now,
      updated_at: now,
      completed_at: null,
      created_by: createdBy,
    };

    return await projectsRepository.projects.insert(project);
  }

  /**
   * Update project
   */
  async updateProject(
    projectId: string,
    dto: UpdateProjectDTO,
    updatedBy: string
  ): Promise<Project> {
    const existing = await projectsRepository.projects.findByIdOrThrow(projectId);

    return (await projectsRepository.projects.update(projectId, {
      ...dto,
      updated_at: new Date(),
    })) as Project;
  }

  /**
   * Delete project (soft delete)
   */
  async deleteProject(projectId: string, deletedBy: string): Promise<boolean> {
    const project = await projectsRepository.projects.findByIdOrThrow(projectId);

    // Check if project has active tasks
    const tasks = await projectsRepository.tasks.findByProjectId(projectId);
    const activeTasks = tasks.filter(
      t => t.task_status !== 'COMPLETED' && t.task_status !== 'CANCELLED'
    );
    if (activeTasks.length > 0) {
      throw new Error(
        'Cannot delete project with active tasks. Please complete or cancel tasks first.'
      );
    }

    return await projectsRepository.projects.softDelete(projectId);
  }

  // ==========================================================================
  // TASK MANAGEMENT
  // ==========================================================================

  /**
   * Get tasks for a project
   */
  async getTasks(projectId: string): Promise<ProjectTaskWithDetails[]> {
    const tasks = await projectsRepository.tasks.findByProjectId(projectId);
    const details: ProjectTaskWithDetails[] = [];

    for (const task of tasks) {
      const withDetails = await projectsRepository.tasks.findByIdWithDetails(task.task_id);
      if (withDetails) {
        details.push(withDetails);
      }
    }

    return details;
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string): Promise<ProjectTaskWithDetails> {
    const task = await projectsRepository.tasks.findByIdWithDetails(taskId);
    if (!task) {
      throw new NotFoundError('Task', taskId);
    }
    return task;
  }

  /**
   * Get Gantt chart data for a project
   */
  async getGanttChartData(projectId: string): Promise<GanttChartData[]> {
    return await projectsRepository.tasks.getGanttChartData(projectId);
  }

  /**
   * Create task
   */
  async createTask(dto: CreateTaskDTO, createdBy: string): Promise<ProjectTask> {
    // Validate project
    const project = await projectsRepository.projects.findByIdOrThrow(dto.project_id);

    // Validate parent task if provided
    if (dto.parent_task_id) {
      const parentTask = await projectsRepository.tasks.findById(dto.parent_task_id);
      if (!parentTask || parentTask.project_id !== dto.project_id) {
        throw new NotFoundError('Parent Task', dto.parent_task_id);
      }
    }

    // Validate dependencies if provided
    if (dto.depends_on_tasks && dto.depends_on_tasks.length > 0) {
      const depResult = await query(
        'SELECT task_id FROM project_tasks WHERE task_id = ANY($1) AND project_id = $2',
        [dto.depends_on_tasks, dto.project_id]
      );
      if (depResult.rows.length !== dto.depends_on_tasks.length) {
        throw new Error('One or more dependency tasks not found in this project');
      }
    }

    // Validate assignee if provided
    if (dto.assigned_to) {
      const user = await query('SELECT user_id FROM users WHERE user_id = $1', [dto.assigned_to]);
      if (user.rows.length === 0) {
        throw new NotFoundError('User', dto.assigned_to);
      }
    }

    const task_id = generateTaskId();
    const now = new Date();

    // Get sort order
    let sort_order = 0;
    if (!dto.parent_task_id) {
      const rootTasks = await projectsRepository.tasks.findRootTasks(dto.project_id);
      sort_order = rootTasks.length;
    } else {
      const siblings = await projectsRepository.tasks.findChildren(dto.parent_task_id);
      sort_order = siblings.length;
    }

    const task: ProjectTask = {
      task_id,
      project_id: dto.project_id,
      parent_task_id: dto.parent_task_id || null,
      task_name: dto.task_name,
      task_description: dto.task_description || null,
      task_number: dto.task_number || null,
      wbs_code: dto.wbs_code || null,
      sort_order,
      assigned_to: dto.assigned_to || null,
      task_status: 'NOT_STARTED' as any,
      task_priority: dto.task_priority || ('MEDIUM' as any),
      start_date: dto.start_date || null,
      due_date: dto.due_date || null,
      actual_start_date: null,
      actual_end_date: null,
      estimated_hours: dto.estimated_hours || null,
      actual_hours: 0,
      hours_variance: dto.estimated_hours || 0,
      progress_percent: 0,
      percent_complete: 0,
      depends_on_tasks: dto.depends_on_tasks || null,
      is_milestone: dto.is_milestone || false,
      is_critical: dto.is_critical || false,
      deliverable_name: dto.deliverable_name || null,
      deliverable_date: dto.deliverable_date || null,
      created_at: now,
      updated_at: now,
      completed_at: null,
      created_by: createdBy,
    };

    return await projectsRepository.tasks.insert(task);
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, dto: UpdateTaskDTO, updatedBy: string): Promise<ProjectTask> {
    const existing = await projectsRepository.tasks.findByIdOrThrow(taskId);

    // Update completed_at if status changed to COMPLETED
    const updates: any = { ...dto, updated_at: new Date() };
    if (dto.task_status === 'COMPLETED' && existing.task_status !== 'COMPLETED') {
      updates.completed_at = new Date();
      updates.actual_end_date = new Date();
      updates.progress_percent = 100;
      updates.percent_complete = 100;
    }

    return (await projectsRepository.tasks.update(taskId, updates)) as ProjectTask;
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const task = await projectsRepository.tasks.findByIdOrThrow(taskId);

    // Check if task has children
    const children = await projectsRepository.tasks.findChildren(taskId);
    if (children.length > 0) {
      throw new Error(
        'Cannot delete task with child tasks. Please reassign or delete children first.'
      );
    }

    return await projectsRepository.tasks.delete(taskId);
  }

  // ==========================================================================
  // MILESTONE MANAGEMENT
  // ==========================================================================

  /**
   * Get milestones for a project
   */
  async getMilestones(projectId: string): Promise<ProjectMilestone[]> {
    return await projectsRepository.milestones.findByProjectId(projectId);
  }

  /**
   * Create milestone
   */
  async createMilestone(dto: CreateMilestoneDTO, createdBy: string): Promise<ProjectMilestone> {
    // Validate project
    await projectsRepository.projects.findByIdOrThrow(dto.project_id);

    const milestone_id = generateMilestoneId();
    const now = new Date();

    const milestone: ProjectMilestone = {
      milestone_id,
      project_id: dto.project_id,
      milestone_name: dto.milestone_name,
      milestone_description: dto.milestone_description || null,
      milestone_number: dto.milestone_number,
      milestone_date: dto.milestone_date,
      completed_at: null,
      milestone_status: 'PENDING',
      is_met: false,
      billing_percentage: dto.billing_percentage || null,
      billing_amount: null,
      invoice_id: null,
      depends_on_milestones: dto.depends_on_milestones || null,
      created_at: now,
      updated_at: now,
      created_by: createdBy,
    };

    return await projectsRepository.milestones.insert(milestone);
  }

  /**
   * Update milestone
   */
  async updateMilestone(
    milestoneId: string,
    dto: Partial<CreateMilestoneDTO>
  ): Promise<ProjectMilestone> {
    const existing = await projectsRepository.milestones.findByIdOrThrow(milestoneId);

    return (await projectsRepository.milestones.update(milestoneId, {
      ...dto,
      updated_at: new Date(),
    })) as ProjectMilestone;
  }

  /**
   * Mark milestone as complete
   */
  async completeMilestone(milestoneId: string): Promise<ProjectMilestone> {
    const milestone = await projectsRepository.milestones.markAsComplete(milestoneId);
    if (!milestone) {
      throw new NotFoundError('Milestone', milestoneId);
    }
    return milestone;
  }

  // ==========================================================================
  // TIME ENTRY MANAGEMENT
  // ==========================================================================

  /**
   * Get time entries with filters
   */
  async getTimeEntries(
    filters: TimeEntryQueryFilters = {}
  ): Promise<ProjectTimeEntryWithDetails[]> {
    const timeEntries = await projectsRepository.timeEntries.queryWithFilters(filters);
    const details: ProjectTimeEntryWithDetails[] = [];

    for (const entry of timeEntries) {
      const withDetails = await projectsRepository.timeEntries.findByIdWithDetails(
        entry.time_entry_id
      );
      if (withDetails) {
        details.push(withDetails);
      }
    }

    return details;
  }

  /**
   * Create time entry
   */
  async createTimeEntry(dto: CreateTimeEntryDTO, createdBy: string): Promise<ProjectTimeEntry> {
    // Validate project
    await projectsRepository.projects.findByIdOrThrow(dto.project_id);

    // Validate task if provided
    if (dto.task_id) {
      const task = await projectsRepository.tasks.findById(dto.task_id);
      if (!task || task.project_id !== dto.project_id) {
        throw new NotFoundError('Task', dto.task_id);
      }
    }

    const time_entry_id = generateTimeEntryId();
    const now = new Date();

    const timeEntry: ProjectTimeEntry = {
      time_entry_id,
      project_id: dto.project_id,
      task_id: dto.task_id || null,
      employee_id: createdBy,
      work_date: dto.work_date,
      work_type: dto.work_type || ('REGULAR' as any),
      regular_hours: dto.regular_hours,
      overtime_1_5_hours: dto.overtime_1_5_hours || 0,
      overtime_2_0_hours: dto.overtime_2_0_hours || 0,
      total_hours:
        dto.regular_hours + (dto.overtime_1_5_hours || 0) + (dto.overtime_2_0_hours || 0),
      description: dto.description || null,
      billable: dto.billable !== undefined ? dto.billable : true,
      billing_rate: dto.billing_rate || null,
      billing_amount: 0, // Will be calculated by trigger
      approved: false,
      approved_by: null,
      approved_at: null,
      invoice_line_item_id: null,
      timesheet_entry_id: null,
      created_at: now,
      updated_at: now,
      created_by: createdBy,
    };

    return await projectsRepository.timeEntries.insert(timeEntry);
  }

  /**
   * Approve time entries
   */
  async approveTimeEntries(dto: ApproveTimeEntriesDTO, approvedBy: string): Promise<void> {
    await projectsRepository.timeEntries.batchApprove(dto.time_entry_ids, dto.approved, approvedBy);

    // Update project actuals for affected projects
    const timeEntries = await query(
      'SELECT DISTINCT project_id FROM project_time_entries WHERE time_entry_id = ANY($1)',
      [dto.time_entry_ids]
    );

    for (const row of timeEntries.rows) {
      await projectsRepository.projects.updateActuals(row.project_id);
    }
  }

  /**
   * Batch approve time entries
   */
  async batchApproveTimeEntries(
    timeEntryIds: string[],
    approve: boolean,
    approvedBy: string
  ): Promise<void> {
    await projectsRepository.timeEntries.batchApprove(timeEntryIds, approve, approvedBy);
  }

  // ==========================================================================
  // EXPENSE MANAGEMENT
  // ==========================================================================

  /**
   * Get expenses with filters
   */
  async getExpenses(filters: ExpenseQueryFilters = {}): Promise<ProjectExpense[]> {
    return await projectsRepository.expenses.queryWithFilters(filters);
  }

  /**
   * Create expense
   */
  async createExpense(dto: CreateExpenseDTO, createdBy: string): Promise<ProjectExpense> {
    // Validate project
    await projectsRepository.projects.findByIdOrThrow(dto.project_id);

    // Validate task if provided
    if (dto.task_id) {
      const task = await projectsRepository.tasks.findById(dto.task_id);
      if (!task || task.project_id !== dto.project_id) {
        throw new NotFoundError('Task', dto.task_id);
      }
    }

    const expense_id = generateExpenseId();
    const now = new Date();

    const expense: ProjectExpense = {
      expense_id,
      project_id: dto.project_id,
      task_id: dto.task_id || null,
      expense_date: dto.expense_date,
      expense_category: dto.expense_category as any,
      amount: dto.amount,
      currency: dto.currency || 'USD',
      exchange_rate: 1.0,
      base_currency_amount: dto.amount,
      description: dto.description,
      receipt_url: dto.receipt_url || null,
      receipt_number: dto.receipt_number || null,
      vendor_name: dto.vendor_name || null,
      submitted_by: createdBy,
      submitted_at: now,
      approved: false,
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      reimbursed: false,
      reimbursement_date: null,
      reimbursement_amount: null,
      reimbursement_check_number: null,
      invoice_line_item_id: null,
      billable: dto.billable !== undefined ? dto.billable : true,
      tax_amount: dto.tax_amount || 0,
      tax_code: dto.tax_code || null,
      created_at: now,
      updated_at: now,
      created_by: createdBy,
    };

    return await projectsRepository.expenses.insert(expense);
  }

  /**
   * Approve expense
   */
  async approveExpense(
    expenseId: string,
    approve: boolean,
    approvedBy: string,
    rejectionReason?: string
  ): Promise<void> {
    const expense = await projectsRepository.expenses.findByIdOrThrow(expenseId);
    await projectsRepository.expenses.batchApprove(
      [expenseId],
      approve,
      approvedBy,
      rejectionReason
    );

    // Update project actuals
    await projectsRepository.projects.updateActuals(expense.project_id);
  }

  /**
   * Batch approve expenses
   */
  async batchApproveExpenses(
    expenseIds: string[],
    approve: boolean,
    approvedBy: string,
    rejectionReason?: string
  ): Promise<void> {
    await projectsRepository.expenses.batchApprove(
      expenseIds,
      approve,
      approvedBy,
      rejectionReason
    );

    // Update project actuals for affected projects
    const expenses = await query(
      'SELECT DISTINCT project_id FROM project_expenses WHERE expense_id = ANY($1)',
      [expenseIds]
    );

    for (const row of expenses.rows) {
      await projectsRepository.projects.updateActuals(row.project_id);
    }
  }

  // ==========================================================================
  // BILLING MANAGEMENT
  // ==========================================================================

  /**
   * Get billing schedule for a project
   */
  async getBillingSchedule(projectId: string): Promise<ProjectBillingSchedule[]> {
    return await projectsRepository.billingSchedule.findByProjectId(projectId);
  }

  /**
   * Create billing schedule item
   */
  async createBillingSchedule(
    dto: CreateBillingScheduleDTO,
    createdBy: string
  ): Promise<ProjectBillingSchedule> {
    // Validate project
    await projectsRepository.projects.findByIdOrThrow(dto.project_id);

    // Validate milestone if provided
    if (dto.milestone_id) {
      const milestone = await projectsRepository.milestones.findById(dto.milestone_id);
      if (!milestone || milestone.project_id !== dto.project_id) {
        throw new NotFoundError('Milestone', dto.milestone_id);
      }
    }

    const schedule_id = generateScheduleId();
    const now = new Date();

    const schedule: ProjectBillingSchedule = {
      schedule_id,
      project_id: dto.project_id,
      milestone_id: dto.milestone_id || null,
      billing_date: dto.billing_date,
      billing_description: dto.billing_description || null,
      amount: dto.amount,
      percentage: dto.percentage || null,
      status: 'PENDING' as any,
      invoice_id: null,
      payment_due_date: dto.payment_due_date || null,
      payment_received_date: null,
      payment_amount: null,
      created_at: now,
      updated_at: now,
      created_by: createdBy,
    };

    return await projectsRepository.billingSchedule.insert(schedule);
  }

  /**
   * Generate project invoice
   * Creates accounting invoice with unbilled time entries and expenses
   */
  async generateProjectInvoice(
    dto: GenerateProjectInvoiceDTO,
    createdBy: string
  ): Promise<GenerateProjectInvoiceResult> {
    const project = await projectsRepository.projects.findByIdOrThrow(dto.project_id);

    // Get unbilled time entries
    let unbilledTimeEntries: ProjectTimeEntry[] = [];
    if (dto.include_unbilled_time !== false) {
      unbilledTimeEntries = await projectsRepository.timeEntries.findUnbilled(dto.project_id);
    }

    // Get unbilled expenses
    let unbilledExpenses: ProjectExpense[] = [];
    if (dto.include_unbilled_expenses !== false) {
      unbilledExpenses = await projectsRepository.expenses.findUnbilled(dto.project_id);
    }

    // Get billing schedule items
    let scheduleItems: ProjectBillingSchedule[] = [];
    if (dto.schedule_ids && dto.schedule_ids.length > 0) {
      for (const scheduleId of dto.schedule_ids) {
        const schedule = await projectsRepository.billingSchedule.findById(scheduleId);
        if (schedule && schedule.project_id === dto.project_id && schedule.status === 'PENDING') {
          scheduleItems.push(schedule);
        }
      }
    }

    // Calculate total amount
    const totalAmount =
      scheduleItems.reduce((sum, s) => sum + Number(s.amount), 0) +
      unbilledTimeEntries.reduce((sum, t) => sum + Number(t.billing_amount), 0) +
      unbilledExpenses.reduce((sum, e) => sum + Number(e.amount) + Number(e.tax_amount), 0);

    // Create accounting invoice (placeholder - would integrate with AccountingService)
    const invoice_number = `INV-${Date.now()}`;
    const invoice_id = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Update billing schedule status
    for (const schedule of scheduleItems) {
      await projectsRepository.billingSchedule.updateStatus(
        schedule.schedule_id,
        'BILLED',
        invoice_id
      );
    }

    // Mark time entries and expenses as billed
    await transaction(async client => {
      if (unbilledTimeEntries.length > 0) {
        await client.query(
          'UPDATE project_time_entries SET invoice_line_item_id = $1 WHERE time_entry_id = ANY($2)',
          [invoice_id, unbilledTimeEntries.map(t => t.time_entry_id)]
        );
      }

      if (unbilledExpenses.length > 0) {
        await client.query(
          'UPDATE project_expenses SET invoice_line_item_id = $1 WHERE expense_id = ANY($2)',
          [invoice_id, unbilledExpenses.map(e => e.expense_id)]
        );
      }
    });

    return {
      invoice_id,
      invoice_number,
      total_amount: totalAmount,
      line_items_count: scheduleItems.length + unbilledTimeEntries.length + unbilledExpenses.length,
      time_entries_included: unbilledTimeEntries.length,
      expenses_included: unbilledExpenses.length,
    };
  }

  // ==========================================================================
  // RESOURCE MANAGEMENT
  // ==========================================================================

  /**
   * Get project resources
   */
  async getProjectResources(projectId: string): Promise<ProjectResourceWithDetails[]> {
    const resources = await projectsRepository.resources.findByProjectId(projectId);
    const details: ProjectResourceWithDetails[] = [];

    for (const resource of resources) {
      const withDetails = await projectsRepository.resources.findByIdWithDetails(
        resource.resource_id
      );
      if (withDetails) {
        details.push(withDetails);
      }
    }

    return details;
  }

  /**
   * Assign resource to project
   */
  async assignResource(dto: AssignResourceDTO, createdBy: string): Promise<ProjectResource> {
    // Validate project
    await projectsRepository.projects.findByIdOrThrow(dto.project_id);

    // Validate user
    const user = await query('SELECT user_id FROM users WHERE user_id = $1', [dto.user_id]);
    if (user.rows.length === 0) {
      throw new NotFoundError('User', dto.user_id);
    }

    // Check if resource already assigned
    const existing = await query(
      'SELECT resource_id FROM project_resources WHERE project_id = $1 AND user_id = $2 AND is_active = true',
      [dto.project_id, dto.user_id]
    );
    if (existing.rows.length > 0) {
      throw new Error('User is already assigned to this project');
    }

    const resource_id = generateResourceId();
    const now = new Date();

    const resource: ProjectResource = {
      resource_id,
      project_id: dto.project_id,
      user_id: dto.user_id,
      role: dto.role || null,
      allocation_percent: dto.allocation_percent || 100,
      hourly_rate: dto.hourly_rate || null,
      cost_rate: dto.cost_rate || null,
      start_date: dto.start_date,
      end_date: dto.end_date || null,
      is_active: true,
      created_at: now,
      updated_at: now,
      created_by: createdBy,
    };

    return await projectsRepository.resources.insert(resource);
  }

  /**
   * Remove resource from project
   */
  async removeResource(resourceId: string): Promise<boolean> {
    return await projectsRepository.resources.removeResource(resourceId);
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  /**
   * Get project dashboard metrics
   */
  async getProjectDashboardMetrics(
    filters?: ProjectQueryFilters
  ): Promise<ProjectDashboardMetrics> {
    const projects = await this.getProjects(filters || {});

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const metrics: ProjectDashboardMetrics = {
      total_projects: projects.length,
      active_projects: projects.filter(p => p.project_status === 'ACTIVE').length,
      total_value: projects.reduce((sum, p) => sum + Number(p.estimated_budget), 0),
      total_revenue: projects.reduce((sum, p) => sum + Number(p.actual_revenue), 0),
      total_cost: projects.reduce((sum, p) => sum + Number(p.actual_cost), 0),
      total_profit: projects.reduce((sum, p) => sum + Number(p.profit_amount), 0),
      average_margin: 0,
      hours_this_month: 0,
      hours_this_period: 0,
      pending_approvals: 0,
      projects_at_risk: 0,
      projects_over_budget: 0,
    };

    // Calculate average margin
    if (metrics.total_revenue > 0) {
      metrics.average_margin = (metrics.total_profit / metrics.total_revenue) * 100;
    }

    // Get hours this month
    const hoursResult = await query(
      `SELECT SUM(total_hours) as total FROM project_time_entries WHERE work_date >= $1`,
      [firstDayOfMonth]
    );
    metrics.hours_this_month = Number(hoursResult.rows[0]?.total) || 0;

    // Get pending approvals
    const pendingResult = await query(
      `SELECT COUNT(*) as count FROM project_time_entries WHERE approved = false`
    );
    metrics.pending_approvals = Number(pendingResult.rows[0]?.count) || 0;

    // Count projects at risk (over budget or overdue)
    for (const project of projects) {
      if (Number(project.actual_cost) > Number(project.estimated_budget)) {
        metrics.projects_over_budget++;
      }
      if (
        project.end_date &&
        new Date(project.end_date) < now &&
        project.project_status === 'ACTIVE'
      ) {
        metrics.projects_at_risk++;
      }
    }

    return metrics;
  }

  /**
   * Get project profitability report
   */
  async getProjectProfitabilityReport(projectId: string): Promise<ProjectProfitabilityReport> {
    const summary = await this.getProjectSummary(projectId);

    // Get labor vs expense breakdown
    const laborResult = await query(
      `SELECT SUM(total_hours * COALESCE(billing_rate, 0)) as labor_cost FROM project_time_entries WHERE project_id = $1 AND approved = true`,
      [projectId]
    );

    const expenseResult = await query(
      `SELECT SUM(base_currency_amount) as expense_cost FROM project_expenses WHERE project_id = $1 AND approved = true`,
      [projectId]
    );

    const billableHoursResult = await query(
      `SELECT SUM(total_hours) as hours FROM project_time_entries WHERE project_id = $1 AND billable = true AND approved = true`,
      [projectId]
    );

    const totalHoursResult = await query(
      `SELECT SUM(total_hours) as hours FROM project_time_entries WHERE project_id = $1 AND approved = true`,
      [projectId]
    );

    const labor_cost = Number(laborResult.rows[0]?.labor_cost) || 0;
    const expense_cost = Number(expenseResult.rows[0]?.expense_cost) || 0;
    const billable_hours = Number(billableHoursResult.rows[0]?.hours) || 0;
    const total_hours = Number(totalHoursResult.rows[0]?.hours) || 0;

    const profit_margin_percent =
      summary.actual_revenue > 0 ? (summary.profit_amount / summary.actual_revenue) * 100 : 0;

    const budget_variance_percent =
      summary.estimated_budget > 0
        ? ((summary.estimated_budget - summary.actual_cost) / summary.estimated_budget) * 100
        : 0;

    const average_hourly_rate = total_hours > 0 ? summary.actual_revenue / total_hours : 0;
    const cost_per_hour = total_hours > 0 ? (labor_cost + expense_cost) / total_hours : 0;

    const billable_percentage = total_hours > 0 ? (billable_hours / total_hours) * 100 : 0;

    return {
      project_id: summary.project_id,
      project_name: summary.project_name,
      estimated_budget: summary.estimated_budget,
      actual_cost: summary.actual_cost,
      actual_revenue: summary.actual_revenue,
      profit_amount: summary.profit_amount,
      profit_margin_percent,
      budget_variance_percent,
      total_hours: summary.total_hours,
      average_hourly_rate,
      cost_per_hour,
      labor_cost,
      expense_cost,
      billable_hours,
      billable_percentage,
    };
  }

  /**
   * Get resource utilization report
   */
  async getResourceUtilization(userId?: string): Promise<ResourceUtilizationReport[]> {
    let whereClause =
      'WHERE pr.is_active = true AND (pr.end_date IS NULL OR pr.end_date >= CURRENT_DATE)';
    const params: (string | number)[] = [];

    if (userId) {
      whereClause += ' AND pr.user_id = $1';
      params.push(userId);
    }

    const result = await query(
      `
      SELECT
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        pr.project_id,
        p.project_name,
        pr.allocation_percent,
        pr.hourly_rate
      FROM project_resources pr
      INNER JOIN users u ON u.user_id = pr.user_id
      INNER JOIN projects p ON p.project_id = pr.project_id
      ${whereClause}
      ORDER BY u.last_name, u.first_name, p.project_name
    `,
      params
    );

    // Group by user
    const userMap = new Map<string, ResourceUtilizationReport>();

    for (const row of result.rows) {
      const userKey = row.user_id;

      if (!userMap.has(userKey)) {
        userMap.set(userKey, {
          user_id: row.user_id,
          user_name: `${row.first_name} ${row.last_name}`,
          total_allocated_hours: 0,
          total_actual_hours: 0,
          utilization_percent: 0,
          projects: [],
        });
      }

      const report = userMap.get(userKey)!;

      // Calculate allocated hours (assuming 40h work week)
      const allocated_hours = (row.allocation_percent / 100) * 40 * 4; // Monthly approximation
      report.total_allocated_hours += allocated_hours;

      // Get actual hours for this project
      const actualHoursResult = await query(
        `SELECT SUM(total_hours) as hours FROM project_time_entries WHERE project_id = $1 AND employee_id = $2 AND work_date >= DATE_TRUNC('month', CURRENT_DATE)`,
        [row.project_id, row.user_id]
      );
      const actual_hours = Number(actualHoursResult.rows[0]?.hours) || 0;
      report.total_actual_hours += actual_hours;

      report.projects.push({
        project_id: row.project_id,
        project_name: row.project_name,
        allocated_hours,
        actual_hours,
        allocation_percent: row.allocation_percent,
      });
    }

    // Calculate utilization
    const reports = Array.from(userMap.values());
    for (const report of reports) {
      report.utilization_percent =
        report.total_allocated_hours > 0
          ? (report.total_actual_hours / report.total_allocated_hours) * 100
          : 0;
    }

    return reports;
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const projectsService = new ProjectsService();
