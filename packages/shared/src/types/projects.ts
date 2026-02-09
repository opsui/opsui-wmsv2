/**
 * Projects Module Types
 *
 * Types for project management, time/expense tracking, billing, and resource allocation
 * Integrates with Accounting, HR, Inventory, and Sales modules
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Project contract/billing type
 */
export enum ProjectType {
  FIXED_BID = 'FIXED_BID',
  TIME_MATERIALS = 'TIME_MATERIALS',
  COST_PLUS = 'COST_PLUS',
  RETAINER = 'RETAINER',
  INTERNAL = 'INTERNAL',
}

/**
 * Project status
 */
export enum ProjectStatus {
  DRAFT = 'DRAFT',
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Task status
 */
export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
}

/**
 * Task priority
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Work type for time entries
 */
export enum WorkType {
  REGULAR = 'REGULAR',
  OVERTIME_1_5 = 'OVERTIME_1_5',
  OVERTIME_2_0 = 'OVERTIME_2_0',
  TRAVEL = 'TRAVEL',
  TRAINING = 'TRAINING',
}

/**
 * Expense category
 */
export enum ExpenseCategory {
  TRAVEL = 'TRAVEL',
  MATERIALS = 'MATERIALS',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
  EQUIPMENT = 'EQUIPMENT',
  SOFTWARE = 'SOFTWARE',
  OTHER = 'OTHER',
}

/**
 * Billing type
 */
export enum BillingType {
  MILESTONE = 'MILESTONE',
  PROGRESS = 'PROGRESS',
  TIME_MATERIAL = 'TIME_MATERIAL',
  FIXED_INTERVAL = 'FIXED_INTERVAL',
  COMPLETION = 'COMPLETION',
}

/**
 * Billing schedule status
 */
