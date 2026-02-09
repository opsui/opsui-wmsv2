/**
 * Backorders Page
 *
 * Page for managing backorders
 * Shows pending backorders, fulfillment options, and linking to original orders
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  TruckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface Backorder {
  backorderId: string;
  originalOrderNumber: string;
  orderNumber: string;
  sku: string;
  description: string;
  quantityOriginal: number;
  quantityOutstanding: number;
  quantityFulfilled: number;
  promisedDate?: string;
  customerName: string;
  status: string;
  priority: number;
  stockAvailable?: number;
}

export default function BackordersPage() {
  const navigate = useNavigate();
  const [backorders, setBackorders] = useState<Backorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const metrics = {
    totalBackorders: backorders.length,
    urgentCount: backorders.filter(
      b =>
        b.promisedDate && new Date(b.promisedDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ).length,
    totalItemsOutstanding: backorders.reduce((sum, b) => sum + b.quantityOutstanding, 0),
    fulfillmentRate:
      backorders.length > 0
        ? (backorders.reduce((sum, b) => sum + b.quantityFulfilled, 0) /
            backorders.reduce((sum, b) => sum + b.quantityOriginal, 0)) *
          100
        : 0,
  };

  useEffect(() => {
    fetchBackorders();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm || selectedStatus) {
        fetchFilteredBackorders();
      } else {
        fetchBackorders();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedStatus]);

  const fetchBackorders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sales/backorders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBackorders(data || []);
      }
    } catch (error) {
      console.error('Error fetching backorders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredBackorders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await fetch(`/api/sales/backorders?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBackorders(data || []);
      }
    } catch (error) {
      console.error('Error fetching filtered backorders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fulfillBackorder = async (backorderId: string, quantity: number) => {
    try {
      const response = await fetch(`/api/sales/backorders/${backorderId}/fulfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ quantity }),
      });

      if (response.ok) {
        fetchBackorders();
      }
    } catch (error) {
      console.error('Error fulfilling backorder:', error);
    }
  };

  const isOverdue = (promisedDate?: string) => {
    if (!promisedDate) return false;
    return new Date(promisedDate) < new Date();
  };

  const isUrgent = (promisedDate?: string) => {
    if (!promisedDate) return false;
    const dueDate = new Date(promisedDate);
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return dueDate < weekFromNow;
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'text-red-400';
    if (priority <= 4) return 'text-amber-400';
    return 'text-slate-400';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority <= 2) return 'High';
    if (priority <= 4) return 'Medium';
    return 'Low';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate('/sales')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Backorders</h1>
            <p className="text-slate-400 text-sm">Manage pending backorders and fulfillment</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card title="Total Backorders" className="bg-slate-800/50">
            <p className="text-3xl font-bold text-blue-400">{metrics.totalBackorders}</p>
          </Card>
          <Card title="Urgent (< 7 days)" className="bg-slate-800/50">
            <p className="text-3xl font-bold text-red-400">{metrics.urgentCount}</p>
          </Card>
          <Card title="Items Outstanding" className="bg-slate-800/50">
            <p className="text-3xl font-bold text-amber-400">{metrics.totalItemsOutstanding}</p>
          </Card>
          <Card title="Fulfillment Rate" className="bg-slate-800/50">
            <p className="text-3xl font-bold text-emerald-400">
              {metrics.fulfillmentRate.toFixed(1)}%
            </p>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search backorders..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="PARTIAL">Partial</option>
              <option value="FULFILLED">Fulfilled</option>
            </select>
          </div>
        </Card>

        {/* Backorders List */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : backorders.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No backorders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                    <th className="pb-3 font-medium">Backorder</th>
                    <th className="pb-3 font-medium">Original Order</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Item</th>
                    <th className="pb-3 font-medium text-right">Original</th>
                    <th className="pb-3 font-medium text-right">Outstanding</th>
                    <th className="pb-3 font-medium text-right">Fulfilled</th>
                    <th className="pb-3 font-medium">Due Date</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium">Stock</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backorders.map(backorder => (
                    <tr
                      key={backorder.backorderId}
                      className={`border-b border-slate-700/30 hover:bg-slate-800/30 ${
                        isOverdue(backorder.promisedDate) ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="py-3">
                        <Link
                          to={`/sales/backorders/${backorder.backorderId}`}
                          className="text-blue-400 hover:text-blue-300 font-medium"
                        >
                          {backorder.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3">
                        <Link
                          to={`/sales/orders/${backorder.backorderId}`}
                          className="text-slate-400 hover:text-slate-300 text-sm"
                        >
                          {backorder.originalOrderNumber}
                        </Link>
                      </td>
                      <td className="py-3 text-white">{backorder.customerName}</td>
                      <td className="py-3">
                        <div>
                          <p className="text-white text-sm font-medium">{backorder.sku}</p>
                          <p className="text-slate-500 text-xs truncate max-w-xs">
                            {backorder.description}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 text-right text-slate-400">
                        {backorder.quantityOriginal}
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-white font-semibold">
                          {backorder.quantityOutstanding}
                        </span>
                      </td>
                      <td className="py-3 text-right text-emerald-400">
                        {backorder.quantityFulfilled}
                      </td>
                      <td className="py-3">
                        {backorder.promisedDate ? (
                          <div className="flex items-center gap-1">
                            {isOverdue(backorder.promisedDate) && (
                              <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />
                            )}
                            <span
                              className={`text-sm ${
                                isOverdue(backorder.promisedDate)
                                  ? 'text-red-400 font-medium'
                                  : isUrgent(backorder.promisedDate)
                                    ? 'text-amber-400'
                                    : 'text-slate-400'
                              }`}
                            >
                              {new Date(backorder.promisedDate).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-sm font-medium ${getPriorityColor(backorder.priority)}`}
                        >
                          {getPriorityLabel(backorder.priority)}
                        </span>
                      </td>
                      <td className="py-3">
                        {backorder.stockAvailable !== undefined ? (
                          <span
                            className={`text-sm ${
                              backorder.stockAvailable >= backorder.quantityOutstanding
                                ? 'text-emerald-400'
                                : backorder.stockAvailable > 0
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                            }`}
                          >
                            {backorder.stockAvailable}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {backorder.status === 'OPEN' && backorder.quantityOutstanding > 0 && (
                          <button
                            onClick={() => {
                              const fulfillQty = Math.min(
                                backorder.quantityOutstanding,
                                backorder.stockAvailable || backorder.quantityOutstanding
                              );
                              if (fulfillQty > 0) {
                                fulfillBackorder(backorder.backorderId, fulfillQty);
                              }
                            }}
                            disabled={!backorder.stockAvailable || backorder.stockAvailable <= 0}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ml-auto ${
                              backorder.stockAvailable && backorder.stockAvailable > 0
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <CheckIcon className="h-4 w-4" />
                            Fulfill
                          </button>
                        )}
                        {backorder.status === 'FULFILLED' && (
                          <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium inline-flex items-center gap-1">
                            <CheckIcon className="h-4 w-4" />
                            Complete
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Overdue Alert */}
        {backorders.some(b => isOverdue(b.promisedDate)) && (
          <Card className="mt-6 bg-red-500/10 border-red-500/30">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-400 font-semibold mb-1">Overdue Backorders Detected</h3>
                <p className="text-red-300 text-sm">
                  {backorders.filter(b => isOverdue(b.promisedDate)).length} backorder(s) are past
                  their promised date. Contact customers and prioritize fulfillment.
                </p>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
