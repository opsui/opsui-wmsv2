/**
 * Projects Repository
 *
 * Data access layer for project management operations
 * Handles projects, tasks, milestones, time entries, expenses, billing, and resources
 */

import { query, transaction } from '../db/client';
import { BaseRepository } from './BaseRepository';
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
  ProjectQueryFilters,
  TimeEntryQueryFilters,
  ExpenseQueryFilters,
} from '@opsui/shared';

// ============================================================================
// PROJECT REPOSITORY
// ============================================================================

export class ProjectRepository extends BaseRepository<Project> {
  constructor() {
    super('projects', 'project_id');
  }

  // Find by number
  async findByNumber(projectNumber: string): Promise<Project | null> {
    const result = await query<Project>(
      `SELECT * FROM ${this.tableName} WHERE project_number = $1`,
      [projectNumber]
    );
    return result.rows[0] || null;
  }

  // Find with details
  async findByIdWithDetails(projectId: string): Promise<ProjectWithDetails | null> {
    const project = await this.findById(projectId);
    if (!project) return null;

    const [customer, projectManager, accountManager] = await Promise.all([
      project.customer_id
        ? query<any>('SELECT id, name FROM customers WHERE id = $1', [project.customer_id])
        : Promise.resolve({ rows: [] }),
      project.project_manager_id
        ? query<any>('SELECT user_id, email, first_name, last_name FROM users WHERE user_id = $1', [
            project.project_manager_id,
          ])
        : Promise.resolve({ rows: [] }),
      project.account_manager_id
        ? query<any>('SELECT user_id, email, first_name, last_name FROM users WHERE user_id = $1', [
            project.account_manager_id,
          ])
        : Promise.resolve({ rows: [] }),
    ]);

    const [tasks, timeEntries, expenses, milestones, resources] = await Promise.all([
      query<ProjectTask>('SELECT * FROM project_tasks WHERE project_id = $1 ORDER BY sort_order', [
        projectId,
      ]),
      query<ProjectTimeEntry>(
        'SELECT * FROM project_time_entries WHERE project_id = $1 ORDER BY work_date DESC',
        [projectId]
      ),
      query<ProjectExpense>(
        'SELECT * FROM project_expenses WHERE project_id = $1 ORDER BY expense_date DESC',
        [projectId]
      ),
      query<ProjectMilestone>(
        'SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY milestone_number',
        [projectId]
      ),
      query<ProjectResource>(
        'SELECT * FROM project_resources WHERE project_id = $1 AND is_active = true',
        [projectId]
      ),
    ]);

    return {
      ...project,
      customer: customer.rows[0] || null,
      project_manager: projectManager.rows[0] || null,
      account_manager: accountManager.rows[0] || null,
      tasks: tasks.rows,
      time_entries: timeEntries.rows,
      expenses: expenses.rows,
      milestones: milestones.rows,
      resources: resources.rows,
    };
  }

  // Get project summary using the database function
  async getProjectSummary(projectId: string): Promise<ProjectSummary | null> {
    const result = await query<any>('SELECT * FROM get_project_summary($1)', [projectId]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      project_id: row.project_id,
      project_name: row.project_name,
      project_status: row.project_status,
      estimated_budget: Number(row.estimated_budget),
      actual_cost: Number(row.actual_cost),
      actual_revenue: Number(row.actual_revenue),
      budget_variance: Number(row.budget_variance),
      profit_amount: Number(row.profit_amount),
      profit_percent: Number(row.profit_percent),
      total_hours: Number(row.total_hours),
      total_expenses: Number(row.total_expenses),
      task_count: Number(row.task_count),
      active_tasks: Number(row.active_tasks),
      completed_tasks: Number(row.completed_tasks),
      milestone_count: Number(row.milestone_count),
      completed_milestones: Number(row.completed_milestones),
    };
  }

