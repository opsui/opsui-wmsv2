/**
 * Asset Transfers Page
 *
 * Page for managing asset transfers between locations, custodians, departments
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  ArrowRightIcon,
  MapPinIcon,
  UserIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface AssetTransfer {
  transferId: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  transferType: string;
  fromLocation?: string;
  toLocation?: string;
  fromCustodian?: string;
  toCustodian?: string;
  fromDepartment?: string;
  toDepartment?: string;
  transferDate: string;
  reason?: string;
  status: string;
  requestedBy?: string;
  approvedBy?: string;
}

interface Location {
  locationId: string;
  locationName: string;
}

interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
}

export default function AssetTransfersPage() {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showNewTransferModal, setShowNewTransferModal] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // New transfer form
  const [newTransfer, setNewTransfer] = useState({
    assetId: '',
    transferType: 'LOCATION',
    toLocationId: '',
    toCustodianId: '',
    toDepartment: '',
    reason: '',
  });

  useEffect(() => {
    fetchTransfers();
    fetchLocations();
    fetchEmployees();
  }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/accounting/asset-transfers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTransfers(data || []);
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/warehouses?limit=100', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLocations(data || []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees?status=ACTIVE', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const createTransfer = async () => {
    if (!newTransfer.assetId || !newTransfer.reason) {
      alert('Please fill in all required fields');
      return;
    }

    if (newTransfer.transferType === 'LOCATION' && !newTransfer.toLocationId) {
      alert('Please select a destination location');
      return;
    }

    if (newTransfer.transferType === 'CUSTODIAN' && !newTransfer.toCustodianId) {
      alert('Please select a destination custodian');
      return;
    }

    try {
      const response = await fetch('/api/accounting/asset-transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newTransfer),
      });

      if (response.ok) {
        setShowNewTransferModal(false);
        setNewTransfer({
          assetId: '',
          transferType: 'LOCATION',
          toLocationId: '',
          toCustodianId: '',
          toDepartment: '',
          reason: '',
        });
        fetchTransfers();
      }
    } catch (error) {
      console.error('Error creating transfer:', error);
      alert('Error creating transfer');
    }
  };

  const approveTransfer = async (transferId: string) => {
    try {
      const response = await fetch(`/api/accounting/asset-transfers/${transferId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        fetchTransfers();
      }
    } catch (error) {
      console.error('Error approving transfer:', error);
    }
  };

  const rejectTransfer = async (transferId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const response = await fetch(`/api/accounting/asset-transfers/${transferId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        fetchTransfers();
      }
    } catch (error) {
      console.error('Error rejecting transfer:', error);
    }
  };

  const getTransferTypeLabel = (type: string) => {
    switch (type) {
      case 'LOCATION':
        return 'Location';
      case 'CUSTODIAN':
        return 'Custodian';
      case 'DEPARTMENT':
        return 'Department';
      case 'ENTITY':
        return 'Entity';
      default:
        return type;
    }
  };

  const getTransferTypeIcon = (type: string) => {
    switch (type) {
      case 'LOCATION':
        return <MapPinIcon className="h-4 w-4" />;
      case 'CUSTODIAN':
        return <UserIcon className="h-4 w-4" />;
      case 'DEPARTMENT':
        return <BuildingOfficeIcon className="h-4 w-4" />;
      default:
        return <ArrowRightIcon className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/20 text-amber-400';
      case 'APPROVED':
        return 'bg-blue-500/20 text-blue-400';
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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
              <h1 className="text-2xl font-bold text-white">Asset Transfers</h1>
              <p className="text-slate-400 text-sm">
                Transfer assets between locations and custodians
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowNewTransferModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            New Transfer
          </button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search transfers..."
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
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </Card>

        {/* Transfers List */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No transfers found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                    <th className="pb-3 font-medium">Asset</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">From</th>
                    <th className="pb-3 font-medium">To</th>
                    <th className="pb-3 font-medium">Transfer Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(transfer => (
                    <tr
                      key={transfer.transferId}
                      className="border-b border-slate-700/30 hover:bg-slate-800/30"
                    >
                      <td className="py-3">
                        <div>
                          <p className="text-white font-medium">{transfer.assetCode}</p>
                          <p className="text-slate-400 text-xs">{transfer.assetName}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2 text-slate-400">
                          {getTransferTypeIcon(transfer.transferType)}
                          <span className="text-sm">
                            {getTransferTypeLabel(transfer.transferType)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-400 text-sm">
                        {transfer.fromLocation ||
                          transfer.fromCustodian ||
                          transfer.fromDepartment ||
                          '-'}
                      </td>
                      <td className="py-3 text-white font-medium">
                        {transfer.toLocation || transfer.toCustodian || transfer.toDepartment}
                      </td>
                      <td className="py-3 text-slate-400 text-sm">
                        {new Date(transfer.transferDate).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(transfer.status)}`}
                        >
                          {transfer.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {transfer.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => approveTransfer(transfer.transferId)}
                                className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <CheckIcon className="h-4 w-4 text-emerald-400" />
                              </button>
                              <button
                                onClick={() => rejectTransfer(transfer.transferId)}
                                className="p-1.5 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <XMarkIcon className="h-4 w-4 text-red-400" />
                              </button>
                            </>
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

        {/* New Transfer Modal */}
        {showNewTransferModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">New Asset Transfer</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Asset</label>
                  <input
                    type="text"
                    placeholder="Enter asset code or ID"
                    value={newTransfer.assetId}
                    onChange={e => setNewTransfer({ ...newTransfer, assetId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Transfer Type</label>
                  <select
                    value={newTransfer.transferType}
                    onChange={e =>
                      setNewTransfer({
                        ...newTransfer,
                        transferType: e.target.value,
                        toLocationId: '',
                        toCustodianId: '',
                        toDepartment: '',
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="LOCATION">Location</option>
                    <option value="CUSTODIAN">Custodian</option>
                    <option value="DEPARTMENT">Department</option>
                  </select>
                </div>

                {newTransfer.transferType === 'LOCATION' && (
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Destination Location
                    </label>
                    <select
                      value={newTransfer.toLocationId}
                      onChange={e =>
                        setNewTransfer({ ...newTransfer, toLocationId: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">Select location</option>
                      {locations.map(loc => (
                        <option key={loc.locationId} value={loc.locationId}>
                          {loc.locationName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {newTransfer.transferType === 'CUSTODIAN' && (
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Destination Custodian
                    </label>
                    <select
                      value={newTransfer.toCustodianId}
                      onChange={e =>
                        setNewTransfer({ ...newTransfer, toCustodianId: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">Select custodian</option>
                      {employees.map(emp => (
                        <option key={emp.employeeId} value={emp.employeeId}>
                          {emp.firstName} {emp.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {newTransfer.transferType === 'DEPARTMENT' && (
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Destination Department
                    </label>
                    <input
                      type="text"
                      placeholder="Enter department name"
                      value={newTransfer.toDepartment}
                      onChange={e =>
                        setNewTransfer({ ...newTransfer, toDepartment: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Reason</label>
                  <textarea
                    placeholder="Enter reason for transfer..."
                    value={newTransfer.reason}
                    onChange={e => setNewTransfer({ ...newTransfer, reason: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowNewTransferModal(false);
                    setNewTransfer({
                      assetId: '',
                      transferType: 'LOCATION',
                      toLocationId: '',
                      toCustodianId: '',
                      toDepartment: '',
                      reason: '',
                    });
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={createTransfer}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Create Transfer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
