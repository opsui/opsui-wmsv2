/**
 * Product Search Page
 *
 * Browse and filter items by SKU, name, barcode, or category
 * View inventory levels and bin locations
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Button,
  Badge,
  Header,
} from '@/components/shared';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  CubeIcon,
  MapPinIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { usePageTracking, PageViews } from '@/hooks/usePageTracking';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores';
import { UserRole } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface InventoryItem {
  binLocation: string;
  quantity: number;
  reserved: number;
  available: number;
}

interface SearchResult {
  sku: string;
  name: string;
  barcode: string;
  category: string | null;
  totalQuantity: number;
  totalAvailable: number;
  inventory: InventoryItem[];
  unitPrice?: number;
  unitCost?: number;
  currency?: string;
}

interface BasicSKU {
  sku: string;
  name: string;
  category: string;
  barcode: string;
  binLocations: string[];
  unitPrice?: number;
  unitCost?: number;
  currency?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const getAllSKUs = async (): Promise<BasicSKU[]> => {
  const response = await apiClient.get<BasicSKU[]>('/skus?limit=200');
  return response.data;
};

const getSKUWithInventory = async (sku: string): Promise<SearchResult> => {
  const response = await apiClient.get<SearchResult>(`/skus/${sku}`);
  return response.data;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductSearchPage() {
  usePageTracking({ view: PageViews.ITEM_SEARCH });
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSKU, setSelectedSKU] = useState<SearchResult | null>(null);

  // Fetch all SKUs
  const { data: allSKUs, isLoading: isLoadingSKUs } = useQuery({
    queryKey: ['skus', 'all'],
    queryFn: getAllSKUs,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch detailed info for selected SKU
  const { data: selectedSKUDetails } = useQuery({
    queryKey: ['sku', 'details', selectedSKU?.sku],
    queryFn: () => getSKUWithInventory(selectedSKU!.sku),
    enabled: !!selectedSKU,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Filter SKUs based on search query
  const filteredSKUs = useMemo(() => {
    if (!allSKUs) return [];
    if (!searchQuery.trim()) return allSKUs;

    const query = searchQuery.toLowerCase();
    return allSKUs.filter(
      sku =>
        sku.sku.toLowerCase().includes(query) ||
        sku.name.toLowerCase().includes(query) ||
        sku.barcode?.toLowerCase().includes(query) ||
        sku.category?.toLowerCase().includes(query)
    );
  }, [allSKUs, searchQuery]);

  // Determine appropriate back route based on role
  const getBackRoute = () => {
    const effectiveRole = getEffectiveRole() || user?.role;
    if (effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.SUPERVISOR) {
      return '/dashboard';
    }
    if (effectiveRole === UserRole.PICKER) {
      return '/orders';
    }
    if (effectiveRole === UserRole.PACKER) {
      return '/packing';
    }
    if (effectiveRole === UserRole.STOCK_CONTROLLER) {
      return '/stock-control';
    }
    if (effectiveRole === ('INWARDS' as UserRole)) {
      return '/inwards';
    }
    if (effectiveRole === ('PRODUCTION' as UserRole)) {
      return '/production';
    }
    if (effectiveRole === ('MAINTENANCE' as UserRole)) {
      return '/maintenance';
    }
    if (effectiveRole === ('SALES' as UserRole)) {
      return '/sales';
    }
    if (effectiveRole === ('RMA' as UserRole)) {
      return '/rma';
    }
    return '/dashboard';
  };

  const selectSKU = async (sku: BasicSKU) => {
    setSelectedSKU({
      sku: sku.sku,
      name: sku.name,
      barcode: sku.barcode,
      category: sku.category,
      totalQuantity: 0,
      totalAvailable: 0,
      inventory: [],
    });
  };

  const closeDetails = () => {
    setSelectedSKU(null);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(getBackRoute())}
                className="flex items-center gap-2"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Search</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Browse and filter products by SKU, name, barcode, or category
                </p>
              </div>
            </div>
            <MagnifyingGlassIcon className="h-8 w-8 text-gray-400" />
          </div>

          {/* Filter Input */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <label
                    htmlFor="filter-input"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Filter Items
                  </label>
                  <Input
                    id="filter-input"
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filter by SKU, name, barcode, or category..."
                    className="text-lg"
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {filteredSKUs.length} of {allSKUs?.length || 0} items shown
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MagnifyingGlassIcon className="h-5 w-5 text-blue-600" />
                All Items ({filteredSKUs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSKUs ? (
                <p className="text-gray-500 dark:text-gray-400">Loading items...</p>
              ) : filteredSKUs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No items match your filter.' : 'No items found.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">
                          SKU
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">
                          Barcode
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">
                          Category
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">
                          Unit Price
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSKUs.map(sku => (
                        <tr
                          key={sku.sku}
                          className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                          onClick={() => selectSKU(sku)}
                        >
                          <td className="py-3 px-4 font-mono font-medium text-gray-900 dark:text-white">
                            {sku.sku}
                          </td>
                          <td className="py-3 px-4 text-gray-900 dark:text-white">{sku.name}</td>
                          <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-400">
                            {sku.barcode || '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {sku.category || '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-900 dark:text-white">
                            {sku.unitPrice != null
                              ? `${sku.currency || 'NZD'} $${Number(sku.unitPrice).toFixed(2)}`
                              : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                selectSKU(sku);
                              }}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected SKU Details */}
          {selectedSKU && (
            <>
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CubeIcon className="h-5 w-5 text-blue-600" />
                      SKU Details: {selectedSKU.sku}
                    </div>
                    <Button variant="ghost" size="sm" onClick={closeDetails}>
                      ×
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedSKUDetails ? (
                    <p className="text-gray-500 dark:text-gray-400">Loading details...</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">SKU</p>
                          <p className="font-medium text-gray-900 dark:text-white font-mono">
                            {selectedSKUDetails.sku}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Product</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {selectedSKUDetails.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Barcode</p>
                          <p className="font-medium text-gray-900 dark:text-white font-mono text-sm">
                            {(selectedSKUDetails as any).barcode || selectedSKU.barcode || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {selectedSKU.category || '-'}
                          </p>
                        </div>
                      </div>
                      {/* Pricing information */}
                      {((selectedSKUDetails as any).unitPrice ||
                        (selectedSKUDetails as any).unitCost) && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Unit Price</p>
                            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                              {(selectedSKUDetails as any).unitPrice != null
                                ? `${(selectedSKUDetails as any).currency || 'NZD'} $${Number((selectedSKUDetails as any).unitPrice).toFixed(2)}`
                                : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Unit Cost</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                              {(selectedSKUDetails as any).unitCost != null
                                ? `${(selectedSKUDetails as any).currency || 'NZD'} $${Number((selectedSKUDetails as any).unitCost).toFixed(2)}`
                                : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Margin</p>
                            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                              {(selectedSKUDetails as any).unitPrice &&
                              (selectedSKUDetails as any).unitCost &&
                              (selectedSKUDetails as any).unitPrice >
                                (selectedSKUDetails as any).unitCost
                                ? `${((((selectedSKUDetails as any).unitPrice - (selectedSKUDetails as any).unitCost) / (selectedSKUDetails as any).unitPrice) * 100).toFixed(1)}%`
                                : '-'}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Total Quantity</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedSKUDetails.inventory?.reduce(
                              (sum, inv) => sum + inv.quantity,
                              0
                            ) || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Total Available
                          </p>
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {selectedSKUDetails.inventory?.reduce(
                              (sum, inv) => sum + inv.available,
                              0
                            ) || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Locations</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedSKUDetails.inventory?.length || 0}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Inventory by Location */}
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPinIcon className="h-5 w-5 text-purple-600" />
                    Inventory by Location ({selectedSKUDetails?.inventory?.length || 0} locations)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedSKUDetails ? (
                    <p className="text-gray-500 dark:text-gray-400">Loading inventory...</p>
                  ) : !selectedSKUDetails.inventory || selectedSKUDetails.inventory.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">
                      No inventory found for this SKU.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b dark:border-gray-700">
                            <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                              Location
                            </th>
                            <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                              Quantity
                            </th>
                            <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                              Reserved
                            </th>
                            <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                              Available
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSKUDetails.inventory.map((inv, idx) => (
                            <tr key={idx} className="border-b dark:border-gray-700 last:border-0">
                              <td className="py-2 px-3 font-mono text-gray-900 dark:text-white">
                                {inv.binLocation}
                              </td>
                              <td className="py-2 px-3 text-gray-900 dark:text-white">
                                {inv.quantity}
                              </td>
                              <td className="py-2 px-3 text-gray-900 dark:text-white">
                                {inv.reserved || 0}
                              </td>
                              <td className="py-2 px-3">
                                <Badge variant={inv.available > 0 ? 'success' : 'default'}>
                                  {inv.available}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProductSearchPage;