  // Query with filters
  async queryWithFilters(filters: ProjectQueryFilters = {}): Promise<Project[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.project_status) {
      conditions.push(`project_status = $${paramIndex++}`);
      params.push(filters.project_status);
    }
    if (filters.project_type) {
      conditions.push(`project_type = $${paramIndex++}`);
      params.push(filters.project_type);
    }
    if (filters.customer_id) {
      conditions.push(`customer_id = $${paramIndex++}`);
      params.push(filters.customer_id);
    }
    if (filters.project_manager_id) {
      conditions.push(`project_manager_id = $${paramIndex++}`);
      params.push(filters.project_manager_id);
    }
    if (filters.entity_id) {
      conditions.push(`entity_id = $${paramIndex++}`);
      params.push(filters.entity_id);
    }
    if (filters.search) {
      conditions.push(`(
        project_name ILIKE $${paramIndex++} OR
        project_description ILIKE $${paramIndex++} OR
        project_number ILIKE $${paramIndex++}
      )`);
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (filters.date_from) {
      conditions.push(`start_date >= $${paramIndex++}`);
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push(`end_date <= $${paramIndex++}`);
      params.push(filters.date_to);
    }
    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`tags && $${paramIndex++}`);
      params.push(filters.tags);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await query<Project>(sql, params);
    return result.rows;
  }

  // Soft delete
  async softDelete(projectId: string): Promise<boolean> {
    const result = await query(
      `UPDATE ${this.tableName} SET project_status = 'CANCELLED', updated_at = NOW() WHERE ${this.primaryKey} = $1`,
      [projectId]
    );
    return (result.rowCount || 0) > 0;
  }

  // Update project actuals (cost and revenue)
  async updateActuals(projectId: string): Promise<void> {
    await query('SELECT update_project_actuals($1)', [projectId]);
  }
}

// ============================================================================
// PROJECT TASK REPOSITORY
// ============================================================================

export class ProjectTaskRepository extends BaseRepository<ProjectTask> {
  constructor() {
    super('project_tasks', 'task_id');
  }

  // Find by project
  async findByProjectId(projectId: string): Promise<ProjectTask[]> {
    const result = await query<ProjectTask>(
      `SELECT * FROM ${this.tableName} WHERE project_id = $1 ORDER BY sort_order, task_name`,
      [projectId]
    );
    return result.rows;
  }

  // Find with details
  async findByIdWithDetails(taskId: string): Promise<ProjectTaskWithDetails | null> {
    const task = await this.findById(taskId);
    if (!task) return null;

    const [project, parentTask, assignedUser, timeEntries] = await Promise.all([
      query<Project>('SELECT * FROM projects WHERE project_id = $1', [task.project_id]),
      task.parent_task_id
        ? query<ProjectTask>('SELECT * FROM project_tasks WHERE task_id = $1', [
            task.parent_task_id,
          ])
        : Promise.resolve({ rows: [] }),
      task.assigned_to
        ? query<any>('SELECT user_id, email, first_name, last_name FROM users WHERE user_id = $1', [
            task.assigned_to,
          ])
        : Promise.resolve({ rows: [] }),
      query<ProjectTimeEntry>(
        'SELECT * FROM project_time_entries WHERE task_id = $1 ORDER BY work_date DESC',
        [taskId]
      ),
    ]);

    const children = await this.findChildren(taskId);
    const dependencies: ProjectTask[] = [];
    if (task.depends_on_tasks && task.depends_on_tasks.length > 0) {
      const depResult = await query<ProjectTask>(
        `SELECT * FROM ${this.tableName} WHERE task_id = ANY($1)`,
        [task.depends_on_tasks]
      );
      dependencies.push(...depResult.rows);
    }

    return {
      ...task,
      project: project.rows[0],
      parent_task: parentTask.rows[0] || null,
      children,
      assigned_user: assignedUser.rows[0] || null,
      time_entries: timeEntries.rows,
      dependencies,
    };
  }

  // Find children tasks
  async findChildren(parentTaskId: string): Promise<ProjectTask[]> {
    const result = await query<ProjectTask>(
      `SELECT * FROM ${this.tableName} WHERE parent_task_id = $1 ORDER BY sort_order`,
      [parentTaskId]
    );
    return result.rows;
  }

  // Find root tasks (no parent)
  async findRootTasks(projectId: string): Promise<ProjectTask[]> {
    const result = await query<ProjectTask>(
      `SELECT * FROM ${this.tableName} WHERE project_id = $1 AND parent_task_id IS NULL ORDER BY sort_order`,
      [projectId]
    );
    return result.rows;
  }

