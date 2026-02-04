/**
 * Unit tests for AutomationService
 * @covers src/services/AutomationService.ts
 */

import { AutomationService, automationService } from '../AutomationService';
import {
  AutomationTaskType,
  AutomationTaskStatus,
  CreateAutomationTaskDTO,
  RFIDScanResult,
} from '@opsui/shared';

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

import { getPool } from '../../db/client';
import { logger } from '../../config/logger';

describe('AutomationService', () => {
  let service: AutomationService;
  let mockPool: any;
  let mockQuery: jest.Mock;

  // Database row format (what the service expects)
  const mockTaskRow = {
    task_id: 'TASK-ABC123XYZ',
    task_type: AutomationTaskType.CYCLE_COUNT,
    status: AutomationTaskStatus.PENDING,
    assigned_to: 'ROBOT-001',
    priority: 5,
    location: 'A-01-01',
    sku: 'SKU-001',
    quantity: 100,
    metadata: JSON.stringify({ batchId: 'BATCH-001' }),
    result: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    completed_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock pool and query function
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);
    service = new AutomationService();
  });

  // ==========================================================================
  // CREATE AUTOMATION TASK
  // ==========================================================================

  describe('createAutomationTask', () => {
    it('should create a cycle count automation task', async () => {
      const dto: CreateAutomationTaskDTO = {
        taskType: AutomationTaskType.CYCLE_COUNT,
        assignedTo: 'ROBOT-001',
        priority: 5,
        location: 'A-01-01',
        sku: 'SKU-001',
        quantity: 100,
        createdBy: 'user-001',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [mockTaskRow],
        }) // INSERT ... RETURNING
        .mockResolvedValueOnce({}) // COMMIT
        .mockResolvedValueOnce({
          rows: [mockTaskRow],
        }); // getAutomationTask

      const result = await service.createAutomationTask(dto);

      expect(result.taskType).toBe(AutomationTaskType.CYCLE_COUNT);
      expect(result.assignedTo).toBe('ROBOT-001');
      expect(result.taskId).toMatch(/^TASK-/); // Check it has the right format
      expect(logger.info).toHaveBeenCalledWith('Automation task created', {
        taskId: expect.stringMatching(/^TASK-/),
        taskType: AutomationTaskType.CYCLE_COUNT,
      });
    });

    it('should create task without optional fields', async () => {
      const dto: CreateAutomationTaskDTO = {
        taskType: AutomationTaskType.INVENTORY_CHECK,
        assignedTo: 'ASRS-001',
        priority: 3,
        location: 'B-02-02',
        createdBy: 'system',
      };

      const taskRowNoMetadata = {
        ...mockTaskRow,
        task_id: 'TASK-XYZ789ABC',
        task_type: AutomationTaskType.INVENTORY_CHECK,
        sku: null,
        quantity: null,
        metadata: null,
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [taskRowNoMetadata],
        }) // INSERT
        .mockResolvedValueOnce({}) // COMMIT
        .mockResolvedValueOnce({
          rows: [taskRowNoMetadata],
        }); // getAutomationTask

      const result = await service.createAutomationTask(dto);

      expect(result.taskType).toBe(AutomationTaskType.INVENTORY_CHECK);
    });

    it('should rollback and throw error on database failure', async () => {
      const dto: CreateAutomationTaskDTO = {
        taskType: AutomationTaskType.PICK,
        assignedTo: 'ROBOT-002',
        priority: 1,
        location: 'C-03-03',
        createdBy: 'user-002',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database connection failed')) // INSERT fails
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.createAutomationTask(dto)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Error creating automation task',
        expect.any(Error)
      );
    });
  });

  // ==========================================================================
  // GET AUTOMATION TASK
  // ==========================================================================

  describe('getAutomationTask', () => {
    it('should return task by ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockTaskRow],
      });

      const result = await service.getAutomationTask('TASK-ABC123XYZ');

      expect(result.taskId).toBe('TASK-ABC123XYZ');
      expect(result.taskType).toBe(AutomationTaskType.CYCLE_COUNT);
    });

    it('should throw error when task not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await expect(service.getAutomationTask('TASK-NOTFOUND')).rejects.toThrow(
        'Automation task TASK-NOTFOUND not found'
      );
    });
  });

  // ==========================================================================
  // GET PENDING TASKS
  // ==========================================================================

  describe('getPendingTasks', () => {
    it('should return pending tasks for assigned system', async () => {
      const task2Row = { ...mockTaskRow, task_id: 'TASK-002' };

      mockQuery.mockResolvedValueOnce({
        rows: [mockTaskRow, task2Row],
      });

      const result = await service.getPendingTasks('ROBOT-001');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(AutomationTaskStatus.PENDING);
    });

    it('should filter by task type when provided', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockTaskRow],
      });

      const result = await service.getPendingTasks('ROBOT-001', AutomationTaskType.CYCLE_COUNT);

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM automation_tasks WHERE assigned_to = $1 AND status = $2 AND task_type = $3 ORDER BY priority DESC, created_at ASC',
        ['ROBOT-001', AutomationTaskStatus.PENDING, AutomationTaskType.CYCLE_COUNT]
      );
    });

    it('should order by priority DESC, created_at ASC', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await service.getPendingTasks('ROBOT-001');

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('ORDER BY priority DESC, created_at ASC');
    });
  });

  // ==========================================================================
  // UPDATE TASK RESULT
  // ==========================================================================

  describe('updateTaskResult', () => {
    it('should update task status to COMPLETED', async () => {
      const completedRow = {
        ...mockTaskRow,
        status: AutomationTaskStatus.COMPLETED,
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockTaskRow] }) // getAutomationTask
        .mockResolvedValueOnce({ rows: [{ quantity: '100' }] }) // inventory_units query for processCycleCountResult
        .mockResolvedValueOnce({ rows: [{ plan_id: 'PLAN-001' }] }) // cycle count plans query
        .mockResolvedValueOnce({}) // INSERT cycle_count_entry
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({}) // COMMIT
        .mockResolvedValueOnce({
          rows: [completedRow],
        }); // getAutomationTask

      const result = await service.updateTaskResult(
        'TASK-ABC123XYZ',
        AutomationTaskStatus.COMPLETED,
        {
          countedQuantity: 95,
          variance: -5,
          notes: 'Minor variance',
        }
      );

      expect(result.status).toBe(AutomationTaskStatus.COMPLETED);
      expect(logger.info).toHaveBeenCalledWith('Automation task updated', {
        taskId: 'TASK-ABC123XYZ',
        status: AutomationTaskStatus.COMPLETED,
      });
    });

    it('should update task status to FAILED', async () => {
      const failedRow = {
        ...mockTaskRow,
        status: AutomationTaskStatus.FAILED,
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockTaskRow] }) // getAutomationTask
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({}) // COMMIT
        .mockResolvedValueOnce({
          rows: [failedRow],
        }); // getAutomationTask

      const result = await service.updateTaskResult('TASK-ABC123XYZ', AutomationTaskStatus.FAILED);

      expect(result.status).toBe(AutomationTaskStatus.FAILED);
    });

    it('should set completed_at when status is COMPLETED', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockTaskRow] }) // getAutomationTask
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({}) // COMMIT
        .mockResolvedValueOnce({
          rows: [{ ...mockTaskRow, status: AutomationTaskStatus.COMPLETED }],
        }); // getAutomationTask (would have completed_at set by DB)

      await service.updateTaskResult('TASK-ABC123XYZ', AutomationTaskStatus.COMPLETED);

      const updateQuery = mockQuery.mock.calls[2][0];
      expect(updateQuery).toContain('completed_at = CASE WHEN');
    });
  });

  // ==========================================================================
  // PROCESS RFID SCAN
  // ==========================================================================

  describe('processRFIDScan', () => {
    const mockRFIDScan: RFIDScanResult = {
      tags: [
        {
          tagId: 'TAG-001',
          epc: 'EPC-001-SKU123',
          sku: 'SKU-123',
          binLocation: 'A-01-01',
          scanCount: 1,
        },
        { tagId: 'TAG-002', epc: 'EPC-002-UNKNOWN', binLocation: 'A-01-01', scanCount: 1 },
      ],
      scanDuration: 5000,
      scanLocation: 'A-01-01',
      scannedBy: 'user-001',
      scannedAt: new Date('2024-01-01'),
    };

    it('should process RFID scan and match tags to SKUs', async () => {
      // First call for EPC-001-SKU123 - finds SKU
      mockQuery.mockResolvedValueOnce({
        rows: [{ sku: 'SKU-123' }],
      });
      // Insert/update RFID tag for matched SKU
      mockQuery.mockResolvedValueOnce({});
      // Second call for EPC-002-UNKNOWN - no SKU found
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });
      // Insert unmatched tag
      mockQuery.mockResolvedValueOnce({});

      const result = await service.processRFIDScan(mockRFIDScan);

      expect(result.matchedTags).toBe(1);
      expect(result.unmatchedTags).toContain('EPC-002-UNKNOWN');
      expect(logger.info).toHaveBeenCalledWith('RFID scan processed', {
        totalTags: 2,
        matchedTags: 1,
        unmatchedTags: 1,
      });
    });

    it('should handle all tags matched', async () => {
      const allMatchedScan: RFIDScanResult = {
        ...mockRFIDScan,
        tags: [
          {
            tagId: 'TAG-001',
            epc: 'EPC-001-SKU123',
            sku: 'SKU-123',
            binLocation: 'A-01-01',
            scanCount: 1,
          },
          {
            tagId: 'TAG-002',
            epc: 'EPC-002-SKU456',
            sku: 'SKU-456',
            binLocation: 'A-01-01',
            scanCount: 1,
          },
        ],
      };

      // Both tags find SKUs
      mockQuery
        .mockResolvedValueOnce({ rows: [{ sku: 'SKU-123' }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ sku: 'SKU-456' }] })
        .mockResolvedValueOnce({});

      const result = await service.processRFIDScan(allMatchedScan);

      expect(result.matchedTags).toBe(2);
      expect(result.unmatchedTags).toHaveLength(0);
    });
  });

  // ==========================================================================
  // GET RFID SCAN SUMMARY
  // ==========================================================================

  describe('getRFIDScanSummary', () => {
    it('should return RFID scan summary for location', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_tags: '10', unique_skus: '5', last_scan: '2024-01-01T10:00:00Z' }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          { sku: 'SKU-001' },
          { sku: 'SKU-002' },
          { sku: 'SKU-003' },
          { sku: 'SKU-004' },
          { sku: 'SKU-005' },
        ],
      });

      const result = await service.getRFIDScanSummary('A-01-01');

      expect(result.totalTags).toBe(10);
      expect(result.matchedSKUs).toBe(5);
      expect(result.uniqueSKUs).toHaveLength(5);
      expect(result.lastScan).toBeInstanceOf(Date);
    });

    it('should return zero values when no tags found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_tags: null, unique_skus: null, last_scan: null }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.getRFIDScanSummary('Z-99-99');

      expect(result.totalTags).toBe(0);
      expect(result.matchedSKUs).toBe(0);
      expect(result.uniqueSKUs).toHaveLength(0);
      expect(result.lastScan).toBeUndefined();
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('automationService singleton', () => {
    it('should export singleton instance', () => {
      expect(automationService).toBeInstanceOf(AutomationService);
    });
  });
});
