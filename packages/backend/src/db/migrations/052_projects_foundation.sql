-- ============================================================================
-- PROJECTS MODULE - FULL FOUNDATION
-- Complete project management system with time/expense tracking, billing, and resource management
-- Integrates with Accounting, HR, Inventory, and Sales modules
-- ============================================================================

-- ============================================================================
-- 1. PROJECT TYPES AND STATUS ENUMS
-- ============================================================================

-- Project type enum
DO $$ BEGIN
  CREATE TYPE project_type AS ENUM ('FIXED_BID', 'TIME_MATERIALS', 'COST_PLUS', 'RETAINER', 'INTERNAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Project status enum
DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('DRAFT', 'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Task status enum
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Task priority enum
DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Time entry work type enum
DO $$ BEGIN
  CREATE TYPE work_type AS ENUM ('REGULAR', 'OVERTIME_1_5', 'OVERTIME_2_0', 'TRAVEL', 'TRAINING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Expense category enum
DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM ('TRAVEL', 'MATERIALS', 'SUBCONTRACTOR', 'EQUIPMENT', 'SOFTWARE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Billing type enum
DO $$ BEGIN
  CREATE TYPE billing_type AS ENUM ('MILESTONE', 'PROGRESS', 'TIME_MATERIAL', 'FIXED_INTERVAL', 'COMPLETION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. PROJECTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
  project_id VARCHAR(20) PRIMARY KEY,
  project_number VARCHAR(50) UNIQUE NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  project_description TEXT,

  -- Customer/Client
  customer_id VARCHAR(50) REFERENCES customers(id),

  -- Type and status
  project_type project_type NOT NULL DEFAULT 'TIME_MATERIALS',
  project_status project_status NOT NULL DEFAULT 'DRAFT',

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,

  -- Financial
  estimated_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  budget_variance DECIMAL(12,2) GENERATED ALWAYS AS (estimated_budget - actual_cost) STORED,
  profit_amount DECIMAL(12,2) GENERATED ALWAYS AS (actual_revenue - actual_cost) STORED,

  -- Progress
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),

  -- Billing
  billing_type billing_type DEFAULT 'TIME_MATERIAL',
  advance_payment DECIMAL(12,2) DEFAULT 0,

  -- Management
  project_manager_id VARCHAR(50) REFERENCES users(user_id),
  account_manager_id VARCHAR(50) REFERENCES users(user_id),

  -- Entity (for multi-entity support)
  entity_id VARCHAR(20) REFERENCES entities(entity_id),

  -- Tags and metadata
  tags TEXT[],
  priority VARCHAR(20) DEFAULT 'MEDIUM',

  -- External references
  quote_id VARCHAR(50), -- References sales quotes
  contract_number VARCHAR(100),
  purchase_order_number VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_by VARCHAR(50) REFERENCES users(user_id)
);

CREATE INDEX idx_projects_customer ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(project_status);
CREATE INDEX idx_projects_type ON projects(project_type);
CREATE INDEX idx_projects_manager ON projects(project_manager_id);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX idx_projects_entity ON projects(entity_id);

COMMENT ON TABLE projects IS 'Main projects table with all project header information';

-- ============================================================================
-- 3. PROJECT TASKS (WORK BREAKDOWN STRUCTURE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_tasks (
  task_id VARCHAR(20) PRIMARY KEY,
  project_id VARCHAR(20) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  parent_task_id VARCHAR(20) REFERENCES project_tasks(task_id) ON DELETE SET NULL,

  -- Task details
  task_name VARCHAR(255) NOT NULL,
  task_description TEXT,
  task_number VARCHAR(50),

  -- WBS
  wbs_code VARCHAR(50), -- Work Breakdown Structure code (1.1, 1.1.1, etc.)
  sort_order INTEGER DEFAULT 0,

  -- Assignment
  assigned_to VARCHAR(50) REFERENCES users(user_id),

  -- Status and priority
  task_status task_status NOT NULL DEFAULT 'NOT_STARTED',
  task_priority task_priority NOT NULL DEFAULT 'MEDIUM',

  -- Dates
  start_date DATE,
  due_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,

  -- Estimates vs actuals
  estimated_hours DECIMAL(8,2),
  actual_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  hours_variance DECIMAL(8,2) GENERATED ALWAYS AS (estimated_hours - actual_hours) STORED,

  -- Progress
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  percent_complete INTEGER DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),

  -- Dependencies
  depends_on_tasks TEXT[], -- Array of task IDs
  is_milestone BOOLEAN DEFAULT false,
  is_critical BOOLEAN DEFAULT false,

  -- Deliverable
  deliverable_name VARCHAR(255),
  deliverable_date DATE,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_by VARCHAR(50) REFERENCES users(user_id)
);

CREATE INDEX idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_parent ON project_tasks(parent_task_id);
CREATE INDEX idx_project_tasks_assigned ON project_tasks(assigned_to);
CREATE INDEX idx_project_tasks_status ON project_tasks(task_status);
CREATE INDEX idx_project_tasks_dates ON project_tasks(start_date, due_date);

COMMENT ON TABLE project_tasks IS 'Work Breakdown Structure (WBS) tasks within projects';

-- ============================================================================
-- 4. PROJECT MILESTONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_milestones (
  milestone_id VARCHAR(20) PRIMARY KEY,
  project_id VARCHAR(20) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,

  -- Milestone details
  milestone_name VARCHAR(255) NOT NULL,
  milestone_description TEXT,
  milestone_number INTEGER NOT NULL,

  -- Dates
  milestone_date DATE NOT NULL,
  completed_at TIMESTAMP,

  -- Status
  milestone_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, OVERDUE
  is_met BOOLEAN DEFAULT false,

  -- Billing
  billing_percentage DECIMAL(5,2), -- % of total project that is billable at this milestone
  billing_amount DECIMAL(12,2),
  invoice_id VARCHAR(50),

  -- Dependencies
  depends_on_milestones TEXT[],

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id)
);

CREATE INDEX idx_project_milestones_project ON project_milestones(project_id);
CREATE INDEX idx_project_milestones_date ON project_milestones(milestone_date);
CREATE INDEX idx_project_milestones_status ON project_milestones(milestone_status);

COMMENT ON TABLE project_milestones IS 'Project milestones for progress billing and tracking';

-- ============================================================================
-- 5. PROJECT TIME ENTRIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_time_entries (
  time_entry_id VARCHAR(20) PRIMARY KEY,

  -- References
  project_id VARCHAR(20) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  task_id VARCHAR(20) REFERENCES project_tasks(task_id) ON DELETE SET NULL,

  -- Employee
  employee_id VARCHAR(50) NOT NULL REFERENCES users(user_id),

  -- Time details
  work_date DATE NOT NULL,
  work_type work_type NOT NULL DEFAULT 'REGULAR',

  -- Hours
  regular_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  overtime_1_5_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  overtime_2_0_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  total_hours DECIMAL(8,2) GENERATED ALWAYS AS (regular_hours + overtime_1_5_hours + overtime_2_0_hours) STORED,

  -- Description
  description TEXT,

  -- Billing
  billable BOOLEAN NOT NULL DEFAULT true,
  billing_rate DECIMAL(10,2),
  billing_amount DECIMAL(10,2) GENERATED ALWAYS AS (total_hours * COALESCE(billing_rate, 0)) STORED,

  -- Approval
  approved BOOLEAN DEFAULT false,
  approved_by VARCHAR(50) REFERENCES users(user_id),
  approved_at TIMESTAMP,

  -- Invoice integration
  invoice_line_item_id VARCHAR(50),
  timesheet_entry_id VARCHAR(50), -- Reference to HR timesheet

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id)
);

CREATE INDEX idx_project_time_entries_project ON project_time_entries(project_id);
CREATE INDEX idx_project_time_entries_task ON project_time_entries(task_id);
CREATE INDEX idx_project_time_entries_employee ON project_time_entries(employee_id);
CREATE INDEX idx_project_time_entries_date ON project_time_entries(work_date);
CREATE INDEX idx_project_time_entries_approved ON project_time_entries(approved) WHERE approved = false;
CREATE INDEX idx_project_time_entries_unbilled ON project_time_entries(project_id) WHERE invoice_line_item_id IS NULL AND billable = true;

COMMENT ON TABLE project_time_entries IS 'Time entries logged against projects and tasks';

-- ============================================================================
-- 6. PROJECT EXPENSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_expenses (
  expense_id VARCHAR(20) PRIMARY KEY,

  -- References
  project_id VARCHAR(20) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  task_id VARCHAR(20) REFERENCES project_tasks(task_id) ON DELETE SET NULL,

  -- Expense details
  expense_date DATE NOT NULL,
  expense_category expense_category NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  exchange_rate DECIMAL(12,6) DEFAULT 1.0,
  base_currency_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount * exchange_rate) STORED,

  -- Description
  description TEXT NOT NULL,

  -- Receipt/Documentation
  receipt_url TEXT,
  receipt_number VARCHAR(100),
  vendor_name VARCHAR(255),

  -- Submission
  submitted_by VARCHAR(50) NOT NULL REFERENCES users(user_id),
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Approval
  approved BOOLEAN DEFAULT false,
  approved_by VARCHAR(50) REFERENCES users(user_id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,

  -- Reimbursement
  reimbursed BOOLEAN DEFAULT false,
  reimbursement_date DATE,
  reimbursement_amount DECIMAL(10,2),
  reimbursement_check_number VARCHAR(100),

  -- Invoice integration
  invoice_line_item_id VARCHAR(50),
  billable BOOLEAN DEFAULT true,

  -- Tax
  tax_amount DECIMAL(10,2) DEFAULT 0,
  tax_code VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id)
);

