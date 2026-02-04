/**
 * Unit tests for ReportsService
 * @covers src/services/ReportsService.ts
 */

import { ReportsService } from '../ReportsService';
import {
  Report,
  ReportExecution,
  ReportType,
  ReportStatus,
  ReportFormat,
  ExportJob,
  ChartType,
} from '@opsui/shared';

// Mock all dependencies
jest.mock('../../db/client', () => ({
  getPool: jest.fn(),
}));

jest.mock('../../repositories/ReportsRepository', () => ({
  reportsRepository: {
    findById: jest.fn(),
    createExecution: jest.fn(),
    createExportJob: jest.fn(),
    getExportJob: jest.fn(),
    updateExportJob: jest.fn(),
  },
}));

describe('ReportsService', () => {
  let reportsService: ReportsService;
  let mockPool: any;
  let mockQuery: jest.Mock;

  // Helper to create a mock report object
  const createMockReport = (overrides: any = {}): any => ({
    reportId: 'REPORT-123',
    name: 'Test Report',
    description: 'Test description',
    reportType: ReportType.INVENTORY,
    fields: [{ name: 'id', field: 'id', aggregation: null }],
    filters: [],
    groups: [],
    status: ReportStatus.COMPLETED,
    chartConfig: {
      enabled: false,
      chartType: ChartType.TABLE,
      showLegend: false,
      showDataLabels: false,
    },
    defaultFormat: ReportFormat.CSV,
    allowExport: true,
    allowSchedule: false,
    isPublic: false,
    tags: [],
    category: 'test',
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock pool and query function
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };

    (require('../../db/client').getPool as jest.Mock).mockReturnValue(mockPool);

    reportsService = new ReportsService();
  });

  // ==========================================================================
  // EXECUTE REPORT
  // ==========================================================================

  describe('executeReport', () => {
    it('should execute report successfully', async () => {
      const mockReport = createMockReport();

      const { reportsRepository } = require('../../repositories/ReportsRepository');
      reportsRepository.findById.mockResolvedValue(mockReport);
      reportsRepository.createExecution.mockResolvedValue({
        executionId: 'EXEC-123',
        status: ReportStatus.COMPLETED,
        rowCount: 10,
        executionTimeMs: 100,
        fileUrl: '/reports/REPORT-123/123456789.csv',
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: '1' }, { id: '2' }],
        rowCount: 2,
      });

      const result = await reportsService.executeReport(
        'REPORT-123',
        ReportFormat.CSV,
        {},
        'user-123'
      );

      expect(result.execution.status).toBe(ReportStatus.COMPLETED);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('_rowNumber', 1);
      expect(reportsRepository.createExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          reportId: 'REPORT-123',
          status: ReportStatus.COMPLETED,
        })
      );
    });

    it('should throw error when report not found', async () => {
      const { reportsRepository } = require('../../repositories/ReportsRepository');
      reportsRepository.findById.mockResolvedValue(null);

      await expect(
        reportsService.executeReport('NONEXISTENT', ReportFormat.CSV, {}, 'user-123')
      ).rejects.toThrow('Report not found');
    });

    it('should handle query execution failure', async () => {
      const mockReport = createMockReport();

      const { reportsRepository } = require('../../repositories/ReportsRepository');
      reportsRepository.findById.mockResolvedValue(mockReport);
      reportsRepository.createExecution.mockResolvedValue({
        executionId: 'EXEC-123',
        status: ReportStatus.FAILED,
        executionTimeMs: 50,
      });

      mockQuery.mockRejectedValue(new Error('Query failed'));

      await expect(
        reportsService.executeReport('REPORT-123', ReportFormat.CSV, {}, 'user-123')
      ).rejects.toThrow('Query failed');

      expect(reportsRepository.createExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReportStatus.FAILED,
          errorMessage: 'Query failed',
        })
      );
    });

    it('should use correct data source for different report types', async () => {
      const mockReport = createMockReport({ reportType: ReportType.ORDERS });

      const { reportsRepository } = require('../../repositories/ReportsRepository');
      reportsRepository.findById.mockResolvedValue(mockReport);
      reportsRepository.createExecution.mockResolvedValue({
        executionId: 'EXEC-123',
        status: ReportStatus.COMPLETED,
      });

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await reportsService.executeReport('REPORT-123', ReportFormat.CSV, {}, 'user-123');

      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain('FROM orders');
    });

    it('should generate file URL based on format', async () => {
      const mockReport = createMockReport();

      const { reportsRepository } = require('../../repositories/ReportsRepository');
      reportsRepository.findById.mockResolvedValue(mockReport);
      reportsRepository.createExecution.mockResolvedValue({
        executionId: 'EXEC-123',
        status: ReportStatus.COMPLETED,
        fileUrl: '/reports/REPORT-123/123456789.pdf',
      });

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await reportsService.executeReport(
        'REPORT-123',
        ReportFormat.PDF,
        {},
        'user-123'
      );

      expect(result.execution.fileUrl).toMatch(/\.pdf$/);
    });
  });

  // ==========================================================================
  // CREATE EXPORT JOB
  // ==========================================================================

  describe('createExportJob', () => {
    it('should create export job successfully', async () => {
      const { reportsRepository } = require('../../repositories/ReportsRepository');

      const mockJob: ExportJob = {
        jobId: 'EXPORT-123',
        name: 'orders Export',
        entityType: 'orders',
        format: ReportFormat.CSV,
        fields: ['id', 'status', 'created_at'],
        filters: [],
        status: ReportStatus.DRAFT,
        createdBy: 'user-123',
        createdAt: new Date(),
      };

      reportsRepository.createExportJob.mockResolvedValue(mockJob);

      // Mock processExportJob to avoid async issues
      jest.spyOn(reportsService as any, 'processExportJob').mockResolvedValue(undefined);

      const result = await reportsService.createExportJob(
        'orders',
        ReportFormat.CSV,
        ['id', 'status', 'created_at'],
        [],
        'user-123'
      );

      expect(result.name).toBe('orders Export');
      expect(result.entityType).toBe('orders');
      expect(result.format).toBe(ReportFormat.CSV);
      expect(reportsRepository.createExportJob).toHaveBeenCalledWith({
        name: 'orders Export',
        entityType: 'orders',
        format: ReportFormat.CSV,
        fields: ['id', 'status', 'created_at'],
        filters: [],
        status: ReportStatus.DRAFT,
        createdBy: 'user-123',
      });
    });

    it('should start processing export job asynchronously', async () => {
      const { reportsRepository } = require('../../repositories/ReportsRepository');

      const mockJob: ExportJob = {
        jobId: 'EXPORT-123',
        name: 'inventory Export',
        entityType: 'inventory',
        format: ReportFormat.CSV,
        fields: ['sku', 'quantity'],
        filters: [],
        status: ReportStatus.DRAFT,
        createdBy: 'user-123',
        createdAt: new Date(),
      };

      reportsRepository.createExportJob.mockResolvedValue(mockJob);

      // Mock the processExportJob method
      const processSpy = jest
        .spyOn(reportsService as any, 'processExportJob')
        .mockResolvedValue(undefined);

      await reportsService.createExportJob(
        'inventory',
        ReportFormat.CSV,
        ['sku', 'quantity'],
        [],
        'user-123'
      );

      // Give some time for async to start
      await new Promise(resolve => setImmediate(resolve));

      expect(processSpy).toHaveBeenCalledWith('EXPORT-123');
      processSpy.mockRestore();
    });
  });

  // ==========================================================================
  // FILTER APPLICATION (tested through executeReport)
  // ==========================================================================

  describe('Filter application', () => {
    it('should apply equals filter', async () => {
      const mockReport = createMockReport({
        filters: [{ field: 'status', operator: 'equals', value: 'active' }],
      });

      const { reportsRepository } = require('../../repositories/ReportsRepository');
      reportsRepository.findById.mockResolvedValue(mockReport);
      reportsRepository.createExecution.mockResolvedValue({
        executionId: 'EXEC-123',
        status: ReportStatus.COMPLETED,
      });

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await reportsService.executeReport(
        'REPORT-123',
        ReportFormat.CSV,
        { status: 'active' },
        'user-123'
      );

      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain('WHERE');
      expect(sql).toContain('status = $1');
    });

    it('should skip filter when parameter value is undefined', async () => {
      const mockReport = createMockReport({
        filters: [{ field: 'status', operator: 'equals', value: 'active' }],
      });

      const { reportsRepository } = require('../../repositories/ReportsRepository');
      reportsRepository.findById.mockResolvedValue(mockReport);
      reportsRepository.createExecution.mockResolvedValue({
        executionId: 'EXEC-123',
        status: ReportStatus.COMPLETED,
      });

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      // Don't provide the status parameter
      await reportsService.executeReport(
        'REPORT-123',
        ReportFormat.CSV,
        {}, // No status parameter
        'user-123'
      );

      const sql = mockQuery.mock.calls[0][0];
      expect(sql).not.toContain('WHERE');
    });
  });

  // ==========================================================================
  // DATA SOURCE MAPPING
  // ==========================================================================

  describe('Data source mapping', () => {
    it('should use correct table for each report type', async () => {
      const reportTypes = [
        { type: ReportType.INVENTORY, table: 'inventory' },
        { type: ReportType.ORDERS, table: 'orders' },
        { type: ReportType.SHIPPING, table: 'shipments' },
        { type: ReportType.RECEIVING, table: 'inbound_shipments' },
        { type: ReportType.PICKING_PERFORMANCE, table: 'pick_tasks' },
        { type: ReportType.PACKING_PERFORMANCE, table: 'packing_tasks' },
        { type: ReportType.CYCLE_COUNTS, table: 'cycle_counts' },
        { type: ReportType.LOCATION_UTILIZATION, table: 'locations' },
        { type: ReportType.USER_PERFORMANCE, table: 'users' },
      ];

      for (const { type, table } of reportTypes) {
        const mockReport = createMockReport({ reportType: type });

        const { reportsRepository } = require('../../repositories/ReportsRepository');
        reportsRepository.findById.mockResolvedValue(mockReport);
        reportsRepository.createExecution.mockResolvedValue({
          executionId: 'EXEC-123',
          status: ReportStatus.COMPLETED,
        });

        mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

        await reportsService.executeReport('REPORT-123', ReportFormat.CSV, {}, 'user-123');

        const sql = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][0];
        expect(sql).toContain(`FROM ${table}`);
      }
    });
  });
});
