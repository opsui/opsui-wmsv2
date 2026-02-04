/**
 * Integration tests for reports routes
 * @covers src/routes/reports.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { reportsService } from '../../services/ReportsService';
import { authenticate, authorize } from '../../middleware';
import { UserRole, ReportType, ReportStatus, ReportFormat } from '@opsui/shared';

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req, res, next) => {
    req.user = {
      userId: 'user-123',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      baseRole: UserRole.ADMIN,
      activeRole: null,
      effectiveRole: UserRole.ADMIN,
    };
    next();
  }),
  authorize: jest.fn((...allowedRoles) => (req, res, next) => {
    const user = req.user || { role: UserRole.ADMIN };
    if (allowedRoles.includes(user.role)) {
      next();
    } else {
      res.status(403).json({ success: false, error: 'Forbidden' });
    }
  }),
}));

// Mock the ReportsService
jest.mock('../../services/ReportsService', () => {
  const mockModule = jest.requireActual('../../services/ReportsService');
  return {
    ...mockModule,
    reportsService: {
      executeReport: jest.fn(),
      createExportJob: jest.fn(),
    },
    reportsRepository: {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findExecutionsByReportId: jest.fn(),
      findDashboards: jest.fn(),
      findDashboardById: jest.fn(),
      createDashboard: jest.fn(),
      getExportJob: jest.fn(),
    },
  };
});

// Also mock the repository module directly since the route imports from there
jest.mock('../../repositories/ReportsRepository', () => ({
  reportsRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findExecutionsByReportId: jest.fn(),
    findDashboards: jest.fn(),
    findDashboardById: jest.fn(),
    createDashboard: jest.fn(),
    getExportJob: jest.fn(),
  },
}));

jest.mock('../../config/logger');
jest.mock('../../db/client');

const mockedAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;
const mockedAuthorize = authorize as jest.MockedFunction<typeof authorize>;

// Get the mocked repository from both modules
const { reportsRepository } = require('../../repositories/ReportsRepository');
const { reportsService: mockReportsService } = require('../../services/ReportsService');

// Type cast for mocks
const mockedExecuteReport = mockReportsService.executeReport as jest.MockedFunction<any>;
const mockedCreateExportJob = mockReportsService.createExportJob as jest.MockedFunction<any>;

describe('Reports Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/v1/reports
  // ==========================================================================

  describe('GET /api/v1/reports', () => {
    it('should get all reports', async () => {
      const mockReports = [
        {
          reportId: 'report-001',
          name: 'Daily Sales',
          reportType: 'ORDERS' as any,
          status: 'COMPLETED' as any,
        },
        {
          reportId: 'report-002',
          name: 'Inventory Summary',
          reportType: 'INVENTORY' as any,
          status: 'COMPLETED' as any,
        },
      ];

      reportsRepository.findAll.mockResolvedValue(mockReports);

      const response = await request(app)
        .get('/api/v1/reports')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          reports: mockReports,
          count: 2,
        },
      });
      expect(reportsRepository.findAll).toHaveBeenCalled();
    });

    it('should filter by reportType', async () => {
      const mockReports = [
        {
          reportId: 'report-001',
          name: 'Daily Sales',
          reportType: 'ORDERS' as any,
        },
      ];

      reportsRepository.findAll.mockResolvedValue(mockReports);

      await request(app)
        .get('/api/v1/reports?reportType=ORDERS')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(reportsRepository.findAll).toHaveBeenCalledWith({
        reportType: 'ORDERS',
        status: undefined,
        isPublic: undefined,
        createdBy: 'user-123',
      });
    });

    it('should filter by status', async () => {
      const mockReports = [
        {
          reportId: 'report-001',
          status: 'COMPLETED' as any,
        },
      ];

      reportsRepository.findAll.mockResolvedValue(mockReports);

      await request(app)
        .get('/api/v1/reports?status=COMPLETED')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(reportsRepository.findAll).toHaveBeenCalledWith({
        reportType: undefined,
        status: 'COMPLETED',
        isPublic: undefined,
        createdBy: 'user-123',
      });
    });

    it('should filter by isPublic', async () => {
      const mockReports = [
        {
          reportId: 'report-001',
          isPublic: true,
        },
      ];

      reportsRepository.findAll.mockResolvedValue(mockReports);

      await request(app)
        .get('/api/v1/reports?isPublic=true')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(reportsRepository.findAll).toHaveBeenCalledWith({
        reportType: undefined,
        status: undefined,
        isPublic: true,
        createdBy: 'user-123',
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/reports/:reportId
  // ==========================================================================

  describe('GET /api/v1/reports/:reportId', () => {
    it('should get a specific report', async () => {
      const mockReport = {
        reportId: 'report-001',
        name: 'Daily Sales',
        reportType: 'ORDERS' as any,
        status: 'COMPLETED' as any,
      };

      reportsRepository.findById.mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/v1/reports/report-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { report: mockReport },
      });
      expect(reportsRepository.findById).toHaveBeenCalledWith('report-001');
    });

    it('should return 404 when report not found', async () => {
      reportsRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/reports/report-999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Report not found',
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/reports
  // ==========================================================================

  describe('POST /api/v1/reports', () => {
    it('should create a new report', async () => {
      const newReport = {
        name: 'New Report',
        reportType: 'ORDERS' as any,
        description: 'Test report',
      };

      const createdReport = {
        reportId: 'report-003',
        ...newReport,
        createdBy: 'user-123',
        createdAt: new Date(),
      };

      reportsRepository.create.mockResolvedValue(createdReport);

      const response = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', 'Bearer valid-token')
        .send(newReport)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: { report: { ...createdReport, createdAt: expect.any(String) } },
      });
      expect(reportsRepository.create).toHaveBeenCalledWith({
        ...newReport,
        createdBy: 'user-123',
        createdAt: expect.any(Date),
      });
    });
  });

  // ==========================================================================
  // PUT /api/v1/reports/:reportId
  // ==========================================================================

  describe('PUT /api/v1/reports/:reportId', () => {
    it('should update a report', async () => {
      const updates = {
        name: 'Updated Report Name',
        description: 'Updated description',
      };

      const updatedReport = {
        reportId: 'report-001',
        ...updates,
        updatedBy: 'user-123',
      };

      reportsRepository.update.mockResolvedValue(updatedReport);

      const response = await request(app)
        .put('/api/v1/reports/report-001')
        .set('Authorization', 'Bearer valid-token')
        .send(updates)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { report: updatedReport },
      });
      expect(reportsRepository.update).toHaveBeenCalledWith('report-001', {
        ...updates,
        updatedBy: 'user-123',
      });
    });

    it('should return 404 when report not found', async () => {
      reportsRepository.update.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/v1/reports/report-999')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Report not found',
      });
    });
  });

  // ==========================================================================
  // DELETE /api/v1/reports/:reportId
  // ==========================================================================

  describe('DELETE /api/v1/reports/:reportId', () => {
    it('should delete a report', async () => {
      reportsRepository.delete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/v1/reports/report-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Report deleted successfully',
      });
      expect(reportsRepository.delete).toHaveBeenCalledWith('report-001');
    });

    it('should return 404 when report not found', async () => {
      reportsRepository.delete.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/v1/reports/report-999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Report not found',
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/reports/:reportId/execute
  // ==========================================================================

  describe('POST /api/v1/reports/:reportId/execute', () => {
    it('should execute a report with default format', async () => {
      const mockResult = {
        execution: {
          executionId: 'exec-001',
          reportId: 'report-001',
          status: 'COMPLETED' as any,
        },
        data: [
          { orderId: 'ORD-20240101-001', amount: 100 },
          { orderId: 'ORD-20240101-002', amount: 200 },
        ],
      };

      mockedExecuteReport.mockResolvedValue(mockResult as any);

      const response = await request(app)
        .post('/api/v1/reports/report-001/execute')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          execution: mockResult.execution,
          results: mockResult.data,
        },
      });
      expect(mockedExecuteReport).toHaveBeenCalledWith('report-001', 'JSON' as any, {}, 'user-123');
    });

    it('should execute a report with custom format and parameters', async () => {
      const mockResult = {
        execution: {
          executionId: 'exec-002',
          status: 'COMPLETED' as any,
        },
        data: 'CSV,data,here',
      };

      mockedExecuteReport.mockResolvedValue(mockResult as any);

      await request(app)
        .post('/api/v1/reports/report-001/execute')
        .set('Authorization', 'Bearer valid-token')
        .send({
          format: 'CSV' as any,
          parameters: { startDate: '2024-01-01', endDate: '2024-01-31' },
        })
        .expect(200);

      expect(mockedExecuteReport).toHaveBeenCalledWith(
        'report-001',
        ReportFormat.CSV,
        { startDate: '2024-01-01', endDate: '2024-01-31' },
        'user-123'
      );
    });

    it('should handle execution errors', async () => {
      mockedExecuteReport.mockRejectedValue(new Error('Report execution failed'));

      const response = await request(app)
        .post('/api/v1/reports/report-001/execute')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Report execution failed',
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/reports/:reportId/executions
  // ==========================================================================

  describe('GET /api/v1/reports/:reportId/executions', () => {
    it('should get execution history with default limit', async () => {
      const mockExecutions = [
        {
          executionId: 'exec-001',
          reportId: 'report-001',
          status: 'COMPLETED' as any,
        },
        {
          executionId: 'exec-002',
          reportId: 'report-001',
          status: 'COMPLETED' as any,
        },
      ];

      reportsRepository.findExecutionsByReportId.mockResolvedValue(mockExecutions);

      const response = await request(app)
        .get('/api/v1/reports/report-001/executions')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          executions: mockExecutions,
          count: 2,
        },
      });
      expect(reportsRepository.findExecutionsByReportId).toHaveBeenCalledWith('report-001', 50);
    });

    it('should accept custom limit', async () => {
      const mockExecutions = [{ executionId: 'exec-001', status: ReportStatus.COMPLETED }];

      reportsRepository.findExecutionsByReportId.mockResolvedValue(mockExecutions);

      await request(app)
        .get('/api/v1/reports/report-001/executions?limit=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(reportsRepository.findExecutionsByReportId).toHaveBeenCalledWith('report-001', 20);
    });
  });

  // ==========================================================================
  // GET /api/v1/reports/dashboards
  // ==========================================================================

  describe('GET /api/v1/reports/dashboards', () => {
    it('should get all dashboards for admin', async () => {
      const mockDashboards = [
        {
          dashboardId: 'dash-001',
          name: 'Sales Dashboard',
          isPublic: true,
        },
        {
          dashboardId: 'dash-002',
          name: 'Inventory Dashboard',
          isPublic: false,
        },
      ];

      reportsRepository.findDashboards.mockResolvedValue(mockDashboards);

      const response = await request(app)
        .get('/api/v1/reports/dashboards')
        .set('Authorization', 'Bearer valid-token');

      // Debug: check what we're getting
      console.log('=== DEBUG INFO ===');
      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));
      console.log('findDashboards mock calls:', reportsRepository.findDashboards.mock.calls.length);
      console.log('==================');

      // The route should return 200 with dashboards
      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          dashboards: mockDashboards,
          count: 2,
        },
      });
      expect(reportsRepository.findDashboards).toHaveBeenCalledWith({
        owner: undefined,
        isPublic: undefined,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/reports/dashboards/:dashboardId
  // ==========================================================================

  describe('GET /api/v1/reports/dashboards/:dashboardId', () => {
    it('should get a specific dashboard', async () => {
      const mockDashboard = {
        dashboardId: 'dash-001',
        name: 'Sales Dashboard',
        widgets: [],
      };

      reportsRepository.findDashboardById.mockResolvedValue(mockDashboard);

      const response = await request(app)
        .get('/api/v1/reports/dashboards/dash-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { dashboard: mockDashboard },
      });
      expect(reportsRepository.findDashboardById).toHaveBeenCalledWith('dash-001');
    });

    it('should return 404 when dashboard not found', async () => {
      reportsRepository.findDashboardById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/reports/dashboards/dash-999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Dashboard not found',
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/reports/dashboards
  // ==========================================================================

  describe('POST /api/v1/reports/dashboards', () => {
    it('should create a new dashboard', async () => {
      const newDashboard = {
        name: 'New Dashboard',
        isPublic: false,
        widgets: [],
      };

      const createdDashboard = {
        dashboardId: 'dash-003',
        ...newDashboard,
        owner: 'user-123',
        createdBy: 'user-123',
        createdAt: new Date(),
      };

      reportsRepository.createDashboard.mockResolvedValue(createdDashboard);

      const response = await request(app)
        .post('/api/v1/reports/dashboards')
        .set('Authorization', 'Bearer valid-token')
        .send(newDashboard)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: { dashboard: { ...createdDashboard, createdAt: expect.any(String) } },
      });
      expect(reportsRepository.createDashboard).toHaveBeenCalledWith({
        ...newDashboard,
        owner: 'user-123',
        createdBy: 'user-123',
        createdAt: expect.any(Date),
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/reports/export
  // ==========================================================================

  describe('POST /api/v1/reports/export', () => {
    it('should create an export job with default format', async () => {
      const jobData = {
        entityType: 'orders',
        fields: ['orderId', 'customerName', 'status', 'total'],
      };

      const mockJob = {
        jobId: 'job-001',
        ...jobData,
        format: 'CSV' as any,
        status: 'PENDING',
      };

      mockedCreateExportJob.mockResolvedValue(mockJob as any);

      const response = await request(app)
        .post('/api/v1/reports/export')
        .set('Authorization', 'Bearer valid-token')
        .send(jobData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: { job: mockJob },
      });
      expect(mockedCreateExportJob).toHaveBeenCalledWith(
        'orders',
        ReportFormat.CSV,
        ['orderId', 'customerName', 'status', 'total'],
        [],
        'user-123'
      );
    });

    it('should create an export job with custom format and filters', async () => {
      const jobData = {
        entityType: 'orders',
        format: 'PDF' as any,
        fields: ['orderId', 'customerName'],
        filters: [
          { field: 'status', operator: 'eq', value: 'COMPLETED' },
          { field: 'createdAt', operator: 'gte', value: '2024-01-01' },
        ],
      };

      const mockJob = {
        jobId: 'job-002',
        entityType: 'orders',
        format: 'PDF' as any,
        status: 'PENDING',
      };

      mockedCreateExportJob.mockResolvedValue(mockJob as any);

      await request(app)
        .post('/api/v1/reports/export')
        .set('Authorization', 'Bearer valid-token')
        .send(jobData)
        .expect(201);

      expect(mockedCreateExportJob).toHaveBeenCalledWith(
        'orders',
        ReportFormat.PDF,
        ['orderId', 'customerName'],
        [
          { field: 'status', operator: 'eq', value: 'COMPLETED' },
          { field: 'createdAt', operator: 'gte', value: '2024-01-01' },
        ],
        'user-123'
      );
    });

    it('should return 400 when entityType is missing', async () => {
      const response = await request(app)
        .post('/api/v1/reports/export')
        .set('Authorization', 'Bearer valid-token')
        .send({
          fields: ['orderId'],
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Missing required fields: entityType, fields (array)',
      });
    });

    it('should return 400 when fields is missing', async () => {
      const response = await request(app)
        .post('/api/v1/reports/export')
        .set('Authorization', 'Bearer valid-token')
        .send({
          entityType: 'orders',
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Missing required fields: entityType, fields (array)',
      });
    });

    it('should return 400 when fields is not an array', async () => {
      const response = await request(app)
        .post('/api/v1/reports/export')
        .set('Authorization', 'Bearer valid-token')
        .send({
          entityType: 'orders',
          fields: 'not-an-array',
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Missing required fields: entityType, fields (array)',
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/reports/export/:jobId
  // ==========================================================================

  describe('GET /api/v1/reports/export/:jobId', () => {
    it('should get export job status', async () => {
      const mockJob = {
        jobId: 'job-001',
        entityType: 'orders',
        format: 'CSV' as any,
        status: 'COMPLETED',
        fileUrl: '/exports/orders-001.csv',
      };

      reportsRepository.getExportJob.mockResolvedValue(mockJob);

      const response = await request(app)
        .get('/api/v1/reports/export/job-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { job: mockJob },
      });
      expect(reportsRepository.getExportJob).toHaveBeenCalledWith('job-001');
    });

    it('should return 404 when export job not found', async () => {
      reportsRepository.getExportJob.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/reports/export/job-999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Export job not found',
      });
    });
  });
});
