import { apiClient } from '@/lib/api-client';
import {
  ArchiveBoxIcon,
  BriefcaseIcon,
  CalculatorIcon,
  ChartBarIcon,
  ChartPieIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  CogIcon,
  CubeIcon,
  DocumentCurrencyDollarIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  HandRaisedIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PresentationChartLineIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SquaresPlusIcon,
  TruckIcon,
  UserCircleIcon,
  UserGroupIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Map icon names to actual components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  HomeIcon,
  ClipboardDocumentListIcon,
  HandRaisedIcon,
  CubeIcon,
  TruckIcon,
  ArchiveBoxIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  UsersIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  DocumentCurrencyDollarIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  DocumentMagnifyingGlassIcon,
  CogIcon,
  UserCircleIcon,
  CodeBracketIcon,
  SquaresPlusIcon,
  CalculatorIcon,
  BriefcaseIcon,
  FolderIcon,
  Cog6ToothIcon,
  ShoppingCartIcon,
};

// Helper to render icon by name
const renderIcon = (iconName: string) => {
  const IconComponent = iconMap[iconName];
  if (IconComponent) {
    return <IconComponent className="w-5 h-5 text-gray-500 dark:text-gray-400" />;
  }
  // Fallback to a default icon
  return <DocumentTextIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />;
};

interface SearchResult {
  orders: Array<{ orderId: string; status: string; customerName: string }>;
  skus: Array<{ sku: string; name: string; binLocation: string }>;
  users: Array<{ userId: string; name: string; role: string }>;
  pages: Array<{ title: string; path: string; icon: string }>;
}

