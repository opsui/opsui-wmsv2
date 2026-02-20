/**
 * Bin Locations Page
 *
 * Interface for managing warehouse bin locations
 *
 * ============================================================================
 * AESTHETIC DIRECTION: WAREHOUSE GRID
 * ============================================================================
 * An industrial warehouse visualization aesthetic:
 * - Blue color theme with industrial accents
 * - Grid pattern backgrounds suggesting warehouse zones
 * - Monospace fonts for bin IDs (JetBrains Mono)
 * - Zone-based color coding with visual hierarchy
 * - Staggered entrance animations for data rows
 * - Industrial corner accents and structured layouts
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import {
  useBinLocationsManagement,
  useBinLocationZones,
  useCreateBinLocation,
  useUpdateBinLocation,
  useDeleteBinLocation,
  useBatchCreateBinLocations,
} from '@/services/api';
import { useAuthStore } from '@/stores';
import { BinType, BinLocation, UserRole } from '@opsui/shared';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import {
  Header,
  Pagination,
  useToast,
  ConfirmDialog,
  Button,
  Breadcrumb,
} from '@/components/shared';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// COMPONENTS
// ============================================================================

function BinLocationModal({
  location,
  onClose,
  onSuccess,
}: {
  location?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const createMutation = useCreateBinLocation();
  const updateMutation = useUpdateBinLocation();
  const isEdit = !!location;

  // Form validation
  const {
    values: formData,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    setFieldValue,
  } = useFormValidation({
    initialValues: {
      binId: location?.binId || '',
      zone: location?.zone || 'A',
      aisle: location?.aisle || '',
      shelf: location?.shelf || '',
      type: location?.type || BinType.SHELF,
      active: location?.active ?? true,
    },
    validationRules: {
      binId: {
        required: true,
        custom: (value: string) => {
          if (!/^[A-Z]-\d{1,3}-\d{2}$/.test(value)) {
            return 'Format must be Z-A-S (e.g., A-12-03)';
          }
          return null;
        },
      },
      zone: {
        required: true,
        custom: (value: string) => {
          if (!/^[A-Z]$/.test(value)) {
            return 'Zone must be a single letter A-Z';
          }
          return null;
        },
      },
      aisle: {
        required: true,
      },
      shelf: {
        required: true,
      },
      type: {
        required: true,
      },
    },
    onSubmit: async values => {
      try {
        if (isEdit) {
          await updateMutation.mutateAsync({
            binId: location.binId,
            updates: values,
          });
          showToast('Bin location updated successfully', 'success');
        } else {
          await createMutation.mutateAsync(values);
          showToast('Bin location created successfully', 'success');
        }
        onSuccess();
        onClose();
      } catch (error: any) {
        showToast(error?.message || 'Failed to save bin location', 'error');
        throw error;
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 my-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Bin Location' : 'Create Bin Location'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bin ID *
            </label>
            <input
              name="binId"
              type="text"
              required
              disabled={isEdit}
              value={formData.binId}
              onChange={e => {
                const upper = e.target.value.toUpperCase();
                handleChange({
                  ...e,
                  target: { ...e.target, value: upper },
                } as React.ChangeEvent<HTMLInputElement>);
              }}
              className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                errors.binId ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="e.g., A-12-03"
            />
            {errors.binId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.binId}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Format: Z-A-S (e.g., A-12-03)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Zone *
            </label>
            <input
              name="zone"
              type="text"
              required
              maxLength={1}
              value={formData.zone}
              onChange={e => {
                const upper = e.target.value.toUpperCase();
                handleChange({
                  ...e,
                  target: { ...e.target, value: upper },
                } as React.ChangeEvent<HTMLInputElement>);
              }}
              className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                errors.zone ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="e.g., A"
            />
            {errors.zone && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.zone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Aisle *
            </label>
            <input
              name="aisle"
              type="text"
              required
              value={formData.aisle}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                errors.aisle ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="e.g., 12"
            />
            {errors.aisle && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.aisle}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Shelf *
            </label>
            <input
              name="shelf"
              type="text"
              required
              value={formData.shelf}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                errors.shelf ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="e.g., 03"
            />
            {errors.shelf && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.shelf}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type *
            </label>
            <select
              name="type"
              required
              value={formData.type}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                errors.type ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
            >
              <option value={BinType.SHELF}>Shelf</option>
              <option value={BinType.FLOOR}>Floor</option>
              <option value={BinType.RACK}>Rack</option>
              <option value={BinType.BIN}>Bin</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.type}</p>
            )}
          </div>

          {isEdit && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={e => setFieldValue('active', e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-blue-500"
              />
              <label htmlFor="active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Active
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting || createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : isEdit
                  ? 'Update'
                  : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BatchCreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const batchMutation = useBatchCreateBinLocations();
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<
    Array<{
      binId: string;
      zone: string;
      aisle: string;
      shelf: string;
      type: BinType;
    }>
  >([]);

  const parseInput = () => {
    const lines = input.trim().split('\n');
    const locations: Array<{
      binId: string;
      zone: string;
      aisle: string;
      shelf: string;
      type: BinType;
    }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Try to parse as "Z-A-S" format (e.g., "A-12-03")
      const match = trimmed.match(/^([A-Z])-(\d{1,3})-(\d{2})$/);
      if (match) {
        locations.push({
          binId: trimmed,
          zone: match[1],
          aisle: match[2],
          shelf: match[3],
          type: BinType.SHELF,
        });
      }
    }

    setParsed(locations);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { showToast } = useToast();
    try {
      const result = await batchMutation.mutateAsync(parsed);

      const created = result.created?.length || 0;
      const failed = result.failed?.length || 0;

      if (created > 0) {
        showToast(
          `Successfully created ${created} location${created > 1 ? 's' : ''}${failed > 0 ? `. Failed: ${failed}` : ''}`,
          failed > 0 ? 'warning' : 'success'
        );
        onSuccess();
        onClose();
      } else {
        showToast(`Failed to create any locations. ${failed} errors.`, 'error');
      }
    } catch (error: any) {
      console.error('Failed to create batch locations:', error);
      showToast(error?.message || 'Failed to create batch locations', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Batch Create Bin Locations
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Enter one bin ID per line (format: Z-A-S, e.g., A-12-03)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bin IDs (one per line)
            </label>
            <textarea
              value={input}
              onChange={e => {
                setInput(e.target.value);
                parseInput();
              }}
              rows={10}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="A-01-01&#10;A-01-02&#10;A-01-03&#10;B-01-01&#10;..."
            />
          </div>

          {parsed.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Parsed {parsed.length} location{parsed.length > 1 ? 's' : ''}:
              </p>
              <div className="max-h-40 overflow-y-auto bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                  {parsed.map((loc, i) => (
                    <div key={i} className="text-green-600 dark:text-green-400">
                      {loc.binId}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={parsed.length === 0 || batchMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {batchMutation.isPending ? 'Creating...' : `Create ${parsed.length} Locations`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function BinLocationsPage() {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [filterZone, setFilterZone] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; binId: string }>({
    isOpen: false,
    binId: '',
  });

  const { data: locationsData, refetch } = useBinLocationsManagement({
    zone: filterZone || undefined,
    type: filterType || undefined,
    active: filterActive,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filterZone, filterType, filterActive]);
  const { data: zonesData } = useBinLocationZones();

  const deleteMutation = useDeleteBinLocation();

  const locations = locationsData?.locations || [];
  const zones = zonesData?.zones || [];

  const canManageLocations =
    user?.role === UserRole.STOCK_CONTROLLER ||
    user?.role === UserRole.SUPERVISOR ||
    user?.role === UserRole.ADMIN;

  const filteredLocations = locations.filter((loc: BinLocation) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        loc.binId.toLowerCase().includes(query) ||
        loc.zone.toLowerCase().includes(query) ||
        loc.aisle.includes(query) ||
        loc.shelf.includes(query)
      );
    }
    return true;
  });

  const handleDelete = async (binId: string) => {
    setDeleteConfirm({ isOpen: true, binId });
  };

  const confirmDelete = async () => {
    const { binId } = deleteConfirm;
    try {
      await deleteMutation.mutateAsync(binId);
      showToast(`Bin location ${binId} deleted successfully`, 'success');
      refetch();
    } catch (error: any) {
      console.error('Failed to delete location:', error);
      showToast(error?.message || 'Failed to delete bin location', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, binId: '' });
    }
  };

  // Group locations by zone
  const locationsByZone: Record<string, typeof locations> = {};
  for (const loc of filteredLocations) {
    if (!locationsByZone[loc.zone]) {
      locationsByZone[loc.zone] = [];
    }
    locationsByZone[loc.zone].push(loc);
  }

  return (
    <div className="bin-grid-bg min-h-screen">
      <Header />
      {/* Breadcrumb Navigation */}
      <Breadcrumb />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="space-y-6">
          {/* Header with distinctive styling */}
          <div
            className="flex justify-between items-center"
            style={{ animation: 'bin-stagger-in 0.4s ease-out' }}
          >
            <div className="flex items-center gap-4">
              {/* Industrial accent */}
              <div className="w-1.5 h-12 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-['Space_Grotesk',sans-serif]">
                  Bin Locations
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage warehouse bin locations
                </p>
              </div>
            </div>
            {canManageLocations && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBatchModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-500"
                >
                  <PlusIcon className="h-5 w-5" />
                  Batch Create
                </button>
                <button
                  onClick={() => {
                    setSelectedLocation(null);
                    setShowModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="h-5 w-5" />
                  New Location
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="glass-card rounded-lg p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Search by ID, zone, aisle..."
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Zone Filter */}
              <select
                value={filterZone}
                onChange={e => setFilterZone(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              >
                <option value="">All Zones</option>
                {zones.map((zone: string) => (
                  <option key={zone} value={zone}>
                    Zone {zone}
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              >
                <option value="">All Types</option>
                <option value={BinType.SHELF}>Shelf</option>
                <option value={BinType.FLOOR}>Floor</option>
                <option value={BinType.RACK}>Rack</option>
                <option value={BinType.BIN}>Bin</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterActive === undefined ? '' : filterActive.toString()}
                onChange={e => {
                  const val = e.target.value;
                  setFilterActive(val === '' ? undefined : val === 'true');
                }}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>

              {/* Clear Filters */}
              {(filterZone || filterType || filterActive !== undefined) && (
                <button
                  onClick={() => {
                    setFilterZone('');
                    setFilterType('');
                    setFilterActive(undefined);
                  }}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Summary Stats with enhanced styling */}
          <div
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
            style={{ animation: 'bin-stagger-in 0.5s ease-out 0.1s backwards' }}
          >
            <div className="bin-card rounded-xl p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Total Locations
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1 bin-id-display">
                {locationsData?.total || 0}
              </div>
            </div>
            <div className="bin-card rounded-xl p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Active</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1 bin-id-display">
                {locations.filter((l: BinLocation) => l.active).length}
              </div>
            </div>
            <div className="bin-card rounded-xl p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Inactive</div>
              <div className="text-3xl font-bold text-gray-500 dark:text-gray-400 mt-1 bin-id-display">
                {locations.filter((l: BinLocation) => !l.active).length}
              </div>
            </div>
            <div className="bin-card rounded-xl p-5">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Zones</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1 bin-id-display">
                {zones.length}
              </div>
            </div>
          </div>

          {/* Locations by Zone with enhanced styling */}
          {Object.keys(locationsByZone).length === 0 ? (
            <div
              className="bin-card rounded-xl p-12 text-center"
              style={{ animation: 'bin-stagger-in 0.5s ease-out 0.2s backwards' }}
            >
              <p className="text-gray-700 dark:text-gray-300">
                {searchQuery || filterZone || filterType || filterActive !== undefined
                  ? 'No locations match your filters'
                  : 'No bin locations found. Create your first location to get started.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(locationsByZone).map(([zone, zoneLocations], zoneIndex) => (
                <div
                  key={zone}
                  className="bin-card rounded-xl overflow-hidden"
                  style={{
                    animation: `bin-stagger-in 0.4s ease-out ${0.2 + zoneIndex * 0.1}s backwards`,
                  }}
                >
                  <div className="zone-header px-6 py-4 bg-blue-500/10">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-blue-500 bin-id-display">
                        {zone}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-['Space_Grotesk',sans-serif]">
                          Zone {zone}
                        </h3>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          {zoneLocations.length} location{zoneLocations.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/[0.05]">
                      <thead className="bg-white/[0.02]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Bin ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Zone
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Aisle
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Shelf
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          {canManageLocations && (
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {zoneLocations.map((location: BinLocation) => (
                          <tr
                            key={location.binId}
                            className="hover:bg-blue-500/5 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="bin-id-display text-sm font-semibold text-gray-900 dark:text-white">
                                {location.binId}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-800 dark:text-white">
                                {location.zone}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-800 dark:text-white">
                                {location.aisle}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-800 dark:text-white">
                                {location.shelf}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-800 dark:text-white">
                                {location.type}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  location.active
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                }`}
                              >
                                {location.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            {canManageLocations && (
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                <button
                                  onClick={() => {
                                    setSelectedLocation(location);
                                    setShowModal(true);
                                  }}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all"
                                  title="Edit"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(location.binId)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {locationsData?.total && locationsData.total > 0 && (
            <Pagination
              currentPage={page}
              totalItems={locationsData.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          )}
        </div>
      </main>

      {showModal && (
        <BinLocationModal
          location={selectedLocation}
          onClose={() => {
            setShowModal(false);
            setSelectedLocation(null);
          }}
          onSuccess={() => refetch()}
        />
      )}

      {showBatchModal && (
        <BatchCreateModal onClose={() => setShowBatchModal(false)} onSuccess={() => refetch()} />
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, binId: '' })}
        onConfirm={confirmDelete}
        title="Delete Bin Location"
        message={`Are you sure you want to delete bin location ${deleteConfirm.binId}?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default BinLocationsPage;
