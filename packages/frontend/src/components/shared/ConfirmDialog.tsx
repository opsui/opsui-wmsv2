/**
 * ConfirmDialog Component
 *
 * Reusable confirmation dialog to replace native window.confirm()
 * Provides consistent styling and better UX
 */

import { ReactNode } from 'react';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export type ConfirmDialogVariant = 'warning' | 'danger' | 'info' | 'success';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
}

// ============================================================================
// CONFIG
// ============================================================================

const VARIANT_CONFIG: Record<
  ConfirmDialogVariant,
  { icon: typeof ExclamationTriangleIcon; iconColor: string; buttonColor: string }
> = {
  warning: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-warning-400',
    buttonColor: 'bg-warning-600 hover:bg-warning-700',
  },
  danger: {
    icon: XCircleIcon,
    iconColor: 'text-error-400',
    buttonColor: 'bg-error-600 hover:bg-error-700',
  },
  info: {
    icon: InformationCircleIcon,
    iconColor: 'text-info-400',
    buttonColor: 'bg-info-600 hover:bg-info-700',
  },
  success: {
    icon: CheckCircleIcon,
    iconColor: 'text-success-400',
    buttonColor: 'bg-success-600 hover:bg-success-700',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-md glass-card rounded-2xl shadow-2xl border border-white/[0.08] transform transition-all"
          onClick={e => e.stopPropagation()}
        >
          {/* Content */}
          <div className="p-6">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full bg-white/[0.05] ${config.iconColor}`}>
                <Icon className="h-8 w-8" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-white text-center mb-2">{title}</h3>

            {/* Message */}
            <div className="text-gray-300 text-center mb-6">
              {typeof message === 'string' ? <p className="text-sm">{message}</p> : message}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className={cn(
                  'px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  'bg-white/[0.05] text-gray-300 hover:bg-white/[0.1]',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={cn(
                  'px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200',
                  config.buttonColor,
                  'disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
                )}
              >
                {isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                )}
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ALERT DIALOG COMPONENT
// ============================================================================

export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | ReactNode;
  buttonText?: string;
  variant?: ConfirmDialogVariant;
}

/**
 * Simple alert dialog for one-way notifications
 * Use this to replace window.alert()
 */
export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK',
  variant = 'info',
}: AlertDialogProps) {
  if (!isOpen) return null;

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-md glass-card rounded-2xl shadow-2xl border border-white/[0.08] transform transition-all"
          onClick={e => e.stopPropagation()}
        >
          {/* Content */}
          <div className="p-6">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full bg-white/[0.05] ${config.iconColor}`}>
                <Icon className="h-8 w-8" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-white text-center mb-2">{title}</h3>

            {/* Message */}
            <div className="text-gray-300 text-center mb-6">
              {typeof message === 'string' ? <p className="text-sm">{message}</p> : message}
            </div>

            {/* Button */}
            <div className="flex items-center justify-end">
              <button
                onClick={onClose}
                className={cn(
                  'px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200',
                  config.buttonColor
                )}
              >
                {buttonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
