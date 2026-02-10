/**
 * Unit tests for ReportsRepository
 * @covers src/repositories/ReportsRepository.test.ts
 */

import { ReportType, ReportStatus, ReportFormat } from '@opsui/shared';

// Mock getPool BEFORE importing ReportsRepository
// This is critical because ReportsRepository calls getPool() at the module level
import { getPool } from '../../db/client';

// Create a mock pool that will be returned by getPool
const mockPool: any = {
  query: jest.fn(),
  connect: jest.fn(),
};

// Mock the getPool function to return our mock pool
jest.mock('../../db/client', () => ({
  getPool: jest.fn(() => mockPool),
}));

// Now import ReportsRepository AFTER the mock is set up
import { ReportsRepository } from '../ReportsRepository';

describe('ReportsRepository', () => {
  let repository: ReportsRepository;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock client for transactions
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Reset mock pool implementations
    mockPool.query.mockClear();
    mockPool.connect.mockClear();

    // Set up connect to return the mock client
    mockPool.connect.mockResolvedValue(mockClient);

    // Ensure getPool returns our mock
    (getPool as jest.Mock).mockReturnValue(mockPool);

    // Create a new instance
    repository = new ReportsRepository();
  });

  // ==========================================================================
  // REPORTS CRUD
  // ==========================================================================

  describe('Reports CRUD', () => {
    describe('findAll', () => {
      it('should return all reports without filters', async () => {
        const mockRows = [
          {
            report_id: 'REPORT-001',
            name: 'Inventory Report',
            description: 'Current inventory status',
            report_type: ReportType.INVENTORY,
            status: ReportStatus.COMPLETED,
            created_by: 'user-1',
            created_at: new Date(),
            updated_by: null,
            updated_at: null,
            fields: '[]',
            filters: '[]',
            groups: '[]',
            chart_config: '{"enabled": false}',
            default_format: ReportFormat.PDF,
            allow_export: true,
            allow_schedule: true,
            is_public: true,
            tags: ['inventory'],
            category: 'Operations',
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findAll();

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('reportId', 'REPORT-001');
        expect(result[0]).toHaveProperty('name', 'Inventory Report');
        expect(mockPool.query).toHaveBeenCalledTimes(1);
      });

      it('should filter reports by type', async () => {
        const mockRows = [
          {
            report_id: 'REPORT-002',
            name: 'Sales Report',
            description: 'Sales data',
            report_type: ReportType.ORDERS,
            status: ReportStatus.COMPLETED,
            created_by: 'user-1',
            created_at: new Date(),
            updated_by: null,
            updated_at: null,
            fields: '[]',
            filters: '[]',
            groups: '[]',
            chart_config: '{"enabled": false}',
            default_format: 'EXCEL',
            allow_export: true,
            allow_schedule: false,
            is_public: false,
            tags: [],
            category: null,
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findAll({ reportType: ReportType.ORDERS });

        expect(result).toHaveLength(1);
        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('report_type = $'), [
          ReportType.ORDERS,
        ]);
      });

      it('should filter reports by status', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findAll({ status: ReportStatus.DRAFT });

        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('status = $'), [
          ReportStatus.DRAFT,
        ]);
      });

      it('should filter reports by isPublic', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findAll({ isPublic: true });

        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('is_public = $'), [
          true,
        ]);
      });

      it('should filter reports by createdBy', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findAll({ createdBy: 'user-1' });

        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('created_by = $1'), [
          'user-1',
        ]);
      });

      it('should include archived reports when includeAll is true', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findAll({ includeAll: true });

        const query = mockPool.query.mock.calls[0][0];
        expect(query).not.toContain("status != 'ARCHIVED'");
      });

      it('should exclude archived reports by default', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findAll();

        const query = mockPool.query.mock.calls[0][0];
        expect(query).toContain("status != 'ARCHIVED'");
      });
    });

    describe('findById', () => {
      it('should find report by ID', async () => {
        const mockRow = {
          report_id: 'REPORT-001',
          name: 'Test Report',
          description: 'Test',
          report_type: ReportType.INVENTORY,
          status: ReportStatus.COMPLETED,
          created_by: 'user-1',
          created_at: new Date(),
          updated_by: null,
          updated_at: null,
          fields: '[]',
          filters: '[]',
          groups: '[]',
          chart_config: '{"enabled": false}',
          default_format: ReportFormat.PDF,
          allow_export: true,
          allow_schedule: true,
          is_public: false,
          tags: [],
          category: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.findById('REPORT-001');

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('reportId', 'REPORT-001');
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE report_id = $1'),
          ['REPORT-001']
        );
      });

      it('should return null when report not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const result = await repository.findById('NONEXISTENT');

        expect(result).toBeNull();
      });
    });

    describe('create', () => {
      it('should create a new report', async () => {
        const mockRow = {
          report_id: 'REPORT-NEW',
          name: 'New Report',
          description: 'New',
          report_type: ReportType.ORDERS,
          status: ReportStatus.DRAFT,
          created_by: 'user-1',
          created_at: new Date(),
          updated_by: null,
          updated_at: null,
          fields: '[]',
          filters: '[]',
          groups: '[]',
          chart_config: '{"enabled": false}',
          default_format: ReportFormat.PDF,
          allow_export: true,
          allow_schedule: false,
          is_public: false,
          tags: [],
          category: null,
        };

        mockPool.connect.mockResolvedValueOnce(mockClient);
        mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
        mockClient.query.mockResolvedValueOnce({ rows: [mockRow] }); // INSERT
        mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

        // Second call to findById after insert
        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.create({
          name: 'New Report',
          description: 'New',
          reportType: ReportType.ORDERS,
          status: ReportStatus.DRAFT,
          fields: [],
          filters: [],
          groups: [],
          chartConfig: { enabled: false } as any,
          defaultFormat: ReportFormat.PDF,
          allowExport: true,
          allowSchedule: false,
          isPublic: false,
          tags: [],
          category: 'Operations',
          createdBy: 'user-1',
        });

        expect(result).toHaveProperty('reportId');
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      });

      it('should rollback on error during creation', async () => {
        mockPool.connect.mockResolvedValueOnce(mockClient);
        mockClient.query.mockRejectedValueOnce(new Error('DB Error'));

        await expect(
          repository.create({
            name: 'Test',
            description: 'Test',
            reportType: ReportType.INVENTORY,
            status: ReportStatus.DRAFT,
            fields: [],
            filters: [],
            groups: [],
            chartConfig: { enabled: false } as any,
            defaultFormat: ReportFormat.PDF,
            allowExport: true,
            allowSchedule: false,
            isPublic: false,
            tags: [],
            category: 'Operations',
            createdBy: 'user-1',
          })
        ).rejects.toThrow('DB Error');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });
    });

    describe('update', () => {
      it('should update report fields', async () => {
        const existingRow = {
          report_id: 'REPORT-001',
          name: 'Old Name',
          description: 'Old',
          report_type: ReportType.INVENTORY,
          status: ReportStatus.DRAFT,
          created_by: 'user-1',
          created_at: new Date(),
          updated_by: null,
          updated_at: null,
          fields: '[]',
          filters: '[]',
          groups: '[]',
          chart_config: '{"enabled": false}',
          default_format: ReportFormat.PDF,
          allow_export: true,
          allow_schedule: false,
          is_public: false,
          tags: [],
          category: null,
        };

        const updatedRow = {
          ...existingRow,
          name: 'Updated Name',
          description: 'Updated',
          status: ReportStatus.COMPLETED,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [existingRow] }); // findById
        mockPool.connect.mockResolvedValueOnce(mockClient);
        mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
        mockClient.query.mockResolvedValueOnce({ rows: [] }); // UPDATE
        mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT
        mockPool.query.mockResolvedValueOnce({ rows: [updatedRow] }); // findById after update

        const result = await repository.update('REPORT-001', {
          name: 'Updated Name',
          description: 'Updated',
          status: ReportStatus.COMPLETED,
        });

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('name', 'Updated Name');
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      });

      it('should return null when updating non-existent report', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] }); // findById returns null

        const result = await repository.update('NONEXISTENT', {
          name: 'Updated',
        });

        expect(result).toBeNull();
      });

      it('should rollback on error during update', async () => {
        const existingRow = {
          report_id: 'REPORT-001',
          name: 'Test',
          description: 'Test',
          report_type: ReportType.INVENTORY,
          status: ReportStatus.DRAFT,
          created_by: 'user-1',
          created_at: new Date(),
          updated_by: null,
          updated_at: null,
          fields: '[]',
          filters: '[]',
          groups: '[]',
          chart_config: '{"enabled": false}',
          default_format: ReportFormat.PDF,
          allow_export: true,
          allow_schedule: false,
          is_public: false,
          tags: [],
          category: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [existingRow] }); // findById
        mockPool.connect.mockResolvedValueOnce(mockClient);
        mockClient.query.mockRejectedValueOnce(new Error('DB Error')); // UPDATE fails

        await expect(
          repository.update('REPORT-001', {
            name: 'Updated',
          })
        ).rejects.toThrow('DB Error');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      });
    });

    describe('delete', () => {
      it('should delete a report', async () => {
        mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

        const result = await repository.delete('REPORT-001');

        expect(result).toBe(true);
        expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM reports WHERE report_id = $1', [
          'REPORT-001',
        ]);
      });

      it('should return false when report not found for deletion', async () => {
        mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

        const result = await repository.delete('NONEXISTENT');

        expect(result).toBe(false);
      });
    });
  });

  // ==========================================================================
  // REPORT EXECUTIONS
  // ==========================================================================

  describe('Report Executions', () => {
    describe('createExecution', () => {
      it('should create a report execution', async () => {
        const mockRow = {
          execution_id: 'EXEC-001',
          report_id: 'REPORT-001',
          executed_at: new Date(),
          executed_by: 'user-1',
          status: ReportStatus.COMPLETED,
          format: ReportFormat.PDF,
          parameters: '{}',
          file_url: 'https://example.com/file.pdf',
          file_size_bytes: 1024,
          row_count: 100,
          execution_time_ms: 5000,
          error_message: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.createExecution({
          reportId: 'REPORT-001',
          executedAt: new Date(),
          executedBy: 'user-1',
          status: ReportStatus.COMPLETED,
          format: ReportFormat.PDF,
          parameters: {},
          fileUrl: 'https://example.com/file.pdf',
          fileSizeBytes: 1024,
          rowCount: 100,
          executionTimeMs: 5000,
        });

        expect(result).toHaveProperty('executionId', 'EXEC-001');
        expect(result).toHaveProperty('reportId', 'REPORT-001');
        expect(mockPool.query).toHaveBeenCalled();
      });

      it('should create execution with error message', async () => {
        const mockRow = {
          execution_id: 'EXEC-002',
          report_id: 'REPORT-001',
          executed_at: new Date(),
          executed_by: 'user-1',
          status: ReportStatus.FAILED,
          format: ReportFormat.PDF,
          parameters: '{}',
          file_url: null,
          file_size_bytes: null,
          row_count: null,
          execution_time_ms: 1000,
          error_message: 'Generation failed',
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.createExecution({
          reportId: 'REPORT-001',
          executedAt: new Date(),
          executedBy: 'user-1',
          status: ReportStatus.FAILED,
          format: ReportFormat.PDF,
          parameters: {},
          executionTimeMs: 1000,
          errorMessage: 'Generation failed',
        });

        expect(result).toHaveProperty('errorMessage', 'Generation failed');
      });
    });

    describe('findExecutionsByReportId', () => {
      it('should find executions for a report', async () => {
        const mockRows = [
          {
            execution_id: 'EXEC-001',
            report_id: 'REPORT-001',
            executed_at: new Date(),
            executed_by: 'user-1',
            status: ReportStatus.COMPLETED,
            format: ReportFormat.PDF,
            parameters: '{}',
            file_url: 'https://example.com/file.pdf',
            file_size_bytes: 1024,
            row_count: 100,
            execution_time_ms: 5000,
            error_message: null,
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findExecutionsByReportId('REPORT-001');

        expect(result).toHaveLength(1);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE report_id = $1'),
          ['REPORT-001', 50]
        );
      });

      it('should respect limit parameter', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findExecutionsByReportId('REPORT-001', 20);

        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $2'), [
          'REPORT-001',
          20,
        ]);
      });
    });
  });

  // ==========================================================================
  // DASHBOARDS
  // ==========================================================================

  describe('Dashboards', () => {
    describe('findDashboards', () => {
      it('should return all dashboards without filters', async () => {
        const mockRows = [
          {
            dashboard_id: 'DASH-001',
            name: 'Operations Dashboard',
            description: 'Overview of operations',
            layout: '{"columns": 3}',
            widgets: '[]',
            owner: 'user-1',
            is_public: false,
            created_by: 'user-1',
            created_at: new Date(),
            updated_by: null,
            updated_at: null,
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findDashboards();

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('dashboardId', 'DASH-001');
      });

      it('should filter dashboards by owner', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findDashboards({ owner: 'user-1' });

        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('owner = $'), [
          'user-1',
        ]);
      });

      it('should filter dashboards by isPublic', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findDashboards({ isPublic: true });

        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('is_public = $'), [
          true,
        ]);
      });
    });

    describe('findDashboardById', () => {
      it('should find dashboard by ID', async () => {
        const mockRow = {
          dashboard_id: 'DASH-001',
          name: 'Test Dashboard',
          description: 'Test',
          layout: '{"columns": 3}',
          widgets: '[]',
          owner: 'user-1',
          is_public: false,
          created_by: 'user-1',
          created_at: new Date(),
          updated_by: null,
          updated_at: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.findDashboardById('DASH-001');

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('dashboardId', 'DASH-001');
      });

      it('should return null when dashboard not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const result = await repository.findDashboardById('NONEXISTENT');

        expect(result).toBeNull();
      });
    });

    describe('createDashboard', () => {
      it('should create a new dashboard', async () => {
        const mockRow = {
          dashboard_id: 'DASH-NEW',
          name: 'New Dashboard',
          description: 'New',
          layout: '{"columns": 3}',
          widgets: '[]',
          owner: 'user-1',
          is_public: false,
          created_by: 'user-1',
          created_at: new Date(),
          updated_by: null,
          updated_at: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] }); // INSERT
        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] }); // findById

        const result = await repository.createDashboard({
          name: 'New Dashboard',
          description: 'New',
          layout: { columns: 3, rows: 3 },
          widgets: [],
          owner: 'user-1',
          isPublic: false,
          createdBy: 'user-1',
        });

        expect(result).toHaveProperty('dashboardId');
        expect(mockPool.query).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ==========================================================================
  // EXPORT JOBS
  // ==========================================================================

  describe('Export Jobs', () => {
    describe('createExportJob', () => {
      it('should create a new export job', async () => {
        const mockRow = {
          job_id: 'EXPORT-001',
          name: 'Product Export',
          entity_type: 'PRODUCT',
          format: ReportFormat.CSV,
          filters: '[]',
          fields: ['id', 'name', 'sku'],
          status: ReportStatus.SCHEDULED,
          created_by: 'user-1',
          created_at: new Date(),
          completed_at: null,
          file_url: null,
          file_size_bytes: null,
          record_count: null,
          error_message: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.createExportJob({
          name: 'Product Export',
          entityType: 'PRODUCT',
          format: ReportFormat.CSV,
          filters: [],
          fields: ['id', 'name', 'sku'],
          status: ReportStatus.SCHEDULED,
          createdBy: 'user-1',
        });

        expect(result).toHaveProperty('jobId');
        expect(result).toHaveProperty('name', 'Product Export');
      });
    });

    describe('updateExportJob', () => {
      it('should update export job status', async () => {
        const mockRow = {
          job_id: 'EXPORT-001',
          name: 'Product Export',
          entity_type: 'PRODUCT',
          format: ReportFormat.CSV,
          filters: '[]',
          fields: ['id', 'name', 'sku'],
          status: ReportStatus.COMPLETED,
          created_by: 'user-1',
          created_at: new Date(),
          completed_at: new Date(),
          file_url: 'https://example.com/export.csv',
          file_size_bytes: 2048,
          record_count: 50,
          error_message: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.updateExportJob('EXPORT-001', {
          status: ReportStatus.COMPLETED,
          fileUrl: 'https://example.com/export.csv',
          fileSizeBytes: 2048,
          recordCount: 50,
          completedAt: new Date(),
        });

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('status', 'COMPLETED');
      });

      it('should update export job with error message', async () => {
        const mockRow = {
          job_id: 'EXPORT-001',
          name: 'Product Export',
          entity_type: 'PRODUCT',
          format: ReportFormat.CSV,
          filters: '[]',
          fields: ['id', 'name', 'sku'],
          status: ReportStatus.FAILED,
          created_by: 'user-1',
          created_at: new Date(),
          completed_at: new Date(),
          file_url: null,
          file_size_bytes: null,
          record_count: null,
          error_message: 'Export failed',
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.updateExportJob('EXPORT-001', {
          status: ReportStatus.FAILED,
          errorMessage: 'Export failed',
          completedAt: new Date(),
        });

        expect(result).toHaveProperty('errorMessage', 'Export failed');
      });

      it('should return null when no updates provided', async () => {
        const result = await repository.updateExportJob('EXPORT-001', {});

        expect(result).toBeNull();
      });

      it('should return null when export job not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const result = await repository.updateExportJob('NONEXISTENT', {
          status: ReportStatus.COMPLETED,
        });

        expect(result).toBeNull();
      });
    });

    describe('getExportJob', () => {
      it('should get export job by ID', async () => {
        const mockRow = {
          job_id: 'EXPORT-001',
          name: 'Product Export',
          entity_type: 'PRODUCT',
          format: ReportFormat.CSV,
          filters: '[]',
          fields: ['id', 'name', 'sku'],
          status: ReportStatus.COMPLETED,
          created_by: 'user-1',
          created_at: new Date(),
          completed_at: new Date(),
          file_url: 'https://example.com/export.csv',
          file_size_bytes: 2048,
          record_count: 50,
          error_message: null,
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.getExportJob('EXPORT-001');

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('jobId', 'EXPORT-001');
      });

      it('should return null when export job not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const result = await repository.getExportJob('NONEXISTENT');

        expect(result).toBeNull();
      });
    });

    describe('findExportJobs', () => {
      it('should find all export jobs without filters', async () => {
        const mockRows = [
          {
            job_id: 'EXPORT-001',
            name: 'Product Export',
            entity_type: 'PRODUCT',
            format: ReportFormat.CSV,
            filters: '[]',
            fields: ['id', 'name'],
            status: ReportStatus.COMPLETED,
            created_by: 'user-1',
            created_at: new Date(),
            completed_at: new Date(),
            file_url: 'https://example.com/file.csv',
            file_size_bytes: 1024,
            record_count: 25,
            error_message: null,
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRows });

        const result = await repository.findExportJobs();

        expect(result).toHaveLength(1);
      });

      it('should filter export jobs by status', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findExportJobs({ status: ReportStatus.SCHEDULED });

        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('status = $1'), [
          ReportStatus.SCHEDULED,
        ]);
      });

      it('should filter export jobs by entityType', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findExportJobs({ entityType: 'PRODUCT' });

        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('entity_type = $1'), [
          'PRODUCT',
        ]);
      });

      it('should filter export jobs by createdBy', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findExportJobs({ createdBy: 'user-1' });

        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('created_by = $1'), [
          'user-1',
        ]);
      });

      it('should apply multiple filters', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await repository.findExportJobs({
          status: ReportStatus.COMPLETED,
          entityType: 'PRODUCT',
          createdBy: 'user-1',
        });

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('AND status = $1 AND entity_type = $2 AND created_by = $3'),
          ['COMPLETED', 'PRODUCT', 'user-1']
        );
      });
    });
  });
});
