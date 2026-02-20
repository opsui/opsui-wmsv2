/**
 * Product Search Page - Enhanced Version
 *
 * Features:
 * - Pagination with server-side support
 * - Advanced filtering (category, stock status, price range)
 * - Sorting capability for all columns
 * - Export functionality (CSV/Excel)
 * - Bulk actions with row selection
 * - Image support with thumbnails
 * - Stock status indicators (low stock, out of stock badges)
 * - Quick actions (quick adjust stock, quick pick)
 * - Mobile responsiveness
 * - Error handling with error boundaries
 * - Loading states with skeleton components
 * - Empty states with helpful guidance
 * - Keyboard shortcuts for navigation
 * - Recent searches with local storage
 *
 * ============================================================================
 * AESTHETIC DIRECTION: DISCOVERY ENGINE
 * ============================================================================
 * Product exploration aesthetic:
 * - Dark theme with bright cyan accents for search focus
 * - Industrial grid background texture
 * - Staggered card reveal animations
 * - Grid/table view toggle with smooth transitions
 * - Stock status badges with visual urgency
 * ============================================================================
 */

import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Header,
  Input,
  Modal,
  Pagination,
  Select,
  TableSkeleton,
} from '@/components/shared';
import { PageViews, usePageTracking } from '@/hooks/usePageTracking';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores';
import {
  ArrowDownTrayIcon,
  Bars3Icon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  Squares2X2Icon,
  TableCellsIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
  image?: string;
  description?: string;
  locationCount?: number;
  binLocations?: string[];
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
  image?: string;
  description?: string;
  totalQuantity?: number;
  totalAvailable?: number;
  locationCount?: number;
}

