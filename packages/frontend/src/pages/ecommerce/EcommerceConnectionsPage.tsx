/**
 * E-commerce Connections Page
 *
 * Page for managing e-commerce platform connections
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface EcommerceConnection {
  connectionId: string;
  connectionName: string;
  platformType: string;
  storeUrl: string;
  isActive: boolean;
  syncFrequencyMinutes: number;
  lastSyncAt?: string;
  createdAt: string;
}

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  platformsConnected: number;
  todaySyncs: number;
}

export default function EcommerceConnectionsPage() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<EcommerceConnection[]>([]);
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    totalConnections: 0,
    activeConnections: 0,
    platformsConnected: 0,
    todaySyncs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewConnectionModal, setShowNewConnectionModal] = useState(false);

  // New connection form
  const [newConnection, setNewConnection] = useState({
    connectionName: '',
    platformType: 'SHOPIFY',
    storeUrl: '',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    apiVersion: 'v1',
    syncCustomers: true,
    syncProducts: true,
    syncInventory: true,
    syncOrders: true,
    autoImportOrders: false,
    syncFrequencyMinutes: 60,
  });

  useEffect(() => {
    fetchConnections();
    fetchMetrics();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ecommerce/connections', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setConnections(data || []);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/ecommerce/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics({
          totalConnections: data.length,
          activeConnections: data.filter((c: EcommerceConnection) => c.isActive).length,
          platformsConnected: new Set(data.map((c: EcommerceConnection) => c.platformType)).size,
          todaySyncs: data.reduce((sum: number, c: any) => sum + (c.ordersSyncedToday || 0), 0),
        });
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const createConnection = async () => {
    if (!newConnection.connectionName || !newConnection.storeUrl || !newConnection.apiKey) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/ecommerce/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...newConnection,
          createdBy: localStorage.getItem('userId'),
        }),
      });

      if (response.ok) {
        setShowNewConnectionModal(false);
        setNewConnection({
          connectionName: '',
          platformType: 'SHOPIFY',
          storeUrl: '',
          apiKey: '',
          apiSecret: '',
          accessToken: '',
          apiVersion: 'v1',
          syncCustomers: true,
          syncProducts: true,
          syncInventory: true,
          syncOrders: true,
          autoImportOrders: false,
          syncFrequencyMinutes: 60,
        });
        fetchConnections();
        fetchMetrics();
      } else {
        const error = await response.json();
        alert(`Error creating connection: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating connection:', error);
      alert('Error creating connection');
    }
  };

  const testConnection = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/ecommerce/connections/${connectionId}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Connection test: ${result.success ? 'SUCCESS' : 'FAILED'}\n${result.message}`);
      } else {
        alert('Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      alert('Error testing connection');
    }
  };

  const deleteConnection = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ecommerce/connections/${connectionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        fetchConnections();
        fetchMetrics();
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
      alert('Error deleting connection');
    }
  };

  const getPlatformIcon = (platform: string) => {
    return <GlobeAltIcon className="h-5 w-5" />;
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

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">Active</span>
    ) : (
      <span className="px-2 py-1 rounded text-xs bg-slate-500/20 text-slate-400">Inactive</span>
    );
  };

  const filteredConnections = connections.filter(
    conn =>
      conn.connectionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conn.storeUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conn.platformType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">E-commerce Connections</h1>
            <p className="text-slate-400 text-sm">Manage your platform integrations</p>
          </div>

          <button
            onClick={() => setShowNewConnectionModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add Connection
          </button>
        </div>

        {/* Metrics */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card title="Total Connections" className="bg-slate-800/50">
            <p className="text-2xl font-bold text-blue-400">{metrics.totalConnections}</p>
          </Card>
          <Card title="Active Connections" className="bg-slate-800/50">
            <p className="text-2xl font-bold text-emerald-400">{metrics.activeConnections}</p>
          </Card>
          <Card title="Platforms Connected" className="bg-slate-800/50">
            <p className="text-2xl font-bold text-purple-400">{metrics.platformsConnected}</p>
          </Card>
          <Card title="Today's Syncs" className="bg-slate-800/50">
            <p className="text-2xl font-bold text-amber-400">{metrics.todaySyncs}</p>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search connections..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400"
            />
          </div>
        </Card>

        {/* Connections List */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="text-center py-8">
              <GlobeAltIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No e-commerce connections found</p>
              <button
                onClick={() => setShowNewConnectionModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Add Your First Connection
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                    <th className="pb-3 font-medium">Connection</th>
                    <th className="pb-3 font-medium">Platform</th>
                    <th className="pb-3 font-medium">Store URL</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Sync Frequency</th>
                    <th className="pb-3 font-medium">Last Sync</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConnections.map(conn => (
                    <tr
                      key={conn.connectionId}
                      className="border-b border-slate-700/30 hover:bg-slate-800/30"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {getPlatformIcon(conn.platformType)}
                          <div>
                            <p className="text-white font-medium">{conn.connectionName}</p>
                            <p className="text-slate-400 text-xs">{conn.connectionId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${getPlatformColor(conn.platformType)}`}
                        >
                          {conn.platformType}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 text-sm">{conn.storeUrl}</td>
                      <td className="py-3">{getStatusBadge(conn.isActive)}</td>
                      <td className="py-3 text-slate-400 text-sm">
                        Every {conn.syncFrequencyMinutes} min
                      </td>
                      <td className="py-3 text-slate-400 text-sm">
                        {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => testConnection(conn.connectionId)}
                            className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-lg transition-colors"
                            title="Test Connection"
                          >
                            <CloudArrowUpIcon className="h-4 w-4 text-emerald-400" />
                          </button>
                          <button
                            onClick={() => navigate(`/ecommerce/connections/${conn.connectionId}`)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Configure"
                          >
                            <Cog6ToothIcon className="h-4 w-4 text-slate-400" />
                          </button>
                          <button
                            onClick={() => deleteConnection(conn.connectionId)}
                            className="p-1.5 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <XMarkIcon className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* New Connection Modal */}
        {showNewConnectionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-white mb-4">Add E-commerce Connection</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Connection Name *</label>
                  <input
                    type="text"
                    placeholder="My Shopify Store"
                    value={newConnection.connectionName}
                    onChange={e =>
                      setNewConnection({ ...newConnection, connectionName: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Platform *</label>
                  <select
                    value={newConnection.platformType}
                    onChange={e =>
                      setNewConnection({
                        ...newConnection,
                        platformType: e.target.value,
                        apiVersion: e.target.value === 'SHOPIFY' ? '2024-01' : 'v1',
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="SHOPIFY">Shopify</option>
                    <option value="WOOCOMMERCE">WooCommerce</option>
                    <option value="MAGENTO">Magento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Store URL *</label>
                  <input
                    type="text"
                    placeholder="https://mystore.myshopify.com"
                    value={newConnection.storeUrl}
                    onChange={e => setNewConnection({ ...newConnection, storeUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">API Key *</label>
                  <input
                    type="password"
                    placeholder="Enter API key"
                    value={newConnection.apiKey}
                    onChange={e => setNewConnection({ ...newConnection, apiKey: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                {newConnection.platformType === 'SHOPIFY' ? (
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Access Token</label>
                    <input
                      type="password"
                      placeholder="Enter access token"
                      value={newConnection.accessToken}
                      onChange={e =>
                        setNewConnection({ ...newConnection, accessToken: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">API Secret</label>
                    <input
                      type="password"
                      placeholder="Enter API secret"
                      value={newConnection.apiSecret}
                      onChange={e =>
                        setNewConnection({ ...newConnection, apiSecret: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 text-sm mb-2">API Version</label>
                  <input
                    type="text"
                    placeholder="v1"
                    value={newConnection.apiVersion}
                    onChange={e =>
                      setNewConnection({ ...newConnection, apiVersion: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    Sync Frequency (minutes)
                  </label>
                  <input
                    type="number"
                    value={newConnection.syncFrequencyMinutes}
                    onChange={e =>
                      setNewConnection({
                        ...newConnection,
                        syncFrequencyMinutes: parseInt(e.target.value) || 60,
                      })
                    }
                    min="1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Sync Settings</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newConnection.syncCustomers}
                        onChange={e =>
                          setNewConnection({ ...newConnection, syncCustomers: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span className="text-slate-300 text-sm">Sync Customers</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newConnection.syncProducts}
                        onChange={e =>
                          setNewConnection({ ...newConnection, syncProducts: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span className="text-slate-300 text-sm">Sync Products</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newConnection.syncInventory}
                        onChange={e =>
                          setNewConnection({ ...newConnection, syncInventory: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span className="text-slate-300 text-sm">Sync Inventory</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newConnection.syncOrders}
                        onChange={e =>
                          setNewConnection({ ...newConnection, syncOrders: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span className="text-slate-300 text-sm">Sync Orders</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newConnection.autoImportOrders}
                        onChange={e =>
                          setNewConnection({ ...newConnection, autoImportOrders: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span className="text-slate-300 text-sm">Auto Import Orders</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowNewConnectionModal(false);
                    setNewConnection({
                      connectionName: '',
                      platformType: 'SHOPIFY',
                      storeUrl: '',
                      apiKey: '',
                      apiSecret: '',
                      accessToken: '',
                      apiVersion: 'v1',
                      syncCustomers: true,
                      syncProducts: true,
                      syncInventory: true,
                      syncOrders: true,
                      autoImportOrders: false,
                      syncFrequencyMinutes: 60,
                    });
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={createConnection}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Create Connection
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
