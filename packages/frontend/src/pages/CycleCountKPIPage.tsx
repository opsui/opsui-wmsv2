/**
 * Cycle Count KPI Dashboard
 *
 * Real-time dashboard for cycle count metrics and analytics
 */

import { useState } from 'react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  MapPinIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Header, useToast } from '@/components/shared';
import {
  useCycleCountDashboard,
  useCycleCountKPIs,
  useCycleCountAccuracyTrend,
  useCycleCountTopDiscrepancies,
  useCycleCountUserPerformance,
  useCycleCountZonePerformance,
  useCycleCountTypeEffectiveness,
} from '@/services/api';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-sm ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              <ArrowTrendingUpIcon className="h-4 w-4" />
              <span>{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-400', '-500/20')}`}
        >
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function AccuracyChart({ data }: { data: Array<{ period: string; accuracy: number }> }) {
  const maxAccuracy = Math.max(...data.map(d => d.accuracy), 100);
  const minAccuracy = Math.min(...data.map(d => d.accuracy), 0);

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Accuracy Trend (Last 30 Days)</h3>
      <div className="relative h-48">
        {/* Simple bar chart visualization */}
        <div className="flex items-end justify-between h-full gap-1">
          {data.map((point, index) => {
            const height = ((point.accuracy - minAccuracy) / (maxAccuracy - minAccuracy)) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="relative w-full flex items-end justify-center">
                  <div
                    className="w-full bg-blue-500 hover:bg-blue-400 transition-all rounded-t"
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={`${point.period}: ${point.accuracy.toFixed(1)}%`}
                  />
                </div>
                {data.length <= 10 && (
                  <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left truncate w-16 text-center">
                    {new Date(point.period).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TopDiscrepanciesTable({
  data,
}: {
  data: Array<{ sku: string; name: string; varianceCount: number; averageVariancePercent: number }>;
}) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Top Discrepancy SKUs</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
              <th className="pb-3">SKU</th>
              <th className="pb-3">Name</th>
              <th className="pb-3 text-right">Variance Count</th>
              <th className="pb-3 text-right">Avg Variance %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  No discrepancies found
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={index} className="hover:bg-gray-800/50">
                  <td className="py-3 font-medium text-white">{item.sku}</td>
                  <td className="py-3 text-gray-300">{item.name}</td>
                  <td className="py-3 text-right text-yellow-400">{item.varianceCount}</td>
                  <td className="py-3 text-right text-orange-400">
                    {item.averageVariancePercent.toFixed(1)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserPerformanceTable({
  data,
}: {
  data: Array<{
    name: string;
    countsCompleted: number;
    itemsCounted: number;
    averageAccuracy: number;
  }>;
}) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">User Performance (Last 30 Days)</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
              <th className="pb-3">User</th>
              <th className="pb-3 text-right">Counts Completed</th>
              <th className="pb-3 text-right">Items Counted</th>
              <th className="pb-3 text-right">Accuracy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  No performance data available
                </td>
              </tr>
            ) : (
              data.map((user, index) => (
                <tr key={index} className="hover:bg-gray-800/50">
                  <td className="py-3 font-medium text-white">{user.name}</td>
                  <td className="py-3 text-right text-blue-400">{user.countsCompleted}</td>
                  <td className="py-3 text-right text-gray-300">{user.itemsCounted}</td>
                  <td className="py-3 text-right">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        user.averageAccuracy >= 98
                          ? 'bg-green-500/20 text-green-400'
                          : user.averageAccuracy >= 95
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {user.averageAccuracy.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ZonePerformanceChart({
  data,
}: {
  data: Array<{ zone: string; countsCompleted: number; averageAccuracy: number }>;
}) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Zone Performance</h3>
      <div className="space-y-4">
        {data.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No zone data available</p>
        ) : (
          data.map((zone, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-white">Zone {zone.zone}</span>
                <span className="text-sm text-gray-400">
                  {zone.countsCompleted} counts • {zone.averageAccuracy.toFixed(1)}% accuracy
                </span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    zone.averageAccuracy >= 98
                      ? 'bg-green-500'
                      : zone.averageAccuracy >= 95
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${zone.averageAccuracy}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CountTypeEffectivenessTable({
  data,
}: {
  data: Array<{
    countType: string;
    countsCompleted: number;
    averageAccuracy: number;
    averageDuration: number;
    varianceDetectionRate: number;
  }>;
}) {
  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${hours.toFixed(1)}h`;
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Count Type Effectiveness (Last 90 Days)
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
              <th className="pb-3">Count Type</th>
              <th className="pb-3 text-right">Completed</th>
              <th className="pb-3 text-right">Accuracy</th>
              <th className="pb-3 text-right">Avg Duration</th>
              <th className="pb-3 text-right">Variance Detection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.map((type, index) => (
              <tr key={index} className="hover:bg-gray-800/50">
                <td className="py-3 font-medium text-white">
                  {type.countType
                    .replace(/_/g, ' ')
                    .toLowerCase()
                    .replace(/\b\w/g, l => l.toUpperCase())}
                </td>
                <td className="py-3 text-right text-blue-400">{type.countsCompleted}</td>
                <td className="py-3 text-right">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      type.averageAccuracy >= 98
                        ? 'bg-green-500/20 text-green-400'
                        : type.averageAccuracy >= 95
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {type.averageAccuracy.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 text-right text-gray-300">
                  {formatDuration(type.averageDuration)}
                </td>
                <td className="py-3 text-right text-purple-400">
                  {type.varianceDetectionRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function CycleCountKPIPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({
    days: 30,
  });

  // Fetch dashboard data
  const { data: dashboard, isLoading: dashboardLoading, refetch } = useCycleCountDashboard();

  const overallKPIs = dashboard?.overallKPIs;
  const accuracyTrend = dashboard?.accuracyTrend || [];
  const topDiscrepancies = dashboard?.topDiscrepancies || [];
  const userPerformance = dashboard?.userPerformance || [];
  const zonePerformance = dashboard?.zonePerformance || [];
  const countTypeEffectiveness = dashboard?.countTypeEffectiveness || [];

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  if (dashboardLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading KPI dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Cycle Count Analytics</h1>
            <p className="text-gray-400 mt-1">Real-time metrics and performance insights</p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Refresh
          </button>
        </div>

        {/* Overall KPI Cards */}
        {overallKPIs && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              title="Total Counts"
              value={overallKPIs.totalCounts}
              subtitle={`${overallKPIs.completedCounts} completed`}
              icon={ChartBarIcon}
              color="text-blue-400"
            />
            <KPICard
              title="Completion Rate"
              value={`${overallKPIs.completionRate.toFixed(1)}%`}
              icon={CheckCircleIcon}
              color="text-green-400"
            />
            <KPICard
              title="Average Accuracy"
              value={`${overallKPIs.averageAccuracy.toFixed(1)}%`}
              icon={ArrowTrendingUpIcon}
              color="text-purple-400"
            />
            <KPICard
              title="Pending Variances"
              value={overallKPIs.pendingVariances}
              subtitle={
                overallKPIs.highValueVarianceCount > 0
                  ? `${overallKPIs.highValueVarianceCount} high severity`
                  : undefined
              }
              icon={ExclamationTriangleIcon}
              color={overallKPIs.pendingVariances > 0 ? 'text-yellow-400' : 'text-green-400'}
            />
          </div>
        )}

        {/* Accuracy Trend Chart */}
        <div className="mb-8">
          <AccuracyChart data={accuracyTrend} />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Discrepancies */}
          <TopDiscrepanciesTable data={topDiscrepancies} />

          {/* Zone Performance */}
          <ZonePerformanceChart data={zonePerformance} />
        </div>

        {/* User Performance */}
        <div className="mb-8">
          <UserPerformanceTable data={userPerformance} />
        </div>

        {/* Count Type Effectiveness */}
        <div>
          <CountTypeEffectivenessTable data={countTypeEffectiveness} />
        </div>

        {/* Additional Stats Footer */}
        {overallKPIs && (
          <div className="mt-8 glass-card rounded-xl p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{overallKPIs.inProgressCounts}</p>
                <p className="text-sm text-gray-400 mt-1">In Progress</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{overallKPIs.scheduledCounts}</p>
                <p className="text-sm text-gray-400 mt-1">Scheduled</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{overallKPIs.totalItemsCounted}</p>
                <p className="text-sm text-gray-400 mt-1">Items Counted</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{overallKPIs.totalVariances}</p>
                <p className="text-sm text-gray-400 mt-1">Total Variances</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
