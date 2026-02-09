/**
 * Purchasing Dashboard Page
 *
 * Main dashboard for purchasing operations
 * Shows metrics for requisitions, RFQs, POs, receipts, and vendor performance
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface DashboardMetrics {
  pending_requisitions: number;
  requisitions_awaiting_approval: number;
  approved_requisitions_this_month: number;
  active_rfqs: number;
  rfqs_awaiting_response: number;
  rfqs_awarded_this_month: number;
  open_orders: number;
  orders_past_due: number;
  orders_ready_to_pay: number;
  total_open_order_value: number;
  pending_receipts: number;
  receipts_today: number;
  receipts_this_month: number;
  match_exceptions: number;
  pending_invoices: number;
  matched_this_month: number;
  vendors_at_risk: number;
  new_vendors_this_month: number;
  top_performers: Array<{
    vendor_id: string;
    overall_rating: number;
    total_spend: number;
  }>;
}

export default function PurchasingDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'requisitions' | 'rfqs' | 'orders' | 'vendors'
  >('overview');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/purchasing/dashboard', {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Purchasing Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage purchase requisitions, RFQs, orders, and vendor performance
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/purchasing/requisitions/new"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                New Requisition
              </Link>
              <Link
                to="/purchasing/orders/new"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                New PO
              </Link>
              <Link
                to="/purchasing/rfqs/new"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                New RFQ
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-2 border-b border-slate-700/50 mb-6">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'requisitions', label: 'Requisitions' },
            { id: 'rfqs', label: 'RFQs' },
            { id: 'orders', label: 'Orders' },
            { id: 'vendors', label: 'Vendors' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard
                title="Pending Requisitions"
                value={metrics?.pending_requisitions || 0}
                subtitle="Awaiting approval"
                link="/purchasing/requisitions?status=PENDING_APPROVAL"
                color="amber"
              />
              <MetricCard
                title="Open RFQs"
                value={metrics?.active_rfqs || 0}
                subtitle="Awaiting vendor response"
                link="/purchasing/rfqs?status=RESPONSES_PENDING"
                color="purple"
              />
              <MetricCard
                title="Open Orders"
                value={metrics?.open_orders || 0}
                subtitle={`Value: $${((metrics?.total_open_order_value || 0) / 1000).toFixed(1)}K`}
                link="/purchasing/orders?status=OPEN"
                color="emerald"
              />
              <MetricCard
                title="Match Exceptions"
                value={metrics?.match_exceptions || 0}
                subtitle="Require attention"
                link="/purchasing/match/exceptions"
                color="red"
              />
            </div>

            {/* Vendor Performance */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Vendor Performance</h2>
                <Link
                  to="/purchasing/vendors/performance"
                  className="text-blue-400 text-sm hover:text-blue-300"
                >
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Vendors at Risk"
                  value={metrics?.vendors_at_risk || 0}
                  subtitle="Performance issues"
                  link="/purchasing/vendors?risk=true"
                  color="red"
                />
                <MetricCard
                  title="New Vendors"
                  value={metrics?.new_vendors_this_month || 0}
                  subtitle="Added this month"
                  link="/purchasing/vendors?new=true"
                  color="blue"
                />
                <MetricCard
                  title="Top Performers"
                  value={metrics?.top_performers?.length || 0}
                  subtitle="Rated 4+ stars"
                  link="/purchasing/vendors?top=true"
                  color="emerald"
                />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Quick Links</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link
                  to="/purchasing/requisitions"
                  className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors text-center"
                >
                  <p className="text-white font-medium">Requisitions</p>
                  <p className="text-slate-400 text-sm">View all</p>
                </Link>
                <Link
                  to="/purchasing/rfqs"
                  className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors text-center"
                >
                  <p className="text-white font-medium">RFQs</p>
                  <p className="text-slate-400 text-sm">Manage quotes</p>
                </Link>
                <Link
                  to="/purchasing/orders"
                  className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors text-center"
                >
                  <p className="text-white font-medium">Orders</p>
                  <p className="text-slate-400 text-sm">Purchase orders</p>
                </Link>
                <Link
                  to="/purchasing/receipts"
                  className="p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors text-center"
                >
                  <p className="text-white font-medium">Receipts</p>
                  <p className="text-slate-400 text-sm">Goods receipt</p>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Requisitions Tab */}
        {selectedTab === 'requisitions' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Pending Approval"
                value={metrics?.requisitions_awaiting_approval || 0}
                subtitle="Require action"
                link="/purchasing/requisitions?status=SUBMITTED"
                color="amber"
              />
              <MetricCard
                title="Approved This Month"
                value={metrics?.approved_requisitions_this_month || 0}
                subtitle="Completed approvals"
                link="/purchasing/requisitions?status=APPROVED"
                color="emerald"
              />
              <MetricCard
                title="Total Pending"
                value={metrics?.pending_requisitions || 0}
                subtitle="All pending requisitions"
                link="/purchasing/requisitions?status=DRAFT"
                color="blue"
              />
            </div>
          </div>
        )}

        {/* RFQs Tab */}
        {selectedTab === 'rfqs' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Awaiting Response"
                value={metrics?.rfqs_awaiting_response || 0}
                subtitle="Sent to vendors"
                link="/purchasing/rfqs?status=SENT"
                color="purple"
              />
              <MetricCard
                title="Awarded This Month"
                value={metrics?.rfqs_awarded_this_month || 0}
                subtitle="Successfully awarded"
                link="/purchasing/rfqs?status=AWARDED"
                color="emerald"
              />
              <MetricCard
                title="Active RFQs"
                value={metrics?.active_rfqs || 0}
                subtitle="In progress"
                link="/purchasing/rfqs?status=ACTIVE"
                color="blue"
              />
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {selectedTab === 'orders' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard
                title="Open Orders"
                value={metrics?.open_orders || 0}
                subtitle={`Value: $${((metrics?.total_open_order_value || 0) / 1000).toFixed(1)}K`}
                link="/purchasing/orders?status=OPEN"
                color="emerald"
              />
              <MetricCard
                title="Past Due"
                value={metrics?.orders_past_due || 0}
                subtitle="Require attention"
                link="/purchasing/orders?due=OVERDUE"
                color="red"
              />
              <MetricCard
                title="Ready to Pay"
                value={metrics?.orders_ready_to_pay || 0}
                subtitle="3-way matched"
                link="/purchasing/orders?payable=TRUE"
                color="blue"
              />
              <MetricCard
                title="Match Exceptions"
                value={metrics?.match_exceptions || 0}
                subtitle="Variance detected"
                link="/purchasing/match/exceptions"
                color="amber"
              />
            </div>

            {/* Three-Way Match Status */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Three-Way Match Status</h2>
                <Link
                  to="/purchasing/match/exceptions"
                  className="text-blue-400 text-sm hover:text-blue-300"
                >
                  View Exceptions
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <p className="text-slate-400 text-sm">Pending Receipt</p>
                  <p className="text-white text-xl font-semibold mt-1">--</p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <p className="text-slate-400 text-sm">Pending Invoice</p>
                  <p className="text-white text-xl font-semibold mt-1">
                    {metrics?.pending_invoices || 0}
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <p className="text-slate-400 text-sm">Matched This Month</p>
                  <p className="text-emerald-400 text-xl font-semibold mt-1">
                    {metrics?.matched_this_month || 0}
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <p className="text-slate-400 text-sm">Exceptions</p>
                  <p className="text-red-400 text-xl font-semibold mt-1">
                    {metrics?.match_exceptions || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vendors Tab */}
        {selectedTab === 'vendors' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard
                title="Vendors at Risk"
                value={metrics?.vendors_at_risk || 0}
                subtitle="Performance issues"
                link="/purchasing/vendors?risk=true"
                color="red"
              />
              <MetricCard
                title="New Vendors"
                value={metrics?.new_vendors_this_month || 0}
                subtitle="Added this month"
                link="/purchasing/vendors?new=true"
                color="blue"
              />
              <MetricCard
                title="Top Performers"
                value={metrics?.top_performers?.length || 0}
                subtitle="Rated 4+ stars"
                link="/purchasing/vendors?top=true"
                color="emerald"
              />
              <MetricCard
                title="Pending Receipts"
                value={metrics?.pending_receipts || 0}
                subtitle="Awaiting processing"
                link="/purchasing/receipts?status=OPEN"
                color="amber"
              />
            </div>

            {/* Top Performing Vendors */}
            {metrics?.top_performers && metrics.top_performers.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Top Performing Vendors</h2>
                <div className="space-y-3">
                  {metrics.top_performers.slice(0, 5).map((vendor, index) => (
                    <div
                      key={vendor.vendor_id}
                      className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : index === 1
                                ? 'bg-slate-400/20 text-slate-300'
                                : index === 2
                                  ? 'bg-orange-600/20 text-orange-400'
                                  : 'bg-slate-600/20 text-slate-400'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-white font-medium">Vendor {vendor.vendor_id}</p>
                          <p className="text-slate-400 text-sm">
                            ${vendor.total_spend.toLocaleString()} total spend
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-semibold">
                          {vendor.overall_rating.toFixed(1)}
                        </span>
                        <svg
                          className="w-5 h-5 text-yellow-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