CREATE INDEX idx_project_expenses_project ON project_expenses(project_id);
CREATE INDEX idx_project_expenses_task ON project_expenses(task_id);
CREATE INDEX idx_project_expenses_category ON project_expenses(expense_category);
CREATE INDEX idx_project_expenses_date ON project_expenses(expense_date);
CREATE INDEX idx_project_expenses_approved ON project_expenses(approved) WHERE approved = false;
CREATE INDEX idx_project_expenses_unbilled ON project_expenses(project_id) WHERE invoice_line_item_id IS NULL AND billable = true;

COMMENT ON TABLE project_expenses IS 'Project-related expenses for tracking and reimbursement';

-- ============================================================================
-- 7. PROJECT BUDGET VS ACTUAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_budget_items (
  budget_item_id VARCHAR(20) PRIMARY KEY,
  project_id VARCHAR(20) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,

  -- Budget category
  category VARCHAR(50) NOT NULL, -- LABOR, MATERIALS, EQUIPMENT, SUBCONTRACTOR, TRAVEL, OTHER
  subcategory VARCHAR(100),

  -- Budget
  budgeted_quantity DECIMAL(10,2),
  budgeted_unit_cost DECIMAL(10,2),
  budgeted_amount DECIMAL(12,2) GENERATED ALWAYS AS (budgeted_quantity * budgeted_unit_cost) STORED,

  -- Actual
  actual_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  actual_unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(12,2) GENERATED ALWAYS AS (actual_quantity * actual_unit_cost) STORED,

  -- Variance
  quantity_variance DECIMAL(10,2) GENERATED ALWAYS AS (budgeted_quantity - actual_quantity) STORED,
  cost_variance DECIMAL(12,2) GENERATED ALWAYS AS (budgeted_amount - actual_amount) STORED,
  variance_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN budgeted_amount > 0
    THEN ((budgeted_amount - actual_amount) / budgeted_amount * 100)
    ELSE 0
    END
  ) STORED,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id)
);

