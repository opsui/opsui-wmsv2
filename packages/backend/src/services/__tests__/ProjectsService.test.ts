/**
 * Unit tests for ProjectsService
 * @covers src/services/ProjectsService.ts
 */

import { projectsService } from '../ProjectsService';
import { projectsRepository } from '../../repositories/ProjectsRepository';
import { query } from '../../db/client';
import {
  NotFoundError,
  ProjectStatus,
  ProjectType,
  BillingType,
  TaskStatus,
  TaskPriority,
  WorkType,
} from '@opsui/shared';
import type {
  Project,
  ProjectWithDetails,
  ProjectTask,
  ProjectMilestone,
  ProjectTimeEntry,
  CreateProjectDTO,
  CreateTaskDTO,
  CreateMilestoneDTO,
  CreateTimeEntryDTO,
  ProjectQueryFilters,
} from '@opsui/shared';

// Mock query function
jest.mock('../../db/client', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
}));

// Mock dependencies
jest.mock('../../repositories/ProjectsRepository', () => ({
  projectsRepository: {
    projects: {
      queryWithFilters: jest.fn(),
      findById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      findByIdOrThrow: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByNumber: jest.fn(),
      getProjectSummary: jest.fn(),
      softDelete: jest.fn(),
      updateActuals: jest.fn(),
    },
    tasks: {
      queryWithFilters: jest.fn(),
      findById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      findByIdOrThrow: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByProjectId: jest.fn(),
      findRootTasks: jest.fn(),
      findChildren: jest.fn(),
      getGanttChartData: jest.fn(),
    },
    milestones: {
      findByProjectId: jest.fn(),
      findById: jest.fn(),
      findByIdOrThrow: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      markAsComplete: jest.fn(),
    },
    timeEntries: {
      queryWithFilters: jest.fn(),
      findById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      batchApprove: jest.fn(),
      findUnbilled: jest.fn(),
    },
    expenses: {
      queryWithFilters: jest.fn(),
      findById: jest.fn(),
      findByIdOrThrow: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      batchApprove: jest.fn(),
      findUnbilled: jest.fn(),
    },
    resources: {
      findByProjectId: jest.fn(),
      findByIdWithDetails: jest.fn(),
      insert: jest.fn(),
      removeResource: jest.fn(),
    },
    billingSchedule: {
      findByProjectId: jest.fn(),
      findById: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
    },
  },
}));

