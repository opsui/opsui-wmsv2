/**
 * Asset Maintenance Page
 *
 * Page for managing asset maintenance schedules and history
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  CalendarIcon,
  WrenchIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface AssetMaintenance {
  maintenanceId: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  maintenanceType: string;
  description: string;
  scheduledDate?: string;
  performedDate?: string;
  performedBy?: string;
  cost?: number;
  status: string;
  notes?: string;
  urgency?: 'OVERDUE' | 'URGENT' | 'UPCOMING' | 'SCHEDULED';
}

export default function AssetMaintenancePage() {
  const navigate = useNavigate();
  const [maintenance, setMaintenance] = useState<AssetMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showNewMaintenanceModal, setShowNewMaintenanceModal] = useState(false);

  // New maintenance form
  const [newMaintenance, setNewMaintenance] = useState({
    assetId: '',
    maintenanceType: 'PREVENTIVE',
    description: '',
    scheduledDate: '',
    cost: 0,
  });

  // Metrics
  const metrics = {
    overdue: maintenance.filter(m => m.urgency === 'OVERDUE').length,
    urgent: maintenance.filter(m => m.urgency === 'URGENT').length,
    scheduled: maintenance.filter(m => m.status === 'SCHEDULED').length,
    inProgress: maintenance.filter(m => m.status === 'IN_PROGRESS').length,
    completedThisMonth: maintenance.filter(
      m =>
        m.status === 'COMPLETED' &&
        m.performedDate &&
        new Date(m.performedDate).getMonth() === new Date().getMonth()
    ).length,
    totalCost: maintenance
      .filter(m => m.status === 'COMPLETED')
      .reduce((sum, m) => sum + (m.cost || 0), 0),
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const fetchMaintenance = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/accounting/asset-maintenance', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMaintenance(data || []);
      }
    } catch (error) {
      console.error('Error fetching maintenance:', error);
    } finally {
      setLoading(false);
    }
  };

  const createMaintenance = async () => {
    if (!newMaintenance.assetId || !newMaintenance.description || !newMaintenance.scheduledDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/accounting/asset-maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newMaintenance),
      });

      if (response.ok) {
        setShowNewMaintenanceModal(false);
        setNewMaintenance({
          assetId: '',
          maintenanceType: 'PREVENTIVE',
          description: '',
          scheduledDate: '',
          cost: 0,
        });
        fetchMaintenance();
      }
    } catch (error) {
      console.error('Error creating maintenance:', error);
      alert('Error creating maintenance record');
    }
  };

  const completeMaintenance = async (maintenanceId: string) => {
    const cost = prompt('Enter actual maintenance cost (optional):');
    try {
      const response = await fetch(`/api/accounting/asset-maintenance/${maintenanceId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ cost: cost ? parseFloat(cost) : null }),
      });

      if (response.ok) {
        fetchMaintenance();
      }
    } catch (error) {
      console.error('Error completing maintenance:', error);
    }
  };

  const getMaintenanceTypeColor = (type: string) => {
    switch (type) {
      case 'PREVENTIVE':
        return 'bg-blue-500/20 text-blue-400';
      case 'CORRECTIVE':
        return 'bg-amber-500/20 text-amber-400';
      case 'EMERGENCY':
        return 'bg-red-500/20 text-red-400';
      case 'UPGRADE':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-slate-500/20 text-slate-400';
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-400';
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'OVERDUE':
        return 'text-red-400';
      case 'URGENT':
        return 'text-amber-400';
      case 'UPCOMING':
        return 'text-blue-400';
      default:
        return 'text-slate-400';
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
              <ArrowLeftIcon className="h-5 w-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Asset Maintenance</h1>
              <p className="text-slate-400 text-sm">Schedule and track asset maintenance</p>
            </div>
          </div>

          <button
            onClick={() => setShowNewMaintenanceModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Schedule Maintenance
          </button>
        </div>

        {/* Metrics */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card title="Overdue" className="bg-red-500/10 border-red-500/30">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <p className="text-2xl font-bold text-red-400">{metrics.overdue}</p>
            </div>
          </Card>
          <Card title="Urgent" className="bg-amber-500/10 border-amber-500/30">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-amber-400" />
              <p className="text-2xl font-bold text-amber-400">{metrics.urgent}</p>
            </div>
          </Card>
          <Card title="Scheduled" className="bg-slate-800/50">
            <p className="text-2xl font-bold text-blue-400">{metrics.scheduled}</p>
          </Card>
          <Card title="In Progress" className="bg-slate-800/50">
            <p className="text-2xl font-bold text-purple-400">{metrics.inProgress}</p>
          </Card>
          <Card title="Completed This Month" className="bg-slate-800/50">
            <p className="text-2xl font-bold text-emerald-400">{metrics.completedThisMonth}</p>
          </Card>
          <Card title="Total Cost" className="bg-slate-800/50">
            <p className="text-2xl font-bold text-slate-300">
              ${metrics.totalCost.toLocaleString()}
            </p>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search maintenance records..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400"
              />
            </div>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="">All Types</option>
              <option value="PREVENTIVE">Preventive</option>
              <option value="CORRECTIVE">Corrective</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="UPGRADE">Upgrade</option>
            </select>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </Card>

        {/* Maintenance List */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : maintenance.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No maintenance records found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                    <th className="pb-3 font-medium">Asset</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 font-medium">Scheduled Date</th>
                    <th className="pb-3 font-medium">Performed Date</th>
                    <th className="pb-3 font-medium text-right">Cost</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.map(maint => (
                    <tr
                      key={maint.maintenanceId}
                      className={`border-b border-slate-700/30 hover:bg-slate-800/30 ${
                        maint.urgency === 'OVERDUE' ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="py-3">
                        <div>
                          <p className="text-white font-medium">{maint.assetCode}</p>
                          <p className="text-slate-400 text-xs">{maint.assetName}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${getMaintenanceTypeColor(maint.maintenanceType)}`}
                        >
                          {maint.maintenanceType}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300 text-sm max-w-xs truncate">
                        {maint.description}
                      </td>
                      <td className="py-3">
                        {maint.scheduledDate ? (
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4 text-slate-400" />
                            <span className={`text-sm ${getUrgencyColor(maint.urgency)}`}>
                              {new Date(maint.scheduledDate).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-400 text-sm">
                        {maint.performedDate
                          ? new Date(maint.performedDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="py-3 text-right text-slate-300 text-sm">
                        {maint.cost !== undefined ? `$${maint.cost.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(maint.status)}`}
                        >
                          {maint.status === 'IN_PROGRESS' && (
                            <span className="flex items-center gap-1">
                              <WrenchIcon className="h-3 w-3" />
                              In Progress
                            </span>
                          )}
                          {maint.status !== 'IN_PROGRESS' && maint.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {maint.status === 'SCHEDULED' && (
                            <button
                              onClick={() => completeMaintenance(maint.maintenanceId)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Complete
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

        {/* New Maintenance Modal */}
        {showNewMaintenanceModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Schedule Maintenance</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Asset ID/Code</label>
                  <input
                    type="text"
                    placeholder="Enter asset code or ID"
                    value={newMaintenance.assetId}
                    onChange={e =>
                      setNewMaintenance({ ...newMaintenance, assetId: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Maintenance Type</label>
                  <select
                    value={newMaintenance.maintenanceType}
                    onChange={e =>
                      setNewMaintenance({ ...newMaintenance, maintenanceType: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="PREVENTIVE">Preventive</option>
                    <option value="CORRECTIVE">Corrective</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="UPGRADE">Upgrade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Description</label>
                  <textarea
                    placeholder="Describe the maintenance task..."
                    value={newMaintenance.description}
                    onChange={e =>
                      setNewMaintenance({ ...newMaintenance, description: e.target.value })
                    }
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Scheduled Date</label>
                  <input
                    type="date"
                    value={newMaintenance.scheduledDate}
                    onChange={e =>
                      setNewMaintenance({ ...newMaintenance, scheduledDate: e.target.value })
                    }
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    Estimated Cost (Optional)
                  </label>
                  <input
                    type="number"
                    value={newMaintenance.cost}
                    onChange={e =>
                      setNewMaintenance({
                        ...newMaintenance,
                        cost: parseFloat(e.target.value) || 0,
                      })
                    }
                    min="0"
                    step="0.01"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowNewMaintenanceModal(false);
                    setNewMaintenance({
                      assetId: '',
                      maintenanceType: 'PREVENTIVE',
                      description: '',
                      scheduledDate: '',
                      cost: 0,
                    });
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={createMaintenance}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
