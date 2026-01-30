/**
 * Pagination component - Premium dark theme
 *
 * Provides pagination controls for list pages with support for
 * page numbers, previous/next buttons, and page size selection
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
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4', className)}>
      {/* Page info and size selector */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">
          Showing {startItem}-{endItem} of {totalItems}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-gray-400">
              Per page:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.08] transition-all duration-300 [&_option]:bg-gray-900 [&_option]:text-gray-100 [&_option]:cursor-pointer"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
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
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
            'disabled:pointer-events-none disabled:opacity-50',
            currentPage === 1
              ? 'bg-white/[0.03] text-gray-500 cursor-not-allowed'
              : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]'
          )}
          aria-label="Previous page"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
                className="w-9 h-9 flex items-center justify-center text-gray-500"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={cn(
                  'min-w-[36px] h-9 px-3 rounded-lg font-medium text-sm transition-all duration-300',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                  page === currentPage
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]'
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
        <div className="sm:hidden px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-gray-400">
          {currentPage} / {totalPages}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'min-w-[36px] h-9 px-3 rounded-lg font-medium text-sm transition-all duration-300',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
            'disabled:pointer-events-none disabled:opacity-50',
            currentPage === totalPages
              ? 'bg-white/[0.03] text-gray-500 cursor-not-allowed'
              : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]'
          )}
          aria-label="Next page"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
