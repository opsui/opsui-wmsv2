/**
 * Developer Metrics Service
 *
 * Provides metrics and monitoring data for the developer panel
 */

import { getPool } from '../db/client';

export interface RequestLog {
  timestamp: Date;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  user_id?: string;
  user_role?: string;
}

export interface RequestStats {
  total: number;
  byStatus: Record<string, number>;
  byMethod: Record<string, number>;
  avgDuration: number;
  slowest: RequestLog;
  fastest: RequestLog;
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
}

export interface MetricsSummary {
  requests: {
    total: number;
    successRate: number;
    avgDuration: number;
  };
  database: {
    size: string;
    connections: number;
    latency: string;
  };
  system: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
  };
}

/**
 * Get recent API request logs from audit_logs
 */
export async function getRecentRequests(limit: number = 50): Promise<RequestLog[]> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT
        occurred_at as timestamp,
        action_type as method,
        entity_id as path,
        status,
        EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000 as duration_ms,
        user_id,
        user_role
      FROM audit_logs
      WHERE action_type IN ('GET', 'POST', 'PATCH', 'DELETE')
      ORDER BY occurred_at DESC
      LIMIT $1`,
      [limit]
    );

    return result.rows as RequestLog[];
  } catch (error) {
    console.error('Failed to get recent requests:', error);
    return [];
  }
}

/**
 * Get request statistics for a time period
 */
export async function getRequestStats(duration: string = '1h'): Promise<RequestStats> {
  const pool = getPool();

  try {
    // Parse duration to get interval
    const intervalMap: Record<string, string> = {
      '1h': "NOW() - INTERVAL '1 hour'",
      '24h': "NOW() - INTERVAL '24 hours'",
      '7d': "NOW() - INTERVAL '7 days'",
      '30d': "NOW() - INTERVAL '30 days'",
    };
    const interval = intervalMap[duration] || intervalMap['1h'];

    // Get total and by status
    const statusResult = await pool.query(
      `SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END), 0) as success,
        COALESCE(SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END), 0) as failure
      FROM audit_logs
      WHERE occurred_at > ${interval}`
    );

    // Get by method
    const methodResult = await pool.query(
      `SELECT action_type, COUNT(*) as count
      FROM audit_logs
      WHERE occurred_at > ${interval}
      GROUP BY action_type`
    );

    // Get average duration
    const durationResult = await pool.query(
      `SELECT
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_duration
      FROM audit_logs
      WHERE occurred_at > ${interval}
      AND updated_at IS NOT NULL`
    );

    const total = parseInt(statusResult.rows[0]?.total || '0');
    const byStatus = {
      success: parseInt(statusResult.rows[0]?.success || '0'),
      failure: parseInt(statusResult.rows[0]?.failure || '0'),
    };

    const byMethod: Record<string, number> = {};
    for (const row of methodResult.rows) {
      byMethod[row.action_type] = parseInt(row.count);
    }

    const avgDuration = parseFloat(durationResult.rows[0]?.avg_duration || '0');

    // Get slowest and fastest
    const extremesResult = await pool.query(
      `SELECT
        occurred_at as timestamp,
        action_type as method,
        entity_id as path,
        status,
        EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000 as duration_ms,
        user_id,
        user_role
      FROM audit_logs
      WHERE occurred_at > ${interval}
      AND updated_at IS NOT NULL
      ORDER BY duration_ms DESC
      LIMIT 1`
    );

    const slowest = extremesResult.rows[0] as RequestLog;

    const fastestResult = await pool.query(
      `SELECT
        occurred_at as timestamp,
        action_type as method,
        entity_id as path,
        status,
        EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000 as duration_ms,
        user_id,
        user_role
      FROM audit_logs
      WHERE occurred_at > ${interval}
      AND updated_at IS NOT NULL
      ORDER BY duration_ms ASC
      LIMIT 1`
    );

    const fastest = fastestResult.rows[0] as RequestLog;

    return {
      total,
      byStatus,
      byMethod,
      avgDuration,
      slowest,
      fastest,
    };
  } catch (error) {
    console.error('Failed to get request stats:', error);
    return {
      total: 0,
      byStatus: {},
      byMethod: {},
      avgDuration: 0,
      slowest: {} as RequestLog,
      fastest: {} as RequestLog,
    };
  }
}

/**
 * Get logs from audit_logs table
 */
export async function getLogs(limit: number = 100, level?: string): Promise<LogEntry[]> {
  const pool = getPool();

  try {
    let query = `
      SELECT
        occurred_at as timestamp,
        CASE
          WHEN status = 'FAILURE' THEN 'error'
          WHEN status = 'SUCCESS' THEN 'info'
          ELSE 'info'
        END as level,
        COALESCE(details, action_type) as message,
        jsonb_build_object(
          'entity_id', entity_id,
          'user_id', user_id,
          'user_role', user_role,
          'ip_address', ip_address
        ) as context
      FROM audit_logs
    `;

    const params: any[] = [];

    if (level) {
      const statusCondition = level === 'error' ? "status = 'FAILURE'" : "status != 'FAILURE'";
      query += ` WHERE ${statusCondition}`;
    }

    query += ` ORDER BY occurred_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows as LogEntry[];
  } catch (error) {
    console.error('Failed to get logs:', error);
    return [];
  }
}

