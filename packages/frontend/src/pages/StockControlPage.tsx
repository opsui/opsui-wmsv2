/**
 * Stock Control page
 *
 * Comprehensive stock management interface for stock controllers
 * Features: inventory overview, stock counts, transfers, adjustments, reports
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useStockControlDashboard,
  useStockControlInventory,
  useStockControlTransactions,
  useLowStockReport,
  useTransferStock,
  useAdjustInventory,
  useCreateStockCount,
  useInventoryAging,
  useInventoryTurnover,
  useBinUtilization,
  useLotTracking,
  useExpiringInventory,
} from '@/services/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  SearchInput,
  MetricCardSkeleton,
  Skeleton,
  TableSkeleton,
  Breadcrumb,
} from '@/components/shared';
import { useToast } from '@/components/shared';
import { useAuthStore } from '@/stores';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useInventoryUpdates, useNotifications } from '@/hooks/useWebSocket';
import {
  CubeIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  XMarkIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import {
  InventoryAgingChart,
  TurnoverChart,
  BinUtilizationHeatmap,
  LotExpirationChart,
} from '@/components/charts';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'dashboard' | 'inventory' | 'transactions' | 'quick-actions' | 'analytics' | 'lots';

interface InventoryTabProps {
  initialSku?: string;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'primary',
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'primary' | 'success' | 'warning' | 'error';
  trend?: { value: number; isPositive: boolean };
}) {
  const colorStyles = {
    primary:
      'bg-blue-100 dark:bg-primary-500/10 text-blue-600 dark:text-primary-400 border border-blue-200 dark:border-primary-500/20',
    success:
      'bg-green-100 dark:bg-success-500/10 text-green-600 dark:text-success-400 border border-green-200 dark:border-success-500/20',
    warning:
      'bg-amber-100 dark:bg-warning-500/10 text-amber-600 dark:text-warning-400 border border-amber-200 dark:border-warning-500/20',
    error:
      'bg-red-100 dark:bg-error-500/10 text-red-600 dark:text-error-400 border border-red-200 dark:border-error-500/20',
  };

  return (
    <Card
      variant="glass"
      className="card-hover group bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {title}
            </p>
            <p className="mt-3 text-4xl font-bold text-gray-900 dark:text-white tracking-tight group-hover:scale-105 transition-transform duration-300">
              {value}
            </p>
            {trend && (
              <p
                className={`mt-2 text-sm ${trend.isPositive ? 'text-green-600 dark:text-success-400' : 'text-red-600 dark:text-error-400'}`}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}% from last week
              </p>
            )}
          </div>
          <div className={`p-4 rounded-2xl ${colorStyles[color]} transition-all duration-300`}>
            <Icon className="h-7 w-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransferModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useToast();
  const transferStock = useTransferStock();

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
      sku: '',
      fromBin: '',
      toBin: '',
      quantity: '',
      reason: '',
    },
    validationRules: {
      sku: {
        required: true,
      },
      fromBin: {
        required: true,
        custom: (value: string) => {
          if (!/^[A-Z]-\d{1,3}-\d{2}$/.test(value)) {
            return 'Format must be Z-A-S (e.g., A-01-01)';
          }
          return null;
        },
      },
      toBin: {
        required: true,
        custom: (value: string) => {
          if (!/^[A-Z]-\d{1,3}-\d{2}$/.test(value)) {
            return 'Format must be Z-A-S (e.g., A-01-01)';
          }
          return null;
        },
      },
      quantity: {
        required: true,
        custom: (value: string) => {
          const num = parseInt(value);
          if (isNaN(num) || num <= 0) {
            return 'Must be a positive number';
          }
          return null;
        },
      },
      reason: {
        required: true,
        minLength: 5,
      },
    },
    onSubmit: async values => {
      try {
        await transferStock.mutateAsync({
          sku: values.sku,
          fromBin: values.fromBin,
          toBin: values.toBin,
          quantity: parseInt(values.quantity),
          reason: values.reason,
        });
        showToast('Stock transferred successfully', 'success');
        onClose();
      } catch (error: any) {
        console.error('Transfer failed:', error);
        showToast(error?.message || 'Transfer failed', 'error');
        throw error;
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full bg-white dark:bg-gray-900 border border-blue-200 dark:border-primary-500/30 shadow-2xl">
        <CardHeader className="px-6 py-4 bg-blue-50 dark:bg-primary-500/10 border-b border-blue-200 dark:border-primary-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-primary-500/20">
                <ArrowPathIcon className="h-6 w-6 text-blue-600 dark:text-primary-500" />
              </div>
              <CardTitle className="text-gray-900 dark:text-white">Transfer Stock</CardTitle>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-white dark:bg-gray-900">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                SKU
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={e => setFieldValue('sku', e.target.value.toUpperCase())}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500 focus:border-transparent transition-all ${
                  errors.sku ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter SKU"
              />
              {errors.sku && <p className="mt-1 text-sm text-red-500">{errors.sku}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                From Bin
              </label>
              <input
                type="text"
                name="fromBin"
                value={formData.fromBin}
                onChange={e => setFieldValue('fromBin', e.target.value.toUpperCase())}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500 focus:border-transparent transition-all ${
                  errors.fromBin ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="e.g., A-01-01"
              />
              {errors.fromBin && <p className="mt-1 text-sm text-red-500">{errors.fromBin}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                To Bin
              </label>
              <input
                type="text"
                name="toBin"
                value={formData.toBin}
                onChange={e => setFieldValue('toBin', e.target.value.toUpperCase())}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500 focus:border-transparent transition-all ${
                  errors.toBin ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="e.g., B-02-03"
              />
              {errors.toBin && <p className="mt-1 text-sm text-red-500">{errors.toBin}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500 focus:border-transparent transition-all ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter quantity"
              />
              {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Reason
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500 focus:border-transparent transition-all resize-none ${
                  errors.reason ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter reason for transfer"
                rows={3}
              />
              {errors.reason && <p className="mt-1 text-sm text-red-500">{errors.reason}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Transferring...' : 'Transfer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AdjustmentModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useToast();
  const adjustInventory = useAdjustInventory();

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
      sku: '',
      binLocation: '',
      quantity: '',
      reason: '',
    },
    validationRules: {
      sku: {
        required: true,
      },
      binLocation: {
        required: true,
        custom: (value: string) => {
          if (!/^[A-Z]-\d{1,3}-\d{2}$/.test(value)) {
            return 'Format must be Z-A-S (e.g., A-01-01)';
          }
          return null;
        },
      },
      quantity: {
        required: true,
        custom: (value: string) => {
          const num = parseInt(value);
          if (isNaN(num) || num === 0) {
            return 'Must be a non-zero number';
          }
          return null;
        },
      },
      reason: {
        required: true,
        minLength: 5,
      },
    },
    onSubmit: async values => {
      try {
        await adjustInventory.mutateAsync({
          sku: values.sku,
          binLocation: values.binLocation,
          quantity: parseInt(values.quantity),
          reason: values.reason,
        });
        showToast('Inventory adjusted successfully', 'success');
        onClose();
      } catch (error: any) {
        console.error('Adjustment failed:', error);
        showToast(error?.message || 'Adjustment failed', 'error');
        throw error;
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full bg-white dark:bg-gray-900 border border-amber-200 dark:border-warning-500/30 shadow-2xl">
        <CardHeader className="px-6 py-4 bg-amber-50 dark:bg-warning-500/10 border-b border-amber-200 dark:border-warning-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-warning-500/20">
                <PlusIcon className="h-6 w-6 text-amber-600 dark:text-warning-500" />
              </div>
              <CardTitle className="text-gray-900 dark:text-white">Adjust Inventory</CardTitle>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-white dark:bg-gray-900">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                SKU
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={e => setFieldValue('sku', e.target.value.toUpperCase())}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-warning-500 focus:border-transparent transition-all ${
                  errors.sku ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter SKU"
              />
              {errors.sku && <p className="mt-1 text-sm text-red-500">{errors.sku}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Bin Location
              </label>
              <input
                type="text"
                name="binLocation"
                value={formData.binLocation}
                onChange={e => setFieldValue('binLocation', e.target.value.toUpperCase())}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-warning-500 focus:border-transparent transition-all ${
                  errors.binLocation ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="e.g., A-01-01"
              />
              {errors.binLocation && (
                <p className="mt-1 text-sm text-red-500">{errors.binLocation}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Quantity (+ to add, - to remove)
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-warning-500 focus:border-transparent transition-all ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="e.g., 5 or -5"
              />
              {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Reason
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-warning-500 focus:border-transparent transition-all resize-none ${
                  errors.reason ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter reason for adjustment"
                rows={3}
              />
              {errors.reason && <p className="mt-1 text-sm text-red-500">{errors.reason}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Adjusting...' : 'Adjust'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function StockCountModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useToast();
  const createStockCount = useCreateStockCount();

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
      binLocation: '',
      type: 'SPOT' as 'FULL' | 'CYCLE' | 'SPOT',
    },
    validationRules: {
      binLocation: {
        required: true,
        custom: (value: string) => {
          if (!/^[A-Z]-\d{1,3}-\d{2}$/.test(value)) {
            return 'Format must be Z-A-S (e.g., A-01-01)';
          }
          return null;
        },
      },
      type: {
        required: true,
      },
    },
    onSubmit: async values => {
      try {
        await createStockCount.mutateAsync({ binLocation: values.binLocation, type: values.type });
        showToast('Stock count created successfully', 'success');
        onClose();
      } catch (error: any) {
        console.error('Stock count creation failed:', error);
        showToast(error?.message || 'Failed to create stock count', 'error');
        throw error;
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full bg-white dark:bg-gray-900 border border-green-200 dark:border-success-500/30 shadow-2xl">
        <CardHeader className="px-6 py-4 bg-green-50 dark:bg-success-500/10 border-b border-green-200 dark:border-success-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-100 dark:bg-success-500/20">
                <ClipboardDocumentListIcon className="h-6 w-6 text-green-600 dark:text-success-500" />
              </div>
              <CardTitle className="text-gray-900 dark:text-white">Create Stock Count</CardTitle>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-white dark:bg-gray-900">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Bin Location
              </label>
              <input
                type="text"
                name="binLocation"
                value={formData.binLocation}
                onChange={e => setFieldValue('binLocation', e.target.value.toUpperCase())}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-success-500 focus:border-transparent transition-all ${
                  errors.binLocation ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="e.g., A-01-01"
              />
              {errors.binLocation && (
                <p className="mt-1 text-sm text-red-500">{errors.binLocation}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Count Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-success-500 focus:border-transparent transition-all ${
                  errors.type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="SPOT">Spot Count</option>
                <option value="CYCLE">Cyclic Count</option>
                <option value="FULL">Full Count</option>
              </select>
              {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// TAB CONTENT
// ============================================================================

function DashboardTab() {
  const { data: dashboard, isLoading, error, isError } = useStockControlDashboard();
  const { data: lowStock } = useLowStockReport(10);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <Card
          variant="glass"
          className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
        >
          <CardContent className="p-6">
            <Skeleton variant="text" className="w-48 h-6 mb-4" />
            <TableSkeleton rows={5} columns={6} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || error || !dashboard) {
    return (
      <Card
        variant="glass"
        className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
      >
        <CardContent className="p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-amber-500 dark:text-warning-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">
            {isError || error
              ? 'Failed to load dashboard data. Please try again.'
              : 'No dashboard data available.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total SKUs"
          value={dashboard.totalSKUs}
          icon={CubeIcon}
          color="primary"
        />
        <MetricCard
          title="Total Bins"
          value={dashboard.totalBins}
          icon={ClipboardDocumentListIcon}
          color="success"
        />
        <MetricCard
          title="Low Stock Items"
          value={dashboard.lowStockItems}
          icon={ExclamationTriangleIcon}
          color={dashboard.lowStockItems > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          title="Out of Stock"
          value={dashboard.outOfStockItems}
          icon={XMarkIcon}
          color={dashboard.outOfStockItems > 0 ? 'error' : 'success'}
        />
      </div>

      {/* Recent Transactions */}
      <Card
        variant="glass"
        className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
      >
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                    Time
                  </th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                    SKU
                  </th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                    Quantity
                  </th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                    Location
                  </th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentTransactions?.map(
                  (txn: {
                    transactionId: string;
                    timestamp: string;
                    type: string;
                    sku: string;
                    quantity: number;
                    binLocation?: string;
                    reason: string;
                  }) => (
                    <tr
                      key={txn.transactionId}
                      className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {new Date(txn.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            txn.type === 'RECEIPT'
                              ? 'bg-green-100 dark:bg-success-500/20 text-green-600 dark:text-success-400'
                              : txn.type === 'DEDUCTION'
                                ? 'bg-red-100 dark:bg-error-500/20 text-red-600 dark:text-error-400'
                                : txn.type === 'ADJUSTMENT'
                                  ? 'bg-amber-100 dark:bg-warning-500/20 text-amber-600 dark:text-warning-400'
                                  : 'bg-blue-100 dark:bg-primary-500/20 text-blue-600 dark:text-primary-400'
                          }`}
                        >
                          {txn.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                        {txn.sku}
                      </td>
                      <td
                        className={`py-3 px-4 font-medium ${
                          txn.quantity > 0
                            ? 'text-green-600 dark:text-success-400'
                            : 'text-red-600 dark:text-error-400'
                        }`}
                      >
                        {txn.quantity > 0 ? '+' : ''}
                        {txn.quantity}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {txn.binLocation || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm">
                        {txn.reason}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStock && lowStock.items.length > 0 && (
        <Card
          variant="glass"
          className="border border-amber-200 dark:border-warning-500/20 bg-white dark:bg-gray-800/50"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 dark:text-warning-400" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                      SKU
                    </th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                      Location
                    </th>
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                      Available
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.items
                    .slice(0, 10)
                    .map(
                      (
                        item: { sku: string; name: string; binLocation: string; available: number },
                        index: number
                      ) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                        >
                          <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                            {item.sku}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            {item.name}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            {item.binLocation}
                          </td>
                          <td className="py-3 px-4 text-amber-600 dark:text-warning-400 font-medium">
                            {item.available}
                          </td>
                        </tr>
                      )
                    )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InventoryTab({ initialSku }: InventoryTabProps) {
  const [searchSku, setSearchSku] = useState(initialSku || '');
  const [searchName, setSearchName] = useState('');
  const [searchBin, setSearchBin] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useStockControlInventory({
    name: searchName || undefined,
    sku: searchSku || undefined,
    binLocation: searchBin || undefined,
    lowStock: filterLowStock || undefined,
    page,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card
        variant="glass"
        className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
      >
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                Product Name
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchName}
                  onChange={e => {
                    setSearchName(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500"
                  placeholder="Search by name..."
                />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                SKU
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchSku}
                  onChange={e => {
                    setSearchSku(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500"
                  placeholder="Enter SKU..."
                />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                Bin Location
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchBin}
                  onChange={e => {
                    setSearchBin(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500"
                  placeholder="e.g., A-01"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lowStock"
                checked={filterLowStock}
                onChange={e => {
                  setFilterLowStock(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-blue-500 dark:text-primary-500 focus:ring-blue-500 dark:focus:ring-primary-500"
              />
              <label htmlFor="lowStock" className="text-sm text-gray-600 dark:text-gray-300">
                Low Stock Only
              </label>
            </div>
            {(searchName || searchSku || searchBin || filterLowStock) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchName('');
                  setSearchSku('');
                  setSearchBin('');
                  setFilterLowStock(false);
                  setPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card
        variant="glass"
        className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
      >
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} columns={8} />
          ) : data?.items && data.items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10">
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        SKU
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Category
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Bin Location
                      </th>
                      <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Quantity
                      </th>
                      <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Reserved
                      </th>
                      <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Available
                      </th>
                      <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map(
                      (
                        item: {
                          sku: string;
                          name: string;
                          category: string;
                          binLocation: string;
                          quantity: number;
                          reserved: number;
                          available: number;
                        },
                        index: number
                      ) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                        >
                          <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                            {item.sku}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            {item.name}
                          </td>
                          <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                            {item.category}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            {item.binLocation}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-4 text-right text-amber-600 dark:text-warning-400">
                            {item.reserved}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-medium ${
                              item.available === 0
                                ? 'text-red-600 dark:text-error-400'
                                : item.available <= 10
                                  ? 'text-amber-600 dark:text-warning-400'
                                  : 'text-green-600 dark:text-success-400'
                            }`}
                          >
                            {item.available}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.available === 0 ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-error-500/20 text-red-600 dark:text-error-400">
                                Out of Stock
                              </span>
                            ) : item.available <= 10 ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-warning-500/20 text-amber-600 dark:text-warning-400">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-success-500/20 text-green-600 dark:text-success-400">
                                In Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.total > 50 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-white/10">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, data.total)} of{' '}
                    {data.total} items
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page * 50 >= data.total}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No inventory items found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionsTab() {
  const [filters, setFilters] = useState({
    sku: '',
    binLocation: '',
    type: '',
  });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useStockControlTransactions({
    sku: filters.sku || undefined,
    binLocation: filters.binLocation || undefined,
    type: filters.type || undefined,
    limit: 50,
    offset: (page - 1) * 50,
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card
        variant="glass"
        className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
      >
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                SKU
              </label>
              <input
                type="text"
                value={filters.sku}
                onChange={e => {
                  setFilters({ ...filters, sku: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500"
                placeholder="Enter SKU..."
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                Bin Location
              </label>
              <input
                type="text"
                value={filters.binLocation}
                onChange={e => {
                  setFilters({ ...filters, binLocation: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500"
                placeholder="e.g., A-01"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={filters.type}
                onChange={e => {
                  setFilters({ ...filters, type: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500"
              >
                <option value="">All Types</option>
                <option value="RECEIPT">Receipt</option>
                <option value="DEDUCTION">Deduction</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="RESERVATION">Reservation</option>
                <option value="CANCELLATION">Cancellation</option>
              </select>
            </div>
            {(filters.sku || filters.binLocation || filters.type) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilters({ sku: '', binLocation: '', type: '' });
                  setPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card
        variant="glass"
        className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
      >
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} columns={7} />
          ) : data?.transactions && data.transactions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10">
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Time
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        SKU
                      </th>
                      <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Quantity
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Location
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        User ID
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map(
                      (txn: {
                        transactionId: string;
                        timestamp: string;
                        type: string;
                        sku: string;
                        quantity: number;
                        binLocation?: string;
                        userId: string;
                        reason: string;
                      }) => (
                        <tr
                          key={txn.transactionId}
                          className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                        >
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {new Date(txn.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                txn.type === 'RECEIPT'
                                  ? 'bg-green-100 dark:bg-success-500/20 text-green-600 dark:text-success-400'
                                  : txn.type === 'DEDUCTION'
                                    ? 'bg-red-100 dark:bg-error-500/20 text-red-600 dark:text-error-400'
                                    : txn.type === 'ADJUSTMENT'
                                      ? 'bg-amber-100 dark:bg-warning-500/20 text-amber-600 dark:text-warning-400'
                                      : txn.type === 'RESERVATION'
                                        ? 'bg-blue-100 dark:bg-primary-500/20 text-blue-600 dark:text-primary-400'
                                        : 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {txn.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                            {txn.sku}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-medium ${
                              txn.quantity > 0
                                ? 'text-green-600 dark:text-success-400'
                                : 'text-red-600 dark:text-error-400'
                            }`}
                          >
                            {txn.quantity > 0 ? '+' : ''}
                            {txn.quantity}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            {txn.binLocation || '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                            {txn.userId}
                          </td>
                          <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm max-w-xs truncate">
                            {txn.reason}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.total > 50 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-white/10">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, data.total)} of{' '}
                    {data.total} transactions
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page * 50 >= data.total}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No transactions found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuickActionsTab() {
  const [activeModal, setActiveModal] = useState<'transfer' | 'adjust' | 'count' | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          variant="glass"
          className="card-hover cursor-pointer border-blue-200 dark:border-primary-500/30 hover:border-blue-300 dark:hover:border-primary-500/50 transition-all bg-white dark:bg-gray-800/50"
          onClick={() => setActiveModal('transfer')}
        >
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-primary-500/20 dark:to-primary-500/10 border border-blue-200 dark:border-primary-500/30 shadow-lg">
                <ArrowPathIcon className="h-10 w-10 text-blue-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Transfer Stock
                </h3>
                <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                  Move inventory between bin locations
                </p>
              </div>
              <div className="w-full pt-4 border-t border-gray-200 dark:border-white/10">
                <span className="text-sm text-blue-600 dark:text-primary-400 font-medium">
                  Click to transfer →
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          variant="glass"
          className="card-hover cursor-pointer border-amber-200 dark:border-warning-500/30 hover:border-amber-300 dark:hover:border-warning-500/50 transition-all bg-white dark:bg-gray-800/50"
          onClick={() => setActiveModal('adjust')}
        >
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-warning-500/20 dark:to-warning-500/10 border border-amber-200 dark:border-warning-500/30 shadow-lg">
                <PlusIcon className="h-10 w-10 text-amber-600 dark:text-warning-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Adjust Inventory
                </h3>
                <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                  Add or remove stock with reason
                </p>
              </div>
              <div className="w-full pt-4 border-t border-gray-200 dark:border-white/10">
                <span className="text-sm text-amber-600 dark:text-warning-400 font-medium">
                  Click to adjust →
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          variant="glass"
          className="card-hover cursor-pointer border-green-200 dark:border-success-500/30 hover:border-green-300 dark:hover:border-success-500/50 transition-all bg-white dark:bg-gray-800/50"
          onClick={() => setActiveModal('count')}
        >
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 dark:from-success-500/20 dark:to-success-500/10 border border-green-200 dark:border-success-500/30 shadow-lg">
                <ClipboardDocumentListIcon className="h-10 w-10 text-green-600 dark:text-success-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Stock Count
                </h3>
                <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                  Create a new stock count session
                </p>
              </div>
              <div className="w-full pt-4 border-t border-gray-200 dark:border-white/10">
                <span className="text-sm text-green-600 dark:text-success-400 font-medium">
                  Click to count →
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeModal === 'transfer' && <TransferModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'adjust' && <AdjustmentModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'count' && <StockCountModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}

// ============================================================================
// ANALYTICS TAB
// ============================================================================

function AnalyticsTab() {
  const { data: agingData, isLoading: agingLoading } = useInventoryAging();
  const { data: turnoverData, isLoading: turnoverLoading } = useInventoryTurnover('month');
  const { data: binUtilizationData, isLoading: binLoading } = useBinUtilization();

  return (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryAgingChart data={agingData?.agingBuckets} isLoading={agingLoading} />
        <TurnoverChart data={turnoverData?.items} isLoading={turnoverLoading} />
      </div>

      {/* Bin Utilization Heatmap */}
      <BinUtilizationHeatmap
        data={binUtilizationData?.bins}
        zoneSummary={binUtilizationData?.zoneSummary}
        isLoading={binLoading}
      />
    </div>
  );
}

// ============================================================================
// LOTS TAB
// ============================================================================

function LotsTab() {
  const [searchSku, setSearchSku] = useState('');
  const [searchLot, setSearchLot] = useState('');
  const [expiringDays, setExpiringDays] = useState(30);

  const { data: lotData, isLoading: lotLoading } = useLotTracking(searchSku);
  const { data: expiringData, isLoading: expiringLoading } = useExpiringInventory(expiringDays);

  return (
    <div className="space-y-6">
      {/* Search and Filter Card */}
      <Card
        variant="glass"
        className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
      >
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                Search by SKU
              </label>
              <input
                type="text"
                value={searchSku}
                onChange={e => setSearchSku(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500"
                placeholder="Enter SKU to view lots..."
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                Search by Lot Number
              </label>
              <input
                type="text"
                value={searchLot}
                onChange={e => setSearchLot(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500"
                placeholder="Enter lot number..."
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                Expiring Within
              </label>
              <select
                value={expiringDays}
                onChange={e => setExpiringDays(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-primary-500"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lot Tracking Table */}
      {searchSku && lotData && (
        <Card
          variant="glass"
          className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
        >
          <CardHeader>
            <CardTitle>Lot Tracking for {searchSku}</CardTitle>
          </CardHeader>
          <CardContent>
            {lotLoading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : lotData.lots && lotData.lots.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10">
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Lot Number
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Expiration
                      </th>
                      <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Quantity
                      </th>
                      <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Available
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Locations
                      </th>
                      <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotData.lots.map((lot: any) => (
                      <tr
                        key={lot.lotNumber}
                        className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <td className="py-3 px-4 text-gray-900 dark:text-white font-medium font-mono text-sm">
                          {lot.lotNumber}
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          {lot.expirationDate
                            ? new Date(lot.expirationDate).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                          {lot.quantity}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                          {lot.available}
                        </td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm">
                          {lot.binLocations.join(', ')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              lot.status === 'EXPIRED'
                                ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                                : lot.status === 'EXPIRING_SOON'
                                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                  : 'bg-green-100 dark:bg-emerald-500/20 text-green-600 dark:text-emerald-400'
                            }`}
                          >
                            {lot.status === 'EXPIRED'
                              ? 'Expired'
                              : lot.status === 'EXPIRING_SOON'
                                ? `Expiring (${lot.daysUntilExpiration} days)`
                                : 'OK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No lots found for this SKU
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expiring Inventory Chart */}
      <LotExpirationChart data={expiringData?.items} isLoading={expiringLoading} />
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function StockControlPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { user, getEffectiveRole } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [quickSearchSku, setQuickSearchSku] = useState<string>('');

  // ==========================================================================
  // Real-time WebSocket Subscriptions
  // ==========================================================================

  // Subscribe to inventory updates for real-time stock changes
  useInventoryUpdates(data => {
    // Refresh all stock control data when inventory changes
    queryClient.invalidateQueries({ queryKey: ['stock-control'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['low-stock'] });
    // Show low stock alert
    if (data.quantity !== undefined && data.quantity <= 10) {
      showToast(`SKU ${data.sku} is running low (${data.quantity} remaining)`, 'error');
    }
  });

  // Subscribe to notifications for stock control alerts
  useNotifications(data => {
    // Show toast for all notifications
    showToast(data.message || data.title, 'info');
  });

  // Read active tab from URL query param, default to 'dashboard'
  const activeTab = (searchParams.get('tab') as TabType) || 'dashboard';

  // Update tab in URL when changed
  const setActiveTab = (tab: TabType) => {
    setSearchParams({ tab });
  };

  // Show loading while user is being fetched
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <Skeleton variant="rectangular" height={200} className="rounded-lg" />
        </div>
      </div>
    );
  }

  // Check if user has access (stock controller, supervisor, or admin)
  // Use effective role (activeRole if set, otherwise base role) for authorization
  // Exception: Admin/Supervisor users with active worker roles can still access
  const effectiveRole = getEffectiveRole();
  const activeRole = useAuthStore(state => state.activeRole);

  // Check if user has access via effective role
  let hasAccess =
    effectiveRole === 'STOCK_CONTROLLER' ||
    effectiveRole === 'SUPERVISOR' ||
    effectiveRole === 'ADMIN';

  // Allow admin/supervisor users with active worker roles to access
  if (!hasAccess && user && activeRole && activeRole !== user.role) {
    hasAccess = user.role === 'ADMIN' || user.role === 'SUPERVISOR';
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-6 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-amber-500 dark:text-warning-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You need stock controller privileges to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] =
    [
      { key: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
      { key: 'inventory', label: 'Inventory', icon: CubeIcon },
      { key: 'transactions', label: 'Transactions', icon: DocumentTextIcon },
      { key: 'quick-actions', label: 'Quick Actions', icon: ArrowPathIcon },
      { key: 'analytics', label: 'Analytics', icon: ChartBarIcon },
      { key: 'lots', label: 'Lots', icon: TagIcon },
    ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />
        {/* Page Header */}
        <div className="animate-in">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Stock Control
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage inventory, stock counts, transfers, and adjustments
          </p>
        </div>

        {/* Quick Search */}
        <Card
          variant="glass"
          className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
        >
          <CardContent className="p-4">
            <SearchInput
              onSelect={sku => {
                setQuickSearchSku(sku);
                setActiveTab('inventory');
              }}
              placeholder="Quick product search (SKU or name)..."
            />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card
          variant="glass"
          className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
        >
          <CardContent className="p-2">
            <div className="flex gap-2 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-blue-100 dark:bg-primary-500/20 text-blue-600 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        <div className="animate-in">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'inventory' && <InventoryTab initialSku={quickSearchSku} />}
          {activeTab === 'transactions' && <TransactionsTab />}
          {activeTab === 'quick-actions' && <QuickActionsTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'lots' && <LotsTab />}
        </div>
      </main>
    </div>
  );
}