CREATE INDEX idx_project_budget_items_project ON project_budget_items(project_id);
CREATE INDEX idx_project_budget_items_category ON project_budget_items(category);

COMMENT ON TABLE project_budget_items IS 'Project budget categories for budget vs actual tracking';

-- ============================================================================
-- 8. PROJECT BILLING SCHEDULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_billing_schedule (
  schedule_id VARCHAR(20) PRIMARY KEY,
  project_id VARCHAR(20) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,

  -- Reference
  milestone_id VARCHAR(20) REFERENCES project_milestones(milestone_id) ON DELETE SET NULL,

  -- Billing details
  billing_date DATE NOT NULL,
  billing_description TEXT,

  -- Amount
  amount DECIMAL(12,2) NOT NULL,
  percentage DECIMAL(5,2), -- % of total project value

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, BILLED, PAID, OVERDUE
  invoice_id VARCHAR(50),

  -- Payment
  payment_due_date DATE,
  payment_received_date DATE,
  payment_amount DECIMAL(12,2),

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id)
);

CREATE INDEX idx_project_billing_schedule_project ON project_billing_schedule(project_id);
CREATE INDEX idx_project_billing_schedule_date ON project_billing_schedule(billing_date);
CREATE INDEX idx_project_billing_schedule_status ON project_billing_schedule(status);
CREATE INDEX idx_project_billing_schedule_invoice ON project_billing_schedule(invoice_id);

