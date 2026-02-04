/**
 * Unit tests for RecurringScheduleService
 * @covers src/services/RecurringScheduleService.ts
 */

import { RecurringScheduleService, recurringScheduleService } from '../RecurringScheduleService';
import {
  CreateRecurringScheduleDTO,
  UpdateRecurringScheduleDTO,
  ScheduleFilters,
  RecurringCountSchedule,
} from '../RecurringScheduleService';
import { CycleCountType } from '@opsui/shared';

// Mock database client
jest.mock('../../db/client', () => ({
  getPool: jest.fn(),
}));

// Mock logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock CycleCountService
jest.mock('../CycleCountService', () => ({
  cycleCountService: {
    createCycleCountPlan: jest.fn(),
  },
}));

import { getPool } from '../../db/client';
import { logger } from '../../config/logger';
import { cycleCountService } from '../CycleCountService';

describe('RecurringScheduleService', () => {
  let service: RecurringScheduleService;
  let mockPool: any;
  let mockQuery: jest.Mock;

  // Database row format (what the service expects from database)
  const mockDbRow = {
    schedule_id: 'RCS-ABC123XYZ',
    schedule_name: 'Weekly A-Zone Count',
    count_type: CycleCountType.BLANKET,
    frequency_type: 'WEEKLY',
    frequency_interval: '1',
    location: 'A-01-01',
    sku: null,
    assigned_to: 'user-001',
    next_run_date: '2024-01-08T08:00:00Z',
    last_run_date: '2024-01-01T08:00:00Z',
    is_active: true,
    created_by: 'admin-001',
    notes: 'Weekly inventory verification',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock pool and query function
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);
    service = new RecurringScheduleService();

    // Mock cycle count service
    (cycleCountService.createCycleCountPlan as jest.Mock).mockResolvedValue({
      planId: 'PLAN-001',
    });
  });

  // ==========================================================================
  // CREATE RECURRING SCHEDULE
  // ==========================================================================

  describe('createRecurringSchedule', () => {
    it('should create a daily recurring schedule', async () => {
      const dto: CreateRecurringScheduleDTO = {
        scheduleName: 'Daily SKU Count',
        countType: CycleCountType.ABC,
        frequencyType: 'DAILY',
        frequencyInterval: 1,
        sku: 'SKU-001',
        assignedTo: 'user-001',
        createdBy: 'admin-001',
      };

      const expectedRow = {
        ...mockDbRow,
        schedule_name: 'Daily SKU Count',
        count_type: CycleCountType.ABC,
        frequency_type: 'DAILY',
        sku: 'SKU-001',
        location: null,
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [expectedRow] }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.createRecurringSchedule(dto);

      expect(result.scheduleName).toBe('Daily SKU Count');
      expect(result.frequencyType).toBe('DAILY');
      expect(result.frequencyInterval).toBe(1);
      expect(result.scheduleId).toMatch(/^RCS-/);
      expect(logger.info).toHaveBeenCalledWith('Recurring schedule created', expect.any(Object));
    });

    it('should create a weekly recurring schedule', async () => {
      const dto: CreateRecurringScheduleDTO = {
        scheduleName: 'Weekly Zone Count',
        countType: CycleCountType.SPOT_CHECK,
        frequencyType: 'WEEKLY',
        frequencyInterval: 1,
        assignedTo: 'user-002',
        createdBy: 'admin-001',
        notes: 'Count zone A weekly',
      };

      const expectedRow = {
        ...mockDbRow,
        schedule_name: 'Weekly Zone Count',
        count_type: CycleCountType.SPOT_CHECK,
        notes: 'Count zone A weekly',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [expectedRow] }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.createRecurringSchedule(dto);

      expect(result.frequencyType).toBe('WEEKLY');
      expect(result.notes).toBe('Count zone A weekly');
    });

    it('should create a monthly recurring schedule', async () => {
      const dto: CreateRecurringScheduleDTO = {
        scheduleName: 'Monthly Full Count',
        countType: CycleCountType.BLANKET,
        frequencyType: 'MONTHLY',
        frequencyInterval: 1,
        assignedTo: 'user-003',
        createdBy: 'admin-001',
      };

      const expectedRow = {
        ...mockDbRow,
        schedule_name: 'Monthly Full Count',
        frequency_type: 'MONTHLY',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [expectedRow] }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.createRecurringSchedule(dto);

      expect(result.frequencyType).toBe('MONTHLY');
    });

    it('should create a quarterly recurring schedule', async () => {
      const dto: CreateRecurringScheduleDTO = {
        scheduleName: 'Quarterly Audit',
        countType: CycleCountType.BLANKET,
        frequencyType: 'QUARTERLY',
        frequencyInterval: 1,
        assignedTo: 'user-004',
        createdBy: 'admin-001',
      };

      const expectedRow = {
        ...mockDbRow,
        schedule_name: 'Quarterly Audit',
        frequency_type: 'QUARTERLY',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [expectedRow] }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.createRecurringSchedule(dto);

      expect(result.frequencyType).toBe('QUARTERLY');
    });

    it('should default frequency interval to 1 if not provided', async () => {
      const dto: CreateRecurringScheduleDTO = {
        scheduleName: 'Default Interval',
        countType: CycleCountType.ABC,
        frequencyType: 'WEEKLY',
        assignedTo: 'user-001',
        createdBy: 'admin-001',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [mockDbRow],
        }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      await service.createRecurringSchedule(dto);

      const insertCall = mockQuery.mock.calls[1];
      expect(insertCall[1][4]).toBe(1); // frequency_interval parameter
    });

    it('should handle null location and sku', async () => {
      const dto: CreateRecurringScheduleDTO = {
        scheduleName: 'Full Warehouse Count',
        countType: CycleCountType.BLANKET,
        frequencyType: 'MONTHLY',
        frequencyInterval: 1,
        assignedTo: 'user-001',
        createdBy: 'admin-001',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [mockDbRow],
        }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      await service.createRecurringSchedule(dto);

      const insertCall = mockQuery.mock.calls[1];
      expect(insertCall[1][5]).toBeNull(); // location
      expect(insertCall[1][6]).toBeNull(); // sku
    });

    it('should rollback and throw error on database failure', async () => {
      const dto: CreateRecurringScheduleDTO = {
        scheduleName: 'Test Schedule',
        countType: CycleCountType.ABC,
        frequencyType: 'DAILY',
        assignedTo: 'user-001',
        createdBy: 'admin-001',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database connection failed')) // INSERT fails
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.createRecurringSchedule(dto)).rejects.toThrow(
        'Database connection failed'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error creating recurring schedule',
        expect.any(Error)
      );
    });

    it('should calculate next run date correctly for daily frequency', async () => {
      const dto: CreateRecurringScheduleDTO = {
        scheduleName: 'Daily Count',
        countType: CycleCountType.ABC,
        frequencyType: 'DAILY',
        frequencyInterval: 7,
        assignedTo: 'user-001',
        createdBy: 'admin-001',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [mockDbRow],
        }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.createRecurringSchedule(dto);

      expect(result.nextRunDate).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // GET ALL SCHEDULES
  // ==========================================================================

  describe('getAllSchedules', () => {
    it('should return all schedules without filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // COUNT
        .mockResolvedValueOnce({
          rows: [mockDbRow],
        }); // SELECT

      const result = await service.getAllSchedules();

      expect(result.schedules).toHaveLength(1);
      expect(result.total).toBe(10);
    });

    it('should filter by is_active status', async () => {
      const filters: ScheduleFilters = { isActive: true };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [mockDbRow] });

      const result = await service.getAllSchedules(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = $1'),
        expect.any(Array)
      );
    });

    it('should filter by assigned_to', async () => {
      const filters: ScheduleFilters = { assignedTo: 'user-001' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [mockDbRow] });

      await service.getAllSchedules(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('assigned_to ='),
        expect.any(Array)
      );
    });

    it('should filter by frequency_type', async () => {
      const filters: ScheduleFilters = { frequencyType: 'WEEKLY' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '7' }] })
        .mockResolvedValueOnce({ rows: [mockDbRow] });

      await service.getAllSchedules(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('frequency_type ='),
        expect.any(Array)
      );
    });

    it('should filter by count_type', async () => {
      const filters: ScheduleFilters = { countType: CycleCountType.ABC };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '4' }] })
        .mockResolvedValueOnce({ rows: [mockDbRow] });

      await service.getAllSchedules(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('count_type ='),
        expect.any(Array)
      );
    });

    it('should apply pagination with limit and offset', async () => {
      const filters: ScheduleFilters = { limit: 10, offset: 20 };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [mockDbRow] });

      await service.getAllSchedules(filters);

      const selectCall = mockQuery.mock.calls[1];
      expect(selectCall[1]).toContain(10);
      expect(selectCall[1]).toContain(20);
    });

    it('should include assigned_to_name and created_by_name', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] }).mockResolvedValueOnce({
        rows: [{ ...mockDbRow, assigned_to_name: 'John Doe', created_by_name: 'Admin' }],
      });

      const result = await service.getAllSchedules();

      expect(result.schedules[0]).toHaveProperty('assignedToName', 'John Doe');
      expect(result.schedules[0]).toHaveProperty('createdByName', 'Admin');
    });

    it('should handle multiple filters combined', async () => {
      const filters: ScheduleFilters = {
        isActive: true,
        assignedTo: 'user-001',
        frequencyType: 'DAILY',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [mockDbRow] });

      await service.getAllSchedules(filters);

      const countCall = mockQuery.mock.calls[0][0];
      expect(countCall).toContain('is_active =');
      expect(countCall).toContain('assigned_to =');
      expect(countCall).toContain('frequency_type =');
    });

    it('should return empty array when no schedules found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getAllSchedules();

      expect(result.schedules).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ==========================================================================
  // GET SCHEDULE
  // ==========================================================================

  describe('getSchedule', () => {
    it('should return schedule by ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockDbRow, assigned_to_name: 'John Doe', created_by_name: 'Admin' }],
      });

      const result = await service.getSchedule('RCS-ABC123XYZ');

      expect(result.scheduleId).toBe('RCS-ABC123XYZ');
      expect(result).toHaveProperty('assignedToName', 'John Doe');
      expect(result).toHaveProperty('createdByName', 'Admin');
    });

    it('should throw error when schedule not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(service.getSchedule('NOT-FOUND')).rejects.toThrow(
        'Recurring schedule NOT-FOUND not found'
      );
    });

    it('should handle missing assigned_to_name gracefully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockDbRow, assigned_to_name: null, created_by_name: 'Admin' }],
      });

      const result = await service.getSchedule('RCS-ABC123XYZ');

      expect(result.scheduleId).toBe('RCS-ABC123XYZ');
      expect(result).toHaveProperty('createdByName', 'Admin');
    });
  });

  // ==========================================================================
  // UPDATE SCHEDULE
  // ==========================================================================

  describe('updateSchedule', () => {
    it('should update schedule name', async () => {
      const dto: UpdateRecurringScheduleDTO = { scheduleName: 'Updated Name' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ ...mockDbRow, schedule_name: 'Updated Name' }],
        }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.updateSchedule('RCS-ABC123XYZ', dto);

      expect(result.scheduleName).toBe('Updated Name');
    });

    it('should update frequency type', async () => {
      const dto: UpdateRecurringScheduleDTO = { frequencyType: 'MONTHLY' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ ...mockDbRow, frequency_type: 'MONTHLY' }],
        })
        .mockResolvedValueOnce({});

      const result = await service.updateSchedule('RCS-ABC123XYZ', dto);

      expect(result.frequencyType).toBe('MONTHLY');
    });

    it('should update frequency interval', async () => {
      const dto: UpdateRecurringScheduleDTO = { frequencyInterval: 2 };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ ...mockDbRow, frequency_interval: '2' }],
        })
        .mockResolvedValueOnce({});

      const result = await service.updateSchedule('RCS-ABC123XYZ', dto);

      expect(result.frequencyInterval).toBe(2);
    });

    it('should update location', async () => {
      const dto: UpdateRecurringScheduleDTO = { location: 'B-02-02' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ ...mockDbRow, location: 'B-02-02' }],
        })
        .mockResolvedValueOnce({});

      const result = await service.updateSchedule('RCS-ABC123XYZ', dto);

      expect(result.location).toBe('B-02-02');
    });

    it('should update location to null', async () => {
      const dto: UpdateRecurringScheduleDTO = { location: null };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ ...mockDbRow, location: null }],
        })
        .mockResolvedValueOnce({});

      await service.updateSchedule('RCS-ABC123XYZ', dto);

      // Check the location parameter is null
      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[1]).toContain(null);
    });

    it('should update sku', async () => {
      const dto: UpdateRecurringScheduleDTO = { sku: 'SKU-999' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ ...mockDbRow, sku: 'SKU-999' }],
        })
        .mockResolvedValueOnce({});

      const result = await service.updateSchedule('RCS-ABC123XYZ', dto);

      expect(result.sku).toBe('SKU-999');
    });

    it('should update assigned to', async () => {
      const dto: UpdateRecurringScheduleDTO = { assignedTo: 'user-999' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ ...mockDbRow, assigned_to: 'user-999' }],
        })
        .mockResolvedValueOnce({});

      const result = await service.updateSchedule('RCS-ABC123XYZ', dto);

      expect(result.assignedTo).toBe('user-999');
    });

    it('should update is_active status', async () => {
      const dto: UpdateRecurringScheduleDTO = { isActive: false };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ ...mockDbRow, is_active: false }],
        })
        .mockResolvedValueOnce({});

      const result = await service.updateSchedule('RCS-ABC123XYZ', dto);

      expect(result.isActive).toBe(false);
    });

    it('should update notes', async () => {
      const dto: UpdateRecurringScheduleDTO = { notes: 'Updated notes' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ ...mockDbRow, notes: 'Updated notes' }],
        })
        .mockResolvedValueOnce({});

      const result = await service.updateSchedule('RCS-ABC123XYZ', dto);

      expect(result.notes).toBe('Updated notes');
    });

    it('should update multiple fields at once', async () => {
      const dto: UpdateRecurringScheduleDTO = {
        scheduleName: 'New Name',
        frequencyType: 'MONTHLY',
        isActive: false,
        notes: 'Multi update',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ ...mockDbRow }],
        })
        .mockResolvedValueOnce({});

      await service.updateSchedule('RCS-ABC123XYZ', dto);

      const updateCall = mockQuery.mock.calls[1][0];
      expect(updateCall).toContain('schedule_name =');
      expect(updateCall).toContain('frequency_type =');
      expect(updateCall).toContain('is_active =');
      expect(updateCall).toContain('notes =');
    });

    it('should throw error when schedule not found', async () => {
      const dto: UpdateRecurringScheduleDTO = { scheduleName: 'Test' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.updateSchedule('NOT-FOUND', dto)).rejects.toThrow(
        'Recurring schedule NOT-FOUND not found'
      );
    });

    it('should rollback and throw error on database failure', async () => {
      const dto: UpdateRecurringScheduleDTO = { scheduleName: 'Test' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Connection lost')) // UPDATE fails
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.updateSchedule('RCS-ABC123XYZ', dto)).rejects.toThrow('Connection lost');
      expect(logger.error).toHaveBeenCalledWith(
        'Error updating recurring schedule',
        expect.any(Error)
      );
    });
  });

  // ==========================================================================
  // DELETE SCHEDULE
  // ==========================================================================

  describe('deleteSchedule', () => {
    it('should delete schedule by ID', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await service.deleteSchedule('RCS-ABC123XYZ');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM recurring_count_schedules WHERE schedule_id = $1',
        ['RCS-ABC123XYZ']
      );
      expect(logger.info).toHaveBeenCalledWith('Recurring schedule deleted', {
        scheduleId: 'RCS-ABC123XYZ',
      });
    });

    it('should throw error when schedule not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      await expect(service.deleteSchedule('NOT-FOUND')).rejects.toThrow(
        'Recurring schedule NOT-FOUND not found'
      );
    });
  });

  // ==========================================================================
  // PROCESS DUE SCHEDULES
  // ==========================================================================

  describe('processDueSchedules', () => {
    it('should process due schedules and create cycle count plans', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [mockDbRow],
        }) // SELECT due schedules
        .mockResolvedValueOnce({}) // UPDATE last_run_date and next_run_date
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.processDueSchedules();

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.details).toHaveLength(1);
      expect(result.details[0].planId).toBe('PLAN-001');
      expect(cycleCountService.createCycleCountPlan).toHaveBeenCalled();
    });

    it('should skip schedules with no due items', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // No due schedules
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.processDueSchedules();

      expect(result.processed).toBe(0);
      expect(result.details).toHaveLength(0);
    });

    it('should handle individual schedule processing failures', async () => {
      (cycleCountService.createCycleCountPlan as jest.Mock).mockRejectedValueOnce(
        new Error('Plan creation failed')
      );

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [mockDbRow],
        }) // SELECT due schedules
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.processDueSchedules();

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.details[0].error).toBe('Plan creation failed');
    });

    it('should process multiple due schedules', async () => {
      const schedule2 = {
        ...mockDbRow,
        schedule_id: 'RCS-002',
        schedule_name: 'Second Schedule',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [mockDbRow, schedule2],
        }) // SELECT due schedules
        .mockResolvedValueOnce({}) // UPDATE schedule 1
        .mockResolvedValueOnce({}) // UPDATE schedule 2
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.processDueSchedules();

      expect(result.processed).toBe(2);
      expect(result.details).toHaveLength(2);
    });

    it('should calculate next run date for each processed schedule', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [mockDbRow],
        }) // SELECT due schedules
        .mockResolvedValueOnce({}) // UPDATE with next_run_date
        .mockResolvedValueOnce({}); // COMMIT

      await service.processDueSchedules();

      const updateCall = mockQuery.mock.calls[2][0];
      expect(updateCall).toContain('next_run_date = $1');
    });

    it('should set last_run_date when processing schedule', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [mockDbRow],
        }) // SELECT due schedules
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      await service.processDueSchedules();

      const updateCall = mockQuery.mock.calls[2][0];
      expect(updateCall).toContain('last_run_date = NOW()');
    });

    it('should only process active schedules', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [mockDbRow],
        }) // SELECT with WHERE is_active = true
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      await service.processDueSchedules();

      const selectCall = mockQuery.mock.calls[1][0];
      expect(selectCall).toContain('is_active = true');
    });

    it('should only process schedules where next_run_date <= NOW()', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [mockDbRow],
        }) // SELECT with WHERE next_run_date <= NOW()
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      await service.processDueSchedules();

      const selectCall = mockQuery.mock.calls[1][0];
      expect(selectCall).toContain('next_run_date <= NOW()');
    });

    it('should rollback on database error', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')) // SELECT fails
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.processDueSchedules()).rejects.toThrow('Database error');
    });

    it('should log completion with statistics', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockDbRow] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}); // COMMIT

      await service.processDueSchedules();

      expect(logger.info).toHaveBeenCalledWith('Schedule processing completed', {
        total: 1,
        processed: 1,
        skipped: 0,
        failed: 0,
      });
    });

    it('should pass schedule details to cycle count plan creation', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockDbRow] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}); // COMMIT

      await service.processDueSchedules();

      const callArgs = (cycleCountService.createCycleCountPlan as jest.Mock).mock.calls[0][0];
      expect(callArgs.planName).toContain('Weekly A-Zone Count');
      expect(callArgs.location).toBe('A-01-01');
      expect(callArgs.countBy).toBe('user-001');
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('recurringScheduleService singleton', () => {
    it('should export singleton instance', () => {
      expect(recurringScheduleService).toBeInstanceOf(RecurringScheduleService);
    });
  });
});
