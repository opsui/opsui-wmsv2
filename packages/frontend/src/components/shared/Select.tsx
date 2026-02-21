/**
 * Select component - Distinctive Purple Industrial Theme
 *
 * Features:
 * - Gradient backgrounds with purple focus states
 * - Smooth hover and focus transitions
 * - Custom appearance with chevron indicator
 * - Distinctive typography
 * - Full dark mode support via Tailwind classes
 */

import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'options'> {
  options: SelectOption[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, ...props }, ref) => {
    const baseStyles = [
      'flex h-11 w-full rounded-xl px-4 py-2 text-base',
      'transition-all duration-300 ease-out',
      'appearance-none cursor-pointer',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'relative',
      // Custom chevron via background
      'bg-no-repeat bg-right',
    ].join(' ');

    // Focus classes for purple glow effect
    const focusClasses = [
      'focus:outline-none',
      'focus:border-purple-400',
      'focus:ring-2',
      'focus:ring-purple-500/20',
      'focus:shadow-[0_0_0_3px_rgba(168,85,247,0.1),0_0_20px_rgba(168,85,247,0.1)]',
    ].join(' ');

    // Hover classes
    const hoverClasses = 'hover:border-purple-300 dark:hover:border-purple-500/40';

    return (
      <select
        ref={ref}
        className={cn(
          baseStyles,
          focusClasses,
          hoverClasses,
          'bg-white dark:bg-slate-800',
          'border border-gray-200 dark:border-white/10',
          'text-gray-900 dark:text-white',
          className
        )}
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundSize: '20px',
          backgroundPosition: 'right 12px center',
          paddingRight: '40px',
        }}
        {...props}
      >
        {options.map((option, index) => (
          <option
            key={`${option.value}-${index}`}
            value={option.value}
            className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);

Select.displayName = 'Select';