COMMENT ON TABLE project_billing_schedule IS 'Progress billing schedule for projects';

-- ============================================================================
-- 9. PROJECT RESOURCES (TEAM ALLOCATION)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_resources (
  resource_id VARCHAR(20) PRIMARY KEY,

  project_id VARCHAR(20) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL REFERENCES users(user_id),

  -- Role on project
  role VARCHAR(100), -- Project Manager, Developer, Designer, Consultant, etc.

  -- Allocation
  allocation_percent INTEGER DEFAULT 100, -- % of time allocated to this project
  hourly_rate DECIMAL(10,2),
  cost_rate DECIMAL(10,2), -- Internal cost rate

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id),

  CONSTRAINT resource_dates_valid CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_project_resources_project ON project_resources(project_id);
CREATE INDEX idx_project_resources_user ON project_resources(user_id);
CREATE INDEX idx_project_resources_active ON project_resources(is_active) WHERE is_active = true;
CREATE INDEX idx_project_resources_dates ON project_resources(start_date, end_date);

COMMENT ON TABLE project_resources IS 'Resource/team allocation to projects';

-- ============================================================================
-- 10. PROJECT ISSUES/RISKS (Optional but useful)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_issues (
  issue_id VARCHAR(20) PRIMARY KEY,
  project_id VARCHAR(20) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  task_id VARCHAR(20) REFERENCES project_tasks(task_id) ON DELETE SET NULL,

  -- Issue details
  issue_title VARCHAR(255) NOT NULL,
  issue_description TEXT,
  issue_type VARCHAR(50), -- ISSUE, RISK, DEFECT, CHANGE_REQUEST
  severity VARCHAR(20), -- LOW, MEDIUM, HIGH, CRITICAL
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, CLOSED

  -- Assignment
  assigned_to VARCHAR(50) REFERENCES users(user_id),
  reported_by VARCHAR(50) REFERENCES users(user_id),

  -- Dates
  reported_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  resolved_date DATE,

  -- Resolution
  resolution_summary TEXT,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id)
);

CREATE INDEX idx_project_issues_project ON project_issues(project_id);
CREATE INDEX idx_project_issues_status ON project_issues(status);
CREATE INDEX idx_project_issues_severity ON project_issues(severity);
CREATE INDEX idx_project_issues_assigned ON project_issues(assigned_to);

COMMENT ON TABLE project_issues IS 'Issues, risks, and change requests tracking for projects';

-- ============================================================================
-- 11. HELPER FUNCTIONS
-- ============================================================================

