/**
 * Button component - Theme-aware (light/dark mode)
 *
 * Uses CSS custom properties from tokens.css for consistent theming.
 * Provides proper contrast in both light and dark modes.
 */

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';

    const variantStyles = {
      primary: ['btn-primary text-white rounded-xl'].join(' '),
      secondary: [
        'btn-secondary rounded-xl',
        // Light mode: white bg with gray border, Dark mode: transparent with subtle border
        'text-gray-700 dark:text-gray-200',
      ].join(' '),
      success: [
        'bg-green-600 dark:bg-green-500 text-white rounded-xl',
        'hover:bg-green-700 dark:hover:bg-green-400',
        'shadow-sm hover:shadow-md',
        'dark:shadow-none dark:hover:shadow-green-500/25',
      ].join(' '),
      danger: [
        'bg-red-600 dark:bg-red-500 text-white rounded-xl',
        'hover:bg-red-700 dark:hover:bg-red-400',
        'shadow-sm hover:shadow-md',
        'dark:shadow-none dark:hover:shadow-red-500/25',
      ].join(' '),
      warning: [
        'bg-amber-500 dark:bg-amber-400 text-white dark:text-amber-950 rounded-xl',
        'hover:bg-amber-600 dark:hover:bg-amber-300',
        'shadow-sm hover:shadow-md',
        'dark:shadow-none dark:hover:shadow-amber-500/25',
      ].join(' '),
      ghost: [
        'bg-transparent rounded-xl',
        'text-gray-600 dark:text-gray-300',
        'hover:bg-gray-100 dark:hover:bg-white/[0.05]',
        'hover:text-gray-900 dark:hover:text-white',
      ].join(' '),
    };

    const sizeStyles = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-6 text-base',
      lg: 'h-13 px-8 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
