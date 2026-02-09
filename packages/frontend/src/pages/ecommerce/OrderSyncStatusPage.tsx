/**
 * Order Sync Status Page
 *
 * Page for viewing and managing order synchronization status
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CloudArrowDownIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface OrderSync {
  syncId: string;
  connectionId: string;
  connectionName: string;
  platformType: string;
  externalOrderId: string;
  internalOrderId?: string;
  syncStatus: string;
  syncType: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface ConnectionStatus {
  connectionId: string;
  connectionName: string;
  platformType: string;
  pendingOrders: number;
  todaySyncs: number;
  failedSyncs: number;
}

export default function OrderSyncStatusPage() {
  const navigate = useNavigate();
  const [syncs, setSyncs] = useState<OrderSync[]>([]);
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedConnection, setSelectedConnection] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [syncsRes, connectionsRes] = await Promise.all([
        fetch('/api/ecommerce/status', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/ecommerce/pending', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      if (syncsRes.ok) {
        const syncsData = await syncsRes.json();

        // Get order syncs from the detailed status
        const orderSyncs = await fetch('/api/ecommerce/errors', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });

        if (orderSyncs.ok) {
          const errorsData = await orderSyncs.json();
          // Combine sync data with error data
          setSyncs(errorsData || []);
        }
      }

      if (connectionsRes.ok) {
        const connectionsData = await connectionsRes.json();
        setConnections(connectionsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncOrders = async (connectionId: string) => {
    setSyncing(true);
    try {
      const response = await fetch('/api/ecommerce/sync/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          connectionId,
          daysToLookBack: 7,
        }),
      });

      if (response.ok) {
        alert('Order sync initiated successfully');
        fetchData();
      } else {
        alert('Failed to initiate order sync');
      }
    } catch (error) {
      console.error('Error syncing orders:', error);
      alert('Error syncing orders');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'FAILED':
        return 'bg-red-500/20 text-red-400';
      case 'PENDING':
        return 'bg-amber-500/20 text-amber-400';
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'FAILED':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'PENDING':
        return <ClockIcon className="h-4 w-4" />;
      default:
        return <DocumentTextIcon className="h-4 w-4" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'SHOPIFY':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'WOOCOMMERCE':
        return 'bg-purple-500/20 text-purple-400';
      case 'MAGENTO':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const filteredSyncs = syncs.filter(
    sync =>
      sync.externalOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      '' ||
      sync.connectionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ''
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/ecommerce')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Order Sync Status</h1>
              <p className="text-slate-400 text-sm">Monitor and manage order synchronization</p>
            </div>
          </div>
        </div>

        {/* Connection Status Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {connections.map(conn => (
            <Card
              key={conn.connectionId}
              className={`bg-slate-800/50 border ${
                conn.failedSyncs > 0 ? 'border-red-500/30' : 'border-slate-700/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${getPlatformColor(conn.platformType)}`}
                  >
                    {conn.platformType}
                  </span>
                  <h3 className="text-white font-medium">{conn.connectionName}</h3>
                </div>
                <button
                  onClick={() => syncOrders(conn.connectionId)}
                  disabled={syncing}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <CloudArrowDownIcon className="h-3 w-3" />
                  Sync
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-amber-400 font-semibold">{conn.pendingOrders}</p>
                  <p className="text-xs text-slate-400">Pending</p>
                </div>
                <div>
                  <p className="text-emerald-400 font-semibold">{conn.todaySyncs}</p>
                  <p className="text-xs text-slate-400">Today</p>
                </div>
                <div>
                  <p className="text-red-400 font-semibold">{conn.failedSyncs}</p>
                  <p className="text-xs text-slate-400">Failed</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by order ID or connection..."
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
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
            </select>
            <button
              onClick={fetchData}
              disabled={syncing}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </Card>

        {/* Sync History */}
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Sync History</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredSyncs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <DocumentTextIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p>No sync history found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                    <th className="pb-3 font-medium">External Order ID</th>
                    <th className="pb-3 font-medium">Connection</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Started</th>
                    <th className="pb-3 font-medium">Completed</th>
                    <th className="pb-3 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSyncs.map(sync => (
                    <tr
                      key={sync.syncId}
                      className="border-b border-slate-700/30 hover:bg-slate-800/30"
                    >
                      <td className="py-3">
                        <div>
                          <p className="text-white font-medium">{sync.externalOrderId}</p>
                          {sync.internalOrderId && (
                            <p className="text-slate-400 text-xs">→ {sync.internalOrderId}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="text-white text-sm">{sync.connectionName}</p>
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs ${getPlatformColor(sync.platformType)}`}
                          >
                            {sync.platformType}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${getStatusColor(sync.syncStatus)}`}
                        >
                          {getStatusIcon(sync.syncStatus)}
                          {sync.syncStatus}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 text-sm">
                        {new Date(sync.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 text-slate-400 text-sm">
                        {sync.completedAt ? new Date(sync.completedAt).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 text-red-400 text-sm max-w-xs truncate">
                        {sync.errorMessage || '-'}
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
