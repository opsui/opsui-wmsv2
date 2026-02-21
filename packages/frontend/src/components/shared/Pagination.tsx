/**
 * Pagination component - Distinctive Purple Industrial Theme
 *
 * Features:
 * - Gradient backgrounds with purple accents
 * - Smooth hover and focus transitions
 * - Glow effects on active page
 * - Distinctive typography with JetBrains Mono
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  maxVisiblePages?: number;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  maxVisiblePages = 7,
  className,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  // Calculate which page numbers to show
  const visiblePages = useMemo(() => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    const pages = [1];

    // Calculate range around current page
    const halfVisible = Math.floor((maxVisiblePages - 2) / 2);
    let startPage = Math.max(2, currentPage - halfVisible);
    let endPage = Math.min(totalPages - 1, currentPage + halfVisible);

    // Adjust if we're near the start or end
    if (currentPage <= halfVisible + 1) {
      endPage = Math.min(totalPages - 1, maxVisiblePages - 1);
    }
    if (currentPage >= totalPages - halfVisible) {
      startPage = Math.max(2, totalPages - maxVisiblePages + 2);
    }

    // Add ellipsis and middle pages
    if (startPage > 2) {
      pages.push(-1); // Ellipsis
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages - 1) {
      pages.push(-1); // Ellipsis
    }

    // Always show last page
    pages.push(totalPages);

    return pages;
  }, [currentPage, totalPages, maxVisiblePages]);

  // Don't render if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={cn('flex flex-col sm:flex-row items-center justify-between gap-4', className)}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Page info and size selector */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium text-slate-500 dark:text-slate-400">
          Showing{' '}
          <span className="text-purple-500 dark:text-purple-400 font-mono">{startItem}</span>-
          <span className="text-purple-500 dark:text-purple-400 font-mono">{endItem}</span> of{' '}
          <span className="font-mono">{totalItems}</span>
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-slate-500 dark:text-slate-400">
              Per page:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 bg-white dark:bg-slate-800 border border-purple-500/15 dark:border-purple-500/30 text-gray-900 dark:text-white"
            >
              {pageSizeOptions.map(size => (
                <option
                  key={size}
                  value={size}
                  className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                >
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'min-w-[36px] h-9 px-3 rounded-lg font-medium text-sm transition-all duration-300',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
            'disabled:pointer-events-none disabled:opacity-50',
            'active:scale-95',
            currentPage === 1
              ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              : 'bg-white dark:bg-slate-800 border border-purple-500/15 dark:border-purple-500/30 text-gray-600 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-500/50'
          )}
          aria-label="Previous page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Page numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {visiblePages.map((page, idx) =>
            page === -1 ? (
              <span
                key={`ellipsis-${idx}`}
                className="w-9 h-9 flex items-center justify-center text-slate-400 dark:text-slate-500"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={cn(
                  'min-w-[36px] h-9 px-3 rounded-lg font-medium text-sm transition-all duration-300',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                  'active:scale-95 font-mono',
                  page === currentPage
                    ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-white dark:bg-slate-800 border border-purple-500/15 dark:border-purple-500/30 text-gray-600 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-500/50'
                )}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            )
          )}
        </div>

        {/* Mobile: Current page / Total */}
        <div className="sm:hidden px-3 py-1.5 rounded-lg text-sm font-medium font-mono bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 dark:border-purple-500/30 text-purple-600 dark:text-purple-400">
          {currentPage} / {totalPages}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'min-w-[36px] h-9 px-3 rounded-lg font-medium text-sm transition-all duration-300',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
            'disabled:pointer-events-none disabled:opacity-50',
            'active:scale-95',
            currentPage === totalPages
              ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              : 'bg-white dark:bg-slate-800 border border-purple-500/15 dark:border-purple-500/30 text-gray-600 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-500/50'
          )}
          aria-label="Next page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