  // Get Gantt chart data
  async getGanttChartData(projectId: string): Promise<any[]> {
    const result = await query<any>(
      `
      WITH RECURSIVE task_tree AS (
        -- Root tasks
        SELECT
          t.*,
          NULL::TEXT as parent_path,
          ARRAY[]::VARCHAR[] as ancestors
        FROM project_tasks t
        WHERE t.project_id = $1 AND t.parent_task_id IS NULL

        UNION ALL

        -- Child tasks
        SELECT
          t.*,
          tt.parent_path || '>' || tt.parent_task_id,
          tt.ancestors || tt.task_id
        FROM project_tasks t
        INNER JOIN task_tree tt ON t.parent_task_id = tt.task_id
      )
      SELECT
        task_id,
        task_name,
        wbs_code,
        start_date,
        due_date as end_date,
        progress_percent as progress,
        assigned_to,
        COALESCE(depends_on_tasks, ARRAY[]::VARCHAR[]) as dependencies,
        (
          SELECT json_agg(json_build_object(
            'task_id', child.task_id,
            'task_name', child.task_name,
            'start_date', child.start_date,
            'due_date', child.due_date,
            'progress', child.progress_percent
          ))
          FROM project_tasks child
          WHERE child.parent_task_id = task_tree.task_id
        ) as children
      FROM task_tree
      ORDER BY sort_order, task_name
    `,
      [projectId]
    );

    return result.rows;
  }
}

// ============================================================================
// PROJECT TIME ENTRY REPOSITORY
// ============================================================================

export class ProjectTimeEntryRepository extends BaseRepository<ProjectTimeEntry> {
  constructor() {
    super('project_time_entries', 'time_entry_id');
  }

  // Find by project
  async findByProjectId(projectId: string): Promise<ProjectTimeEntry[]> {
    const result = await query<ProjectTimeEntry>(
      `SELECT * FROM ${this.tableName} WHERE project_id = $1 ORDER BY work_date DESC`,
      [projectId]
    );
    return result.rows;
  }

  // Find by employee
  async findByEmployeeId(employeeId: string): Promise<ProjectTimeEntry[]> {
    const result = await query<ProjectTimeEntry>(
      `SELECT * FROM ${this.tableName} WHERE employee_id = $1 ORDER BY work_date DESC`,
      [employeeId]
    );
    return result.rows;
  }

  // Find with details
  async findByIdWithDetails(timeEntryId: string): Promise<ProjectTimeEntryWithDetails | null> {
    const timeEntry = await this.findById(timeEntryId);
    if (!timeEntry) return null;

    const [project, task, employee] = await Promise.all([
      query<Project>('SELECT * FROM projects WHERE project_id = $1', [timeEntry.project_id]),
      timeEntry.task_id
        ? query<ProjectTask>('SELECT * FROM project_tasks WHERE task_id = $1', [timeEntry.task_id])
        : Promise.resolve({ rows: [] }),
      query<any>('SELECT user_id, email, first_name, last_name FROM users WHERE user_id = $1', [
        timeEntry.employee_id,
      ]),
    ]);

    return {
      ...timeEntry,
      project: project.rows[0],
      task: task.rows[0] || null,
      employee: employee.rows[0],
    };
  }

