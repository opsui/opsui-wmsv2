/**
 * Integration tests for root cause analysis routes
 * @covers src/routes/rootCauseAnalysis.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { rootCauseAnalysisService } from '../../services/RootCauseAnalysisService';
import { UserRole } from '@opsui/shared';

// Mock all dependencies
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    };
    next();
  }),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
  asyncHandler: (fn: any) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next),
}));

jest.mock('../../services/RootCauseAnalysisService', () => ({
  rootCauseAnalysisService: {
    getAllCategories: jest.fn().mockResolvedValue([
      {
        categoryId: 'category-001',
        name: 'Data Entry Error',
        description: 'Manual data entry mistakes',
        isActive: true,
      },
      {
        categoryId: 'category-002',
        name: 'Theft',
        description: 'Intentional removal of inventory',
        isActive: true,
      },
    ]),
    getCategory: jest.fn().mockResolvedValue({
      categoryId: 'category-001',
      name: 'Data Entry Error',
      description: 'Manual data entry mistakes',
      isActive: true,
    }),
    recordRootCause: jest.fn().mockResolvedValue({
      rootCauseId: 'rc-001',
      entryId: 'entry-001',
      categoryId: 'category-001',
      additionalNotes: 'Correction made',
      createdBy: 'user-123',
      createdAt: '2024-01-01T10:00:00Z',
    }),
    getRootCauseForEntry: jest.fn().mockResolvedValue({
      rootCauseId: 'rc-001',
      entryId: 'entry-001',
      categoryId: 'category-001',
      categoryName: 'Data Entry Error',
    }),
    getRootCausePareto: jest.fn().mockResolvedValue({
      categories: [
        {
          categoryId: 'category-001',
          categoryName: 'Data Entry Error',
          count: 45,
          percentage: 45,
          cumulativePercentage: 45,
        },
      ],
      total: 100,
    }),
    getCategoryBreakdown: jest.fn().mockResolvedValue({
      categories: [
        {
          categoryId: 'category-001',
          categoryName: 'Data Entry Error',
          count: 45,
          trend: 'INCREASING',
          changePercent: 15,
        },
      ],
      period: '30 days',
    }),
    getTrendingRootCauses: jest.fn().mockResolvedValue([
      {
        categoryId: 'category-001',
        categoryName: 'Data Entry Error',
        currentPeriod: 45,
        previousPeriod: 30,
        changePercent: 50,
        trend: 'INCREASING',
      },
    ]),
    getRootCauseBySKU: jest.fn().mockResolvedValue({
      sku: 'SKU-001',
      productName: 'Product A',
      rootCauses: [
        {
          categoryId: 'category-001',
          categoryName: 'Data Entry Error',
          count: 10,
        },
      ],
      totalCount: 10,
    }),
    getRootCauseByZone: jest.fn().mockResolvedValue({
      zone: 'A',
      rootCauses: [
        {
          categoryId: 'category-001',
          categoryName: 'Data Entry Error',
          count: 25,
        },
      ],
      totalCount: 25,
    }),
  },
}));

jest.mock('../../middleware/permissions', () => ({
  requirePermission: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe('Root Cause Analysis Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/root-causes/categories
  // ==========================================================================

  describe('GET /api/v1/cycle-count/root-causes/categories', () => {
    it('should get all root cause categories', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/root-causes/categories')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('categoryId');
      expect(response.body[0]).toHaveProperty('name', 'Data Entry Error');
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/root-causes/categories/:categoryId
  // ==========================================================================

  describe('GET /api/v1/cycle-count/root-causes/categories/:categoryId', () => {
    it('should get a specific root cause category', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/root-causes/categories/category-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('categoryId', 'category-001');
      expect(response.body).toHaveProperty('name', 'Data Entry Error');
    });
  });

  // ==========================================================================
  // POST /api/v1/cycle-count/root-causes
  // ==========================================================================

  describe('POST /api/v1/cycle-count/root-causes', () => {
    it('should record root cause for a variance entry', async () => {
      const rootCauseData = {
        entryId: 'entry-001',
        categoryId: 'category-001',
        additionalNotes: 'Correction made',
      };

      const response = await request(app)
        .post('/api/v1/cycle-count/root-causes')
        .set('Authorization', 'Bearer valid-token')
        .send(rootCauseData)
        .expect(201);

      expect(response.body).toHaveProperty('rootCauseId');
      expect(response.body).toHaveProperty('entryId', 'entry-001');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        entryId: 'entry-001',
        // missing categoryId
      };

      const response = await request(app)
        .post('/api/v1/cycle-count/root-causes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
      expect(response.body).toHaveProperty('code', 'MISSING_FIELDS');
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/root-causes/entry/:entryId
  // ==========================================================================

  describe('GET /api/v1/cycle-count/root-causes/entry/:entryId', () => {
    it('should get root cause for a specific entry', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/root-causes/entry/entry-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('rootCauseId');
      expect(response.body).toHaveProperty('entryId', 'entry-001');
      expect(response.body).toHaveProperty('categoryName');
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/root-causes/pareto
  // ==========================================================================

  describe('GET /api/v1/cycle-count/root-causes/pareto', () => {
    it('should get Pareto analysis with default days', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/root-causes/pareto')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(rootCauseAnalysisService.getRootCausePareto).toHaveBeenCalledWith(30);
      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('total');
    });

    it('should get Pareto analysis with custom days', async () => {
      await request(app)
        .get('/api/v1/cycle-count/root-causes/pareto?days=60')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(rootCauseAnalysisService.getRootCausePareto).toHaveBeenCalledWith(60);
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/root-causes/breakdown
  // ==========================================================================

  describe('GET /api/v1/cycle-count/root-causes/breakdown', () => {
    it('should get category breakdown with default days', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/root-causes/breakdown')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(rootCauseAnalysisService.getCategoryBreakdown).toHaveBeenCalledWith(30);
      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('period');
    });

    it('should get category breakdown with custom days', async () => {
      await request(app)
        .get('/api/v1/cycle-count/root-causes/breakdown?days=90')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(rootCauseAnalysisService.getCategoryBreakdown).toHaveBeenCalledWith(90);
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/root-causes/trending
  // ==========================================================================

  describe('GET /api/v1/cycle-count/root-causes/trending', () => {
    it('should get trending root causes with default days', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/root-causes/trending')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(rootCauseAnalysisService.getTrendingRootCauses).toHaveBeenCalledWith(30);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get trending root causes with custom days', async () => {
      await request(app)
        .get('/api/v1/cycle-count/root-causes/trending?days=45')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(rootCauseAnalysisService.getTrendingRootCauses).toHaveBeenCalledWith(45);
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/root-causes/sku/:sku
  // ==========================================================================

  describe('GET /api/v1/cycle-count/root-causes/sku/:sku', () => {
    it('should get root cause analysis for SKU', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/root-causes/sku/SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(rootCauseAnalysisService.getRootCauseBySKU).toHaveBeenCalledWith('SKU-001', 30);
      expect(response.body).toHaveProperty('sku', 'SKU-001');
      expect(response.body).toHaveProperty('rootCauses');
    });

    it('should pass custom days parameter', async () => {
      await request(app)
        .get('/api/v1/cycle-count/root-causes/sku/SKU-001?days=60')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(rootCauseAnalysisService.getRootCauseBySKU).toHaveBeenCalledWith('SKU-001', 60);
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/root-causes/zone/:zone
  // ==========================================================================

  describe('GET /api/v1/cycle-count/root-causes/zone/:zone', () => {
    it('should get root cause analysis for zone', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/root-causes/zone/A')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(rootCauseAnalysisService.getRootCauseByZone).toHaveBeenCalledWith('A', 30);
      expect(response.body).toHaveProperty('zone', 'A');
      expect(response.body).toHaveProperty('rootCauses');
    });

    it('should pass custom days parameter', async () => {
      await request(app)
        .get('/api/v1/cycle-count/root-causes/zone/B?days=60')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(rootCauseAnalysisService.getRootCauseByZone).toHaveBeenCalledWith('B', 60);
    });
  });
});