describe('ProjectsService', () => {
  // Helper to create mock project
  const createMockProject = (overrides: any = {}): Project => ({
    project_id: 'PRJ-001',
    project_number: 'PRJ-1234567890',
    project_name: 'Test Project',
    project_description: 'A test project',
    customer_id: 'CUST-001',
    project_type: ProjectType.TIME_MATERIALS,
    project_status: ProjectStatus.ACTIVE,
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-12-31'),
    actual_start_date: new Date('2024-01-01'),
    actual_end_date: null,
    estimated_budget: 100000,
    actual_cost: 50000,
    actual_revenue: 60000,
    budget_variance: -10000,
    profit_amount: 10000,
    progress_percent: 50,
    billing_type: BillingType.TIME_MATERIAL,
    advance_payment: 0,
    project_manager_id: 'USER-001',
    account_manager_id: 'USER-002',
    entity_id: null,
    tags: ['tag1', 'tag2'],
    priority: 'MEDIUM',
    quote_id: null,
    contract_number: null,
    purchase_order_number: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    completed_at: null,
    created_by: 'user-123',
    ...overrides,
  });

  // Helper to create mock project with details
  const createMockProjectWithDetails = (overrides: any = {}): ProjectWithDetails => ({
    ...createMockProject(),
    customer: { id: 'CUST-001', name: 'Test Customer' },
    project_manager: {
      user_id: 'USER-001',
      email: 'pm@example.com',
      first_name: 'Project',
      last_name: 'Manager',
    },
    account_manager: {
      user_id: 'USER-002',
      email: 'am@example.com',
      first_name: 'Account',
      last_name: 'Manager',
    },
    tasks: [],
    time_entries: [],
    expenses: [],
    milestones: [],
    resources: [],
    ...overrides,
  });

  // Helper to create mock task
  const createMockTask = (overrides: any = {}): ProjectTask => ({
    task_id: 'TSK-001',
    project_id: 'PRJ-001',
    parent_task_id: null,
    task_name: 'Test Task',
    task_description: 'A test task',
    task_number: 'TSK-001',
    wbs_code: '1.1',
    sort_order: 1,
    assigned_to: 'USER-001',
    task_status: TaskStatus.NOT_STARTED,
    task_priority: TaskPriority.MEDIUM,
    start_date: new Date('2024-01-01'),
    due_date: new Date('2024-01-31'),
    actual_start_date: null,
    actual_end_date: null,
    estimated_hours: 40,
    actual_hours: 20,
    hours_variance: -20,
    progress_percent: 0,
    percent_complete: 0,
    depends_on_tasks: null,
    is_milestone: false,
    is_critical: false,
    deliverable_name: null,
    deliverable_date: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    completed_at: null,
    created_by: 'user-123',
    ...overrides,
  });

  // Helper to create mock milestone
  const createMockMilestone = (overrides: any = {}): ProjectMilestone => ({
    milestone_id: 'MLST-001',
    project_id: 'PRJ-001',
    milestone_name: 'Milestone 1',
    milestone_description: 'First milestone',
    milestone_number: 1,
    milestone_date: new Date('2024-06-30'),
    completed_at: null,
    milestone_status: 'PENDING',
    is_met: false,
    billing_percentage: 25,
    billing_amount: 25000,
    invoice_id: null,
    depends_on_milestones: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    created_by: 'user-123',
    ...overrides,
  });

  // Helper to create mock time entry
  const createMockTimeEntry = (overrides: any = {}): ProjectTimeEntry => ({
    time_entry_id: 'TIME-001',
    project_id: 'PRJ-001',
    task_id: 'TSK-001',
    employee_id: 'USER-001',
    work_date: new Date('2024-01-01'),
    work_type: WorkType.REGULAR,
    regular_hours: 8,
    overtime_1_5_hours: 0,
    overtime_2_0_hours: 0,
    total_hours: 8,
    description: 'Work done',
    billable: true,
    billing_rate: 100,
    billing_amount: 800,
    approved: false,
    approved_by: null,
    approved_at: null,
    invoice_line_item_id: null,
    timesheet_entry_id: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    created_by: 'user-123',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // PROJECT MANAGEMENT
  // ==========================================================================

  describe('getProjects', () => {
    it('should return all projects', async () => {
      const mockProjects = [
        createMockProject({ project_id: 'PRJ-001' }),
        createMockProject({ project_id: 'PRJ-002' }),
      ];
      (projectsRepository.projects.queryWithFilters as jest.Mock).mockResolvedValue(mockProjects);

      const result = await projectsService.getProjects();

      expect(result).toHaveLength(2);
      expect(projectsRepository.projects.queryWithFilters).toHaveBeenCalledWith({});
    });

    it('should filter projects by status', async () => {
      const mockProjects = [createMockProject()];
      (projectsRepository.projects.queryWithFilters as jest.Mock).mockResolvedValue(mockProjects);

      const filters: ProjectQueryFilters = { project_status: ProjectStatus.ACTIVE };
      await projectsService.getProjects(filters);

      expect(projectsRepository.projects.queryWithFilters).toHaveBeenCalledWith(filters);
    });

    it('should filter projects by customer', async () => {
      const mockProjects = [createMockProject()];
      (projectsRepository.projects.queryWithFilters as jest.Mock).mockResolvedValue(mockProjects);

      const filters: ProjectQueryFilters = { customer_id: 'CUST-001' };
      await projectsService.getProjects(filters);

      expect(projectsRepository.projects.queryWithFilters).toHaveBeenCalledWith(filters);
    });
  });

  describe('getProjectById', () => {
    it('should return project', async () => {
      const mockProject = createMockProjectWithDetails();
      (projectsRepository.projects.findByIdWithDetails as jest.Mock).mockResolvedValue(mockProject);

      const result = await projectsService.getProjectById('PRJ-001');

      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundError when project not found', async () => {
      (projectsRepository.projects.findByIdWithDetails as jest.Mock).mockResolvedValue(null);

      await expect(projectsService.getProjectById('NONEXISTENT')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const dto: CreateProjectDTO = {
        project_name: 'New Project',
        project_description: 'A new project',
        customer_id: 'CUST-001',
        project_type: ProjectType.FIXED_BID,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        estimated_budget: 100000,
        billing_type: BillingType.MILESTONE,
      };

      const mockProject = createMockProject(dto);
      (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'CUST-001' }] });
      (projectsRepository.projects.findByNumber as jest.Mock).mockResolvedValue(null);
      (projectsRepository.projects.insert as jest.Mock).mockResolvedValue(mockProject);

      const result = await projectsService.createProject(dto, 'user-123');

      expect(result.project_name).toBe('New Project');
    });
  });

  describe('updateProject', () => {
    it('should update an existing project', async () => {
      const existingProject = createMockProject();
      const updatedProject = createMockProject({ project_name: 'Updated Project' });

      (projectsRepository.projects.findByIdOrThrow as jest.Mock).mockResolvedValue(existingProject);
      (projectsRepository.projects.update as jest.Mock).mockResolvedValue(updatedProject);

      const result = await projectsService.updateProject(
        'PRJ-001',
        {
          project_name: 'Updated Project',
        },
        'user-123'
      );

      expect(result.project_name).toBe('Updated Project');
    });

    it('should throw NotFoundError when updating non-existent project', async () => {
      (projectsRepository.projects.findByIdOrThrow as jest.Mock).mockRejectedValue(
        new NotFoundError('Project', 'NONEXISTENT')
      );

      await expect(
        projectsService.updateProject('NONEXISTENT', { project_name: 'Updated' }, 'user-123')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==========================================================================
  // TASKS
  // ==========================================================================

  describe('getTasks', () => {
    it('should return all tasks for a project', async () => {
      const mockTasks = [
        createMockTask({ task_id: 'TSK-001' }),
        createMockTask({ task_id: 'TSK-002' }),
      ];
      (projectsRepository.tasks.findByProjectId as jest.Mock).mockResolvedValue(mockTasks);
      (projectsRepository.tasks.findByIdWithDetails as jest.Mock).mockImplementation((id: string) =>
        Promise.resolve(mockTasks.find((t: any) => t.task_id === id))
      );

      const result = await projectsService.getTasks('PRJ-001');

      expect(result).toHaveLength(2);
    });
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const dto: CreateTaskDTO = {
        project_id: 'PRJ-001',
        task_name: 'New Task',
        task_description: 'A new task',
        assigned_to: 'USER-001',
        start_date: new Date('2024-01-01'),
        due_date: new Date('2024-01-31'),
        estimated_hours: 40,
      };

      const mockTask = createMockTask(dto);
      const mockProject = createMockProject();
      (query as jest.Mock).mockResolvedValue({ rows: [{ user_id: 'USER-001' }] });
      (projectsRepository.projects.findByIdOrThrow as jest.Mock).mockResolvedValue(mockProject);
      (projectsRepository.tasks.findById as jest.Mock).mockResolvedValue(null);
      (projectsRepository.tasks.findRootTasks as jest.Mock).mockResolvedValue([]);
      (projectsRepository.tasks.insert as jest.Mock).mockResolvedValue(mockTask);

      const result = await projectsService.createTask(dto, 'user-123');

      expect(result.task_name).toBe('New Task');
      expect(result.project_id).toBe('PRJ-001');
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', async () => {
      const existingTask = createMockTask();
      const updatedTask = createMockTask({ task_name: 'Updated Task' });

      (projectsRepository.tasks.findByIdOrThrow as jest.Mock).mockResolvedValue(existingTask);
      (projectsRepository.tasks.update as jest.Mock).mockResolvedValue(updatedTask);

      const result = await projectsService.updateTask(
        'TSK-001',
        {
          task_name: 'Updated Task',
        },
        'user-123'
      );

      expect(result.task_name).toBe('Updated Task');
    });

    it('should throw NotFoundError when task not found', async () => {
      (projectsRepository.tasks.findByIdOrThrow as jest.Mock).mockRejectedValue(
        new NotFoundError('Task', 'NONEXISTENT')
      );

      await expect(
        projectsService.updateTask('NONEXISTENT', { task_name: 'Updated' }, 'user-123')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==========================================================================
  // MILESTONES
  // ==========================================================================

  describe('getMilestones', () => {
    it('should return all milestones for a project', async () => {
      const mockMilestones = [
        createMockMilestone({ milestone_id: 'MLST-001' }),
        createMockMilestone({ milestone_id: 'MLST-002' }),
      ];
      (projectsRepository.milestones.findByProjectId as jest.Mock).mockResolvedValue(
        mockMilestones
      );

      const result = await projectsService.getMilestones('PRJ-001');

      expect(result).toHaveLength(2);
    });
  });

  describe('createMilestone', () => {
    it('should create a new milestone', async () => {
      const dto: CreateMilestoneDTO = {
        project_id: 'PRJ-001',
        milestone_name: 'Milestone 1',
        milestone_description: 'First milestone',
        milestone_number: 1,
        milestone_date: new Date('2024-06-30'),
        billing_percentage: 25,
      };

      const mockMilestone = createMockMilestone(dto);
      (projectsRepository.milestones.insert as jest.Mock).mockResolvedValue(mockMilestone);

      const result = await projectsService.createMilestone(dto, 'user-123');

      expect(result.milestone_name).toBe('Milestone 1');
      expect(result.project_id).toBe('PRJ-001');
    });
  });

  // ==========================================================================
  // TIME ENTRIES
  // ==========================================================================

  describe('createTimeEntry', () => {
    it('should create a new time entry', async () => {
      const dto: CreateTimeEntryDTO = {
        project_id: 'PRJ-001',
        task_id: 'TSK-001',
        work_date: new Date('2024-01-01'),
        work_type: WorkType.REGULAR,
        regular_hours: 8,
        description: 'Work done',
      };

      const mockTimeEntry = createMockTimeEntry(dto);
      const mockProject = createMockProject();
      const mockTask = createMockTask();
      (projectsRepository.projects.findByIdOrThrow as jest.Mock).mockResolvedValue(mockProject);
      (projectsRepository.tasks.findById as jest.Mock).mockResolvedValue(mockTask);
      (projectsRepository.timeEntries.insert as jest.Mock).mockResolvedValue(mockTimeEntry);

      const result = await projectsService.createTimeEntry(dto, 'user-123');

      expect(result.total_hours).toBe(8);
    });
  });

  describe('getTimeEntries', () => {
    it('should return time entries for a project', async () => {
      const mockTimeEntries = [
        createMockTimeEntry({ time_entry_id: 'TIME-001', total_hours: 8 }),
        createMockTimeEntry({ time_entry_id: 'TIME-002', total_hours: 6 }),
      ];
      (projectsRepository.timeEntries.queryWithFilters as jest.Mock).mockResolvedValue(
        mockTimeEntries
      );
      (projectsRepository.timeEntries.findByIdWithDetails as jest.Mock).mockImplementation(
        (id: string) => Promise.resolve(mockTimeEntries.find((t: any) => t.time_entry_id === id))
      );

      const result = await projectsService.getTimeEntries({ project_id: 'PRJ-001' });

      expect(result).toHaveLength(2);
    });
  });
});
