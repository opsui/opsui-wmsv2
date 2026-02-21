/**
 * Input component - Distinctive Purple Industrial Theme
 *
 * Features:
 * - Gradient focus states with purple glow
 * - Smooth hover and focus transitions
 * - Distinctive typography with JetBrains Mono
 * - Animated focus ring effect
 * - Full dark mode support via Tailwind classes
 */

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'filled' | 'industrial';
  inputSize?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', variant = 'default', inputSize = 'md', ...props }, ref) => {
    const baseStyles = [
      'flex w-full rounded-xl border transition-all duration-300 ease-out',
      'focus-visible:outline-none',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'relative',
    ].join(' ');

    // Tailwind-based variant classes for proper dark mode support
    const variantClasses: Record<string, string> = {
      default:
        'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500',
      filled:
        'bg-gray-100 dark:bg-slate-700/50 border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500',
      industrial:
        'bg-gradient-to-br from-slate-900 to-slate-800 border-purple-500/30 text-slate-100 placeholder:text-slate-400',
    };

    const sizeStyles = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-4 text-base',
      lg: 'h-13 px-5 text-lg',
    };

    // Focus classes for purple glow effect
    const focusClasses = [
      'focus:border-purple-400',
      'focus:ring-2',
      'focus:ring-purple-500/20',
      'focus:shadow-[0_0_0_3px_rgba(168,85,247,0.1),0_0_20px_rgba(168,85,247,0.1)]',
    ].join(' ');

    // Hover classes
    const hoverClasses = 'hover:border-purple-300 dark:hover:border-purple-500/40';

    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          baseStyles,
          variantClasses[variant],
          sizeStyles[inputSize],
          focusClasses,
          hoverClasses,
          className
        )}
        style={{
          fontFamily:
            type === 'text' || type === 'search'
              ? "'Plus Jakarta Sans', sans-serif"
              : "'JetBrains Mono', monospace",
        }}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
