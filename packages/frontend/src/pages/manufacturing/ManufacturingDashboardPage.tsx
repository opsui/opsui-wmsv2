/**
 * Manufacturing Dashboard Page
 *
 * Main dashboard for manufacturing operations
 * Shows metrics for production orders, work centers, quality, and capacity
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface DashboardMetrics {
  active_orders: number;
  orders_past_due: number;
  orders_today: number;
  orders_ready_to_ship: number;
  work_centers_active: number;
  work_centers_idle: number;
  work_centers_overloaded: number;
  overall_utilization_percent: number;
  units_produced_today: number;
  units_produced_this_month: number;
  scrap_rate_percent: number;
  rework_rate_percent: number;
  first_pass_yield_percent: number;
  defects_today: number;
  inspections_pending: number;
  capacity_utilization_percent: number;
  overloaded_work_centers: number;
  mps_items_firm: number;
  mrp_action_messages_pending: number;
}

export default function ManufacturingDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/manufacturing/dashboard', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, subtitle, link, color = 'blue' }: any) => (
    <Link
      to={link || '#'}
      className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-all"
    >
      <h3 className="text-slate-400 text-sm font-medium mb-2">{title}</h3>
      <p className={`text-3xl font-bold text-${color}-400 mb-1`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtitle && <p className="text-slate-500 text-xs">{subtitle}</p>}
    </Link>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Manufacturing Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">
                Production control, MRP, and shop floor management
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/manufacturing/production-orders/new"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                New Work Order
              </Link>
              <Link
                to="/manufacturing/routings/new"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                New Routing
              </Link>
              <Link
                to="/manufacturing/mrp/run"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Run MRP
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <MetricCard
            title="Active Orders"
            value={metrics?.active_orders || 0}
            subtitle="In production"
            link="/manufacturing/orders?status=RELEASED"
            color="blue"
          />
          <MetricCard
            title="Past Due"
            value={metrics?.orders_past_due || 0}
            subtitle="Require attention"
            link="/manufacturing/orders?due=PAST_DUE"
            color="red"
          />
          <MetricCard
            title="Ready to Ship"
            value={metrics?.orders_ready_to_ship || 0}
            subtitle="Completed"
            link="/manufacturing/orders?status=COMPLETED"
            color="emerald"
          />
          <MetricCard
            title="Work Centers"
            value={metrics?.work_centers_active || 0}
            subtitle="Active"
            link="/manufacturing/work-centers"
            color="purple"
          />
          <MetricCard
            title="Utilization"
            value={`${metrics?.overall_utilization_percent?.toFixed(1) || 0}%`}
            subtitle="Capacity utilized"
            link="/manufacturing/capacity"
            color="amber"
          />
        </div>

        {/* Production Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Production Metrics */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Production Metrics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Units Today</p>
                <p className="text-white text-2xl font-semibold">
                  {(metrics?.units_produced_today || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Units This Month</p>
                <p className="text-white text-2xl font-semibold">
                  {(metrics?.units_produced_this_month || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Scrap Rate</p>
                <p
                  className={`text-lg font-semibold ${(metrics?.scrap_rate_percent || 0) > 5 ? 'text-red-400' : 'text-emerald-400'}`}
                >
                  {(metrics?.scrap_rate_percent || 0).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">First Pass Yield</p>
                <p className="text-white text-2xl font-semibold">
                  {(metrics?.first_pass_yield_percent || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quality Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Defects Today</p>
                <p className="text-red-400 text-2xl font-semibold">{metrics?.defects_today || 0}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Pending Inspections</p>
                <p className="text-amber-400 text-2xl font-semibold">
                  {metrics?.inspections_pending || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Planning Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* MRP Actions */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">MRP Actions</h2>
              <Link
                to="/manufacturing/mrp/actions"
                className="text-blue-400 text-sm hover:text-blue-300"
              >
                View All
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-slate-300">Pending Actions</span>
                <span className="text-amber-400 font-semibold">
                  {metrics?.mrp_action_messages_pending || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-slate-300">Firm MPS Items</span>
                <span className="text-blue-400 font-semibold">{metrics?.mps_items_firm || 0}</span>
              </div>
            </div>
          </div>

          {/* Capacity Status */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Capacity Status</h2>
              <Link
                to="/manufacturing/capacity"
                className="text-blue-400 text-sm hover:text-blue-300"
              >
                View Details
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-slate-300">Capacity Utilization</span>
                <span
                  className={`font-semibold ${(metrics?.capacity_utilization_percent || 0) > 90 ? 'text-red-400' : 'text-emerald-400'}`}
                >
                  {(metrics?.capacity_utilization_percent || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-slate-300">Overloaded Work Centers</span>
                <span className="text-red-400 font-semibold">
                  {metrics?.overloaded_work_centers || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              to="/manufacturing/orders"
              className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors text-center"
            >
              <p className="text-white font-medium">Production Orders</p>
              <p className="text-slate-400 text-sm">Manage work orders</p>
            </Link>
            <Link
              to="/manufacturing/routings"
              className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors text-center"
            >
              <p className="text-white font-medium">Routings</p>
              <p className="text-slate-400 text-sm">BOM & operations</p>
            </Link>
            <Link
              to="/manufacturing/work-centers"
              className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors text-center"
            >
              <p className="text-white font-medium">Work Centers</p>
              <p className="text-slate-400 text-sm">Capacity & load</p>
            </Link>
            <Link
              to="/manufacturing/shop-floor"
              className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors text-center"
            >
              <p className="text-white font-medium">Shop Floor</p>
              <p className="text-slate-400 text-sm">Real-time tracking</p>
            </Link>
            <Link
              to="/manufacturing/mrp"
              className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors text-center"
            >
              <p className="text-white font-medium">MRP</p>
              <p className="text-slate-400 text-sm">Material planning</p>
            </Link>
            <Link
              to="/manufacturing/quality"
              className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors text-center"
            >
              <p className="text-white font-medium">Quality</p>
              <p className="text-slate-400 text-sm">Inspections & defects</p>
            </Link>
            <Link
              to="/manufacturing/capacity"
              className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors text-center"
            >
              <p className="text-white font-medium">Capacity</p>
              <p className="text-slate-400 text-sm">Planning & analysis</p>
            </Link>
            <Link
              to="/manufacturing/reports"
              className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors text-center"
            >
              <p className="text-white font-medium">Reports</p>
              <p className="text-slate-400 text-sm">Analytics & KPIs</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
