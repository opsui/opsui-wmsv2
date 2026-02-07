/**
 * FormField component
 *
 * A wrapper component for form fields with labels.
 */

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

export function FormField({
  label,
  required,
  error,
  children,
  className,
  ...props
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      {label && (
        <label className="text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
