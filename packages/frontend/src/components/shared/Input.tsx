/**
 * Input component - Theme-aware (light/dark mode)
 */

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

// ============================================================================
// COMPONENT
// ============================================================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base',
          'text-gray-900 placeholder:text-gray-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500',
          'dark:focus-visible:ring-blue-400',
          'transition-all',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
