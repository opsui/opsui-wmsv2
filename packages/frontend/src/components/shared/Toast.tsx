/**
 * Toast Notification Component
 *
 * General-purpose toast notifications for success, error, warning, and info messages.
 *
 * Usage:
 * ```tsx
 * const { showToast } = useToast();
 * showToast('Success!', 'success');
 * showToast('Error occurred', 'error');
 * ```
 */

import { useEffect, useState, createContext, useContext, ReactNode, useCallback } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  timestamp: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: Toast = {
        id,
        message,
        type,
        duration,
        timestamp: Date.now(),
      };

      setToasts(prev => [toast, ...prev].slice(0, 5)); // Max 5 toasts

      // Auto-dismiss
      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// ============================================================================
// TOAST COMPONENT
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [timeLeft, setTimeLeft] = useState(toast.duration || 0);

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 100));
    }, 100);

    return () => clearInterval(timer);
  }, [toast.duration]);

  const config = {
    success: {
      icon: CheckCircleIcon,
      bgColor: 'bg-success-500/10',
      borderColor: 'border-success-500/30',
      textColor: 'text-success-300',
      iconColor: 'text-success-400',
      progressColor: 'bg-success-500',
    },
    error: {
      icon: XCircleIcon,
      bgColor: 'bg-error-500/10',
      borderColor: 'border-error-500/30',
      textColor: 'text-error-300',
      iconColor: 'text-error-400',
      progressColor: 'bg-error-500',
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-warning-500/10',
      borderColor: 'border-warning-500/30',
      textColor: 'text-warning-300',
      iconColor: 'text-warning-400',
      progressColor: 'bg-warning-500',
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-primary-500/10',
      borderColor: 'border-primary-500/30',
      textColor: 'text-primary-300',
      iconColor: 'text-primary-400',
      progressColor: 'bg-primary-500',
    },
  };

  const style = config[toast.type];
  const Icon = style.icon;

  return (
    <div
      className={`relative glass-card px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 border ${style.bgColor} ${style.borderColor} animate-slide-in-right`}
    >
      {/* Icon */}
      <Icon className={`h-5 w-5 ${style.iconColor} flex-shrink-0`} />

      {/* Message */}
      <span className={`text-sm font-medium flex-1 ${style.textColor}`}>{toast.message}</span>

      {/* Dismiss Button */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-white transition-colors p-1 flex-shrink-0"
        aria-label="Dismiss"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>

      {/* Progress Bar */}
      {toast.duration && toast.duration > 0 && (
        <div
          className={`absolute bottom-0 left-0 h-1 ${style.progressColor} transition-all duration-100 ease-linear rounded-b-xl`}
          style={{ width: `${(timeLeft / toast.duration) * 100}%` }}
        />
      )}
    </div>
  );
}

// ============================================================================
// TOAST CONTAINER
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
      <div className="pointer-events-auto space-y-2">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Helper hook for API error handling with toast notifications
 */
export function useApiErrorHandler() {
  const { showToast } = useToast();

  const handleError = (error: any, defaultMessage = 'An error occurred') => {
    const message = error?.response?.data?.message || error?.message || defaultMessage;
    showToast(message, 'error');
  };

  return { handleError };
}

/**
 * Example usage with React Query:
 *
 * ```tsx
 * const { handleError } = useApiErrorHandler();
 *
 * const { data, error } = useQuery({
 *   queryKey: ['orders'],
 *   queryFn: fetchOrders,
 *   onError: (error) => handleError(error, 'Failed to load orders'),
 * });
 * ```
 */
