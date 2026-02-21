/**
 * Button component - Distinctive Purple Industrial Theme
 *
 * Features:
 * - Gradient backgrounds with purple accents
 * - Smooth hover/active micro-interactions
 * - Scale animations on press
 * - Distinctive typography with Archivo font
 * - Glow effects for emphasis
 * - Full dark mode support via Tailwind classes
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
    const baseStyles = [
      'inline-flex items-center justify-center font-semibold rounded-xl',
      'transition-all duration-200 ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'active:scale-[0.98]',
      'relative overflow-hidden',
    ].join(' ');

    // Tailwind-based variant classes for proper dark mode support
    const variantClasses: Record<string, string> = {
      primary:
        'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/45 hover:-translate-y-0.5',
      secondary:
        'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 shadow-sm hover:border-purple-200 dark:hover:border-purple-500/30 hover:shadow-md hover:-translate-y-0.5',
      success:
        'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/45 hover:-translate-y-0.5',
      danger:
        'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/45 hover:-translate-y-0.5',
      warning:
        'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/45 hover:-translate-y-0.5',
      ghost:
        'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
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
          variantClasses[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        style={{
          fontFamily: "'Archivo', sans-serif",
          letterSpacing: '-0.01em',
        }}
        {...props}
      >
        {/* Shimmer effect overlay */}
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            transform: 'translateX(-100%)',
          }}
        />
        <span className="relative flex items-center gap-2">
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
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
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';
