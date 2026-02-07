/**
 * Search and Filter Bar Component
 *
 * Reusable component for search, filter, and export functionality
 */

import { FormInput, FormSelect, Button } from '@/components/shared';
import {
  SearchIcon,
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface SearchAndFilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filterOptions?: Array<{ value: string; label: string }>;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterLabel?: string;
  onExport?: () => void;
  showExport?: boolean;
  totalCount?: number;
  filteredCount?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SearchAndFilterBar({
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filterOptions,
  filterValue = '',
  onFilterChange,
  filterLabel = 'Filter',
  onExport,
  showExport = true,
  totalCount,
  filteredCount,
}: SearchAndFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="flex-1 w-full relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={localSearch}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Filter */}
        {filterOptions && filterOptions.length > 0 && (
          <div className="w-full md:w-48">
            <select
              value={filterValue}
              onChange={e => onFilterChange?.(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="">{filterLabel}</option>
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 w-full md:w-auto">
          {showExport && onExport && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onExport}
              className="flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>

        {/* Count */}
        {totalCount !== undefined && (
          <div className="text-sm text-gray-400 whitespace-nowrap">
            {filteredCount !== undefined && filteredCount !== totalCount ? (
              <span>
                Showing {filteredCount} of {totalCount} results
              </span>
            ) : (
              <span>{totalCount} results</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