  // Query with filters
  async queryWithFilters(filters: TimeEntryQueryFilters = {}): Promise<ProjectTimeEntry[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.project_id) {
      conditions.push(`project_id = $${paramIndex++}`);
      params.push(filters.project_id);
    }
    if (filters.task_id) {
      conditions.push(`task_id = $${paramIndex++}`);
      params.push(filters.task_id);
    }
    if (filters.employee_id) {
      conditions.push(`employee_id = $${paramIndex++}`);
      params.push(filters.employee_id);
    }
    if (filters.date_from) {
      conditions.push(`work_date >= $${paramIndex++}`);
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push(`work_date <= $${paramIndex++}`);
      params.push(filters.date_to);
    }
    if (filters.billable !== undefined) {
      conditions.push(`billable = $${paramIndex++}`);
      params.push(filters.billable);
    }
    if (filters.approved !== undefined) {
      conditions.push(`approved = $${paramIndex++}`);
      params.push(filters.approved);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY work_date DESC, created_at DESC
    `;

    const result = await query<ProjectTimeEntry>(sql, params);
    return result.rows;
  }

  // Get pending approvals
  async findPendingApprovals(projectId?: string): Promise<ProjectTimeEntry[]> {
    const sql = projectId
      ? `SELECT * FROM ${this.tableName} WHERE project_id = $1 AND approved = false ORDER BY work_date DESC`
      : `SELECT * FROM ${this.tableName} WHERE approved = false ORDER BY work_date DESC`;
    const result = await query<ProjectTimeEntry>(sql, projectId ? [projectId] : []);
    return result.rows;
  }

  // Get unbilled time entries
  async findUnbilled(projectId: string): Promise<ProjectTimeEntry[]> {
    const result = await query<ProjectTimeEntry>(
      `SELECT * FROM ${this.tableName} WHERE project_id = $1 AND billable = true AND invoice_line_item_id IS NULL AND approved = true`,
      [projectId]
    );
    return result.rows;
  }

  // Batch approve
  async batchApprove(timeEntryIds: string[], approved: boolean, approvedBy: string): Promise<void> {
    await query(
      `UPDATE ${this.tableName} SET approved = $1, approved_by = $2, approved_at = NOW() WHERE time_entry_id = ANY($3)`,
      [approved, approvedBy, timeEntryIds]
    );
  }
}

// ============================================================================
// PROJECT EXPENSE REPOSITORY
// ============================================================================

export class ProjectExpenseRepository extends BaseRepository<ProjectExpense> {
  constructor() {
    super('project_expenses', 'expense_id');
  }

  // Find by project
  async findByProjectId(projectId: string): Promise<ProjectExpense[]> {
    const result = await query<ProjectExpense>(
      `SELECT * FROM ${this.tableName} WHERE project_id = $1 ORDER BY expense_date DESC`,
      [projectId]
    );
    return result.rows;
  }

  // Query with filters
  async queryWithFilters(filters: ExpenseQueryFilters = {}): Promise<ProjectExpense[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.project_id) {
      conditions.push(`project_id = $${paramIndex++}`);
      params.push(filters.project_id);
    }
    if (filters.category) {
      conditions.push(`expense_category = $${paramIndex++}`);
      params.push(filters.category);
    }
    if (filters.date_from) {
      conditions.push(`expense_date >= $${paramIndex++}`);
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push(`expense_date <= $${paramIndex++}`);
      params.push(filters.date_to);
    }
    if (filters.approved !== undefined) {
      conditions.push(`approved = $${paramIndex++}`);
      params.push(filters.approved);
    }
    if (filters.reimbursed !== undefined) {
      conditions.push(`reimbursed = $${paramIndex++}`);
      params.push(filters.reimbursed);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY expense_date DESC, created_at DESC
    `;

    const result = await query<ProjectExpense>(sql, params);
    return result.rows;
  }

  // Get pending approvals
  async findPendingApprovals(projectId?: string): Promise<ProjectExpense[]> {
    const sql = projectId
      ? `SELECT * FROM ${this.tableName} WHERE project_id = $1 AND approved = false ORDER BY expense_date DESC`
      : `SELECT * FROM ${this.tableName} WHERE approved = false ORDER BY expense_date DESC`;
    const result = await query<ProjectExpense>(sql, projectId ? [projectId] : []);
    return result.rows;
  }

  // Get unbilled expenses
  async findUnbilled(projectId: string): Promise<ProjectExpense[]> {
    const result = await query<ProjectExpense>(
      `SELECT * FROM ${this.tableName} WHERE project_id = $1 AND billable = true AND invoice_line_item_id IS NULL AND approved = true`,
      [projectId]
    );
    return result.rows;
  }

  // Batch approve
  async batchApprove(
    expenseIds: string[],
    approved: boolean,
    approvedBy: string,
    rejectionReason?: string
  ): Promise<void> {
    const updates = ['approved = $1', 'approved_by = $2', 'approved_at = NOW()'];
    const params: any[] = [approved, approvedBy];

    if (!approved && rejectionReason) {
      updates.push(`rejection_reason = $${params.length + 1}`);
      params.push(rejectionReason);
    }

    params.push(expenseIds);

    await query(
      `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE expense_id = ANY($${params.length})`,
      params
    );
  }
}

// ============================================================================
// PROJECT MILESTONE REPOSITORY
// ============================================================================