-- Get project summary with financials
CREATE OR REPLACE FUNCTION get_project_summary(p_project_id VARCHAR)
RETURNS TABLE (
  project_id VARCHAR,
  project_name VARCHAR,
  project_status project_status,
  estimated_budget DECIMAL,
  actual_cost DECIMAL,
  actual_revenue DECIMAL,
  budget_variance DECIMAL,
  profit_amount DECIMAL,
  profit_percent DECIMAL,
  total_hours DECIMAL,
  total_expenses DECIMAL,
  task_count BIGINT,
  active_tasks BIGINT,
  completed_tasks BIGINT,
  milestone_count BIGINT,
  completed_milestones BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.project_id,
    p.project_name,
    p.project_status,
    p.estimated_budget,
    p.actual_cost,
    p.actual_revenue,
    p.budget_variance,
    p.profit_amount,
    CASE WHEN p.actual_revenue > 0
         THEN (p.profit_amount / p.actual_revenue * 100)
         ELSE 0
    END as profit_percent,
    COALESCE(SUM(te.total_hours), 0) as total_hours,
    COALESCE(SUM(pe.base_currency_amount), 0) as total_expenses,
    COUNT(DISTINCT pt.task_id) as task_count,
    COUNT(DISTINCT CASE WHEN pt.task_status = 'IN_PROGRESS' THEN pt.task_id END) as active_tasks,
    COUNT(DISTINCT CASE WHEN pt.task_status = 'COMPLETED' THEN pt.task_id END) as completed_tasks,
    COUNT(DISTINCT pm.milestone_id) as milestone_count,
    COUNT(DISTINCT CASE WHEN pm.milestone_status = 'COMPLETED' THEN pm.milestone_id END) as completed_milestones
  FROM projects p
  LEFT JOIN project_tasks pt ON pt.project_id = p.project_id
  LEFT JOIN project_time_entries te ON te.project_id = p.project_id
  LEFT JOIN project_expenses pe ON pe.project_id = p.project_id
  LEFT JOIN project_milestones pm ON pm.project_id = p.project_id
  WHERE p.project_id = p_project_id
  GROUP BY p.project_id, p.project_name, p.project_status, p.estimated_budget, p.actual_cost, p.actual_revenue, p.budget_variance, p.profit_amount;
END;
$$ LANGUAGE plpgsql;

-- Update project actuals from time entries and expenses
CREATE OR REPLACE FUNCTION update_project_actuals(p_project_id VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE projects p
  SET
    actual_cost = (
      -- Labor cost from time entries
      COALESCE((SELECT SUM(te.total_hours * COALESCE(te.billing_rate, 0))
                FROM project_time_entries te
                WHERE te.project_id = p.project_id AND te.approved = true), 0) +
      -- Expenses
      COALESCE((SELECT SUM(pe.base_currency_amount)
                FROM project_expenses pe
                WHERE pe.project_id = p.project_id AND pe.approved = true), 0)
    ),
    actual_revenue = (
      COALESCE((SELECT SUM(pbs.amount)
                FROM project_billing_schedule pbs
                WHERE pbs.project_id = p.project_id AND pbs.status = 'PAID'), 0)
    ),
    updated_at = NOW()
  WHERE p.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. TRIGGERS
-- ============================================================================

-- Update project progress based on tasks
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects p
  SET
    progress_percent = (
      SELECT CASE
        WHEN COUNT(*) > 0
        THEN ROUND(CAST(AVG(pt.progress_percent) AS INTEGER))
        ELSE 0
      END
      FROM project_tasks pt
      WHERE pt.project_id = COALESCE(NEW.project_id, OLD.project_id)
    ),
    updated_at = NOW()
  WHERE p.project_id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_progress_after_task_change
AFTER INSERT OR UPDATE OR DELETE ON project_tasks
FOR EACH ROW
EXECUTE FUNCTION update_project_progress();

-- Update task actual hours from time entries
CREATE OR REPLACE FUNCTION update_task_hours()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE project_tasks pt
  SET
    actual_hours = (
      SELECT COALESCE(SUM(te.total_hours), 0)
      FROM project_time_entries te
      WHERE te.task_id = COALESCE(NEW.task_id, OLD.task_id) AND te.approved = true
    ),
    updated_at = NOW()
  WHERE pt.task_id = COALESCE(NEW.task_id, OLD.task_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_hours_after_time_entry
AFTER INSERT OR UPDATE OR DELETE ON project_time_entries
FOR EACH STATEMENT
EXECUTE FUNCTION update_task_hours();

-- ============================================================================
-- 13. SEED DATA (Sample project)
-- ============================================================================

INSERT INTO projects (
  project_id,
  project_number,
  project_name,
  project_description,
  project_type,
  project_status,
  start_date,
  end_date,
  estimated_budget,
  billing_type,
  project_manager_id,
  created_by
) SELECT
  'PRJ-' || substr(gen_random_uuid()::text, 1, 8),
  'PRJ-001',
  'Sample Implementation Project',
  'A sample project to demonstrate the Projects module functionality',
  'TIME_MATERIALS',
  'ACTIVE',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '90 days',
  50000.00,
  'TIME_MATERIAL',
  (SELECT user_id FROM users WHERE email = 'admin@opsui.local' LIMIT 1),
  (SELECT user_id FROM users WHERE email = 'admin@opsui.local' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@opsui.local')
ON CONFLICT (project_number) DO NOTHING;

-- ============================================================================
-- COMPLETE
-- ============================================================================

-- Migration complete
-- Next steps:
-- 1. Create project types in shared package
-- 2. Create ProjectsService and ProjectsRepository
-- 3. Create projects API routes
-- 4. Create Projects frontend pages
