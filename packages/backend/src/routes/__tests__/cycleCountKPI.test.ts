/**
 * Integration tests for cycle count KPI routes
 * @covers src/routes/cycleCountKPI.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { cycleCountKPIService } from '../../services/CycleCountKPIService';

// Mock all dependencies
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'admin@example.com',
      role: 'ADMIN',
    };
    next();
  }),
  asyncHandler: (fn: any) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next),
}));

jest.mock('../../services/CycleCountKPIService', () => ({
  cycleCountKPIService: {
    getOverallKPIs: jest.fn().mockResolvedValue({
      totalCounts: 150,
      completedCounts: 120,
      pendingCounts: 30,
      accuracyRate: 98.5,
      averageCountTime: 15.5,
      varianceRate: 1.2,
      discrepancyCount: 5,
    }),
    getAccuracyTrend: jest.fn().mockResolvedValue([
      { date: '2024-01-01', accuracy: 98.5 },
      { date: '2024-01-02', accuracy: 97.8 },
      { date: '2024-01-03', accuracy: 99.1 },
    ]),
    getTopDiscrepancySKUs: jest.fn().mockResolvedValue([
      { sku: 'SKU-001', discrepancyCount: 5, varianceAmount: 150 },
      { sku: 'SKU-002', discrepancyCount: 3, varianceAmount: 75 },
    ]),
    getCountByUser: jest.fn().mockResolvedValue([
      { userId: 'user-1', userName: 'John Doe', countCompleted: 25, accuracy: 98.5 },
      { userId: 'user-2', userName: 'Jane Smith', countCompleted: 30, accuracy: 99.1 },
    ]),
    getZonePerformance: jest.fn().mockResolvedValue([
      { zone: 'A', countCompleted: 45, accuracy: 98.2, averageTime: 12.5 },
      { zone: 'B', countCompleted: 38, accuracy: 97.8, averageTime: 15.3 },
    ]),
    getCountTypeEffectiveness: jest.fn().mockResolvedValue([
      { countType: 'WAVE', total: 50, accuracy: 98.5, averageTime: 10.2 },
      { countType: 'CYCLE', total: 40, accuracy: 97.8, averageTime: 18.5 },
    ]),
    getDailyStats: jest.fn().mockResolvedValue([
      { date: '2024-01-01', total: 25, completed: 20, accuracy: 98.5 },
      { date: '2024-01-02', total: 30, completed: 28, accuracy: 97.8 },
    ]),
    getRealTimeDashboard: jest.fn().mockResolvedValue({
      overallKPIs: {
        totalCounts: 150,
        completedCounts: 120,
        accuracyRate: 98.5,
      },
      accuracyTrend: [
        { date: '2024-01-01', accuracy: 98.5 },
        { date: '2024-01-02', accuracy: 97.8 },
      ],
      topDiscrepancies: [{ sku: 'SKU-001', discrepancyCount: 5, varianceAmount: 150 }],
      userPerformance: [
        { userId: 'user-1', userName: 'John Doe', countCompleted: 25, accuracy: 98.5 },
      ],
      zonePerformance: [{ zone: 'A', countCompleted: 45, accuracy: 98.2, averageTime: 12.5 }],
    }),
  },
}));

describe('Cycle Count KPI Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/kpi/overall
  // ==========================================================================

  describe('GET /api/v1/cycle-count/kpi/overall', () => {
    it('should get overall KPIs', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/kpi/overall')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('totalCounts', 150);
      expect(response.body).toHaveProperty('accuracyRate', 98.5);
    });

    it('should pass filters to service', async () => {
      await request(app)
        .get(
          '/api/v1/cycle-count/kpi/overall?startDate=2024-01-01&endDate=2024-01-31&location=A&countType=WAVE'
        )
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(cycleCountKPIService.getOverallKPIs).toHaveBeenCalledWith({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        location: 'A',
        countType: 'WAVE',
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/kpi/accuracy-trend
  // ==========================================================================

  describe('GET /api/v1/cycle-count/kpi/accuracy-trend', () => {
    it('should get accuracy trend', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/kpi/accuracy-trend')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('date');
      expect(response.body[0]).toHaveProperty('accuracy');
    });

    it('should use custom days parameter', async () => {
      await request(app)
        .get('/api/v1/cycle-count/kpi/accuracy-trend?days=60')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(cycleCountKPIService.getAccuracyTrend).toHaveBeenCalledWith(60);
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/kpi/top-discrepancies
  // ==========================================================================

  describe('GET /api/v1/cycle-count/kpi/top-discrepancies', () => {
    it('should get top discrepancy SKUs', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/kpi/top-discrepancies')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('sku');
      expect(response.body[0]).toHaveProperty('discrepancyCount');
    });

    it('should use custom limit and days parameters', async () => {
      await request(app)
        .get('/api/v1/cycle-count/kpi/top-discrepancies?limit=20&days=60')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(cycleCountKPIService.getTopDiscrepancySKUs).toHaveBeenCalledWith(20, 60);
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/kpi/user-performance
  // ==========================================================================

  describe('GET /api/v1/cycle-count/kpi/user-performance', () => {
    it('should get user performance', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/kpi/user-performance')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('userId');
      expect(response.body[0]).toHaveProperty('userName');
      expect(response.body[0]).toHaveProperty('accuracy');
    });

    it('should use custom days parameter', async () => {
      await request(app)
        .get('/api/v1/cycle-count/kpi/user-performance?days=60')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(cycleCountKPIService.getCountByUser).toHaveBeenCalledWith(60);
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/kpi/zone-performance
  // ==========================================================================

  describe('GET /api/v1/cycle-count/kpi/zone-performance', () => {
    it('should get zone performance', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/kpi/zone-performance')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('zone');
      expect(response.body[0]).toHaveProperty('accuracy');
    });

    it('should use custom days parameter', async () => {
      await request(app)
        .get('/api/v1/cycle-count/kpi/zone-performance?days=60')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(cycleCountKPIService.getZonePerformance).toHaveBeenCalledWith(60);
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/kpi/count-type-effectiveness
  // ==========================================================================

  describe('GET /api/v1/cycle-count/kpi/count-type-effectiveness', () => {
    it('should get count type effectiveness', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/kpi/count-type-effectiveness')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('countType');
      expect(response.body[0]).toHaveProperty('accuracy');
    });

    it('should use custom days parameter', async () => {
      await request(app)
        .get('/api/v1/cycle-count/kpi/count-type-effectiveness?days=120')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(cycleCountKPIService.getCountTypeEffectiveness).toHaveBeenCalledWith(120);
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/kpi/daily-stats
  // ==========================================================================

  describe('GET /api/v1/cycle-count/kpi/daily-stats', () => {
    it('should get daily statistics', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/kpi/daily-stats')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('date');
      expect(response.body[0]).toHaveProperty('total');
    });

    it('should use custom days parameter', async () => {
      await request(app)
        .get('/api/v1/cycle-count/kpi/daily-stats?days=60')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(cycleCountKPIService.getDailyStats).toHaveBeenCalledWith(60);
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/kpi/dashboard
  // ==========================================================================

  describe('GET /api/v1/cycle-count/kpi/dashboard', () => {
    it('should get real-time dashboard data', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/kpi/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('overallKPIs');
      expect(response.body).toHaveProperty('accuracyTrend');
      expect(response.body).toHaveProperty('topDiscrepancies');
      expect(response.body).toHaveProperty('userPerformance');
      expect(response.body).toHaveProperty('zonePerformance');
    });

    it('should pass filters to service', async () => {
      await request(app)
        .get('/api/v1/cycle-count/kpi/dashboard?startDate=2024-01-01&location=A')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(cycleCountKPIService.getRealTimeDashboard).toHaveBeenCalledWith({
        startDate: expect.any(Date),
        endDate: undefined,
        location: 'A',
        countType: undefined,
      });
    });
  });
});