export class ProjectMilestoneRepository extends BaseRepository<ProjectMilestone> {
  constructor() {
    super('project_milestones', 'milestone_id');
  }

  // Find by project
  async findByProjectId(projectId: string): Promise<ProjectMilestone[]> {
    const result = await query<ProjectMilestone>(
      `SELECT * FROM ${this.tableName} WHERE project_id = $1 ORDER BY milestone_number`,
      [projectId]
    );
    return result.rows;
  }

  // Find pending milestones
  async findPending(projectId?: string): Promise<ProjectMilestone[]> {
    const sql = projectId
      ? `SELECT * FROM ${this.tableName} WHERE project_id = $1 AND milestone_status = 'PENDING' ORDER BY milestone_date`
      : `SELECT * FROM ${this.tableName} WHERE milestone_status = 'PENDING' ORDER BY milestone_date`;
    const result = await query<ProjectMilestone>(sql, projectId ? [projectId] : []);
    return result.rows;
  }

  // Find overdue milestones
  async findOverdue(): Promise<ProjectMilestone[]> {
    const result = await query<ProjectMilestone>(
      `SELECT * FROM ${this.tableName} WHERE milestone_status = 'PENDING' AND milestone_date < CURRENT_DATE ORDER BY milestone_date`
    );
    return result.rows;
  }

  // Mark as complete
  async markAsComplete(milestoneId: string): Promise<ProjectMilestone | null> {
    const result = await query<ProjectMilestone>(
      `UPDATE ${this.tableName} SET milestone_status = 'COMPLETED', is_met = true, completed_at = NOW(), updated_at = NOW() WHERE milestone_id = $1 RETURNING *`,
      [milestoneId]
    );
    return result.rows[0] || null;
  }
}

// ============================================================================
// PROJECT BUDGET ITEM REPOSITORY
// ============================================================================

export class ProjectBudgetItemRepository extends BaseRepository<ProjectBudgetItem> {
  constructor() {
    super('project_budget_items', 'budget_item_id');
  }

  // Find by project
  async findByProjectId(projectId: string): Promise<ProjectBudgetItem[]> {
    const result = await query<ProjectBudgetItem>(
      `SELECT * FROM ${this.tableName} WHERE project_id = $1 ORDER BY category, subcategory`,
      [projectId]
    );
    return result.rows;
  }
}

// ============================================================================
// PROJECT BILLING SCHEDULE REPOSITORY
// ============================================================================

export class ProjectBillingScheduleRepository extends BaseRepository<ProjectBillingSchedule> {
  constructor() {
    super('project_billing_schedule', 'schedule_id');
  }

  // Find by project
  async findByProjectId(projectId: string): Promise<ProjectBillingSchedule[]> {
    const result = await query<ProjectBillingSchedule>(
      `SELECT * FROM ${this.tableName} WHERE project_id = $1 ORDER BY billing_date`,
      [projectId]
    );
    return result.rows;
  }

  // Find pending billing items
  async findPending(projectId?: string): Promise<ProjectBillingSchedule[]> {
    const sql = projectId
      ? `SELECT * FROM ${this.tableName} WHERE project_id = $1 AND status = 'PENDING' ORDER BY billing_date`
      : `SELECT * FROM ${this.tableName} WHERE status = 'PENDING' ORDER BY billing_date`;
    const result = await query<ProjectBillingSchedule>(sql, projectId ? [projectId] : []);
    return result.rows;
  }

  // Find overdue payments
  async findOverdue(): Promise<ProjectBillingSchedule[]> {
    const result = await query<ProjectBillingSchedule>(
      `SELECT * FROM ${this.tableName} WHERE status = 'BILLED' AND payment_due_date < CURRENT_DATE ORDER BY payment_due_date`
    );
    return result.rows;
  }

  // Update status
  async updateStatus(scheduleId: string, status: string, invoiceId?: string): Promise<boolean> {
    const updates = ['status = $1', 'updated_at = NOW()'];
    const params: any[] = [status];

    if (invoiceId) {
      updates.push(`invoice_id = $${params.length + 1}`);
      params.push(invoiceId);
    }

    params.push(scheduleId);

    const result = await query(
      `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE schedule_id = $${params.length}`,
      params
    );
    return (result.rowCount || 0) > 0;
  }
}

