/**
 * Fixed Assets Page
 *
 * Manages fixed assets including tracking depreciation, disposals,
 * and generating asset registers.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  Skeleton,
  Breadcrumb,
} from '@/components/shared';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface FixedAsset {
  assetId: string;
  assetNumber: string;
  assetName: string;
  assetCategory?: string;
  purchaseDate: Date;
  purchaseCost: number;
  salvageValue: number;
  usefulLife: number;
  depreciationMethod: string;
  currentBookValue: number;
  accumulatedDepreciation: number;
  status: string;
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function FixedAssetsPage() {
  const navigate = useNavigate();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Mock data
  const mockAssets: FixedAsset[] = [
    {
      assetId: 'FA-001',
      assetNumber: 'EQ-2024-001',
      assetName: 'Forklift - Toyota 8-Series',
      assetCategory: 'Equipment',
      purchaseDate: new Date('2024-01-15'),
      purchaseCost: 45000,
      salvageValue: 5000,
      usefulLife: 10,
      depreciationMethod: 'STRAIGHT_LINE',
      currentBookValue: 41000,
      accumulatedDepreciation: 4000,
      status: 'ACTIVE',
    },
    {
      assetId: 'FA-002',
      assetNumber: 'VE-2024-001',
      assetName: 'Delivery Truck - Ford Transit',
      assetCategory: 'Vehicles',
      purchaseDate: new Date('2024-03-01'),
      purchaseCost: 35000,
      salvageValue: 3000,
      usefulLife: 8,
      depreciationMethod: 'DOUBLE_DECLINING',
      currentBookValue: 32000,
      accumulatedDepreciation: 3000,
      status: 'ACTIVE',
    },
    {
      assetId: 'FA-003',
      assetNumber: 'BL-2023-001',
      assetName: 'Warehouse Racking System',
      assetCategory: 'Building Improvements',
      purchaseDate: new Date('2023-06-01'),
      purchaseCost: 120000,
      salvageValue: 0,
      usefulLife: 20,
      depreciationMethod: 'STRAIGHT_LINE',
      currentBookValue: 114000,
      accumulatedDepreciation: 6000,
      status: 'ACTIVE',
    },
    {
      assetId: 'FA-004',
      assetNumber: 'OF-2022-001',
      assetName: 'Office Furniture',
      assetCategory: 'Furniture & Fixtures',
      purchaseDate: new Date('2022-01-15'),
      purchaseCost: 15000,
      salvageValue: 0,
      usefulLife: 7,
      depreciationMethod: 'STRAIGHT_LINE',
      currentBookValue: 10714,
      accumulatedDepreciation: 4286,
      status: 'ACTIVE',
    },
  ];

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const totalOriginalCost = mockAssets.reduce((sum, a) => sum + a.purchaseCost, 0);
  const totalAccumulatedDepreciation = mockAssets.reduce(
    (sum, a) => sum + a.accumulatedDepreciation,
    0
  );
  const totalNetBookValue = mockAssets.reduce((sum, a) => sum + a.currentBookValue, 0);

  // Export to CSV
  const exportToCSV = () => {
    const lines: string[] = [];

    lines.push('FIXED ASSET REGISTER');
    lines.push(`Generated on ${new Date().toLocaleDateString()}`);
    lines.push('');
    lines.push(
      'Asset Number,Asset Name,Category,Purchase Date,Cost,Accum. Depreciation,Net Book Value'
    );

    mockAssets.forEach(asset => {
      lines.push(
        `${asset.assetNumber},${asset.assetName},${asset.assetCategory || ''},` +
          `${new Date(asset.purchaseDate).toLocaleDateString()},${asset.purchaseCost},` +
          `${asset.accumulatedDepreciation},${asset.currentBookValue}`
      );
    });

    lines.push('');
    lines.push(
      `TOTALS,,,$${totalOriginalCost},$${totalAccumulatedDepreciation},$${totalNetBookValue}`
    );

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixed-assets-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/20 rounded-xl">
                <BuildingOfficeIcon className="h-8 w-8 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Fixed Assets</h1>
                <p className="mt-2 text-gray-400">Manage fixed assets and depreciation schedules</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={exportToCSV} className="flex items-center gap-2">
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-2">
                <PrinterIcon className="h-4 w-4" />
                Print
              </Button>
              <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                Add Asset
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <Card variant="glass" className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Assets</p>
                <p className="text-2xl font-bold text-white">{mockAssets.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Original Cost</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatCurrency(totalOriginalCost)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Accumulated Depreciation</p>
                <p className="text-2xl font-bold text-amber-400">
                  {formatCurrency(totalAccumulatedDepreciation)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Net Book Value</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(totalNetBookValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assets Table */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton variant="rounded" className="h-64" />
          </div>
        ) : (
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Asset Register</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        Asset #
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        Category
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        Purchase Date
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                        Cost
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                        Accum. Dep.
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                        Net Book Value
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                        Dep. Method
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockAssets.map(asset => (
                      <tr
                        key={asset.assetId}
                        className="border-b border-gray-800 hover:bg-white/[0.02]"
                      >
                        <td className="py-3 px-4 text-sm font-mono text-gray-300">
                          {asset.assetNumber}
                        </td>
                        <td className="py-3 px-4 text-sm text-white font-medium">
                          {asset.assetName}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {asset.assetCategory || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-300">
                          {new Date(asset.purchaseDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-blue-400">
                          {formatCurrency(asset.purchaseCost)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-amber-400">
                          {formatCurrency(asset.accumulatedDepreciation)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-bold text-emerald-400">
                          {formatCurrency(asset.currentBookValue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-center text-gray-400">
                          {asset.depreciationMethod.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button className="p-1 hover:bg-white/[0.05] rounded">
                              <PencilIcon className="h-4 w-4 text-gray-400" />
                            </button>
                            <button className="p-1 hover:bg-white/[0.05] rounded">
                              <TrashIcon className="h-4 w-4 text-rose-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-700 bg-white/[0.02]">
                      <td
                        colSpan={4}
                        className="py-3 px-4 text-sm font-bold text-gray-400 text-right"
                      >
                        TOTALS:
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-blue-400">
                        {formatCurrency(totalOriginalCost)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-amber-400">
                        {formatCurrency(totalAccumulatedDepreciation)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-emerald-400">
                        {formatCurrency(totalNetBookValue)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Asset Modal (placeholder) */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card variant="glass" className="w-full max-w-2xl mx-4">
              <CardHeader>
                <CardTitle>Add New Fixed Asset</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-400 mb-4">Asset creation form would go here...</p>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setShowAddModal(false)}>Save Asset</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default FixedAssetsPage;
