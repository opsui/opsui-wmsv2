/**
 * Unit tests for CycleCountKPIService
 * @covers src/services/CycleCountKPIService.ts
 */

import { CycleCountKPIService, cycleCountKPIService } from '../CycleCountKPIService';
import {
  CycleCountKPI,
  AccuracyTrend,
  TopDiscrepancySKU,
  CountByUser,
  ZonePerformance,
  CountTypeEffectiveness,
  DailyStats,
} from '../CycleCountKPIService';

// Mock database client
jest.mock('../../db/client', () => ({
  getPool: jest.fn(),
}));

import { getPool } from '../../db/client';

describe('CycleCountKPIService', () => {
  let service: CycleCountKPIService;
  let mockPool: any;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock pool and query function
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);
    service = new CycleCountKPIService();
  });

  // ==========================================================================
  // GET OVERALL KPIS
  // ==========================================================================

  describe('getOverallKPIs', () => {
    it('should return overall KPIs with default filters', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              total_counts: '100',
              completed_counts: '80',
              in_progress_counts: '10',
              scheduled_counts: '10',
              total_items_counted: '500',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total_variances: '25',
              pending_variances: '5',
              high_value_variance_count: '3',
              average_accuracy: '95.5',
            },
          ],
        });

      const result = await service.getOverallKPIs();

      expect(result.totalCounts).toBe(100);
      expect(result.completedCounts).toBe(80);
      expect(result.completionRate).toBe(80);
      expect(result.averageAccuracy).toBe(95.5);
      expect(result.totalItemsCounted).toBe(500);
      expect(result.totalVariances).toBe(25);
      expect(result.pendingVariances).toBe(5);
      expect(result.highValueVarianceCount).toBe(3);
    });

    it('should apply startDate filter', async () => {
      const startDate = new Date('2024-01-01');

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              total_counts: '50',
              completed_counts: '40',
              in_progress_counts: '5',
              scheduled_counts: '5',
              total_items_counted: '200',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total_variances: '10',
              pending_variances: '2',
              high_value_variance_count: '1',
              average_accuracy: '92',
            },
          ],
        });

      await service.getOverallKPIs({ startDate });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[0][1]).toContain(startDate);
    });

    it('should apply endDate filter', async () => {
      const endDate = new Date('2024-12-31');

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              total_counts: '50',
              completed_counts: '40',
              in_progress_counts: '5',
              scheduled_counts: '5',
              total_items_counted: '200',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total_variances: '10',
              pending_variances: '2',
              high_value_variance_count: '1',
              average_accuracy: '92',
            },
          ],
        });

      await service.getOverallKPIs({ endDate });

      const callParams = mockQuery.mock.calls[0][1];
      expect(callParams).toContain(endDate);
    });

    it('should apply location filter', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              total_counts: '30',
              completed_counts: '25',
              in_progress_counts: '3',
              scheduled_counts: '2',
              total_items_counted: '100',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total_variances: '5',
              pending_variances: '1',
              high_value_variance_count: '0',
              average_accuracy: '98',
            },
          ],
        });

      await service.getOverallKPIs({ location: 'A-01-01' });

      const callParams = mockQuery.mock.calls[0][1];
      expect(callParams).toContain('A-01-01');
    });

    it('should apply countType filter', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              total_counts: '20',
              completed_counts: '18',
              in_progress_counts: '1',
              scheduled_counts: '1',
              total_items_counted: '80',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total_variances: '3',
              pending_variances: '0',
              high_value_variance_count: '0',
              average_accuracy: '99',
            },
          ],
        });

      await service.getOverallKPIs({ countType: 'ABC' });

      const callParams = mockQuery.mock.calls[0][1];
      expect(callParams).toContain('ABC');
    });

    it('should handle zero counts correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              total_counts: '0',
              completed_counts: '0',
              in_progress_counts: '0',
              scheduled_counts: '0',
              total_items_counted: '0',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total_variances: '0',
              pending_variances: '0',
              high_value_variance_count: '0',
              average_accuracy: null,
            },
          ],
        });

      const result = await service.getOverallKPIs();

      expect(result.completionRate).toBe(0);
      expect(result.averageAccuracy).toBe(0);
    });

    it('should round completion rate to 2 decimal places', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              total_counts: '3',
              completed_counts: '2',
              in_progress_counts: '1',
              scheduled_counts: '0',
              total_items_counted: '50',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total_variances: '1',
              pending_variances: '0',
              high_value_variance_count: '0',
              average_accuracy: '95.666',
            },
          ],
        });

      const result = await service.getOverallKPIs();

      expect(result.completionRate).toBe(66.67);
      expect(result.averageAccuracy).toBe(95.67);
    });
  });

  // ==========================================================================
  // GET ACCURACY TREND
  // ==========================================================================

  describe('getAccuracyTrend', () => {
    it('should return accuracy trend for default 30 days', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { period: '2024-01-01', accuracy: '95.5', total_counts: '10' },
          { period: '2024-01-02', accuracy: '96.2', total_counts: '12' },
          { period: '2024-01-03', accuracy: '97.8', total_counts: '8' },
        ],
      });

      const result = await service.getAccuracyTrend();

      expect(result).toHaveLength(3);
      expect(result[0].period).toBe('2024-01-01');
      expect(result[0].accuracy).toBe(95.5);
      expect(result[0].totalCounts).toBe(10);
    });

    it('should use custom days parameter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.getAccuracyTrend(60);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('60 days');
    });

    it('should round accuracy to 2 decimal places', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ period: '2024-01-01', accuracy: '95.666', total_counts: '10' }],
      });

      const result = await service.getAccuracyTrend();

      expect(result[0].accuracy).toBe(95.67);
    });

    it('should return empty array when no data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getAccuracyTrend();

      expect(result).toHaveLength(0);
    });

    it('should handle null accuracy values', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ period: '2024-01-01', accuracy: null, total_counts: '0' }],
      });

      const result = await service.getAccuracyTrend();

      expect(result[0].accuracy).toBe(0);
    });
  });

  // ==========================================================================
  // GET TOP DISCREPANCY SKUS
  // ==========================================================================

  describe('getTopDiscrepancySKUs', () => {
    it('should return top discrepancy SKUs with default params', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            sku: 'SKU-001',
            name: 'Widget A',
            variance_count: '10',
            total_variance: '50',
            average_variance_percent: '5.5',
          },
          {
            sku: 'SKU-002',
            name: 'Widget B',
            variance_count: '8',
            total_variance: '30',
            average_variance_percent: '3.75',
          },
        ],
      });

      const result = await service.getTopDiscrepancySKUs();

      expect(result).toHaveLength(2);
      expect(result[0].sku).toBe('SKU-001');
      expect(result[0].varianceCount).toBe(10);
      expect(result[0].averageVariancePercent).toBe(5.5);
    });

    it('should use custom limit parameter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.getTopDiscrepancySKUs(20);

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [20]);
    });

    it('should use custom days parameter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.getTopDiscrepancySKUs(10, 60);

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('60 days');
    });

    it('should round average variance percent', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            sku: 'SKU-001',
            name: 'Widget A',
            variance_count: '5',
            total_variance: '25',
            average_variance_percent: '5.666',
          },
        ],
      });

      const result = await service.getTopDiscrepancySKUs();

      expect(result[0].averageVariancePercent).toBe(5.67);
    });

    it('should return empty array when no discrepancies', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getTopDiscrepancySKUs();

      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // GET COUNT BY USER
  // ==========================================================================

  describe('getCountByUser', () => {
    it('should return user performance for default 30 days', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            userid: 'user-001',
            name: 'John Doe',
            counts_completed: '25',
            items_counted: '150',
            average_accuracy: '96.5',
          },
          {
            userid: 'user-002',
            name: 'Jane Smith',
            counts_completed: '20',
            items_counted: '120',
            average_accuracy: '98.2',
          },
        ],
      });

      const result = await service.getCountByUser();

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-001');
      expect(result[0].countsCompleted).toBe(25);
      expect(result[0].itemsCounted).toBe(150);
      expect(result[0].averageAccuracy).toBe(96.5);
    });

    it('should use custom days parameter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.getCountByUser(60);

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('60 days');
    });

    it('should round average accuracy', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            userid: 'user-001',
            name: 'John Doe',
            counts_completed: '10',
            items_counted: '50',
            average_accuracy: '95.666',
          },
        ],
      });

      const result = await service.getCountByUser();

      expect(result[0].averageAccuracy).toBe(95.67);
    });

    it('should return empty array when no data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getCountByUser();

      expect(result).toHaveLength(0);
    });

    it('should handle null accuracy values', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            userid: 'user-001',
            name: 'John Doe',
            counts_completed: '5',
            items_counted: '25',
            average_accuracy: null,
          },
        ],
      });

      const result = await service.getCountByUser();

      expect(result[0].averageAccuracy).toBe(0);
    });

    it('should order by counts completed DESC', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            userid: 'user-001',
            name: 'User 1',
            counts_completed: '30',
            items_counted: '150',
            average_accuracy: '95',
          },
          {
            userid: 'user-002',
            name: 'User 2',
            counts_completed: '20',
            items_counted: '100',
            average_accuracy: '97',
          },
        ],
      });

      const result = await service.getCountByUser();

      expect(result[0].countsCompleted).toBeGreaterThanOrEqual(result[1].countsCompleted);
    });
  });

  // ==========================================================================
  // GET ZONE PERFORMANCE
  // ==========================================================================

  describe('getZonePerformance', () => {
    it('should return zone performance for default 30 days', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            zone: 'A',
            counts_completed: '30',
            items_counted: '180',
            average_accuracy: '96.2',
            total_variance: '5',
          },
          {
            zone: 'B',
            counts_completed: '25',
            items_counted: '150',
            average_accuracy: '94.8',
            total_variance: '8',
          },
        ],
      });

      const result = await service.getZonePerformance();

      expect(result).toHaveLength(2);
      expect(result[0].zone).toBe('A');
      expect(result[0].countsCompleted).toBe(30);
      expect(result[0].totalVariance).toBe(5);
    });

    it('should use custom days parameter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.getZonePerformance(60);

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('60 days');
    });

    it('should round average accuracy', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            zone: 'A',
            counts_completed: '10',
            items_counted: '50',
            average_accuracy: '95.666',
            total_variance: '2',
          },
        ],
      });

      const result = await service.getZonePerformance();

      expect(result[0].averageAccuracy).toBe(95.67);
    });

    it('should handle null total variance', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            zone: 'A',
            counts_completed: '10',
            items_counted: '50',
            average_accuracy: '95',
            total_variance: null,
          },
        ],
      });

      const result = await service.getZonePerformance();

      expect(result[0].totalVariance).toBe(0);
    });

    it('should return empty array when no data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getZonePerformance();

      expect(result).toHaveLength(0);
    });

    it('should order by zone ASC', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            zone: 'A',
            counts_completed: '20',
            items_counted: '100',
            average_accuracy: '95',
            total_variance: '3',
          },
          {
            zone: 'B',
            counts_completed: '15',
            items_counted: '75',
            average_accuracy: '97',
            total_variance: '2',
          },
        ],
      });

      const result = await service.getZonePerformance();

      expect(result[0].zone).toBe('A');
      expect(result[1].zone).toBe('B');
    });
  });

  // ==========================================================================
  // GET COUNT TYPE EFFECTIVENESS
  // ==========================================================================

  describe('getCountTypeEffectiveness', () => {
    it('should return effectiveness for default 90 days', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            counttype: 'ABC',
            counts_completed: '50',
            variance_detection_rate: '0.15',
            average_accuracy: '96.5',
            average_duration: '2.5',
          },
          {
            counttype: 'BLANKET',
            counts_completed: '30',
            variance_detection_rate: '0.08',
            average_accuracy: '98.2',
            average_duration: '4.2',
          },
        ],
      });

      const result = await service.getCountTypeEffectiveness();

      expect(result).toHaveLength(2);
      expect(result[0].countType).toBe('ABC');
      expect(result[0].countsCompleted).toBe(50);
      expect(result[0].varianceDetectionRate).toBe(15);
      expect(result[0].averageAccuracy).toBe(96.5);
      expect(result[0].averageDuration).toBe(2.5);
    });

    it('should use custom days parameter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.getCountTypeEffectiveness(30);

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('30 days');
    });

    it('should round variance detection rate to percentage', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            counttype: 'ABC',
            counts_completed: '10',
            variance_detection_rate: '0.1555',
            average_accuracy: '95',
            average_duration: '2',
          },
        ],
      });

      const result = await service.getCountTypeEffectiveness();

      expect(result[0].varianceDetectionRate).toBe(15.55);
    });

    it('should round average accuracy and duration', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            counttype: 'ABC',
            counts_completed: '10',
            variance_detection_rate: '0.1',
            average_accuracy: '96.666',
            average_duration: '2.333',
          },
        ],
      });

      const result = await service.getCountTypeEffectiveness();

      expect(result[0].averageAccuracy).toBe(96.67);
      expect(result[0].averageDuration).toBe(2.33);
    });

    it('should handle null values', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            counttype: 'ABC',
            counts_completed: '5',
            variance_detection_rate: null,
            average_accuracy: null,
            average_duration: null,
          },
        ],
      });

      const result = await service.getCountTypeEffectiveness();

      expect(result[0].varianceDetectionRate).toBe(0);
      expect(result[0].averageAccuracy).toBe(0);
      expect(result[0].averageDuration).toBe(0);
    });

    it('should order by counts completed DESC', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            counttype: 'ABC',
            counts_completed: '50',
            variance_detection_rate: '0.1',
            average_accuracy: '95',
            average_duration: '2',
          },
          {
            counttype: 'BLANKET',
            counts_completed: '30',
            variance_detection_rate: '0.08',
            average_accuracy: '97',
            average_duration: '4',
          },
        ],
      });

      const result = await service.getCountTypeEffectiveness();

      expect(result[0].countsCompleted).toBeGreaterThanOrEqual(result[1].countsCompleted);
    });
  });

  // ==========================================================================
  // GET DAILY STATS
  // ==========================================================================

  describe('getDailyStats', () => {
    it('should return daily stats for default 30 days', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            date: '2024-01-01',
            counts_completed: '10',
            items_counted: '50',
            variances_found: '5',
            accuracy_rate: '95.5',
          },
          {
            date: '2024-01-02',
            counts_completed: '12',
            items_counted: '60',
            variances_found: '3',
            accuracy_rate: '96.2',
          },
        ],
      });

      const result = await service.getDailyStats();

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].countsCompleted).toBe(10);
      expect(result[0].itemsCounted).toBe(50);
      expect(result[0].variancesFound).toBe(5);
      expect(result[0].accuracyRate).toBe(95.5);
    });

    it('should use custom days parameter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.getDailyStats(60);

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('60 days');
    });

    it('should round accuracy rate', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            date: '2024-01-01',
            counts_completed: '10',
            items_counted: '50',
            variances_found: '2',
            accuracy_rate: '95.666',
          },
        ],
      });

      const result = await service.getDailyStats();

      expect(result[0].accuracyRate).toBe(95.67);
    });

    it('should handle null accuracy rate', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            date: '2024-01-01',
            counts_completed: '5',
            items_counted: '25',
            variances_found: '1',
            accuracy_rate: null,
          },
        ],
      });

      const result = await service.getDailyStats();

      expect(result[0].accuracyRate).toBe(0);
    });

    it('should return empty array when no data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getDailyStats();

      expect(result).toHaveLength(0);
    });

    it('should order by date ASC', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            date: '2024-01-01',
            counts_completed: '10',
            items_counted: '50',
            variances_found: '2',
            accuracy_rate: '95',
          },
          {
            date: '2024-01-02',
            counts_completed: '12',
            items_counted: '60',
            variances_found: '3',
            accuracy_rate: '96',
          },
        ],
      });

      const result = await service.getDailyStats();

      expect(new Date(result[0].date).getTime()).toBeLessThan(new Date(result[1].date).getTime());
    });
  });

  // ==========================================================================
  // GET REAL-TIME DASHBOARD
  // ==========================================================================

  describe('getRealTimeDashboard', () => {
    it('should aggregate all KPIs without filters', async () => {
      // Mock all the internal method calls
      mockQuery
        // getOverallKPIs - 2 queries
        .mockResolvedValueOnce({
          rows: [
            {
              total_counts: '100',
              completed_counts: '80',
              in_progress_counts: '10',
              scheduled_counts: '10',
              total_items_counted: '500',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total_variances: '25',
              pending_variances: '5',
              high_value_variance_count: '3',
              average_accuracy: '95.5',
            },
          ],
        })
        // getAccuracyTrend
        .mockResolvedValueOnce({
          rows: [{ period: '2024-01-01', accuracy: '95', total_counts: '10' }],
        })
        // getTopDiscrepancySKUs
        .mockResolvedValueOnce({
          rows: [
            {
              sku: 'SKU-001',
              name: 'Widget',
              variance_count: '10',
              total_variance: '50',
              average_variance_percent: '5',
            },
          ],
        })
        // getCountByUser
        .mockResolvedValueOnce({
          rows: [
            {
              userid: 'user-001',
              name: 'John',
              counts_completed: '25',
              items_counted: '150',
              average_accuracy: '96',
            },
          ],
        })
        // getZonePerformance
        .mockResolvedValueOnce({
          rows: [
            {
              zone: 'A',
              counts_completed: '30',
              items_counted: '180',
              average_accuracy: '96',
              total_variance: '5',
            },
          ],
        })
        // getCountTypeEffectiveness
        .mockResolvedValueOnce({
          rows: [
            {
              counttype: 'ABC',
              counts_completed: '50',
              variance_detection_rate: '0.15',
              average_accuracy: '96',
              average_duration: '2.5',
            },
          ],
        })
        // getDailyStats
        .mockResolvedValueOnce({
          rows: [
            {
              date: '2024-01-01',
              counts_completed: '10',
              items_counted: '50',
              variances_found: '5',
              accuracy_rate: '95',
            },
          ],
        });

      const result = await service.getRealTimeDashboard();

      expect(result).toHaveProperty('overallKPIs');
      expect(result).toHaveProperty('accuracyTrend');
      expect(result).toHaveProperty('topDiscrepancies');
      expect(result).toHaveProperty('userPerformance');
      expect(result).toHaveProperty('zonePerformance');
      expect(result).toHaveProperty('countTypeEffectiveness');
      expect(result).toHaveProperty('dailyStats');
    });

    it('should pass filters to getOverallKPIs only', async () => {
      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        location: 'A-01-01',
        countType: 'ABC',
      };

      // Mock all 8 queries (2 for overall KPIs + 6 others)
      mockQuery
        // getOverallKPIs with filters - first query (counts)
        .mockResolvedValueOnce({
          rows: [
            {
              total_counts: '50',
              completed_counts: '40',
              in_progress_counts: '5',
              scheduled_counts: '5',
              total_items_counted: '200',
            },
          ],
        })
        // getOverallKPIs with filters - second query (variances)
        .mockResolvedValueOnce({
          rows: [
            {
              total_variances: '10',
              pending_variances: '2',
              high_value_variance_count: '1',
              average_accuracy: '92',
            },
          ],
        })
        // getAccuracyTrend (no filters)
        .mockResolvedValueOnce({
          rows: [{ period: '2024-01-01', accuracy: '95', total_counts: '10' }],
        })
        // getTopDiscrepancySKUs (no filters)
        .mockResolvedValueOnce({
          rows: [
            {
              sku: 'SKU-001',
              name: 'Widget',
              variance_count: '10',
              total_variance: '50',
              average_variance_percent: '5',
            },
          ],
        })
        // getCountByUser (no filters)
        .mockResolvedValueOnce({
          rows: [
            {
              userid: 'user-001',
              name: 'John',
              counts_completed: '25',
              items_counted: '150',
              average_accuracy: '96',
            },
          ],
        })
        // getZonePerformance (no filters)
        .mockResolvedValueOnce({
          rows: [
            {
              zone: 'A',
              counts_completed: '30',
              items_counted: '180',
              average_accuracy: '96',
              total_variance: '5',
            },
          ],
        })
        // getCountTypeEffectiveness (no filters)
        .mockResolvedValueOnce({
          rows: [
            {
              counttype: 'ABC',
              counts_completed: '50',
              variance_detection_rate: '0.15',
              average_accuracy: '96',
              average_duration: '2.5',
            },
          ],
        })
        // getDailyStats (no filters)
        .mockResolvedValueOnce({
          rows: [
            {
              date: '2024-01-01',
              counts_completed: '10',
              items_counted: '50',
              variances_found: '5',
              accuracy_rate: '95',
            },
          ],
        });

      const result = await service.getRealTimeDashboard(filters);

      // Verify filters were used in first query (getOverallKPIs)
      const firstCallParams = mockQuery.mock.calls[0][1];
      expect(firstCallParams).toContain(filters.startDate);
      expect(firstCallParams).toContain(filters.endDate);
      expect(firstCallParams).toContain(filters.location);
      expect(firstCallParams).toContain(filters.countType);
    });

    it('should execute all queries in parallel', async () => {
      // Mock all 8 queries (2 for overall KPIs + 6 others)
      mockQuery
        // getOverallKPIs - first query (counts)
        .mockResolvedValueOnce({
          rows: [
            {
              total_counts: '100',
              completed_counts: '80',
              in_progress_counts: '10',
              scheduled_counts: '10',
              total_items_counted: '500',
            },
          ],
        })
        // getOverallKPIs - second query (variances)
        .mockResolvedValueOnce({
          rows: [
            {
              total_variances: '25',
              pending_variances: '5',
              high_value_variance_count: '3',
              average_accuracy: '95.5',
            },
          ],
        })
        // getAccuracyTrend
        .mockResolvedValueOnce({
          rows: [{ period: '2024-01-01', accuracy: '95', total_counts: '10' }],
        })
        // getTopDiscrepancySKUs
        .mockResolvedValueOnce({
          rows: [
            {
              sku: 'SKU-001',
              name: 'Widget',
              variance_count: '10',
              total_variance: '50',
              average_variance_percent: '5',
            },
          ],
        })
        // getCountByUser
        .mockResolvedValueOnce({
          rows: [
            {
              userid: 'user-001',
              name: 'John',
              counts_completed: '25',
              items_counted: '150',
              average_accuracy: '96',
            },
          ],
        })
        // getZonePerformance
        .mockResolvedValueOnce({
          rows: [
            {
              zone: 'A',
              counts_completed: '30',
              items_counted: '180',
              average_accuracy: '96',
              total_variance: '5',
            },
          ],
        })
        // getCountTypeEffectiveness
        .mockResolvedValueOnce({
          rows: [
            {
              counttype: 'ABC',
              counts_completed: '50',
              variance_detection_rate: '0.15',
              average_accuracy: '96',
              average_duration: '2.5',
            },
          ],
        })
        // getDailyStats
        .mockResolvedValueOnce({
          rows: [
            {
              date: '2024-01-01',
              counts_completed: '10',
              items_counted: '50',
              variances_found: '5',
              accuracy_rate: '95',
            },
          ],
        });

      await service.getRealTimeDashboard();

      // Should have called all 8 queries (2 for overall KPIs + 6 others)
      expect(mockQuery).toHaveBeenCalledTimes(8);
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('cycleCountKPIService singleton', () => {
    it('should export singleton instance', () => {
      expect(cycleCountKPIService).toBeInstanceOf(CycleCountKPIService);
    });
  });
});
