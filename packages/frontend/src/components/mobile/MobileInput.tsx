/**
 * MobileInput - Touch-optimized input component for mobile devices
 *
 * Features:
 * - 16px font-size minimum (prevents iOS zoom on focus)
 * - Proper inputMode attributes for mobile keyboards
 * - Full accessibility with aria-invalid, aria-describedby
 * - Clear button for easy value clearing
 * - Voice input support where available
 */

import React, { forwardRef, useId } from 'react';
import { XMarkIcon, MicrophoneIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

export interface MobileInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size'
> {
  /** Label for the input (required for accessibility) */
  label: string;
  /** Error message to display */
  error?: string;
  /** Hint text shown below the input */
  hint?: string;
  /** Show clear button */
  showClear?: boolean;
  /** Show voice input button (where supported) */
  showVoiceInput?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Input mode for mobile keyboard */
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  /** Auto capitalize */
  autoCapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
  /** Auto correct */
  autoCorrect?: 'on' | 'off';
  /** Left icon or element */
  leftElement?: React.ReactNode;
  /** Right icon or element */
  rightElement?: React.ReactNode;
  /** On clear callback */
  onClear?: () => void;
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  (
    {
      label,
      error,
      hint,
      showClear = false,
      showVoiceInput = false,
      size = 'md',
      inputMode,
      autoCapitalize,
      autoCorrect,
      leftElement,
      rightElement,
      onClear,
      className,
      required,
      disabled,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const sizeClasses = {
      sm: 'py-2 px-3 text-sm',
      md: 'py-3 px-4 text-base',
      lg: 'py-4 px-5 text-lg',
    };

    const handleClear = () => {
      if (onChange) {
        const event = {
          target: { value: '', name: props.name },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
      onClear?.();
    };

    const handleVoiceInput = () => {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition =
          (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (onChange) {
            const syntheticEvent = {
              target: { value: transcript, name: props.name },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          }
        };

        recognition.start();
      }
    };

    const hasValue = value !== undefined && value !== '';

    return (
      <div className={cn('space-y-2', className)}>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && (
            <span className="text-error-500 ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>

        <div className="relative">
          {/* Left element */}
          {leftElement && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftElement}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            inputMode={inputMode}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={cn(error && errorId, hint && hintId).trim() || undefined}
            className={cn(
              'w-full rounded-lg border transition-all duration-200',
              // Font size: 16px minimum to prevent iOS zoom
              'text-base',
              sizeClasses[size],
              // Padding adjustments for icons
              leftElement && 'pl-10',
              (showClear || showVoiceInput || rightElement) && 'pr-10',
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
            {...props}
          />

          {/* Clear button */}
          {showClear && hasValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'p-1 rounded-full',
                'text-gray-400 hover:text-gray-600',
                'dark:text-gray-500 dark:hover:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-white/10',
                'transition-colors',
                'min-w-[32px] min-h-[32px] flex items-center justify-center'
              )}
              aria-label="Clear input"
              tabIndex={-1}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}

          {/* Voice input button */}
          {showVoiceInput && !showClear && !disabled && (
            <button
              type="button"
              onClick={handleVoiceInput}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'p-1 rounded-full',
                'text-gray-400 hover:text-gray-600',
                'dark:text-gray-500 dark:hover:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-white/10',
                'transition-colors',
                'min-w-[32px] min-h-[32px] flex items-center justify-center'
              )}
              aria-label="Voice input"
              tabIndex={-1}
            >
              <MicrophoneIcon className="h-5 w-5" />
            </button>
          )}

          {/* Right element */}
          {rightElement && !showClear && !showVoiceInput && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightElement}
            </div>
          )}
        </div>

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

MobileInput.displayName = 'MobileInput';

export default MobileInput;
