/**
 * Production Analytics Dashboard
 *
 * Comprehensive production metrics and KPIs
 * OEE (Overall Equipment Effectiveness) calculations
 * Yield, scrap, downtime tracking
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared';
import { ProductionOrder } from '@opsui/shared';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PauseCircleIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface ProductionAnalyticsDashboardProps {
  orders: ProductionOrder[];
  dateRange?: { start: Date; end: Date };
}

interface OEEMetrics {
  availability: number; // Percentage
  performance: number; // Percentage
  quality: number; // Percentage
  oee: number; // Overall (availability * performance * quality / 10000)
}

interface ProductionStats {
  totalOrders: number;
  completedOrders: number;
  inProgressOrders: number;
  onHoldOrders: number;
  totalQuantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  yieldRate: number; // Percentage
  avgCycleTime: number; // Hours
  overdueOrders: number;
  upcomingDeadlines: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateOEE(
  orders: ProductionOrder[],
  dateRange?: { start: Date; end: Date }
): OEEMetrics {
  const filteredOrders = dateRange
    ? orders.filter(o => {
        const orderDate = new Date(o.scheduledStartDate);
        return orderDate >= dateRange.start && orderDate <= dateRange.end;
      })
    : orders;

  const completedOrders = filteredOrders.filter(o => o.status === 'COMPLETED');

  if (completedOrders.length === 0) {
    return { availability: 0, performance: 0, quality: 0, oee: 0 };
  }

  // Availability: Ratio of actual production time to planned production time
  // Simplified: Orders completed on time vs total planned orders
  const onTimeOrders = completedOrders.filter(o => {
    if (!o.scheduledEndDate) return true;
    return o.actualEndDate && new Date(o.actualEndDate) <= new Date(o.scheduledEndDate);
  }).length;
  const availability = Math.round((onTimeOrders / completedOrders.length) * 100);

  // Performance: Ratio of actual production rate to ideal production rate
  // Simplified: Average completion percentage
  const avgCompletion =
    completedOrders.reduce((sum, o) => {
      const planned = o.quantityToProduce || 1;
      const actual = o.quantityCompleted || 0;
      return sum + actual / planned;
    }, 0) / completedOrders.length;
  const performance = Math.round(Math.min(avgCompletion * 100, 100));

  // Quality: Ratio of good products to total products produced
  const totalProduced = completedOrders.reduce((sum, o) => sum + (o.quantityCompleted || 0), 0);
  const totalRejected = completedOrders.reduce((sum, o) => sum + (o.quantityRejected || 0), 0);
  const goodProducts = totalProduced - totalRejected;
  const quality = totalProduced > 0 ? Math.round((goodProducts / totalProduced) * 100) : 100;

  // OEE = Availability × Performance × Quality / 10000
  const oee = Math.round((availability * performance * quality) / 10000);

  return { availability, performance, quality, oee };
}

function calculateStats(orders: ProductionOrder[]): ProductionStats {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return {
    totalOrders: orders.length,
    completedOrders: orders.filter(o => o.status === 'COMPLETED').length,
    inProgressOrders: orders.filter(o => o.status === 'IN_PROGRESS').length,
    onHoldOrders: orders.filter(o => o.status === 'ON_HOLD').length,
    totalQuantity: orders.reduce((sum, o) => sum + (o.quantityToProduce || 0), 0),
    completedQuantity: orders.reduce((sum, o) => sum + (o.quantityCompleted || 0), 0),
    rejectedQuantity: orders.reduce((sum, o) => sum + (o.quantityRejected || 0), 0),
    yieldRate:
      orders.length > 0
        ? Math.round(
            (orders.reduce((sum, o) => sum + (o.quantityCompleted || 0), 0) /
              orders.reduce((sum, o) => sum + (o.quantityToProduce || 1), 0)) *
              100
          )
        : 0,
    avgCycleTime: 0, // Would need start/end timestamps
    overdueOrders: orders.filter(
      o => o.scheduledEndDate && new Date(o.scheduledEndDate) < now && o.status !== 'COMPLETED'
    ).length,
    upcomingDeadlines: orders.filter(
      o =>
        o.scheduledEndDate &&
        new Date(o.scheduledEndDate) >= today &&
        new Date(o.scheduledEndDate) <= nextWeek &&
        o.status !== 'COMPLETED'
    ).length,
  };
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: 'primary' | 'success' | 'warning' | 'error' | 'gray';
  subtitle?: string;
}

function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  color,
  subtitle,
}: MetricCardProps) {
  const colorClasses = {
    primary: 'border-l-primary-500 bg-primary-500/5',
    success: 'border-l-success-500 bg-success-500/5',
    warning: 'border-l-warning-500 bg-warning-500/5',
    error: 'border-l-error-500 bg-error-500/5',
    gray: 'border-l-gray-500 bg-gray-500/5',
  };

  const iconColors = {
    primary: 'text-primary-400',
    success: 'text-success-400',
    warning: 'text-warning-400',
    error: 'text-error-400',
    gray: 'text-gray-400',
  };

  return (
    <div className={`p-5 rounded-xl border-l-4 ${colorClasses[color]} bg-gray-800/30`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-white">{value}</p>
            {unit && <p className="text-sm text-gray-400">{unit}</p>}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && trendValue && (
            <div
              className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                trend === 'up'
                  ? 'text-success-400'
                  : trend === 'down'
                    ? 'text-error-400'
                    : 'text-gray-400'
              }`}
            >
              {trend === 'up' ? (
                <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
              ) : trend === 'down' ? (
                <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
              ) : null}
              {trendValue}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className={`h-6 w-6 ${iconColors[color]}`} />
        </div>
      </div>
    </div>
  );
}

interface OEEDisplayProps {
  metrics: OEEMetrics;
}

function OEEDisplay({ metrics }: OEEDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success-400';
    if (score >= 60) return 'text-warning-400';
    return 'text-error-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return 'bg-success-500/20 border-success-500/30';
    if (score >= 60) return 'bg-warning-500/20 border-warning-500/30';
    return 'bg-error-500/20 border-error-500/30';
  };

  return (
    <Card variant="glass" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Overall Equipment Effectiveness</h3>
          <p className="text-sm text-gray-400">Industry benchmark: 85% = World Class</p>
        </div>
        <div className={`px-6 py-3 rounded-xl border-2 ${getScoreBg(metrics.oee)}`}>
          <p className="text-4xl font-bold ${getScoreColor(metrics.oee)}">{metrics.oee}%</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Availability */}
        <div className="text-center p-4 bg-gray-800/50 rounded-xl">
          <p className="text-sm text-gray-400 mb-2">Availability</p>
          <p className={`text-2xl font-bold ${getScoreColor(metrics.availability)}`}>
            {metrics.availability}%
          </p>
          <div className="w-full bg-white/[0.08] rounded-full h-2 mt-3">
            <div
              className={`h-2 rounded-full transition-all ${
                metrics.availability >= 85
                  ? 'bg-success-500'
                  : metrics.availability >= 60
                    ? 'bg-warning-500'
                    : 'bg-error-500'
              }`}
              style={{ width: `${metrics.availability}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">On-time delivery rate</p>
        </div>

        {/* Performance */}
        <div className="text-center p-4 bg-gray-800/50 rounded-xl">
          <p className="text-sm text-gray-400 mb-2">Performance</p>
          <p className={`text-2xl font-bold ${getScoreColor(metrics.performance)}`}>
            {metrics.performance}%
          </p>
          <div className="w-full bg-white/[0.08] rounded-full h-2 mt-3">
            <div
              className={`h-2 rounded-full transition-all ${
                metrics.performance >= 85
                  ? 'bg-success-500'
                  : metrics.performance >= 60
                    ? 'bg-warning-500'
                    : 'bg-error-500'
              }`}
              style={{ width: `${metrics.performance}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Production speed vs target</p>
        </div>

        {/* Quality */}
        <div className="text-center p-4 bg-gray-800/50 rounded-xl">
          <p className="text-sm text-gray-400 mb-2">Quality</p>
          <p className={`text-2xl font-bold ${getScoreColor(metrics.quality)}`}>
            {metrics.quality}%
          </p>
          <div className="w-full bg-white/[0.08] rounded-full h-2 mt-3">
            <div
              className={`h-2 rounded-full transition-all ${
                metrics.quality >= 85
                  ? 'bg-success-500'
                  : metrics.quality >= 60
                    ? 'bg-warning-500'
                    : 'bg-error-500'
              }`}
              style={{ width: `${metrics.quality}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Good products vs total</p>
        </div>
      </div>

      {/* OEE Formula */}
      <div className="mt-6 p-4 bg-gray-800/30 rounded-lg text-center text-sm text-gray-400">
        OEE = Availability × Performance × Quality = {metrics.availability}% × {metrics.performance}
        % × {metrics.quality}% ={' '}
        <span className={`font-bold ${getScoreColor(metrics.oee)}`}>{metrics.oee}%</span>
      </div>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductionAnalyticsDashboard({
  orders,
  dateRange,
}: ProductionAnalyticsDashboardProps) {
  const oee = useMemo(() => calculateOEE(orders, dateRange), [orders, dateRange]);
  const stats = useMemo(() => calculateStats(orders), [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Production Analytics</h2>
        <p className="text-gray-400 text-sm mt-1">
          Real-time production metrics and performance indicators
        </p>
      </div>

      {/* OEE Score */}
      <OEEDisplay metrics={oee} />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={CubeIcon}
          color="primary"
          subtitle="All time orders"
        />
        <MetricCard
          title="Completed"
          value={stats.completedOrders}
          unit="orders"
          icon={CheckCircleIcon}
          color="success"
          subtitle={`${stats.completedOrders}/${stats.totalOrders} fulfilled`}
        />
        <MetricCard
          title="Yield Rate"
          value={stats.yieldRate}
          unit="%"
          icon={ArrowTrendingUpIcon}
          color="success"
          subtitle={`${stats.completedQuantity} good units produced`}
        />
        <MetricCard
          title="In Production"
          value={stats.inProgressOrders}
          unit="orders"
          icon={ClockIcon}
          color="primary"
          subtitle={`${stats.onHoldOrders} on hold`}
        />
      </div>

      {/* Quality & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quality Metrics */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Quality Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-400">Good Quantity</p>
                  <p className="text-lg font-semibold text-white">{stats.completedQuantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Rejected</p>
                  <p className="text-lg font-semibold text-error-400">{stats.rejectedQuantity}</p>
                </div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Quality Score</span>
                  <span
                    className={`font-semibold ${oee.quality >= 85 ? 'text-success-400' : oee.quality >= 60 ? 'text-warning-400' : 'text-error-400'}`}
                  >
                    {oee.quality}%
                  </span>
                </div>
                <div className="w-full bg-white/[0.08] rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      oee.quality >= 85
                        ? 'bg-success-500'
                        : oee.quality >= 60
                          ? 'bg-warning-500'
                          : 'bg-error-500'
                    }`}
                    style={{ width: `${oee.quality}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Alerts & Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.overdueOrders > 0 && (
                <div className="flex items-center gap-3 p-3 bg-error-500/10 border border-error-500/30 rounded-lg">
                  <ExclamationTriangleIcon className="h-5 w-5 text-error-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {stats.overdueOrders} Overdue Orders
                    </p>
                    <p className="text-xs text-gray-400">Require immediate attention</p>
                  </div>
                </div>
              )}
              {stats.upcomingDeadlines > 0 && (
                <div className="flex items-center gap-3 p-3 bg-warning-500/10 border border-warning-500/30 rounded-lg">
                  <ClockIcon className="h-5 w-5 text-warning-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {stats.upcomingDeadlines} Deadlines This Week
                    </p>
                    <p className="text-xs text-gray-400">Plan resources accordingly</p>
                  </div>
                </div>
              )}
              {stats.overdueOrders === 0 && stats.upcomingDeadlines === 0 && (
                <div className="flex items-center gap-3 p-3 bg-success-500/10 border border-success-500/30 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-success-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">All Systems Normal</p>
                    <p className="text-xs text-gray-400">No urgent actions required</p>
                  </div>
                </div>
              )}
              {stats.onHoldOrders > 0 && (
                <div className="flex items-center gap-3 p-3 bg-white/[0.05] border border-white/[0.08] rounded-lg">
                  <PauseCircleIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {stats.onHoldOrders} Orders On Hold
                    </p>
                    <p className="text-xs text-gray-400">Awaiting resolution</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