export enum BillingScheduleStatus {
  PENDING = 'PENDING',
  BILLED = 'BILLED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

/**
 * Issue type
 */
export enum IssueType {
  ISSUE = 'ISSUE',
  RISK = 'RISK',
  DEFECT = 'DEFECT',
  CHANGE_REQUEST = 'CHANGE_REQUEST',
}

/**
 * Issue severity
 */
export enum IssueSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Issue status
 */
export enum IssueStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

/**
 * Project interface
 */
export interface Project {
  project_id: string;
  project_number: string;
  project_name: string;
  project_description: string | null;
  customer_id: string | null;
  project_type: ProjectType;
  project_status: ProjectStatus;
  start_date: Date;
  end_date: Date | null;
  actual_start_date: Date | null;
  actual_end_date: Date | null;
  estimated_budget: number;
  actual_cost: number;
  actual_revenue: number;
  budget_variance: number;
  profit_amount: number;
  progress_percent: number;
  billing_type: BillingType;
  advance_payment: number;
  project_manager_id: string | null;
  account_manager_id: string | null;
  entity_id: string | null;
  tags: string[] | null;
  priority: string;
  quote_id: string | null;
  contract_number: string | null;
  purchase_order_number: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  created_by: string | null;
}

/**
 * Project with details
 */
export interface ProjectWithDetails extends Project {
  customer: {
    id: string;
    name: string;
  } | null;
  project_manager: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  account_manager: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  tasks: ProjectTask[];
  time_entries: ProjectTimeEntry[];
  expenses: ProjectExpense[];
  milestones: ProjectMilestone[];
  resources: ProjectResource[];
}

/**
 * Project summary
 */
export interface ProjectSummary {
  project_id: string;
  project_name: string;
  project_status: ProjectStatus;
  estimated_budget: number;
  actual_cost: number;
  actual_revenue: number;
  budget_variance: number;
  profit_amount: number;
  profit_percent: number;
  total_hours: number;
  total_expenses: number;
  task_count: number;
  active_tasks: number;
  completed_tasks: number;
  milestone_count: number;
  completed_milestones: number;
}

/**
 * Create Project DTO
 */
export interface CreateProjectDTO {
  project_name: string;
  project_description?: string;
  customer_id?: string;
  project_type?: ProjectType;
  start_date: Date;
  end_date?: Date;
  estimated_budget?: number;
  billing_type?: BillingType;
  advance_payment?: number;
  project_manager_id?: string;
  account_manager_id?: string;
  entity_id?: string;
  tags?: string[];
  priority?: string;
  quote_id?: string;
  contract_number?: string;
  purchase_order_number?: string;
}

/**
 * Update Project DTO
 */
export interface UpdateProjectDTO {
  project_name?: string;
  project_description?: string;
  customer_id?: string;
  project_type?: ProjectType;
  project_status?: ProjectStatus;
  end_date?: Date;
  estimated_budget?: number;
  billing_type?: BillingType;
  project_manager_id?: string;
  account_manager_id?: string;
  tags?: string[];
  priority?: string;
  progress_percent?: number;
}

// ============================================================================
// PROJECT TASKS
// ============================================================================

/**
 * Project Task interface
 */
export interface ProjectTask {
  task_id: string;
  project_id: string;
  parent_task_id: string | null;
  task_name: string;
  task_description: string | null;
  task_number: string | null;
  wbs_code: string | null;
  sort_order: number;
  assigned_to: string | null;
  task_status: TaskStatus;
  task_priority: TaskPriority;
  start_date: Date | null;
  due_date: Date | null;
  actual_start_date: Date | null;
  actual_end_date: Date | null;
  estimated_hours: number | null;
  actual_hours: number;
  hours_variance: number;
  progress_percent: number;
  percent_complete: number;
  depends_on_tasks: string[] | null;
  is_milestone: boolean;
  is_critical: boolean;
  deliverable_name: string | null;
  deliverable_date: Date | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  created_by: string | null;
}

/**
 * Project Task with details
 */
export interface ProjectTaskWithDetails extends ProjectTask {
  project: Project;
  parent_task: ProjectTask | null;
  children: ProjectTask[];
  assigned_user: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  time_entries: ProjectTimeEntry[];
  dependencies: ProjectTask[];
}

/**
 * Create Task DTO
 */
export interface CreateTaskDTO {
  project_id: string;
  parent_task_id?: string;
  task_name: string;
  task_description?: string;
  task_number?: string;
  wbs_code?: string;
  assigned_to?: string;
  task_priority?: TaskPriority;
  start_date?: Date;
  due_date?: Date;
  estimated_hours?: number;
  depends_on_tasks?: string[];
  is_milestone?: boolean;
  is_critical?: boolean;
  deliverable_name?: string;
  deliverable_date?: Date;
}

/**
 * Update Task DTO
 */
export interface UpdateTaskDTO {
  task_name?: string;
  task_description?: string;
  assigned_to?: string;
  task_status?: TaskStatus;
  task_priority?: TaskPriority;
  start_date?: Date;
  due_date?: Date;
  estimated_hours?: number;
  progress_percent?: number;
  percent_complete?: number;
  depends_on_tasks?: string[];
  is_critical?: boolean;
}

// ============================================================================
// PROJECT MILESTONES
// ============================================================================

/**
 * Project Milestone interface
 */
export interface ProjectMilestone {
  milestone_id: string;
  project_id: string;
  milestone_name: string;
  milestone_description: string | null;
  milestone_number: number;
  milestone_date: Date;
  completed_at: Date | null;
  milestone_status: string;
  is_met: boolean;
  billing_percentage: number | null;
  billing_amount: number | null;
  invoice_id: string | null;
  depends_on_milestones: string[] | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

/**
 * Create Milestone DTO
 */
export interface CreateMilestoneDTO {
  project_id: string;
  milestone_name: string;
  milestone_description?: string;
  milestone_number: number;
  milestone_date: Date;
  billing_percentage?: number;
  depends_on_milestones?: string[];
}

// ============================================================================
// PROJECT TIME ENTRIES
// ============================================================================

/**
 * Project Time Entry interface
 */
export interface ProjectTimeEntry {
  time_entry_id: string;
  project_id: string;
  task_id: string | null;
  employee_id: string;
  work_date: Date;
  work_type: WorkType;
  regular_hours: number;
  overtime_1_5_hours: number;
  overtime_2_0_hours: number;
  total_hours: number;
  description: string | null;
  billable: boolean;
  billing_rate: number | null;
  billing_amount: number;
  approved: boolean;
  approved_by: string | null;
  approved_at: Date | null;
  invoice_line_item_id: string | null;
  timesheet_entry_id: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

/**
 * Project Time Entry with details
 */
export interface ProjectTimeEntryWithDetails extends ProjectTimeEntry {
  project: Project;
  task: ProjectTask | null;
  employee: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

/**
 * Create Time Entry DTO
 */
export interface CreateTimeEntryDTO {
  project_id: string;
  task_id?: string;
  work_date: Date;
  work_type?: WorkType;
  regular_hours: number;
  overtime_1_5_hours?: number;
  overtime_2_0_hours?: number;
  description?: string;
  billable?: boolean;
  billing_rate?: number;
}

/**
 * Approve Time Entries DTO
 */
export interface ApproveTimeEntriesDTO {
  time_entry_ids: string[];
  approved: boolean;
}

// ============================================================================
// PROJECT EXPENSES
// ============================================================================

/**
 * Project Expense interface
 */
export interface ProjectExpense {
  expense_id: string;
  project_id: string;
  task_id: string | null;
  expense_date: Date;
  expense_category: ExpenseCategory;
  amount: number;
  currency: string;
  exchange_rate: number;
  base_currency_amount: number;
  description: string;
  receipt_url: string | null;
  receipt_number: string | null;
  vendor_name: string | null;
  submitted_by: string;
  submitted_at: Date;
  approved: boolean;
  approved_by: string | null;
  approved_at: Date | null;
  rejection_reason: string | null;
  reimbursed: boolean;
  reimbursement_date: Date | null;
  reimbursement_amount: number | null;
  reimbursement_check_number: string | null;
  invoice_line_item_id: string | null;
  billable: boolean;
  tax_amount: number;
  tax_code: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

/**
 * Create Expense DTO
 */
export interface CreateExpenseDTO {
  project_id: string;
  task_id?: string;
  expense_date: Date;
  expense_category: ExpenseCategory;
  amount: number;
  currency?: string;
  description: string;
  receipt_url?: string;
  receipt_number?: string;
  vendor_name?: string;
  tax_amount?: number;
  tax_code?: string;
  billable?: boolean;
}

// ============================================================================
// PROJECT BUDGET
// ============================================================================

/**
 * Project Budget Item interface
 */
export interface ProjectBudgetItem {
  budget_item_id: string;
  project_id: string;
  category: string;
  subcategory: string | null;
  budgeted_quantity: number | null;
  budgeted_unit_cost: number | null;
  budgeted_amount: number;
  actual_quantity: number;
  actual_unit_cost: number;
  actual_amount: number;
  quantity_variance: number;
  cost_variance: number;
  variance_percent: number;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

/**
 * Create Budget Item DTO
 */
export interface CreateBudgetItemDTO {
  project_id: string;
  category: string;
  subcategory?: string;
  budgeted_quantity?: number;
  budgeted_unit_cost?: number;
}

// ============================================================================
// PROJECT BILLING
// ============================================================================

/**
 * Project Billing Schedule interface
 */
export interface ProjectBillingSchedule {
  schedule_id: string;
  project_id: string;
  milestone_id: string | null;
  billing_date: Date;
  billing_description: string | null;
  amount: number;
  percentage: number | null;
  status: BillingScheduleStatus;
  invoice_id: string | null;
  payment_due_date: Date | null;
  payment_received_date: Date | null;
  payment_amount: number | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

/**
 * Create Billing Schedule DTO
 */
export interface CreateBillingScheduleDTO {
  project_id: string;
  milestone_id?: string;
  billing_date: Date;
  billing_description?: string;
  amount: number;
  percentage?: number;
  payment_due_date?: Date;
}

/**
 * Generate Project Invoice DTO
 */
export interface GenerateProjectInvoiceDTO {
  project_id: string;
  schedule_ids?: string[];
  include_unbilled_time?: boolean;
  include_unbilled_expenses?: boolean;
  invoice_date: Date;
  due_date?: Date;
}

// ============================================================================
// PROJECT RESOURCES
// ============================================================================

/**
 * Project Resource (Team Allocation) interface
 */
export interface ProjectResource {
  resource_id: string;
  project_id: string;
  user_id: string;
  role: string | null;
  allocation_percent: number;
  hourly_rate: number | null;
  cost_rate: number | null;
  start_date: Date;
  end_date: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

/**
 * Project Resource with details
 */
export interface ProjectResourceWithDetails extends ProjectResource {
  project: Project;
  user: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

/**
 * Assign Resource to Project DTO
 */
export interface AssignResourceDTO {
  project_id: string;
  user_id: string;
  role?: string;
  allocation_percent?: number;
  hourly_rate?: number;
  cost_rate?: number;
  start_date: Date;
  end_date?: Date;
}

// ============================================================================
// PROJECT ISSUES
// ============================================================================

/**
 * Project Issue interface
 */
export interface ProjectIssue {
  issue_id: string;
  project_id: string;
  task_id: string | null;
  issue_title: string;
  issue_description: string | null;
  issue_type: IssueType;
  severity: IssueSeverity;
  status: IssueStatus;
  assigned_to: string | null;
  reported_by: string;
  reported_date: Date;
  due_date: Date | null;
  resolved_date: Date | null;
  resolution_summary: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

/**
 * Create Issue DTO
 */
export interface CreateIssueDTO {
  project_id: string;
  task_id?: string;
  issue_title: string;
  issue_description?: string;
  issue_type: IssueType;
  severity: IssueSeverity;
  assigned_to?: string;
  due_date?: Date;
}

// ============================================================================
// QUERY AND FILTER TYPES
// ============================================================================

/**
 * Project query filters
 */
export interface ProjectQueryFilters {
  project_status?: ProjectStatus;
  project_type?: ProjectType;
  customer_id?: string;
  project_manager_id?: string;
  entity_id?: string;
  search?: string;
  date_from?: Date;
  date_to?: Date;
  tags?: string[];
}

/**
 * Time entry query filters
 */
export interface TimeEntryQueryFilters {
  project_id?: string;
  task_id?: string;
  employee_id?: string;
  date_from?: Date;
  date_to?: Date;
  billable?: boolean;
  approved?: boolean;
}

/**
 * Expense query filters
 */
export interface ExpenseQueryFilters {
  project_id?: string;
  category?: ExpenseCategory;
  date_from?: Date;
  date_to?: Date;
  approved?: boolean;
  reimbursed?: boolean;
}

// ============================================================================
// ANALYTICS AND REPORTING TYPES
// ============================================================================

/**
 * Project profitability report
 */
export interface ProjectProfitabilityReport {
  project_id: string;
  project_name: string;
  estimated_budget: number;
  actual_cost: number;
  actual_revenue: number;
  profit_amount: number;
  profit_margin_percent: number;
  budget_variance_percent: number;
  total_hours: number;
  average_hourly_rate: number;
  cost_per_hour: number;
  labor_cost: number;
  expense_cost: number;
  billable_hours: number;
  billable_percentage: number;
}

/**
 * Resource utilization report
 */
export interface ResourceUtilizationReport {
  user_id: string;
  user_name: string;
  total_allocated_hours: number;
  total_actual_hours: number;
  utilization_percent: number;
  projects: Array<{
    project_id: string;
    project_name: string;
    allocated_hours: number;
    actual_hours: number;
    allocation_percent: number;
  }>;
}

/**
 * Gantt chart data
 */
export interface GanttChartData {
  task_id: string;
  task_name: string;
  wbs_code: string | null;
  start_date: Date | null;
  end_date: Date | null;
  progress: number;
  assigned_to: string | null;
  dependencies: string[];
  children: GanttChartData[];
}

/**
 * Project dashboard metrics
 */
export interface ProjectDashboardMetrics {
  total_projects: number;
  active_projects: number;
  total_value: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  average_margin: number;
  hours_this_month: number;
  hours_this_period: number;
  pending_approvals: number;
  projects_at_risk: number;
  projects_over_budget: number;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batch approve time entries DTO
 */
export interface BatchApproveTimeEntriesDTO {
  time_entry_ids: string[];
  approve: boolean;
  rejection_reason?: string;
}

/**
 * Batch approve expenses DTO
 */
export interface BatchApproveExpensesDTO {
  expense_ids: string[];
  approve: boolean;
  rejection_reason?: string;
}

/**
 * Generate project invoice result
 */
export interface GenerateProjectInvoiceResult {
  invoice_id: string;
  invoice_number: string;
  total_amount: number;
  line_items_count: number;
  time_entries_included: number;
  expenses_included: number;
}
