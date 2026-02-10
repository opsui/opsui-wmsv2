/**
 * E2E Tests: Projects Module
 * @covers e2e/projects.spec.ts
 *
 * Tests for the Projects module including:
 * - Project management
 * - Task tracking
 * - Resource allocation
 * - Time tracking
 * - Project reporting
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Helper functions
async function login(page: Page, role: 'pm' | 'teamlead' | 'member' = 'pm') {
  const credentials = {
    pm: { email: 'pm@example.com', password: 'password123' },
    teamlead: { email: 'teamlead@example.com', password: 'password123' },
    member: { email: 'member@example.com', password: 'password123' },
  };

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', credentials[role].email);
  await page.fill('input[name="password"]', credentials[role].password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(dashboard|projects)/);
  await page.waitForLoadState('networkidle');
}

test.describe('Projects Module', () => {
  test.describe('Project Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'pm');
    });

    test('displays project dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Projects')).toBeVisible();
      await expect(page.getByRole('button', { name: /new project/i })).toBeVisible();
    });

    test('views active projects', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await expect(page.getByText('Active Projects')).toBeVisible();

      const projects = page.locator('[data-testid^="project-card-"]');
      const count = await projects.count();
      expect(count).toBeGreaterThan(0);
    });

    test('filters projects by status', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('button:has-text("All Projects")');
      await page.click('text=In Progress');

      // Should filter to show only in-progress projects
      await expect(page.getByText('In Progress')).toHaveClass(/selected/i);
    });
  });

  test.describe('Project Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'pm');
    });

    test('creates new project', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('button:has-text("New Project")');

      // Fill project details
      await page.fill('[data-testid="project-name"]', 'Warehouse Expansion');
      await page.fill('[data-testid="project-code"]', 'PRJ-2024-001');
      await page.fill('[data-testid="project-description"]', 'Expand warehouse capacity by 50%');

      // Set dates
      await page.fill('[data-testid="start-date"]', '2024-02-01');
      await page.fill('[data-testid="end-date"]', '2024-06-30');

      // Set budget
      await page.fill('[data-testid="project-budget"]', '100000');

      // Select project manager
      await page.selectOption('[data-testid="project-manager"]', 'pm@example.com');

      // Create project
      await page.click('button:has-text("Create Project")');

      await expect(page.getByText(/project created/i)).toBeVisible();
    });

    test('views project details', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');

      await expect(page.getByText('Project Details')).toBeVisible();
      await expect(page.getByText('Progress')).toBeVisible();
      await expect(page.getByText('Budget')).toBeVisible();
      await expect(page.getByText('Timeline')).toBeVisible();
    });

    test('edits project information', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Edit Project")');

      await page.fill('[data-testid="project-name"]', 'Updated Project Name');
      await page.click('button:has-text("Save Changes")');

      await expect(page.getByText(/project updated/i)).toBeVisible();
    });

    test('assigns team members', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');

      await page.click('button:has-text("Team")');
      await page.click('button:has-text("Add Member")');

      await page.selectOption('[data-testid="team-member"]', 'member@example.com');
      await page.selectOption('[data-testid="member-role"]', 'DEVELOPER');

      await page.click('button:has-text("Add to Team")');

      await expect(page.getByText(/team member added/i)).toBeVisible();
    });

    test('updates project status', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Change Status")');

      await page.selectOption('[data-testid="project-status"]', 'ON_HOLD');
      await page.click('button:has-text("Update Status")');

      await expect(page.getByText(/status updated/i)).toBeVisible();
    });
  });

  test.describe('Task Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'pm');
    });

    test('views project tasks', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Tasks")');

      await expect(page.getByText('Project Tasks')).toBeVisible();
    });

    test('creates new task', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Tasks")');
      await page.click('button:has-text("New Task")');

      await page.fill('[data-testid="task-name"]', 'Design warehouse layout');
      await page.fill('[data-testid="task-description"]', 'Create detailed floor plan');
      await page.selectOption('[data-testid="task-priority"]', 'HIGH');
      await page.fill('[data-testid="task-due-date"]', '2024-02-15');
      await page.selectOption('[data-testid="task-assignee"]', 'member@example.com');

      await page.click('button:has-text("Create Task")');

      await expect(page.getByText(/task created/i)).toBeVisible();
    });

    test('updates task status', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Tasks")');

      const task = page.locator('[data-testid^="task-"]').first();
      await task.click();
      await page.selectOption('[data-testid="task-status"]', 'IN_PROGRESS');
      await page.click('button:has-text("Update")');

      await expect(page.getByText(/task updated/i)).toBeVisible();
    });

    test('adds task dependencies', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Tasks")');

      await page.click('[data-testid^="task-"]');
      await page.click('button:has-text("Dependencies")');
      await page.click('button:has-text("Add Dependency")');

      await page.selectOption('[data-testid="depends-on-task"]', 'TASK-001');
      await page.selectOption('[data-testid="dependency-type"]', 'FINISH_TO_START');

      await page.click('button:has-text("Add Dependency")');

      await expect(page.getByText(/dependency added/i)).toBeVisible();
    });

    test('views task in kanban view', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Tasks")');
      await page.click('button:has-text("Kanban View")');

      await expect(page.locator('.kanban-board')).toBeVisible();
      await expect(page.getByText('To Do')).toBeVisible();
      await expect(page.getByText('In Progress')).toBeVisible();
      await expect(page.getByText('Done')).toBeVisible();
    });

    test('drags task between columns', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Tasks")');
      await page.click('button:has-text("Kanban View")');

      const task = page.locator('[data-testid^="task-card-"]').first();
      const inProgressColumn = page.locator('[data-testid="column-in-progress"]');

      await task.dragTo(inProgressColumn);

      await expect(page.getByText(/task updated/i)).toBeVisible();
    });
  });

  test.describe('Time Tracking', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'member');
    });

    test('logs time against task', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/my-tasks`);

      await page.click('[data-testid^="my-task-"]');
      await page.click('button:has-text("Log Time")');

      await page.fill('[data-testid="time-date"]', '2024-02-01');
      await page.fill('[data-testid="time-hours"]', '4');
      await page.fill('[data-testid="time-description"]', 'Worked on design');

      await page.click('button:has-text("Log Time")');

      await expect(page.getByText(/time logged/i)).toBeVisible();
    });

    test('views timesheet', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/timesheet');

      await expect(page.getByText('Timesheet')).toBeVisible();

      await page.fill('[data-testid="timesheet-period"]', '2024-02-01');

      const timeEntries = page.locator('[data-testid^="time-entry-"]');
      const count = await timeEntries.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('submits timesheet for approval', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/timesheet`);

      await page.fill('[data-testid="timesheet-period"]', '2024-02-01');

      await page.click('button:has-text("Submit for Approval")');

      await expect(page.getByText(/timesheet submitted/i)).toBeVisible();
    });
  });

  test.describe('Task Approval (Team Lead)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'teamlead');
    });

    test('approves task completion', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/pending-approvals');

      const pendingTask = page.locator('[data-testid^="pending-task-"]').first();

      if ((await pendingTask.count()) > 0) {
        await pendingTask.click();
        await page.click('button:has-text("Approve")');

        await expect(page.getByText(/task approved/i)).toBeVisible();
      }
    });

    test('requests task revision', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/pending-approvals');

      const pendingTask = page.locator('[data-testid^="pending-task-"]').first();

      if ((await pendingTask.count()) > 0) {
        await pendingTask.click();
        await page.click('button:has-text("Request Revision")');
        await page.fill('[data-testid="revision-notes"]', 'Needs more detail');
        await page.click('button:has-text("Send Back")');

        await expect(page.getByText(/revision requested/i)).toBeVisible();
      }
    });

    test('approves timesheet', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/timesheet-approvals');

      const pendingTimesheet = page.locator('[data-status="PENDING"]').first();

      if ((await pendingTimesheet.count()) > 0) {
        await pendingTimesheet.click();
        await page.click('button:has-text("Approve Timesheet")');

        await expect(page.getByText(/timesheet approved/i)).toBeVisible();
      }
    });
  });

  test.describe('Resource Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'pm');
    });

    test('views resource allocation', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/resources`);

      await expect(page.getByText('Resource Allocation')).toBeVisible();

      const resources = page.locator('[data-testid^="resource-"]');
      const count = await resources.count();
      expect(count).toBeGreaterThan(0);
    });

    test('views team workload', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/resources');

      await page.click('button:has-text("Team Workload")');

      await expect(page.getByText('Workload Distribution')).toBeVisible();

      const teamMembers = page.locator('[data-testid^="team-workload-"]');
      const count = await teamMembers.count();
      expect(count).toBeGreaterThan(0);
    });

    test('allocates resource to project', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/resources');

      await page.click('button:has-text("Allocate Resource")');

      await page.selectOption('[data-testid="resource"]', 'member@example.com');
      await page.selectOption('[data-testid="allocate-project"]', 'PRJ-001');
      await page.fill('[data-testid="allocation-percent"]', '50');
      await page.fill('[data-testid="allocation-start"]', '2024-02-01');
      await page.fill('[data-testid="allocation-end"]', '2024-06-30');

      await page.click('button:has-text("Allocate")');

      await expect(page.getByText(/resource allocated/i)).toBeVisible();
    });
  });

  test.describe('Project Reports', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'pm');
    });

    test('views project progress report', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/reports`);

      await page.click('button:has-text("Progress Report")');

      await expect(page.getByText('Project Progress')).toBeVisible();
      await expect(page.getByText('Completion')).toBeVisible();
      await expect(page.getByText('Milestones')).toBeVisible();
    });

    test('views budget report', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/reports`);

      await page.click('button:has-text("Budget Report")');

      await expect(page.getByText('Budget vs Actual')).toBeVisible();
      await expect(page.getByText('Variance')).toBeVisible();
    });

    test('views resource utilization report', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/reports`);

      await page.click('button:has-text("Resource Utilization")');

      await expect(page.getByText('Utilization by Team Member')).toBeVisible();
    });

    test('exports project report', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/reports`);

      await page.click('button:has-text("Progress Report")');
      await page.click('button:has-text("Generate Report")');

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export PDF")');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/project-report.*\.pdf/);
    });
  });

  test.describe('Milestones', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'pm');
    });

    test('creates milestone', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Milestones")');
      await page.click('button:has-text("New Milestone")');

      await page.fill('[data-testid="milestone-name"]', 'Design Complete');
      await page.fill('[data-testid="milestone-date"]', '2024-03-31');
      await page.fill('[data-testid="milestone-description"]', 'All design documents finalized');

      await page.click('button:has-text("Create Milestone")');

      await expect(page.getByText(/milestone created/i)).toBeVisible();
    });

    test('marks milestone as complete', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Milestones")');

      const milestone = page.locator('[data-status="PENDING"]').first();

      if ((await milestone.count()) > 0) {
        await milestone.click();
        await page.click('button:has-text("Mark Complete")');

        await expect(page.getByText(/milestone completed/i)).toBeVisible();
      }
    });

    test('views milestone dependencies', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Milestones")');

      await page.click('[data-testid^="milestone-"]');

      await expect(page.getByText('Milestone Details')).toBeVisible();
      await expect(page.getByText('Dependencies')).toBeVisible();
    });
  });

  test.describe('Project Collaboration', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'member');
    });

    test('posts project comment', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Comments")');

      await page.fill('[data-testid="comment-text"]', 'Updated the design document');
      await page.click('button:has-text("Post Comment")');

      await expect(page.getByText(/comment posted/i)).toBeVisible();
    });

    test('uploads project file', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Files")');
      await page.click('button:has-text("Upload File")');

      // Simulate file upload
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('mock pdf content'),
      });

      await page.click('button:has-text("Upload")');

      await expect(page.getByText(/file uploaded/i)).toBeVisible();
    });

    test('views project activity feed', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Activity")');

      await expect(page.getByText('Activity Feed')).toBeVisible();

      const activities = page.locator('[data-testid^="activity-"]');
      const count = await activities.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Project Templates', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'pm');
    });

    test('creates project from template', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/templates`);

      await page.click('[data-testid^="template-"]');
      await page.click('button:has-text("Use Template")');

      await page.fill('[data-testid="project-name"]', 'New Project from Template');
      await page.fill('[data-testid="start-date"]', '2024-02-01');

      await page.click('button:has-text("Create Project")');

      await expect(page.getByText(/project created/i)).toBeVisible();
    });

    test('creates new template', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/templates`);

      await page.click('button:has-text("New Template")');

      await page.fill('[data-testid="template-name"]', 'Software Development Project');
      await page.fill('[data-testid="template-description"]', 'Standard SDLC template');

      // Add template tasks
      await page.click('button:has-text("Add Task")');
      await page.fill('[data-testid="template-task-0"]', 'Requirements Gathering');
      await page.fill('[data-testid="template-task-1"]', 'Design');
      await page.fill('[data-testid="template-task-2"]', 'Development');

      await page.click('button:has-text("Create Template")');

      await expect(page.getByText(/template created/i)).toBeVisible();
    });
  });

  test.describe('Gantt Chart View', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'pm');
    });

    test('views project gantt chart', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Gantt Chart")');

      await expect(page.locator('.gantt-chart')).toBeVisible();
      await expect(page.getByText('Timeline')).toBeVisible();
    });

    test('adjusts task dates in gantt view', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);

      await page.click('[data-testid^="project-card-"]');
      await page.click('button:has-text("Gantt Chart")');

      // Drag task bar to adjust dates
      const taskBar = page.locator('[data-testid^="gantt-bar-"]').first();
      await taskBar.dragTo(page.locator('[data-testid="gantt-timeline-2024-02-15"]'));

      await expect(page.getByText(/task updated/i)).toBeVisible();
    });
  });
});