/**
 * Get metrics summary for dashboard
 */
export async function getMetricsSummary(): Promise<MetricsSummary> {
  const pool = getPool();

  try {
    // Request metrics from last hour
    const requestResult = await pool.query(
      `SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END), 0) as success,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_duration
      FROM audit_logs
      WHERE occurred_at > NOW() - INTERVAL '1 hour'`
    );

    const total = parseInt(requestResult.rows[0]?.total || '0');
    const success = parseInt(requestResult.rows[0]?.success || '0');
    const avgDuration = parseFloat(requestResult.rows[0]?.avg_duration || '0');

    // Database metrics
    const dbResult = await pool.query(`
      SELECT
        pg_size_pretty(pg_database_size('wms_db')) as size,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = 'wms_db') as connections
    `);

    // Measure latency
    const latencyStart = Date.now();
    await pool.query('SELECT 1');
    const latency = Date.now() - latencyStart;

    return {
      requests: {
        total,
        successRate: total > 0 ? (success / total) * 100 : 100,
        avgDuration,
      },
      database: {
        size: dbResult.rows[0]?.size || 'Unknown',
        connections: parseInt(dbResult.rows[0]?.connections || '0'),
        latency: `${latency}ms`,
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    };
  } catch (error) {
    console.error('Failed to get metrics summary:', error);
    return {
      requests: { total: 0, successRate: 100, avgDuration: 0 },
      database: { size: 'Unknown', connections: 0, latency: 'Unknown' },
      system: { uptime: 0, memory: process.memoryUsage() },
    };
  }
}

/**
 * Get performance metrics over time
 */
export async function getPerformanceMetrics(duration: string = '24h'): Promise<any[]> {
  const pool = getPool();

  try {
    const intervalMap: Record<string, string> = {
      '1h': "10 minutes",
      '24h': "1 hour",
      '7d': "6 hours",
      '30d': "1 day",
    };

    const bucketSize = intervalMap[duration] || intervalMap['24h'];

    const result = await pool.query(
      `SELECT
        date_trunc('minute', occurred_at) as timestamp,
        COUNT(*) as request_count,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_duration,
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END), 0) as success_count,
        COALESCE(SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END), 0) as error_count
      FROM audit_logs
      WHERE occurred_at > NOW() - INTERVAL '24 hours'
      GROUP BY date_trunc('minute', occurred_at)
      ORDER BY timestamp DESC
      LIMIT 100`
    );

    return result.rows;
  } catch (error) {
    console.error('Failed to get performance metrics:', error);
    return [];
  }
}
