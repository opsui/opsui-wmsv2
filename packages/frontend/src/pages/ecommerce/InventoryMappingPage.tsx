/**
 * Inventory Mapping Page
 *
 * Page for managing product mappings and inventory sync
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LinkIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface ProductMapping {
  mappingId: string;
  connectionId: string;
  connectionName: string;
  platformType: string;
  internalSku: string;
  externalProductId: string;
  externalVariantId?: string;
  externalProductTitle?: string;
  syncStatus: string;
  lastSyncedAt?: string;
}

interface ConnectionOption {
  connectionId: string;
  connectionName: string;
  platformType: string;
}

export default function InventoryMappingPage() {
  const navigate = useNavigate();
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConnection, setSelectedConnection] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showNewMappingModal, setShowNewMappingModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // New mapping form
  const [newMapping, setNewMapping] = useState({
    connectionId: '',
    internalSku: '',
    externalProductId: '',
    externalVariantId: '',
    externalProductTitle: '',
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      fetchMappings();
    }
  }, [selectedConnection]);

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/ecommerce/connections/active', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setConnections(data || []);
        if (data && data.length > 0 && !selectedConnection) {
          setSelectedConnection(data[0].connectionId);
        }
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const fetchMappings = async () => {
    if (!selectedConnection) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/ecommerce/connections/${selectedConnection}/mappings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();

        // Add connection details to mappings
        const connection = connections.find(c => c.connectionId === selectedConnection);
        const enrichedData = data.map((m: ProductMapping) => ({
          ...m,
          connectionName: connection?.connectionName || '',
          platformType: connection?.platformType || '',
        }));

        setMappings(enrichedData || []);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const createMapping = async () => {
    if (!newMapping.connectionId || !newMapping.internalSku || !newMapping.externalProductId) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(
        '/api/ecommerce/connections/' + newMapping.connectionId + '/mappings',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(newMapping),
        }
      );

      if (response.ok) {
        setShowNewMappingModal(false);
        setNewMapping({
          connectionId: '',
          internalSku: '',
          externalProductId: '',
          externalVariantId: '',
          externalProductTitle: '',
        });
        fetchMappings();
      } else {
        alert('Error creating mapping');
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
      alert('Error creating mapping');
    }
  };

  const syncInventory = async (connectionId: string) => {
    setSyncing(true);
    try {
      const response = await fetch('/api/ecommerce/sync/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          connectionId,
          skus: mappings.map(m => m.internalSku),
          syncType: 'PUSH',
        }),
      });

      if (response.ok) {
        alert('Inventory sync initiated successfully');
        fetchMappings();
      } else {
        alert('Failed to initiate inventory sync');
      }
    } catch (error) {
      console.error('Error syncing inventory:', error);
      alert('Error syncing inventory');
    } finally {
      setSyncing(false);
    }
  };

  const deleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ecommerce/mappings/${mappingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        fetchMappings();
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      alert('Error deleting mapping');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'UNSYNCED':
        return 'bg-amber-500/20 text-amber-400';
      case 'DISABLED':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
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

  const filteredMappings = mappings.filter(
    m =>
      m.internalSku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.externalProductId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.externalProductTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen">
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
              <h1 className="text-2xl font-bold text-white">Product Mappings</h1>
              <p className="text-slate-400 text-sm">Map SKUs to e-commerce products</p>
            </div>
          </div>

          <button
            onClick={() => setShowNewMappingModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add Mapping
          </button>
        </div>

        {/* Connection Selector */}
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-slate-400 text-sm mb-2">Select Connection</label>
              <select
                value={selectedConnection}
                onChange={e => setSelectedConnection(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                {connections.map(conn => (
                  <option key={conn.connectionId} value={conn.connectionId}>
                    {conn.connectionName} ({conn.platformType})
                  </option>
                ))}
              </select>
            </div>
            {selectedConnection && (
              <button
                onClick={() => syncInventory(selectedConnection)}
                disabled={syncing}
                className="mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Sync Inventory
              </button>
            )}
          </div>
        </Card>

        {/* Metrics */}
        {selectedConnection && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card title="Total Mappings" className="bg-slate-800/50">
              <p className="text-2xl font-bold text-blue-400">{mappings.length}</p>
            </Card>
            <Card title="Active" className="bg-slate-800/50">
              <p className="text-2xl font-bold text-emerald-400">
                {mappings.filter(m => m.syncStatus === 'ACTIVE').length}
              </p>
            </Card>
            <Card title="Unsynced" className="bg-slate-800/50">
              <p className="text-2xl font-bold text-amber-400">
                {mappings.filter(m => m.syncStatus === 'UNSYNCED').length}
              </p>
            </Card>
            <Card title="Disabled" className="bg-slate-800/50">
              <p className="text-2xl font-bold text-red-400">
                {mappings.filter(m => m.syncStatus === 'DISABLED').length}
              </p>
            </Card>
          </div>
        )}

        {/* Search */}
        <Card className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU, product ID, or title..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400"
            />
          </div>
        </Card>

        {/* Mappings List */}
        <Card>
          {!selectedConnection ? (
            <div className="text-center py-8">
              <LinkIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Select a connection to view product mappings</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredMappings.length === 0 ? (
            <div className="text-center py-8">
              <CubeIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No product mappings found</p>
              <button
                onClick={() => setShowNewMappingModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create Your First Mapping
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                    <th className="pb-3 font-medium">Internal SKU</th>
                    <th className="pb-3 font-medium">External Product</th>
                    <th className="pb-3 font-medium">External ID</th>
                    <th className="pb-3 font-medium">Variant ID</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Last Synced</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMappings.map(mapping => (
                    <tr
                      key={mapping.mappingId}
                      className="border-b border-slate-700/30 hover:bg-slate-800/30"
                    >
                      <td className="py-3">
                        <p className="text-white font-medium">{mapping.internalSku}</p>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs ${getPlatformColor(mapping.platformType)}`}
                          >
                            {mapping.platformType}
                          </span>
                          <p className="text-slate-300 text-sm max-w-xs truncate">
                            {mapping.externalProductTitle || mapping.externalProductId}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 text-slate-400 text-sm font-mono">
                        {mapping.externalProductId}
                      </td>
                      <td className="py-3 text-slate-400 text-sm font-mono">
                        {mapping.externalVariantId || '-'}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(mapping.syncStatus)}`}
                        >
                          {mapping.syncStatus}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 text-sm">
                        {mapping.lastSyncedAt
                          ? new Date(mapping.lastSyncedAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => deleteMapping(mapping.mappingId)}
                          className="p-1.5 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors"
                          title="Delete Mapping"
                        >
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* New Mapping Modal */}
        {showNewMappingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Add Product Mapping</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Connection *</label>
                  <select
                    value={newMapping.connectionId}
                    onChange={e => setNewMapping({ ...newMapping, connectionId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select connection</option>
                    {connections.map(conn => (
                      <option key={conn.connectionId} value={conn.connectionId}>
                        {conn.connectionName} ({conn.platformType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Internal SKU *</label>
                  <input
                    type="text"
                    placeholder="Enter SKU"
                    value={newMapping.internalSku}
                    onChange={e => setNewMapping({ ...newMapping, internalSku: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">External Product ID *</label>
                  <input
                    type="text"
                    placeholder="Enter external product ID"
                    value={newMapping.externalProductId}
                    onChange={e =>
                      setNewMapping({ ...newMapping, externalProductId: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">External Variant ID</label>
                  <input
                    type="text"
                    placeholder="Enter variant ID (optional)"
                    value={newMapping.externalVariantId}
                    onChange={e =>
                      setNewMapping({ ...newMapping, externalVariantId: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Product Title</label>
                  <input
                    type="text"
                    placeholder="Enter product title"
                    value={newMapping.externalProductTitle}
                    onChange={e =>
                      setNewMapping({ ...newMapping, externalProductTitle: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowNewMappingModal(false);
                    setNewMapping({
                      connectionId: '',
                      internalSku: '',
                      externalProductId: '',
                      externalVariantId: '',
                      externalProductTitle: '',
                    });
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={createMapping}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Create Mapping
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
