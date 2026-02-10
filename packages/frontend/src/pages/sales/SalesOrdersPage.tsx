/**
 * Sales Orders Page
 *
 * Main page for managing sales orders
 * Includes order listing, filtering, status management, and quick actions
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  DocumentTextIcon,
  TruckIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface SalesOrder {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerPoNumber?: string;
  orderStatus: string;
  totalAmount: number;
  salesPerson?: string;
  territory?: string;
  promisedDate?: string;
  isBackorder: boolean;
  linesCount: number;
  itemsShipped: number;
  itemsTotal: number;
}

interface Customer {
  customerId: string;
  customerName: string;
}

interface SalesPerson {
  employeeId: string;
  firstName: string;
  lastName: string;
}

interface Territory {
  territoryId: string;
  territoryName: string;
}

export default function SalesOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedSalesPerson, setSelectedSalesPerson] = useState('');
  const [selectedTerritory, setSelectedTerritory] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter options
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesPeople, setSalesPeople] = useState<SalesPerson[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);

  // Metrics
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    openOrders: 0,
    shippedToday: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    fetchOrders();
    fetchFilterOptions();
    fetchMetrics();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (
        searchTerm ||
        selectedStatus ||
        selectedCustomer ||
        selectedSalesPerson ||
        selectedTerritory
      ) {
        fetchFilteredOrders();
      } else {
        fetchOrders();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedStatus, selectedCustomer, selectedSalesPerson, selectedTerritory]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sales/orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedStatus) params.append('orderStatus', selectedStatus);
      if (selectedCustomer) params.append('customerId', selectedCustomer);
      if (selectedSalesPerson) params.append('salesPersonId', selectedSalesPerson);
      if (selectedTerritory) params.append('territoryId', selectedTerritory);

      const response = await fetch(`/api/sales/orders?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching filtered orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Fetch customers
      const custResponse = await fetch('/api/sales/customers?limit=100', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (custResponse.ok) {
        const data = await custResponse.json();
        setCustomers(data.customers || []);
      }

      // Fetch sales people (employees)
      const empResponse = await fetch('/api/hr/employees?status=ACTIVE', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (empResponse.ok) {
        const data = await empResponse.json();
        setSalesPeople(data || []);
      }

      // Fetch territories
      const terrResponse = await fetch('/api/sales/territories', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (terrResponse.ok) {
        const data = await terrResponse.json();
        setTerritories(data || []);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/sales/orders/metrics', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/sales/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ orderStatus: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
        fetchMetrics();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400';
      case 'PENDING':
        return 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
      case 'PICKING':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400';
      case 'PICKED':
        return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400';
      case 'PARTIAL':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400';
      case 'SHIPPED':
        return 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400';
      case 'INVOICED':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'CLOSED':
        return 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PICKING':
      case 'PICKED':
        return <TruckIcon className="h-4 w-4" />;
      case 'SHIPPED':
        return <TruckIcon className="h-4 w-4" />;
      case 'INVOICED':
      case 'CLOSED':
        return <CheckIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Orders</h1>
            <p className="text-gray-600 dark:text-slate-400 text-sm">Manage customer orders and fulfillment</p>
          </div>
          <Link
            to="/sales/orders/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            New Order
          </Link>
        </div>

        {/* Metrics */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card title="Total Orders" className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-0">
            <p className="text-3xl font-bold text-blue-500 dark:text-blue-400">{metrics.totalOrders}</p>
          </Card>
          <Card title="Pending" className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-0">
            <p className="text-3xl font-bold text-amber-500 dark:text-amber-400">{metrics.pendingOrders}</p>
          </Card>
          <Card title="Open" className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-0">
            <p className="text-3xl font-bold text-purple-500 dark:text-purple-400">{metrics.openOrders}</p>
          </Card>
          <Card title="Shipped Today" className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-0">
            <p className="text-3xl font-bold text-cyan-500 dark:text-cyan-400">{metrics.shippedToday}</p>
          </Card>
          <Card title="Revenue" className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-0">
            <p className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">
              ${metrics.totalRevenue.toLocaleString()}
            </p>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                showFilters ||
                selectedStatus ||
                selectedCustomer ||
                selectedSalesPerson ||
                selectedTerritory
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-600 dark:text-slate-400 text-xs mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PICKING">Picking</option>
                  <option value="PICKED">Picked</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="INVOICED">Invoiced</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 dark:text-slate-400 text-xs mb-2">Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                >
                  <option value="">All Customers</option>
                  {customers.map(cust => (
                    <option key={cust.customerId} value={cust.customerId}>
                      {cust.customerName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-600 dark:text-slate-400 text-xs mb-2">Sales Person</label>
                <select
                  value={selectedSalesPerson}
                  onChange={e => setSelectedSalesPerson(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                >
                  <option value="">All Sales People</option>
                  {salesPeople.map(sp => (
                    <option key={sp.employeeId} value={sp.employeeId}>
                      {sp.firstName} {sp.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-600 dark:text-slate-400 text-xs mb-2">Territory</label>
                <select
                  value={selectedTerritory}
                  onChange={e => setSelectedTerritory(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                >
                  <option value="">All Territories</option>
                  {territories.map(terr => (
                    <option key={terr.territoryId} value={terr.territoryId}>
                      {terr.territoryName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </Card>

        {/* Orders List */}
        <Card className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-slate-400">No sales orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-slate-400 text-xs border-b border-gray-200 dark:border-slate-700/50">
                    <th className="pb-3 font-medium">Order</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                    <th className="pb-3 font-medium">Sales Person</th>
                    <th className="pb-3 font-medium">Fulfillment</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr
                      key={order.orderId}
                      className="border-b border-gray-100 dark:border-slate-700/30 hover:bg-gray-50 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {order.isBackorder && (
                            <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs rounded">
                              BO
                            </span>
                          )}
                          <Link
                            to={`/sales/orders/${order.orderId}`}
                            className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 font-medium"
                          >
                            {order.orderNumber}
                          </Link>
                          {order.customerPoNumber && (
                            <span className="text-gray-400 dark:text-slate-500 text-xs">
                              PO: {order.customerPoNumber}
                            </span>
                          )}
                        </div>
                        {order.promisedDate && (
                          <p className="text-gray-400 dark:text-slate-500 text-xs">
                            Due: {new Date(order.promisedDate).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-gray-900 dark:text-white">{order.customerName}</td>
                      <td className="py-3 text-gray-500 dark:text-slate-400 text-sm">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus)}`}
                        >
                          {getStatusIcon(order.orderStatus)}
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-900 dark:text-white font-medium">
                        ${order.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 text-gray-500 dark:text-slate-400 text-sm">{order.salesPerson || '-'}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2 w-20">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{
                                width: `${order.itemsTotal > 0 ? (order.itemsShipped / order.itemsTotal) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-gray-400 dark:text-slate-400 text-xs">
                            {order.itemsShipped}/{order.itemsTotal}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/sales/orders/${order.orderId}`}
                            className="p-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4 text-gray-400 dark:text-slate-400" />
                          </Link>
                          {['DRAFT', 'PENDING'].includes(order.orderStatus) && (
                            <>
                              <button
                                onClick={() => updateOrderStatus(order.orderId, 'CONFIRMED')}
                                className="p-1.5 bg-emerald-100 dark:bg-emerald-600/20 hover:bg-emerald-200 dark:hover:bg-emerald-600/30 rounded-lg transition-colors"
                                title="Confirm"
                              >
                                <CheckIcon className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                              </button>
                            </>
                          )}
                          {order.orderStatus === 'PICKED' && (
                            <button
                              onClick={() => updateOrderStatus(order.orderId, 'SHIPPED')}
                              className="p-1.5 bg-cyan-100 dark:bg-cyan-600/20 hover:bg-cyan-200 dark:hover:bg-cyan-600/30 rounded-lg transition-colors"
                              title="Mark Shipped"
                            >
                              <TruckIcon className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}