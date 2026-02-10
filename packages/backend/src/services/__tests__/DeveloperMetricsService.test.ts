/**
 * Unit tests for DeveloperMetricsService
 * @covers src/services/DeveloperMetricsService.ts
 */

import {
  getRecentRequests,
  getRequestStats,
  getLogs,
  getMetricsSummary,
  getPerformanceMetrics,
} from '../DeveloperMetricsService';
import { getPool } from '../../db/client';
import type {
  RequestLog,
  RequestStats,
  LogEntry,
  MetricsSummary,
} from '../DeveloperMetricsService';

// Mock the database client
jest.mock('../../db/client', () => ({
  getPool: jest.fn(),
}));

describe('DeveloperMetricsService', () => {
  let mockPool: any;

  // Helper to create mock request log
  const createMockRequestLog = (overrides: any = {}): RequestLog => ({
    timestamp: new Date('2024-01-01T10:00:00Z'),
    method: 'GET',
    path: '/api/products',
    status: 'SUCCESS',
    duration_ms: 150,
    user_id: 'user-123',
    user_role: 'admin',
    ...overrides,
  });

  // Helper to create mock log entry
  const createMockLogEntry = (overrides: any = {}): LogEntry => ({
    timestamp: new Date('2024-01-01T10:00:00Z'),
    level: 'info',
    message: 'API request completed',
    context: {
      entity_id: 'PROD-001',
      user_id: 'user-123',
      user_role: 'admin',
      ip_address: '192.168.1.1',
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockPool = {
      query: jest.fn(),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  // ==========================================================================
  // GET RECENT REQUESTS
  // ==========================================================================

  describe('getRecentRequests', () => {
    it('should return recent API request logs', async () => {
      const mockRows = [
        createMockRequestLog({ method: 'GET', path: '/api/products' }),
        createMockRequestLog({ method: 'POST', path: '/api/orders' }),
        createMockRequestLog({ method: 'DELETE', path: '/api/items/123' }),
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await getRecentRequests(50);

      expect(result).toHaveLength(3);
      expect(result[0].method).toBe('GET');
      expect(result[1].method).toBe('POST');
      expect(result[2].method).toBe('DELETE');
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('FROM audit_logs'), [50]);
    });

    it('should filter by HTTP methods', async () => {
      const mockRows = [
        createMockRequestLog({ method: 'GET' }),
        createMockRequestLog({ method: 'POST' }),
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      await getRecentRequests(25);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE action_type IN ('GET', 'POST', 'PATCH', 'DELETE')"),
        [25]
      );
    });

    it('should use default limit of 50 when not provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getRecentRequests();

      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [50]);
    });

    it('should return empty array on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const result = await getRecentRequests();

      expect(result).toEqual([]);
    });

    it('should order by occurred_at descending', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getRecentRequests();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY occurred_at DESC'),
        expect.any(Array)
      );
    });
  });

  // ==========================================================================
  // GET REQUEST STATS
  // ==========================================================================

  describe('getRequestStats', () => {
    it('should return request statistics for default duration', async () => {
      // Mock status query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '100', success: '95', failure: '5' }],
      });

      // Mock method query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { action_type: 'GET', count: '50' },
          { action_type: 'POST', count: '30' },
          { action_type: 'DELETE', count: '20' },
        ],
      });

      // Mock duration query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ avg_duration: '150.5' }],
      });

      // Mock slowest query
      mockPool.query.mockResolvedValueOnce({
        rows: [createMockRequestLog({ duration_ms: 500 })],
      });

      // Mock fastest query
      mockPool.query.mockResolvedValueOnce({
        rows: [createMockRequestLog({ duration_ms: 10 })],
      });

      const result = await getRequestStats('1h');

      expect(result.total).toBe(100);
      expect(result.byStatus).toEqual({ success: 95, failure: 5 });
      expect(result.byMethod).toEqual({ GET: 50, POST: 30, DELETE: 20 });
      expect(result.avgDuration).toBe(150.5);
      expect(result.slowest.duration_ms).toBe(500);
      expect(result.fastest.duration_ms).toBe(10);
    });

    it('should support 24h duration', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ total: '0' }] });

      await getRequestStats('24h');

      expect(mockPool.query).toHaveBeenCalled();
      // Check that first query contains the 24h interval
      expect(mockPool.query.mock.calls[0][0]).toContain("INTERVAL '24 hours'");
    });

    it('should support 7d duration', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ total: '0' }] });

      await getRequestStats('7d');

      expect(mockPool.query).toHaveBeenCalled();
      expect(mockPool.query.mock.calls[0][0]).toContain("INTERVAL '7 days'");
    });

    it('should support 30d duration', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ total: '0' }] });

      await getRequestStats('30d');

      expect(mockPool.query).toHaveBeenCalled();
      expect(mockPool.query.mock.calls[0][0]).toContain("INTERVAL '30 days'");
    });

    it('should default to 1h for unknown duration', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getRequestStats('invalid');

      expect(mockPool.query).toHaveBeenCalled();
      expect(mockPool.query.mock.calls[0][0]).toContain("INTERVAL '1 hour'");
    });

    it('should return default values on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const result = await getRequestStats();

      expect(result).toEqual({
        total: 0,
        byStatus: {},
        byMethod: {},
        avgDuration: 0,
        slowest: {},
        fastest: {},
      });
    });

    it('should handle null results gracefully', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getRequestStats();

      // Should handle missing rows without throwing
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET LOGS
  // ==========================================================================

  describe('getLogs', () => {
    it('should return logs without level filter', async () => {
      const mockRows = [
        createMockLogEntry({ level: 'info', message: 'Request completed' }),
        createMockLogEntry({ level: 'error', message: 'Request failed' }),
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await getLogs(100);

      expect(result).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM audit_logs'),
        [100]
      );
    });

    it('should filter by error level', async () => {
      mockPool.query.mockResolvedValue({ rows: [createMockLogEntry({ level: 'error' })] });

      await getLogs(100, 'error');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = 'FAILURE'"),
        [100]
      );
    });

    it('should filter by info level (non-errors)', async () => {
      mockPool.query.mockResolvedValue({ rows: [createMockLogEntry({ level: 'info' })] });

      await getLogs(100, 'info');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status != 'FAILURE'"),
        [100]
      );
    });

    it('should use default limit of 100 when not provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getLogs();

      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [100]);
    });

    it('should return empty array on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const result = await getLogs();

      expect(result).toEqual([]);
    });

    it('should map FAILURE status to error level', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            timestamp: new Date(),
            level: 'error',
            message: 'Test error',
            context: {},
          },
        ],
      });

      const result = await getLogs();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHEN status = 'FAILURE' THEN 'error'"),
        expect.any(Array)
      );
    });

    it('should build context object correctly', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getLogs();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('jsonb_build_object'),
        expect.any(Array)
      );
    });
  });

  // ==========================================================================
  // GET METRICS SUMMARY
  // ==========================================================================

  describe('getMetricsSummary', () => {
    beforeEach(() => {
      // Mock process.uptime and process.memoryUsage
      jest.spyOn(process, 'uptime').mockReturnValue(3600);
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 123456789,
        heapTotal: 50000000,
        heapUsed: 30000000,
        external: 1000000,
        arrayBuffers: 500000,
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return complete metrics summary', async () => {
      // Mock request metrics
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '1000', success: '980', avg_duration: '120.5' }],
      });

      // Mock database metrics
      mockPool.query.mockResolvedValueOnce({
        rows: [{ size: '250 MB', connections: '15' }],
      });

      // Mock latency query
      mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const result = await getMetricsSummary();

      expect(result.requests).toEqual({
        total: 1000,
        successRate: 98,
        avgDuration: 120.5,
      });
      expect(result.database.size).toBe('250 MB');
      expect(result.database.connections).toBe(15);
      expect(result.database.latency).toMatch(/\d+ms/);
      expect(result.system.uptime).toBe(3600);
      expect(result.system.memory).toBeDefined();
    });

    it('should calculate success rate correctly', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '200', success: '150', avg_duration: '100' }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ size: '100 MB', connections: '5' }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await getMetricsSummary();

      expect(result.requests.successRate).toBe(75); // 150/200 * 100
    });

    it('should return 100% success rate when no requests', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '0', success: '0', avg_duration: null }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ size: '100 MB', connections: '5' }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await getMetricsSummary();

      expect(result.requests.successRate).toBe(100);
      expect(result.requests.total).toBe(0);
    });

    it('should measure database latency', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '100', success: '100', avg_duration: '50' }],
        })
        .mockResolvedValueOnce({
          rows: [{ size: '100 MB', connections: '5' }],
        })
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const result = await getMetricsSummary();

      expect(result.database.latency).toMatch(/\d+ms/);
      const latencyValue = parseInt(result.database.latency);
      expect(latencyValue).toBeGreaterThanOrEqual(0);
    });

    it('should return default values on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const result = await getMetricsSummary();

      expect(result.requests).toEqual({ total: 0, successRate: 100, avgDuration: 0 });
      expect(result.database).toEqual({ size: 'Unknown', connections: 0, latency: 'Unknown' });
      expect(result.system.uptime).toBeGreaterThanOrEqual(0);
      expect(result.system.memory).toBeDefined();
    });

    it('should handle null database results', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{}] });
      mockPool.query.mockResolvedValueOnce({ rows: [{}] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await getMetricsSummary();

      expect(result.requests.total).toBe(0);
      expect(result.database.size).toBe('Unknown');
      expect(result.database.connections).toBe(0);
    });
  });

  // ==========================================================================
  // GET PERFORMANCE METRICS
  // ==========================================================================

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics for 24h', async () => {
      const mockRows = [
        {
          timestamp: new Date('2024-01-01T10:00:00Z'),
          request_count: '100',
          avg_duration: '120.5',
          success_count: '95',
          error_count: '5',
        },
        {
          timestamp: new Date('2024-01-01T09:00:00Z'),
          request_count: '80',
          avg_duration: '100.2',
          success_count: '78',
          error_count: '2',
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await getPerformanceMetrics('24h');

      expect(result).toHaveLength(2);
      expect(result[0].request_count).toBe('100');
      expect(result[0].success_count).toBe('95');
      expect(result[0].error_count).toBe('5');
    });

    it('should support 1h duration', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getPerformanceMetrics('1h');

      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should support 7d duration', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getPerformanceMetrics('7d');

      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should support 30d duration', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getPerformanceMetrics('30d');

      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should return empty array on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const result = await getPerformanceMetrics();

      expect(result).toEqual([]);
    });

    it('should group by minute and limit to 100 results', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getPerformanceMetrics();

      expect(mockPool.query).toHaveBeenCalled();
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain("GROUP BY date_trunc('minute', occurred_at)");
      expect(query).toContain('LIMIT 100');
    });

    it('should order by timestamp descending', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await getPerformanceMetrics();

      expect(mockPool.query).toHaveBeenCalled();
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('ORDER BY timestamp DESC');
    });

    it('should calculate average duration correctly', async () => {
      const mockRows = [
        {
          timestamp: new Date(),
          request_count: '10',
          avg_duration: '150.75',
          success_count: '9',
          error_count: '1',
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await getPerformanceMetrics();

      expect(result[0].avg_duration).toBe('150.75');
    });
  });
});
