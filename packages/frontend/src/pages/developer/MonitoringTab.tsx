/**
 * Monitoring Tab
 *
 * Developer panel tab for real-time monitoring and metrics
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared';
import { LogViewer, type LogEntry } from '@/components/shared/LogViewer';
import { LineChart } from '@/components/charts/LineChart';
import { apiClient } from '@/lib/api-client';
import {
  ServerIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';

export interface RequestLog {
  timestamp: string;
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

export function MonitoringTab() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [requestStats, setRequestStats] = useState<RequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [duration, setDuration] = useState<'1h' | '24h' | '7d'>('1h');
  const [activeTab, setActiveTab] = useState<'requests' | 'logs' | 'metrics'>('requests');

  useEffect(() => {
    loadAllData();
    let interval: NodeJS.Timeout;

    if (autoRefresh) {
      interval = setInterval(() => {
        loadAllData();
      }, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, duration]);

  const loadAllData = async () => {
    await Promise.all([
      loadMetrics(),
      loadRequests(),
      loadLogs(),
      loadRequestStats(),
    ]);
  };

  const loadMetrics = async () => {
    try {
      const response = await apiClient.get('/developer/monitoring/metrics');
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const response = await apiClient.get('/developer/monitoring/requests', { params: { limit: 50 } });
      setRequests(response.data.requests);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await apiClient.get('/developer/monitoring/logs', { params: { limit: 100 } });
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const loadRequestStats = async () => {
    try {
      const response = await apiClient.get('/developer/monitoring/request-stats', { params: { duration } });
      setRequestStats(response.data);
    } catch (error) {
      console.error('Failed to load request stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Monitoring Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time application metrics and logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            <ArrowPathIcon className={`h-4 w-4 inline mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh
          </button>
          <button
            onClick={loadAllData}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4 inline mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Requests"
            value={metrics.requests.total.toString()}
            change={null}
            icon={<ChartBarIcon className="h-5 w-5" />}
            color="blue"
          />
          <MetricCard
            title="Success Rate"
            value={`${metrics.requests.successRate.toFixed(1)}%`}
            change={null}
            icon={<CheckCircleIcon className="h-5 w-5" />}
            color="green"
          />
          <MetricCard
            title="Avg Duration"
            value={`${metrics.requests.avgDuration.toFixed(0)}ms`}
            change={null}
            icon={<ClockIcon className="h-5 w-5" />}
            color="amber"
          />
          <MetricCard
            title="DB Connections"
            value={metrics.database.connections.toString()}
            change={null}
            icon={<CircleStackIcon className="h-5 w-5" />}
            color="purple"
          />
        </div>
      )}

      {/* System Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ServerIcon className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Database Size</span>
                <p className="text-lg font-semibold dark:text-white">{metrics.database.size}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">DB Latency</span>
                <p className="text-lg font-semibold dark:text-white">{metrics.database.latency}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Uptime</span>
                <p className="text-lg font-semibold dark:text-white">{formatUptime(metrics.system.uptime)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Memory Used</span>
                <p className="text-lg font-semibold dark:text-white">
                  {formatBytes(metrics.system.memory.heapUsed)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Content */}
      <div>
        <div className="flex border-b dark:border-gray-700 mb-4">
          {[
            { id: 'requests', label: 'API Requests', icon: DocumentTextIcon },
            { id: 'logs', label: 'Logs', icon: ServerIcon },
            { id: 'metrics', label: 'Performance', icon: ChartBarIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Request Stats */}
        {activeTab === 'requests' && requestStats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Requests</span>
                  <p className="text-2xl font-bold dark:text-white">{requestStats.total}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Average Duration</span>
                  <p className="text-2xl font-bold dark:text-white">{requestStats.avgDuration.toFixed(0)}ms</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <span className="text-sm text-green-600 dark:text-green-400">Success</span>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {requestStats.byStatus.success || 0}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <span className="text-sm text-red-600 dark:text-red-400">Errors</span>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {requestStats.byStatus.failure || 0}
                  </p>
                </div>
              </div>

              <h3 className="text-sm font-medium dark:text-gray-300 mb-3">Recent Requests</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left p-2 dark:text-gray-300">Time</th>
                      <th className="text-left p-2 dark:text-gray-300">Method</th>
                      <th className="text-left p-2 dark:text-gray-300">Path</th>
                      <th className="text-left p-2 dark:text-gray-300">Duration</th>
                      <th className="text-left p-2 dark:text-gray-300">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.slice(0, 20).map((req, i) => (
                      <tr key={i} className="border-b dark:border-gray-800">
                        <td className="p-2 dark:text-gray-300 text-xs">
                          {new Date(req.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              req.method === 'GET'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : req.method === 'POST'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : req.method === 'PATCH'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {req.method}
                          </span>
                        </td>
                        <td className="p-2 dark:text-gray-300 font-mono text-xs max-w-[200px] truncate">
                          {req.path}
                        </td>
                        <td className="p-2 dark:text-gray-300">
                          {req.duration_ms ? `${req.duration_ms.toFixed(0)}ms` : '-'}
                        </td>
                        <td className="p-2 dark:text-gray-300 text-xs">{req.user_role || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logs */}
        {activeTab === 'logs' && (
          <LogViewer
            logs={logs}
            onClear={() => setLogs([])}
            filterLevel="all"
            maxLines={100}
            autoScroll={autoRefresh}
          />
        )}

        {/* Performance Metrics */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* Request Rate Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Request Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <LineChart
                    data={requests.reduce((acc: any[], req) => {
                      const minute = new Date(req.timestamp);
                      minute.setSeconds(0, 0);
                      const timeKey = minute.toISOString();
                      const existing = acc.find(d => d.time === timeKey);
                      if (existing) {
                        existing.count++;
                        existing.avgDuration = (existing.avgDuration * (existing.count - 1) + req.duration_ms) / existing.count;
                      } else {
                        acc.push({ time: timeKey, count: 1, avgDuration: req.duration_ms || 0 });
                      }
                      return acc;
                    }, []).slice(-20)}
                    xAxisKey="time"
                    lines={[
                      { dataKey: 'count', name: 'Requests/min', color: '#3b82f6' },
                    ]}
                    formatXAxis={(value) => {
                      const date = new Date(value);
                      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Latency Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Average Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <LineChart
                    data={requests.reduce((acc: any[], req) => {
                      const minute = new Date(req.timestamp);
                      minute.setSeconds(0, 0);
                      const timeKey = minute.toISOString();
                      const existing = acc.find(d => d.time === timeKey);
                      if (existing) {
                        existing.count++;
                        existing.avgDuration = (existing.avgDuration * (existing.count - 1) + (req.duration_ms || 0)) / existing.count;
                      } else {
                        acc.push({ time: timeKey, count: 1, avgDuration: req.duration_ms || 0 });
                      }
                      return acc;
                    }, []).slice(-20)}
                    xAxisKey="time"
                    lines={[
                      { dataKey: 'avgDuration', name: 'Avg Duration (ms)', color: '#10b981' },
                    ]}
                    formatXAxis={(value) => {
                      const date = new Date(value);
                      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Error Rate Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Response Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <span className="text-sm text-green-600 dark:text-green-400">2xx Success</span>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {requestStats?.byStatus['2'] || requests.filter(r => r.status >= 200 && r.status < 300).length}
                    </p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                    <span className="text-sm text-amber-600 dark:text-amber-400">3xx Redirect</span>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                      {requestStats?.byStatus['3'] || requests.filter(r => r.status >= 300 && r.status < 400).length}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <span className="text-sm text-blue-600 dark:text-blue-400">4xx Client Error</span>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {requestStats?.byStatus['4'] || requests.filter(r => r.status >= 400 && r.status < 500).length}
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <span className="text-sm text-red-600 dark:text-red-400">5xx Server Error</span>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {requestStats?.byStatus['5'] || requests.filter(r => r.status >= 500).length}
                    </p>
                  </div>
                </div>
                <div className="h-64">
                  <LineChart
                    data={requests.reduce((acc: any[], req) => {
                      const minute = new Date(req.timestamp);
                      minute.setSeconds(0, 0);
                      const timeKey = minute.toISOString();
                      const existing = acc.find(d => d.time === timeKey);
                      if (existing) {
                        existing.total++;
                        if (req.status >= 400) existing.errors++;
                      } else {
                        acc.push({ time: timeKey, total: 1, errors: req.status >= 400 ? 1 : 0 });
                      }
                      return acc;
                    }, []).slice(-20).map(d => ({
                      ...d,
                      errorRate: d.total > 0 ? (d.errors / d.total) * 100 : 0,
                    }))}
                    xAxisKey="time"
                    lines={[
                      { dataKey: 'errorRate', name: 'Error Rate (%)', color: '#ef4444' },
                    ]}
                    formatXAxis={(value) => {
                      const date = new Date(value);
                      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change: number | null;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

function MetricCard({ title, value, change, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  };

  const iconColorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
    purple: 'text-purple-500',
  };

  return (
    <Card className={`border-2 ${colorClasses[color]}`}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className={iconColorClasses[color]}>{icon}</div>
          {change !== null && (
            <span
              className={`text-sm font-medium ${
                change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {change >= 0 ? '+' : ''}
              {change}%
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold dark:text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