interface SearchResultsProps {
  results: SearchResult;
  isLoading: boolean;
  onSelectItem: (type: string, item: unknown) => void;
  selectedIndex: number;
  totalItems: number;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading,
  onSelectItem,
  selectedIndex,
  totalItems,
}) => {
  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-sm">Searching...</p>
      </div>
    );
  }

  // Ensure results and its properties exist before accessing
  const safeResults = {
    orders: results?.orders ?? [],
    skus: results?.skus ?? [],
    users: results?.users ?? [],
    pages: results?.pages ?? [],
  };

  const hasResults =
    safeResults.orders.length > 0 ||
    safeResults.skus.length > 0 ||
    safeResults.users.length > 0 ||
    safeResults.pages.length > 0;

  if (!hasResults) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <p className="text-sm">No results found</p>
      </div>
    );
  }

  let currentIndex = -1;

  const getItemProps = (type: string, item: unknown) => {
    currentIndex++;
    const isSelected = currentIndex === selectedIndex;
    return {
      className: `px-3 py-2 cursor-pointer flex items-center gap-3 ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`,
      onClick: () => onSelectItem(type, item),
    };
  };

  return (
    <div className="max-h-80 overflow-y-auto">
      {safeResults.pages.length > 0 && (
        <div>
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">
            Pages
          </div>
          {safeResults.pages.map(page => (
            <div key={page.path} {...getItemProps('page', page)}>
              {renderIcon(page.icon)}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{page.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{page.path}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {safeResults.orders.length > 0 && (
        <div>
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">
            Orders
          </div>
          {safeResults.orders.map(order => (
            <div key={order.orderId} {...getItemProps('order', order)}>
              <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-300">
                  {order.orderId.slice(0, 3)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {order.orderId}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {order.customerName} • {order.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {safeResults.skus.length > 0 && (
        <div>
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">
            Items / SKUs
          </div>
          {safeResults.skus.map(sku => (
            <div key={sku.sku} {...getItemProps('sku', sku)}>
              <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <span className="text-xs font-bold text-green-600 dark:text-green-300">📦</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {sku.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {sku.sku} • {sku.binLocation || 'No location'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {safeResults.users.length > 0 && (
        <div>
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">
            Users
          </div>
          {safeResults.users.map(user => (
            <div key={user.userId} {...getItemProps('user', user)}>
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-300">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.userId} • {user.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalItems > 10 && (
        <div className="px-3 py-2 text-xs text-center text-gray-500 dark:text-gray-400 border-t dark:border-gray-700">
          Showing 10 of {totalItems} results. Continue typing to refine.
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PROPS
// ============================================================================

interface GlobalSearchProps {
  /** Called when mobile search expands (true) or collapses (false) */
  onMobileSearchActive?: (active: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onMobileSearchActive }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult>({
    orders: [],
    skus: [],
    users: [],
    pages: [],
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  /** Whether the search input is expanded on mobile */
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  /** Ref mirror of isMobileExpanded to avoid stale closures in event handlers */
  const isMobileExpandedRef = useRef(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // -------------------------------------------------------------------------
  // Mobile expand / collapse helpers
  // -------------------------------------------------------------------------

  const expandMobile = () => {
    isMobileExpandedRef.current = true;
    setIsMobileExpanded(true);
    onMobileSearchActive?.(true);
    // Small delay so the input is visible before we focus it
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const collapseMobile = useCallback(() => {
    isMobileExpandedRef.current = false;
    setIsMobileExpanded(false);
    setIsOpen(false);
    setQuery('');
    setResults({ orders: [], skus: [], users: [], pages: [] });
    setTotalItems(0);
    onMobileSearchActive?.(false);
    inputRef.current?.blur();
  }, [onMobileSearchActive]);

  // -------------------------------------------------------------------------
  // Debounced search
  // -------------------------------------------------------------------------

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ orders: [], skus: [], users: [], pages: [] });
      setTotalItems(0);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.get(`/search?q=${encodeURIComponent(searchQuery)}`);
      const apiResults = response.data.results ?? {};
      setResults({
        orders: apiResults.orders ?? [],
        skus: apiResults.skus ?? [],
        users: apiResults.users ?? [],
        pages: apiResults.pages ?? [],
      });
      setTotalItems(response.data.total ?? 0);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search failed:', error);
      setResults({ orders: [], skus: [], users: [], pages: [] });
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults({ orders: [], skus: [], users: [], pages: [] });
      setTotalItems(0);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  // -------------------------------------------------------------------------
  // Click outside → close dropdown (and collapse mobile if expanded)
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (isMobileExpandedRef.current) {
          collapseMobile();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [collapseMobile]);

  // -------------------------------------------------------------------------
  // Keyboard navigation
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen && !isMobileExpandedRef.current) return;

      switch (e.key) {
        case 'ArrowDown':
          if (!isOpen) return;
          e.preventDefault();
          setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          if (!isOpen) return;
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          if (!isOpen) return;
          e.preventDefault();
          handleSelectItem(selectedIndex);
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          if (isMobileExpandedRef.current) {
            collapseMobile();
          } else {
            inputRef.current?.blur();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, totalItems, results, collapseMobile]);

  // -------------------------------------------------------------------------
  // Result selection helpers
  // -------------------------------------------------------------------------

  const handleSelectItem = (index: number) => {
    let currentIndex = -1;

    const checkAndSelect = (type: string, items: unknown[]) => {
      for (const item of items) {
        currentIndex++;
        if (currentIndex === index) {
          handleNavigation(type, item);
          return true;
        }
      }
      return false;
    };

    if (checkAndSelect('page', results?.pages ?? [])) return;
    if (checkAndSelect('order', results?.orders ?? [])) return;
    if (checkAndSelect('sku', results?.skus ?? [])) return;
    if (checkAndSelect('user', results?.users ?? [])) return;
  };

  const handleNavigation = (type: string, item: unknown) => {
    setIsOpen(false);
    setQuery('');

    // Collapse mobile search after navigating
    if (isMobileExpandedRef.current) {
      isMobileExpandedRef.current = false;
      setIsMobileExpanded(false);
      onMobileSearchActive?.(false);
    }

    switch (type) {
      case 'page':
        navigate((item as { path: string }).path);
        break;
      case 'order':
        navigate(`/orders?id=${(item as { orderId: string }).orderId}`);
        break;
      case 'sku':
        navigate(`/search?sku=${(item as { sku: string }).sku}`);
        break;
      case 'user':
        navigate(`/user-roles?user=${(item as { userId: string }).userId}`);
        break;
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    setQuery('');
    setResults({ orders: [], skus: [], users: [], pages: [] });
    setTotalItems(0);
    inputRef.current?.focus();
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div ref={containerRef} className={`relative ${isMobileExpanded ? 'flex-1 min-w-0' : ''}`}>
      {/* ── Mobile: icon-only button (hidden once expanded) ── */}
      <button
        className={`md:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors ${
          isMobileExpanded ? 'hidden' : 'flex items-center justify-center'
        }`}
        onClick={expandMobile}
        aria-label="Open search"
      >
        <MagnifyingGlassIcon className="h-5 w-5" />
      </button>

      {/* ── Input: always visible on md+, only visible when expanded on mobile ── */}
      <div className={`relative ${isMobileExpanded ? 'flex w-full' : 'hidden md:flex'}`}>
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Search orders, items, users..."
          className={`pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 dark:focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800 transition-all duration-200 ${
            isMobileExpanded ? 'w-full' : 'w-56 lg:w-72'
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        />

        {/* Right action button — only shown when there is a query to clear */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Clear search"
          >
            <XMarkIcon className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* ── Results dropdown ── */}
      {isOpen && (query || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <SearchResults
            results={results}
            isLoading={isLoading}
            onSelectItem={handleNavigation}
            selectedIndex={selectedIndex}
            totalItems={totalItems}
          />
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
