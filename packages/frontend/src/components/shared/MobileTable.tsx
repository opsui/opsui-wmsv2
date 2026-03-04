/**
 * MobileTable Component
 *
 * A responsive table wrapper that provides:
 * - Horizontal scroll on all devices for wide tables
 * - Automatic card-based layout on mobile screens (<550px)
 * - Proper overflow handling and touch-friendly scrolling
 *
 * Usage:
 *   <MobileTable className="min-w-[600px]">
 *     <thead>...</thead>
 *     <tbody>...</tbody>
 *   </MobileTable>
 */

import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface MobileTableProps extends HTMLAttributes<HTMLTableElement> {
  /** Optional minimum width to trigger horizontal scroll */
  minWidth?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const MobileTable = forwardRef<HTMLTableElement, MobileTableProps>(
  ({ className, minWidth, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          // Negative margin on mobile to extend to screen edges
          '-mx-3 xs:-mx-4 mobile:-mx-0 sm:mx-0',
          // Matching padding to maintain content spacing
          'px-3 xs:px-4 mobile:px-4 sm:px-0',
          // Smooth horizontal scrolling with touch momentum
          'overflow-x-auto',
          // Enable iOS-style momentum scrolling
          '-webkit-overflow-scrolling: touch',
          // Prevent layout shift during scroll
          'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent'
        )}
      >
        <table
          ref={ref}
          className={cn(
            // Apply mobile-table class for card-based conversion on small screens
            'mobile-table',
            // Full width by default
            'w-full',
            // Optional min-width for scroll trigger
            minWidth,
            // Custom className
            className
          )}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

MobileTable.displayName = 'MobileTable';

// ============================================================================
// TABLE SUBCOMPONENTS (for convenience)
// ============================================================================

export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {}

export function TableHeader({ className, children, ...props }: TableHeaderProps) {
  return (
    <thead className={cn('bg-gray-50 dark:bg-gray-800/50', className)} {...props}>
      {children}
    </thead>
  );
}

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}

export function TableBody({ className, children, ...props }: TableBodyProps) {
  return (
    <tbody className={cn('divide-y divide-gray-200 dark:divide-gray-700', className)} {...props}>
      {children}
    </tbody>
  );
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {}

export function TableRow({ className, children, ...props }: TableRowProps) {
  return (
    <tr
      className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors', className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  /** Header cell variant */
  header?: boolean;
}

export function TableCell({ className, header = false, children, ...props }: TableCellProps) {
  const Tag = header ? 'th' : 'td';
  return (
    <Tag
      className={cn(
        // Base padding
        'py-3 px-4',
        // Text styles
        'text-sm',
        // Alignment
        'text-left',
        // Header specific
        header && 'font-semibold text-gray-900 dark:text-white whitespace-nowrap',
        // Cell specific
        !header && 'text-gray-700 dark:text-gray-300',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
