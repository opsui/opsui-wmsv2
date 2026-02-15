/**
 * useDebouncedInvalidation - Hook to batch and debounce React Query invalidations
 *
 * Prevents excessive re-renders when multiple WebSocket events trigger
 * simultaneous invalidations. Batches all invalidation requests within
 * a configurable delay window into a single update.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface InvalidationBatch {
  keys: Set<string>;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

/**
 * Hook that provides a debounced invalidation function for React Query.
 * Batches multiple invalidation requests within the delay window.
 *
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Object with invalidateQueued function
 *
 * @example
 * const { invalidateQueued } = useDebouncedInvalidation(500);
 *
 * // Instead of:
 * queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
 * queryClient.invalidateQueries({ queryKey: ['role-activity'] });
 *
 * // Use:
 * invalidateQueued('dashboard-metrics');
 * invalidateQueued('role-activity');
 * // Both will be batched and executed once after 500ms
 */
export function useDebouncedInvalidation(delay = 300) {
  const queryClient = useQueryClient();
  const batchRef = useRef<InvalidationBatch>({
    keys: new Set(),
    timeoutId: null,
  });

  const flush = useCallback(() => {
    const batch = batchRef.current;
    if (batch.keys.size > 0) {
      // Invalidate all queued keys at once
      batch.keys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      batch.keys.clear();
    }
    batch.timeoutId = null;
  }, [queryClient]);

  const invalidateQueued = useCallback(
    (key: string) => {
      const batch = batchRef.current;
      batch.keys.add(key);

      // Clear existing timeout and set a new one
      if (batch.timeoutId) {
        clearTimeout(batch.timeoutId);
      }
      batch.timeoutId = setTimeout(flush, delay);
    },
    [flush, delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchRef.current.timeoutId) {
        clearTimeout(batchRef.current.timeoutId);
      }
    };
  }, []);

  return { invalidateQueued };
}

export default useDebouncedInvalidation;
