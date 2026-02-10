/**
 * Asset Register Page
 *
 * Main page for fixed asset register
 * Shows all assets with filtering, search, and quick actions
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  QrCodeIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  UserIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface FixedAsset {
  assetId: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  serialNumber?: string;
  purchaseDate: string;
  cost: number;
  netBookValue: number;
  accumulatedDepreciation: number;
  status: string;
  locationId?: string;
  locationName?: string;
  custodianName?: string;
  warrantyExpiry?: string;
  physicalCondition: string;
}

export default function AssetRegisterPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Metrics
  const [metrics, setMetrics] = useState({
    totalAssets: 0,
    totalValue: 0,
    netBookValue: 0,
    accumulatedDepreciation: 0,
    requiringMaintenance: 0,
    warrantyExpiring: 0,
  });

  useEffect(() => {
    fetchAssets();
    fetchMetrics();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm || selectedType || selectedStatus || selectedLocation) {
        fetchFilteredAssets();
      } else {
        fetchAssets();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedType, selectedStatus, selectedLocation]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/accounting/fixed-assets', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAssets(data || []);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedType) params.append('assetType', selectedType);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedLocation) params.append('locationId', selectedLocation);

      const response = await fetch(`/api/accounting/fixed-assets?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAssets(data || []);
      }
    } catch (error) {
      console.error('Error fetching filtered assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/accounting/fixed-assets/metrics', {
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

  const isWarrantyExpiring = (warrantyExpiry?: string) => {
    if (!warrantyExpiry) return false;
    const expiryDate = new Date(warrantyExpiry);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return expiryDate < thirtyDaysFromNow;
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'GOOD':
        return 'text-emerald-400';
      case 'FAIR':
        return 'text-amber-400';
      case 'POOR':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'DISPOSED':
        return 'bg-red-500/20 text-red-400';
      case 'IN_MAINTENANCE':
        return 'bg-amber-500/20 text-amber-400';
      case 'RETired':
        return 'bg-slate-500/20 text-slate-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/accounting')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <BuildingOfficeIcon className="h-5 w-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Asset Register</h1>
              <p className="text-slate-400 text-sm">Fixed assets register and tracking</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/accounting/asset-transfers"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Transfers
            </Link>
            <Link
              to="/accounting/asset-maintenance"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Maintenance
            </Link>
            <Link
              to="/accounting/assets/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add Asset
            </Link>
          </div>
        </div>

        {/* Metrics */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card title="Total Assets" className="bg-slate-800/50">
            <p className="text-3xl font-bold text-blue-400">{metrics.totalAssets}</p>
          </Card>
          <Card title="Total Cost" className="bg-slate-800/50">
            <p className="text-xl font-bold text-purple-400">
              ${metrics.totalValue.toLocaleString()}
            </p>
          </Card>
          <Card title="Net Book Value" className="bg-slate-800/50">
            <p className="text-xl font-bold text-emerald-400">
              ${metrics.netBookValue.toLocaleString()}
            </p>
          </Card>
          <Card title="Accum. Depreciation" className="bg-slate-800/50">
            <p className="text-xl font-bold text-amber-400">
              ${metrics.accumulatedDepreciation.toLocaleString()}
            </p>
          </Card>
          <Card title="Needs Maintenance" className="bg-slate-800/50">
            <p className="text-3xl font-bold text-orange-400">{metrics.requiringMaintenance}</p>
          </Card>
          <Card title="Warranty Expiring" className="bg-slate-800/50">
            <p className="text-3xl font-bold text-red-400">{metrics.warrantyExpiring}</p>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                showFilters || selectedType || selectedStatus || selectedLocation
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 text-xs mb-2">Asset Type</label>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">All Types</option>
                  <option value="BUILDING">Building</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="VEHICLE">Vehicle</option>
                  <option value="FURNITURE">Furniture</option>
                  <option value="COMPUTER">Computer</option>
                  <option value="SOFTWARE">Software</option>
                  <option value="LAND">Land</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DISPOSED">Disposed</option>
                  <option value="IN_MAINTENANCE">In Maintenance</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-2">Condition</label>
                <select
                  value={selectedLocation}
                  onChange={e => setSelectedLocation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">All Locations</option>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="OFFICE">Office</option>
                  <option value="PRODUCTION">Production</option>
                </select>
              </div>
            </div>
          )}
        </Card>

        {/* Assets Table */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8">
              <BuildingOfficeIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No fixed assets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                    <th className="pb-3 font-medium">Asset</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium text-right">Cost</th>
                    <th className="pb-3 font-medium text-right">NBV</th>
                    <th className="pb-3 font-medium">Location</th>
                    <th className="pb-3 font-medium">Custodian</th>
                    <th className="pb-3 font-medium">Condition</th>
                    <th className="pb-3 font-medium">Warranty</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(asset => (
                    <tr
                      key={asset.assetId}
                      className="border-b border-slate-700/30 hover:bg-slate-800/30"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {isWarrantyExpiring(asset.warrantyExpiry) && (
                            <ExclamationTriangleIcon className="h-4 w-4 text-amber-400" />
                          )}
                          <div>
                            <Link
                              to={`/accounting/assets/${asset.assetId}`}
                              className="text-blue-400 hover:text-blue-300 font-medium"
                            >
                              {asset.assetCode}
                            </Link>
                            <p className="text-slate-400 text-xs">{asset.assetName}</p>
                            {asset.serialNumber && (
                              <p className="text-slate-500 text-xs">SN: {asset.serialNumber}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-slate-400 text-sm">{asset.assetType}</td>
                      <td className="py-3 text-right text-white">${asset.cost.toLocaleString()}</td>
                      <td className="py-3 text-right text-slate-300">
                        ${asset.netBookValue.toLocaleString()}
                      </td>
                      <td className="py-3 text-slate-400 text-sm">
                        {asset.locationName || asset.locationId || '-'}
                      </td>
                      <td className="py-3 text-slate-400 text-sm">{asset.custodianName || '-'}</td>
                      <td className="py-3">
                        <span
                          className={`text-sm font-medium ${getConditionColor(asset.physicalCondition)}`}
                        >
                          {asset.physicalCondition}
                        </span>
                      </td>
                      <td className="py-3">
                        {asset.warrantyExpiry ? (
                          <span
                            className={`text-xs ${
                              isWarrantyExpiring(asset.warrantyExpiry)
                                ? 'text-red-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {new Date(asset.warrantyExpiry).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/accounting/assets/${asset.assetId}`}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4 text-slate-400" />
                          </Link>
                          <button
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Print QR Code"
                          >
                            <QrCodeIcon className="h-4 w-4 text-slate-400" />
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
      </main>
    </div>
  );
}
