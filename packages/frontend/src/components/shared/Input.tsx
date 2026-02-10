/**
 * Input component - Theme-aware (light/dark mode)
 *
 * Uses CSS custom properties from tokens.css for consistent theming.
 * Light mode: White background with subtle border
 * Dark mode: Subtle transparent background with light border
 */

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'filled';
  inputSize?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', variant = 'default', inputSize = 'md', ...props }, ref) => {
    const baseStyles = [
      'flex w-full rounded-xl border transition-all duration-200',
      'text-gray-900 dark:text-white',
      'placeholder:text-gray-400 dark:placeholder:text-gray-500',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400',
      'focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900',
      'disabled:cursor-not-allowed disabled:opacity-50',
    ].join(' ');

    const variantStyles = {
      default: [
        'bg-white dark:bg-gray-800',
        'border-gray-300 dark:border-gray-700',
        'hover:border-gray-400 dark:hover:border-gray-600',
      ].join(' '),
      filled: [
        'bg-gray-100 dark:bg-gray-800',
        'border-transparent dark:border-gray-700',
        'hover:bg-gray-200 dark:hover:bg-gray-750',
      ].join(' '),
    };

    const sizeStyles = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-4 text-base',
      lg: 'h-13 px-5 text-lg',
    };

    return (
      <input
        type={type}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[inputSize], className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