// ============================================================================
// PROJECT RESOURCE REPOSITORY
// ============================================================================

export class ProjectResourceRepository extends BaseRepository<ProjectResource> {
  constructor() {
    super('project_resources', 'resource_id');
  }

  // Find by project
  async findByProjectId(projectId: string): Promise<ProjectResource[]> {
    const result = await query<ProjectResource>(
      `SELECT * FROM ${this.tableName} WHERE project_id = $1 ORDER BY created_at`,
      [projectId]
    );
    return result.rows;
  }

  // Find with details
  async findByIdWithDetails(resourceId: string): Promise<ProjectResourceWithDetails | null> {
    const resource = await this.findById(resourceId);
    if (!resource) return null;

    const [project, user] = await Promise.all([
      query<Project>('SELECT * FROM projects WHERE project_id = $1', [resource.project_id]),
      query<any>('SELECT user_id, email, first_name, last_name FROM users WHERE user_id = $1', [
        resource.user_id,
      ]),
    ]);

    return {
      ...resource,
      project: project.rows[0],
      user: user.rows[0],
    };
  }

  // Find by user
  async findByUserId(userId: string): Promise<ProjectResource[]> {
    const result = await query<ProjectResource>(
      `SELECT * FROM ${this.tableName} WHERE user_id = $1 AND is_active = true ORDER BY start_date DESC`,
      [userId]
    );
    return result.rows;
  }

  // Find active resources
  async findActive(projectId?: string): Promise<ProjectResource[]> {
    const sql = projectId
      ? `SELECT * FROM ${this.tableName} WHERE project_id = $1 AND is_active = true AND (end_date IS NULL OR end_date >= CURRENT_DATE) ORDER BY start_date`
      : `SELECT * FROM ${this.tableName} WHERE is_active = true AND (end_date IS NULL OR end_date >= CURRENT_DATE) ORDER BY start_date`;
    const result = await query<ProjectResource>(sql, projectId ? [projectId] : []);
    return result.rows;
  }

  // Remove resource (soft delete by setting is_active to false)
  async removeResource(resourceId: string): Promise<boolean> {
    const result = await query(
      `UPDATE ${this.tableName} SET is_active = false, updated_at = NOW() WHERE resource_id = $1`,
      [resourceId]
    );
    return (result.rowCount || 0) > 0;
  }
}

// ============================================================================
// PROJECT ISSUE REPOSITORY
// ============================================================================

export class ProjectIssueRepository extends BaseRepository<ProjectIssue> {
  constructor() {
    super('project_issues', 'issue_id');
  }

  // Find by project
  async findByProjectId(projectId: string): Promise<ProjectIssue[]> {
    const result = await query<ProjectIssue>(
      `SELECT * FROM ${this.tableName} WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId]
    );
    return result.rows;
  }

  // Find open issues
  async findOpen(projectId?: string): Promise<ProjectIssue[]> {
    const sql = projectId
      ? `SELECT * FROM ${this.tableName} WHERE project_id = $1 AND status = 'OPEN' ORDER BY severity DESC, created_at DESC`
      : `SELECT * FROM ${this.tableName} WHERE status = 'OPEN' ORDER BY severity DESC, created_at DESC`;
    const result = await query<ProjectIssue>(sql, projectId ? [projectId] : []);
    return result.rows;
  }

  // Find critical issues
  async findCritical(): Promise<ProjectIssue[]> {
    const result = await query<ProjectIssue>(
      `SELECT * FROM ${this.tableName} WHERE severity = 'CRITICAL' AND status NOT IN ('RESOLVED', 'CLOSED') ORDER BY created_at DESC`
    );
    return result.rows;
  }
}

// ============================================================================
// REPOSITORY EXPORT
// ============================================================================

export const projectsRepository = {
  projects: new ProjectRepository(),
  tasks: new ProjectTaskRepository(),
  timeEntries: new ProjectTimeEntryRepository(),
  expenses: new ProjectExpenseRepository(),
  milestones: new ProjectMilestoneRepository(),
  budgetItems: new ProjectBudgetItemRepository(),
  billingSchedule: new ProjectBillingScheduleRepository(),
  resources: new ProjectResourceRepository(),
  issues: new ProjectIssueRepository(),
};
