/**
 * MobileNumericInput - Touch-optimized numeric input for mobile devices
 *
 * Features:
 * - Large numeric keypad (inputMode="numeric")
 * - Quick increment/decrement buttons
 * - Voice feedback option
 * - Min/max validation with aria alerts
 * - Step support for custom increments
 */

import React, { forwardRef, useId, useCallback } from 'react';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

export interface MobileNumericInputProps {
  /** Label for the input (required for accessibility) */
  label: string;
  /** Current value */
  value: number;
  /** Change handler */
  onChange: (value: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Error message to display */
  error?: string;
  /** Hint text shown below the input */
  hint?: string;
  /** Show increment/decrement buttons */
  showStepper?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input is required */
  required?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Voice feedback on change */
  voiceFeedback?: boolean;
}

export const MobileNumericInput = forwardRef<HTMLInputElement, MobileNumericInputProps>(
  (
    {
      label,
      value,
      onChange,
      min,
      max,
      step = 1,
      error,
      hint,
      showStepper = true,
      size = 'md',
      disabled,
      required,
      className,
      placeholder,
      voiceFeedback = false,
    },
    ref
  ) => {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const sizeClasses = {
      sm: 'py-2 text-sm',
      md: 'py-3 text-base',
      lg: 'py-4 text-lg',
    };

    const buttonSizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    };

    const announceValue = useCallback(
      (newValue: number) => {
        if (voiceFeedback && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(newValue.toString());
          utterance.rate = 1.2;
          speechSynthesis.speak(utterance);
        }
      },
      [voiceFeedback]
    );

    const handleDecrement = () => {
      if (disabled) return;
      const newValue = Math.max(min ?? -Infinity, value - step);
      onChange(newValue);
      announceValue(newValue);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    };

    const handleIncrement = () => {
      if (disabled) return;
      const newValue = Math.min(max ?? Infinity, value + step);
      onChange(newValue);
      announceValue(newValue);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const stringValue = e.target.value.replace(/[^0-9.-]/g, '');
      let newValue = parseFloat(stringValue);

      if (isNaN(newValue)) {
        newValue = min ?? 0;
      }

      // Clamp to min/max
      if (min !== undefined) newValue = Math.max(min, newValue);
      if (max !== undefined) newValue = Math.min(max, newValue);

      onChange(newValue);
    };

    const isAtMin = min !== undefined && value <= min;
    const isAtMax = max !== undefined && value >= max;

    return (
      <div className={cn('space-y-2', className)}>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && (
            <span className="text-error-500 ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>

        <div className="flex items-center gap-2">
          {/* Decrement button */}
          {showStepper && (
            <button
              type="button"
              onClick={handleDecrement}
              disabled={disabled || isAtMin}
              aria-label={`Decrease by ${step}`}
              className={cn(
                'flex-shrink-0 rounded-lg',
                'flex items-center justify-center',
                'bg-gray-100 dark:bg-white/10',
                'text-gray-700 dark:text-gray-300',
                'hover:bg-gray-200 dark:hover:bg-white/20',
                'active:bg-gray-300 dark:active:bg-white/30',
                'transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                buttonSizeClasses[size],
                // Touch-friendly
                'min-w-touch min-h-touch'
              )}
            >
              <MinusIcon className="h-5 w-5" />
            </button>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={id}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={cn(error && errorId, hint && hintId).trim() || undefined}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            className={cn(
              'flex-1 rounded-lg border text-center',
              // Font size: 16px minimum to prevent iOS zoom
              'text-base font-medium',
              sizeClasses[size],
              'px-4',
              // Colors
              'bg-white dark:bg-dark-100',
              'text-gray-900 dark:text-white',
              'placeholder-gray-400 dark:placeholder-gray-500',
              // Border colors
              error
                ? 'border-error-500 focus:ring-error-500/50 focus:border-error-500'
                : 'border-gray-300 dark:border-white/20 focus:ring-primary-500/50 focus:border-primary-500',
              // Focus state
              'focus:outline-none focus:ring-2',
              // Disabled state
              disabled && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-dark-200'
            )}
          />

          {/* Increment button */}
          {showStepper && (
            <button
              type="button"
              onClick={handleIncrement}
              disabled={disabled || isAtMax}
              aria-label={`Increase by ${step}`}
              className={cn(
                'flex-shrink-0 rounded-lg',
                'flex items-center justify-center',
                'bg-gray-100 dark:bg-white/10',
                'text-gray-700 dark:text-gray-300',
                'hover:bg-gray-200 dark:hover:bg-white/20',
                'active:bg-gray-300 dark:active:bg-white/30',
                'transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                buttonSizeClasses[size],
                // Touch-friendly
                'min-w-touch min-h-touch'
              )}
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Quick increment buttons */}
        {showStepper && size !== 'sm' && (
          <div className="flex justify-center gap-2 mt-2">
            {[5, 10, 25, 50].map((increment) => (
              <button
                key={increment}
                type="button"
                onClick={() => {
                  if (disabled || isAtMax) return;
                  const newValue = Math.min(max ?? Infinity, value + increment);
                  onChange(newValue);
                  announceValue(newValue);
                  if ('vibrate' in navigator) {
                    navigator.vibrate(10);
                  }
                }}
                disabled={disabled || isAtMax}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium',
                  'bg-gray-100 dark:bg-white/10',
                  'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-200 dark:hover:bg-white/20',
                  'active:bg-gray-300 dark:active:bg-white/30',
                  'transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  // Touch-friendly
                  'min-h-touch'
                )}
              >
                +{increment}
              </button>
            ))}
          </div>
        )}

        {/* Hint */}
        {hint && !error && (
          <p id={hintId} className="text-sm text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}

        {/* Error */}
        {error && (
          <p
            id={errorId}
            className="text-sm text-error-500 dark:text-error-400"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

MobileNumericInput.displayName = 'MobileNumericInput';

export default MobileNumericInput;
