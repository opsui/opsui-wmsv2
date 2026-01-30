/**
 * Label component - Theme-aware (light/dark mode)
 */

import { LabelHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

// ============================================================================
// COMPONENT
// ============================================================================

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          'text-gray-700 dark:text-gray-300',
          className
        )}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';
