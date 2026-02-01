/**
 * useUndo Hook
 *
 * Provides undo/redo functionality for any state.
 * Tracks history and allows navigation backward and forward.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, set, undo, redo, canUndo, canRedo } = useUndo<Order>();
 *
 *   const handleUpdate = (newOrder: Order) => {
 *     set(newOrder);
 *     showUndoToast('Order updated', undo);
 *   };
 *
 *   return (
 *     <div>
 *       <button disabled={!canUndo} onClick={undo}>Undo</button>
 *       <button disabled={!canRedo} onClick={redo}>Redo</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useCallback, useState } from 'react';

export interface UndoState<T> {
  past: T[][];
  present: T | null;
  future: T[][];
}

export interface UseUndoReturn<T> {
  state: T | null;
  past: T[][];
  future: T[][];
  set: (newPresent: T) => void;
  reset: (initialState: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

export function useUndo<T>(initialState: T | null = null): UseUndoReturn<T> {
  const [past, setPast] = useState<T[][]>([]);
  const [present, setPresent] = useState<T | null>(initialState);
  const [future, setFuture] = useState<T[][]>([]);

  const set = useCallback(
    (newPresent: T) => {
      setPast(prev => {
        const history = [...prev];
        if (present !== null) {
          history.push([present]);
        }
        return history;
      });
      setPresent(newPresent);
      setFuture([]);
    },
    [present]
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setPresent(previous[0] ?? null);
    setFuture(() => {
      const history = present !== null ? [[present]] : [];
      return [...history, ...future];
    });
  }, [past, present, future]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast(() => {
      const history = [...past];
      if (present !== null) {
        history.push([present]);
      }
      return history;
    });
    setPresent(next[0] ?? null);
    setFuture(newFuture);
  }, [past, present, future]);

  const reset = useCallback((initialState: T) => {
    setPast([]);
    setPresent(initialState);
    setFuture([]);
  }, []);

  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return {
    state: present,
    past,
    future,
    set,
    reset,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    clearHistory,
  };
}

/**
 * useUndoableAction Hook
 *
 * Wraps an async action with undo functionality.
 *
 * @example
 * ```tsx
 * function PickTaskItem({ task }) {
 *   const { execute, undo, canUndo, isExecuting } = useUndoableAction({
 *     action: async () => {
 *       await updatePickedQuantity(task.id, task.quantity);
 *     },
 *     undo: async () => {
 *       await updatePickedQuantity(task.id, task.picked_quantity);
 *     },
 *     successMessage: 'Item picked'
 *   });
 *
 *   return (
 *     <button onClick={execute} disabled={isExecuting}>
 *       Pick
 *     </button>
 *   );
 * }
 * ```
 */

export interface UseUndoableActionOptions {
  action: () => Promise<void>;
  undo: () => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
  onUndo?: () => void;
  onError?: (error: Error) => void;
}

export function useUndoableAction(options: UseUndoableActionOptions) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [didExecute, setDidExecute] = useState(false);

  const execute = async () => {
    setIsExecuting(true);
    setLastError(null);

    try {
      await options.action();
      setCanUndo(true);
      setDidExecute(true);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Action failed');
      setLastError(err);
      options.onError?.(err);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  };

  const undo = async () => {
    if (!canUndo || !didExecute) return;

    setIsExecuting(true);
    setLastError(null);

    try {
      await options.undo();
      setCanUndo(false);
      setDidExecute(false);
      options.onUndo?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Undo failed');
      setLastError(err);
      options.onError?.(err);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    execute,
    undo,
    canUndo,
    isExecuting,
    didExecute,
    error: lastError,
    reset: () => {
      setCanUndo(false);
      setDidExecute(false);
      setLastError(null);
    },
  };
}

/**
 * useKeyboardUndo Hook
 *
 * Adds keyboard shortcuts for undo/redo (Ctrl+Z, Ctrl+Shift+Z).
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, set, undo, redo, canUndo, canRedo } = useUndo<Order>();
 *
 *   useKeyboardUndo({ undo, redo, canUndo, canRedo });
 *
 *   return <div>...</div>;
 * }
 * ```
 */

export interface UseKeyboardUndoOptions {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  enabled?: boolean;
}

export function useKeyboardUndo({
  undo,
  redo,
  canUndo,
  canRedo,
  enabled = true,
}: UseKeyboardUndoOptions) {
  if (typeof window === 'undefined') return; // SSR check

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
      }

      // Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }

      // Ctrl+Y or Cmd+Y for redo (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [undo, redo, canUndo, canRedo, enabled]);
}

import { useEffect } from 'react';

/**
 * Example: Picking Module with Full Undo Support
 *
 * ```tsx
 * function PickingInterface({ order }) {
 *   const [items, setItems] = useState(order.items);
 *   const { showUndo } = useUndoToasts();
 *
 *   const handlePickItem = async (itemId: string, quantity: number) => {
 *     const previousQuantity = items.find(i => i.id === itemId)?.picked_quantity || 0;
 *
 *     // Update picked quantity
 *     await updatePickedQuantity(itemId, quantity);
 *
 *     // Show undo toast
 *     showUndo(
 *       `Picked ${quantity}x items`,
 *       async () => {
 *         // Undo: revert to previous quantity
 *         await updatePickedQuantity(itemId, previousQuantity);
 *       }
 *     );
 *   };
 *
 *   const handleSkipTask = async (taskId: string) => {
 *     await skipTask(taskId);
 *
 *     showUndo(
 *       'Task skipped',
 *       async () => {
 *         await unskipTask(taskId);
 *       }
 *     );
 *   };
 *
 *   const handleUpdateBinLocation = async (taskId: string, newBin: string) => {
 *     const task = items.find(i => i.id === taskId);
 *     const oldBin = task?.bin_location;
 *
 *     await updateBinLocation(taskId, newBin);
 *
 *     showUndo(
 *       `Bin location updated to ${newBin}`,
 *       async () => {
 *         await updateBinLocation(taskId, oldBin);
 *       }
 *     );
 *   };
 *
 *   return (
 *     <div>
 *       {items.map(item => (
 *         <PickTaskItem
 *           key={item.id}
 *           item={item}
 *           onPick={(qty) => handlePickItem(item.id, qty)}
 *           onSkip={() => handleSkipTask(item.id)}
 *           onUpdateBin={(bin) => handleUpdateBinLocation(item.id, bin)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
