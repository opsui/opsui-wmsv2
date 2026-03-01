/**
 * UndoToast Component
 *
 * Displays a toast notification with undo functionality.
 * Automatically dismisses after 5 seconds or when user clicks undo.
 *
 * Usage:
 * ```tsx
 * <UndoToast
 *   message="Item picked"
 *   onUndo={() => handleUndo()}
 *   onDismiss={() => handleDismiss()}
 * />
 * ```
 */

import { useEffect, useState } from 'react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number; // Auto-dismiss duration in ms (default: 5000)
  undoLabel?: string;
}

export function UndoToast({
  message,
  onUndo,
  onDismiss,
  duration = 5000,
  undoLabel = 'Undo',
}: UndoToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const handleUndo = () => {
    onUndo();
    onDismiss(); // Dismiss after undo
  };

  return (
    <div className="fixed bottom-4 right-4 glass-card text-white px-5 py-4 rounded-xl shadow-premium flex items-center gap-3 z-50 animate-slide-up border border-white/[0.08]">
      {/* Message */}
      <span className="text-sm font-semibold flex-1">{message}</span>

      {/* Undo Button */}
      <button
        onClick={handleUndo}
        className="btn-primary text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 shadow-glow hover:shadow-lg"
      >
        {undoLabel}
      </button>

      {/* Dismiss Button */}
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-white transition-colors p-1"
        aria-label="Dismiss"
      >
        ✕
      </button>

      {/* Progress Bar */}
      <div
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary-500 to-primary-400 rounded-b-xl"
        style={{ animation: `toast-shrink ${duration}ms linear forwards` }}
      />
    </div>
  );
}

/**
 * Multiple Undo Toasts Manager
 *
 * Manages multiple undo toasts in a stack.
 */
interface UndoAction {
  id: string;
  message: string;
  onUndo: () => void;
  timestamp: number;
}

export function useUndoToasts() {
  const [toasts, setToasts] = useState<UndoAction[]>([]);

  const showUndo = (message: string, onUndo: () => void) => {
    const id = `undo-${Date.now()}-${Math.random()}`;
    const action: UndoAction = {
      id,
      message,
      onUndo,
      timestamp: Date.now(),
    };

    setToasts(prev => [action, ...prev].slice(0, 3)); // Max 3 toasts
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearAll = () => {
    setToasts([]);
  };

  return {
    toasts,
    showUndo,
    dismissToast,
    clearAll,
  };
}

/**
 * UndoToastContainer Component
 *
 * Renders all active undo toasts.
 */
export function UndoToastContainer() {
  const { toasts, dismissToast } = useUndoToasts();

  return (
    <div className="undo-toast-container">
      {toasts.map(toast => (
        <UndoToast
          key={toast.id}
          message={toast.message}
          onUndo={toast.onUndo}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  );
}

/**
 * withUndo HOC
 *
 * Higher-order component that adds undo functionality to any action.
 */
export function withUndo<T extends (...args: any[]) => any>(
  action: T,
  undoAction: (...args: Parameters<T>) => void,
  message: string
): T {
  return ((...args: Parameters<T>) => {
    const result = action(...args);

    // Show undo toast
    const { showUndo } = useUndoToasts();
    showUndo(message, () => undoAction(...args));

    return result;
  }) as T;
}

/**
 * Example Usage:
 *
 * ```tsx
 * function PickTaskItem({ task }) {
 *   const { showUndo } = useUndoToasts();
 *
 *   const handlePick = async () => {
 *     await updatePickedQuantity(task.id, task.quantity);
 *
 *     showUndo(
 *       `Picked ${task.quantity}x ${task.sku}`,
 *       async () => {
 *         await updatePickedQuantity(task.id, task.picked_quantity);
 *       }
 *     );
 *   };
 *
 *   return (
 *     <button onClick={handlePick}>Pick</button>
 *   );
 * }
 * ```
 */
