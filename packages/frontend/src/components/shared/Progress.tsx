/**
 * Progress component - Theme-aware (light/dark mode)
 * Based on shadcn/ui Progress component
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div
        ref={ref}
        className={cn(
          'relative h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
          className
        )}
        {...props}
      >
        <div
          className="h-full flex-1 bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