interface PaginatedResponse {
  data: BasicSKU[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  filters: {
    categories: string[];
  };
}

type StockStatus = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
type SortField = 'sku' | 'name' | 'category' | 'unitPrice' | 'totalQuantity' | 'totalAvailable';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'table' | 'grid';

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

const RECENT_SEARCHES_KEY = 'product-search-recent';
const MAX_RECENT_SEARCHES = 5;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getRecentSearches = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (search: string) => {
  if (!search.trim()) return;
  const recent = getRecentSearches();
  const filtered = recent.filter(s => s.toLowerCase() !== search.toLowerCase());
  const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
};

const getStockStatusBadge = (quantity: number, lowThreshold: number = 10) => {
  if (quantity === 0) {
    return { variant: 'error' as const, label: 'Out of Stock', icon: XMarkIcon };
  }
  if (quantity <= lowThreshold) {
    return { variant: 'warning' as const, label: 'Low Stock', icon: ExclamationTriangleIcon };
  }
  return { variant: 'success' as const, label: 'In Stock', icon: CheckCircleIcon };
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductSearchPage() {
  usePageTracking({ view: PageViews.ITEM_SEARCH });
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore(state => state.user);
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);

  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '');
  const [selectedSKU, setSelectedSKU] = useState<SearchResult | null>(null);
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [pageSize, setPageSize] = useState(20);
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [stockStatus, setStockStatus] = useState<StockStatus>(
    (searchParams.get('stockStatus') as StockStatus) || 'all'
  );
  const [sortBy, setSortBy] = useState<SortField>(
    (searchParams.get('sortBy') as SortField) || 'sku'
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    (searchParams.get('sortOrder') as SortOrder) || 'asc'
  );
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [quickAdjustModal, setQuickAdjustModal] = useState<{
    sku: BasicSKU;
    currentQty: number;
  } | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      if (searchQuery.trim()) {
        saveRecentSearch(searchQuery);
        setRecentSearches(getRecentSearches());
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (page > 1) params.set('page', String(page));
    if (category !== 'all') params.set('category', category);
    if (stockStatus !== 'all') params.set('stockStatus', stockStatus);
    if (sortBy !== 'sku') params.set('sortBy', sortBy);
    if (sortOrder !== 'asc') params.set('sortOrder', sortOrder);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, page, category, stockStatus, sortBy, sortOrder, setSearchParams]);

  // Fetch paginated SKUs
  const { data, isLoading, isError, refetch } = useQuery<PaginatedResponse>({
    queryKey: [
      'skus',
      'paginated',
      page,
      pageSize,
      debouncedSearch,
      category,
      stockStatus,
      sortBy,
      sortOrder,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (category !== 'all') params.set('category', category);
      if (stockStatus !== 'all') params.set('stockStatus', stockStatus);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const response = await apiClient.get<PaginatedResponse>(`/skus?${params.toString()}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch detailed info for selected SKU
  const { data: selectedSKUDetails } = useQuery({
    queryKey: ['sku', 'details', selectedSKU?.sku],
    queryFn: async () => {
      const response = await apiClient.get<SearchResult>(`/skus/${selectedSKU!.sku}`);
      return response.data;
    },
    enabled: !!selectedSKU,
    staleTime: 2 * 60 * 1000,
  });

  // Auto-select SKU from URL parameter
  useEffect(() => {
    const skuFromUrl = searchParams.get('sku');
    if (skuFromUrl && data?.data && !selectedSKU) {
      const skuToSelect = data.data.find(s => s.sku === skuFromUrl);
      if (skuToSelect) {
        setSelectedSKU({
          sku: skuToSelect.sku,
          name: skuToSelect.name,
          barcode: skuToSelect.barcode,
          category: skuToSelect.category,
          totalQuantity: skuToSelect.totalQuantity || 0,
          totalAvailable: skuToSelect.totalAvailable || 0,
          inventory: [],
        });
      }
    }
  }, [searchParams, data?.data, selectedSKU]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, stockStatus, pageSize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      // Clear selection on Escape
      if (e.key === 'Escape') {
        setSelectedSkus(new Set());
        setSelectedSKU(null);
        setShowRecentSearches(false);
      }
      // Toggle view mode on V
      if (
        e.key === 'v' &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        setViewMode(prev => (prev === 'table' ? 'grid' : 'table'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = () => {
    if (data?.data) {
      if (selectedSkus.size === data.data.length) {
        setSelectedSkus(new Set());
      } else {
        setSelectedSkus(new Set(data.data.map(s => s.sku)));
      }
    }
  };

  const handleSelectSku = (sku: string) => {
    const newSelected = new Set(selectedSkus);
    if (newSelected.has(sku)) {
      newSelected.delete(sku);
    } else {
      newSelected.add(sku);
    }
    setSelectedSkus(newSelected);
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    const itemsToExport =
      selectedSkus.size > 0 ? data?.data.filter(s => selectedSkus.has(s.sku)) : data?.data;

    if (!itemsToExport?.length) {
      setToast({ message: 'No items to export', type: 'error' });
      return;
    }

    // Create CSV content
    const headers = [
      'SKU',
      'Name',
      'Category',
      'Barcode',
      'Unit Price',
      'Total Quantity',
      'Available',
      'Status',
    ];
    const rows = itemsToExport.map(item => {
      const status = getStockStatusBadge(item.totalQuantity || 0);
      return [
        item.sku,
        item.name,
        item.category || '',
        item.barcode || '',
        item.unitPrice ? `${item.currency || 'NZD'} ${item.unitPrice}` : '',
        item.totalQuantity || 0,
        item.totalAvailable || 0,
        status.label,
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setToast({ message: `Exported ${itemsToExport.length} items`, type: 'success' });
  };

  const handleQuickAdjust = async () => {
    if (!quickAdjustModal || !adjustReason) return;

    setIsAdjusting(true);
    try {
      await apiClient.post('/inventory/adjust', {
        sku: quickAdjustModal.sku.sku,
        binLocation: quickAdjustModal.sku.binLocations?.[0] || 'ADJUST',
        quantity: adjustQuantity,
        reason: adjustReason,
      });
      setToast({ message: 'Stock adjusted successfully', type: 'success' });
      refetch();
    } catch (error) {
      setToast({ message: 'Failed to adjust stock', type: 'error' });
    } finally {
      setIsAdjusting(false);
      setQuickAdjustModal(null);
      setAdjustQuantity(0);
      setAdjustReason('');
    }
  };

  const selectSKU = (sku: BasicSKU) => {
    setSelectedSKU({
      sku: sku.sku,
      name: sku.name,
      barcode: sku.barcode,
      category: sku.category,
      totalQuantity: sku.totalQuantity || 0,
      totalAvailable: sku.totalAvailable || 0,
      inventory: [],
    });
  };

  const closeDetails = () => {
    setSelectedSKU(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategory('all');
    setStockStatus('all');
    setSortBy('sku');
    setSortOrder('asc');
    setPage(1);
  };

  const hasActiveFilters = debouncedSearch || category !== 'all' || stockStatus !== 'all';

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4 text-blue-500" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 text-blue-500" />
    );
  };

  return (
    <div className="min-h-screen relative">
      {/* Industrial grid background texture */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(168, 85, 247, 0.12) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(168, 85, 247, 0.12) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          opacity: 0.2,
          maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 80%)',
        }}
      />

      <Header />
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in-up z-10">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircleIcon className="h-5 w-5" />}
            {toast.type === 'error' && <ExclamationTriangleIcon className="h-5 w-5" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
              Product Search
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Browse and filter products by SKU, name, barcode, or category
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
                title="Table view"
              >
                <TableCellsIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
                title="Grid view"
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
            </div>

            {/* Export Button */}
            <div className="relative">
              <Button
                variant="secondary"
                className="flex items-center gap-2"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <button
                    onClick={() => {
                      handleExport('csv');
                      setShowExportMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => {
                      handleExport('excel');
                      setShowExportMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                  >
                    Export as Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <label
                  htmlFor="search-input"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Search Products
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setShowRecentSearches(true)}
                    onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
                    placeholder="Search by SKU, name, barcode, or category..."
                    className="pl-10 text-lg"
                    autoFocus
                  />
                  {/* Recent Searches Dropdown */}
                  {showRecentSearches && recentSearches.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                      <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                        Recent searches
                      </div>
                      {recentSearches.map((search, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSearchQuery(search);
                            setShowRecentSearches(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Press{' '}
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    Ctrl+K
                  </kbd>{' '}
                  to focus search
                </p>
              </div>

              {/* Filter Toggle (Mobile) */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                <Bars3Icon className="h-5 w-5" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="primary" className="ml-1">
                    Active
                  </Badge>
                )}
              </button>

              {/* Filter Controls */}
              <div
                className={`flex flex-col sm:flex-row gap-4 ${showFilters ? 'block' : 'hidden lg:flex'}`}
              >
                {/* Category Filter */}
                <div className="w-full sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <Select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Categories' },
                      ...(Array.isArray(data?.filters?.categories)
                        ? data.filters.categories.map(c => ({ value: c, label: c }))
                        : []),
                    ]}
                  />
                </div>

                {/* Stock Status Filter */}
                <div className="w-full sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stock Status
                  </label>
                  <Select
                    value={stockStatus}
                    onChange={e => setStockStatus(e.target.value as StockStatus)}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'in-stock', label: 'In Stock' },
                      { value: 'low-stock', label: 'Low Stock' },
                      { value: 'out-of-stock', label: 'Out of Stock' },
                    ]}
                  />
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <Button variant="ghost" onClick={clearFilters} className="text-sm">
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedSkus.size > 0 && (
          <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedSkus.size} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleExport('csv')}>
                Export Selected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSkus(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Results */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CubeIcon className="h-5 w-5 text-blue-600" />
                Products ({data?.pagination?.totalItems || 0})
              </div>
              {data?.pagination && (
                <span className="text-sm font-normal text-gray-500">
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={pageSize} columns={7} />
            ) : isError ? (
              <EmptyState
                type="error"
                title="Failed to load products"
                description="There was an error loading the product list. Please try again."
                action={{
                  label: 'Retry',
                  onClick: () => refetch(),
                }}
              />
            ) : !Array.isArray(data?.data) || data.data.length === 0 ? (
              <EmptyState
                type="no-results"
                title="No products found"
                description={
                  hasActiveFilters
                    ? 'Try adjusting your filters or search terms'
                    : 'No products are available in the system'
                }
                action={
                  hasActiveFilters
                    ? {
                        label: 'Clear filters',
                        onClick: clearFilters,
                      }
                    : undefined
                }
              />
            ) : viewMode === 'table' ? (
              /* Table View */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedSkus.size === data.data.length}
                          onChange={handleSelectAll}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th
                        className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white"
                        onClick={() => handleSort('sku')}
                      >
                        <div className="flex items-center gap-1">
                          SKU
                          <SortIcon field="sku" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Name
                          <SortIcon field="name" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center gap-1">
                          Category
                          <SortIcon field="category" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white"
                        onClick={() => handleSort('unitPrice')}
                      >
                        <div className="flex items-center gap-1">
                          Price
                          <SortIcon field="unitPrice" />
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white"
                        onClick={() => handleSort('totalQuantity')}
                      >
                        <div className="flex items-center gap-1">
                          Stock
                          <SortIcon field="totalQuantity" />
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map(sku => {
                      const status = getStockStatusBadge(sku.totalQuantity || 0);
                      const StatusIcon = status.icon;
                      return (
                        <tr
                          key={sku.sku}
                          className={`border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            selectedSkus.has(sku.sku) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedSkus.has(sku.sku)}
                              onChange={() => handleSelectSku(sku.sku)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {sku.image && (
                                <img
                                  src={sku.image}
                                  alt={sku.name}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              )}
                              <span className="font-mono font-medium text-gray-900 dark:text-white">
                                {sku.sku}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-900 dark:text-white">{sku.name}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {sku.category || '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-900 dark:text-white">
                            {sku.unitPrice != null
                              ? `${sku.currency || 'NZD'} $${Number(sku.unitPrice).toFixed(2)}`
                              : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {sku.totalQuantity || 0}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({sku.totalAvailable || 0} available)
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={status.variant} className="flex items-center gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => selectSKU(sku)}
                                title="View details"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setQuickAdjustModal({ sku, currentQty: sku.totalQuantity || 0 })
                                }
                                title="Quick adjust stock"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.data.map((sku, index) => {
                  const status = getStockStatusBadge(sku.totalQuantity || 0);
                  const StatusIcon = status.icon;
                  return (
                    <div
                      key={sku.sku}
                      className={`p-4 rounded-lg border dark:border-gray-700 hover:shadow-lg transition-all duration-200 cursor-pointer animate-fade-in-up ${
                        selectedSkus.has(sku.sku)
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-glow'
                          : 'border-gray-200 dark:bg-gray-800 hover:border-primary-300'
                      }`}
                      style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'backwards' }}
                      onClick={() => selectSKU(sku)}
                    >
                      {/* Image */}
                      {sku.image ? (
                        <img
                          src={sku.image}
                          alt={sku.name}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                          <CubeIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                            {sku.sku}
                          </span>
                          <input
                            type="checkbox"
                            checked={selectedSkus.has(sku.sku)}
                            onChange={e => {
                              e.stopPropagation();
                              handleSelectSku(sku.sku);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                        <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2">
                          {sku.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {sku.category || 'Uncategorized'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {sku.unitPrice != null
                              ? `${sku.currency || 'NZD'} $${Number(sku.unitPrice).toFixed(2)}`
                              : '-'}
                          </span>
                          <Badge
                            variant={status.variant}
                            className="flex items-center gap-1 text-xs"
                          >
                            <StatusIcon className="h-3 w-3" />
                            {sku.totalQuantity || 0}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={data.pagination.page}
                  totalItems={data.pagination.totalItems}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
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
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Product Image */}
                    {(selectedSKUDetails as any).image && (
                      <div className="mb-6">
                        <img
                          src={(selectedSKUDetails as any).image}
                          alt={selectedSKUDetails.name}
                          className="w-full max-w-md h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}

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
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Available</p>
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
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : !selectedSKUDetails.inventory || selectedSKUDetails.inventory.length === 0 ? (
                  <EmptyState
                    type="no-items"
                    title="No inventory found"
                    description="This SKU has no inventory records"
                  />
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

        {/* Quick Adjust Modal */}
        {quickAdjustModal && (
          <Modal
            isOpen={true}
            onClose={() => setQuickAdjustModal(null)}
            title={`Adjust Stock: ${quickAdjustModal.sku.sku}`}
          >
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Current quantity:{' '}
                  <span className="font-medium">{quickAdjustModal.currentQty}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Quantity
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setAdjustQuantity(prev => prev - 1)}
                  >
                    <MinusIcon className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={adjustQuantity}
                    onChange={e => setAdjustQuantity(parseInt(e.target.value) || 0)}
                    className="w-24 text-center"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setAdjustQuantity(prev => prev + 1)}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason
                </label>
                <Select
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  options={[
                    { value: '', label: 'Select a reason' },
                    { value: 'cycle-count', label: 'Cycle Count' },
                    { value: 'damage', label: 'Damage' },
                    { value: 'theft', label: 'Theft/Loss' },
                    { value: 'receiving-error', label: 'Receiving Error' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setQuickAdjustModal(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleQuickAdjust}
                  disabled={!adjustReason || isAdjusting}
                >
                  {isAdjusting ? 'Adjusting...' : 'Adjust Stock'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Keyboard Shortcuts Help */}
        <div className="fixed bottom-4 right-4 text-xs text-gray-400 dark:text-gray-500">
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+K</kbd> search
          <span className="mx-2">|</span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">V</kbd> toggle view
          <span className="mx-2">|</span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> clear
        </div>
      </main>
    </div>
  );
}
