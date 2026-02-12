/**
 * Modal Component
 *
 * Reusable modal dialog for forms and content
 * - Focus trap for keyboard accessibility
 * - Proper ARIA attributes (WCAG 2.1 compliant)
 * - Mobile-responsive with safe area support
 */

import { ReactNode, useEffect, useId } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';

// ============================================================================
// TYPES
// ============================================================================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Description for screen readers */
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: ReactNode;
  className?: string;
  /** Whether to show close button (default: true) */
  showCloseButton?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  footer,
  className,
  showCloseButton = true,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  // Focus trap for accessibility
  const { containerRef } = useFocusTrap({
    active: isOpen,
    onEscape: onClose,
    restoreFocus: true,
  });

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={cn(
            'relative w-full glass-card rounded-2xl shadow-2xl border border-white/[0.08] transform transition-all',
            sizeClasses[size],
            // Mobile-responsive
            'mx-auto',
            'max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)]',
            className
          )}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 md:px-6 border-b border-white/[0.08]">
            <h2
              id={titleId}
              className="text-lg md:text-xl font-semibold text-white pr-8"
            >
              {title}
            </h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  'absolute top-4 right-4',
                  'text-gray-400 hover:text-white transition-colors',
                  'p-2 rounded-lg hover:bg-white/[0.05]',
                  // Touch-friendly target size
                  'min-w-touch min-h-touch flex items-center justify-center',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/50'
                )}
                aria-label="Close dialog"
                type="button"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Screen reader description */}
          {description && (
            <p id={descriptionId} className="sr-only">
              {description}
            </p>
          )}

          {/* Content */}
          <div className="px-4 py-4 md:px-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-4 py-4 md:px-6 border-t border-white/[0.08] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FORM INPUT WITH ERROR (Accessibility Enhanced)
// ============================================================================

export interface FormInputProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'date' | 'search' | 'url';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Hint text shown below the input */
  hint?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Input mode for mobile keyboards */
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
}

export function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  required,
  placeholder,
  disabled,
  className,
  hint,
  autoFocus,
  inputMode,
}: FormInputProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">
        {label}
        {required && (
          <span className="text-error-400 ml-1" aria-hidden="true">*</span>
        )}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
        // Accessibility attributes
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={cn(
          error && errorId,
          hint && hintId
        ).trim() || undefined}
        className={cn(
          'w-full px-4 py-3 md:py-2.5 bg-white/[0.05] border rounded-lg text-white placeholder-gray-500',
          // 16px minimum to prevent iOS zoom
          'text-base',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50',
          'transition-all duration-200',
          error
            ? 'border-error-500/50 focus:ring-error-500/50 focus:border-error-500/50'
            : 'border-white/[0.08]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />
      {hint && !error && (
        <p id={hintId} className="text-sm text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="text-sm text-error-400"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// FORM TEXTAREA WITH ERROR (Accessibility Enhanced)
// ============================================================================

export interface FormTextareaProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
  /** Hint text shown below the textarea */
  hint?: string;
}

export function FormTextarea({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  required,
  placeholder,
  rows = 4,
  disabled,
  className,
  hint,
}: FormTextareaProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">
        {label}
        {required && (
          <span className="text-error-400 ml-1" aria-hidden="true">*</span>
        )}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        // Accessibility attributes
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={cn(
          error && errorId,
          hint && hintId
        ).trim() || undefined}
        className={cn(
          'w-full px-4 py-3 md:py-2.5 bg-white/[0.05] border rounded-lg text-white placeholder-gray-500',
          // 16px minimum to prevent iOS zoom
          'text-base',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50',
          'transition-all duration-200 resize-none',
          error
            ? 'border-error-500/50 focus:ring-error-500/50 focus:border-error-500/50'
            : 'border-white/[0.08]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />
      {hint && !error && (
        <p id={hintId} className="text-sm text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="text-sm text-error-400"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// FORM SELECT WITH ERROR (Accessibility Enhanced)
// ============================================================================

export interface FormSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  className?: string;
  /** Placeholder text for the select */
  placeholder?: string;
  /** Hint text shown below the select */
  hint?: string;
}

export function FormSelect({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  required,
  options,
  disabled,
  className,
  placeholder,
  hint,
}: FormSelectProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">
        {label}
        {required && (
          <span className="text-error-400 ml-1" aria-hidden="true">*</span>
        )}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        // Accessibility attributes
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={cn(
          error && errorId,
          hint && hintId
        ).trim() || undefined}
        className={cn(
          'w-full px-4 py-3 md:py-2.5 bg-white/[0.05] border rounded-lg text-white',
          // 16px minimum to prevent iOS zoom
          'text-base',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50',
          'transition-all duration-200',
          '[&_option]:bg-gray-900 [&_option]:text-gray-100',
          error
            ? 'border-error-500/50 focus:ring-error-500/50 focus:border-error-500/50'
            : 'border-white/[0.08]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && !error && (
        <p id={hintId} className="text-sm text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="text-sm text-error-400"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
