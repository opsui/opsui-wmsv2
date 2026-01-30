/**
 * Performance optimization hooks
 *
 * Collection of custom hooks for optimizing React component performance
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';

/**
 * Hook to memoize expensive calculations with proper dependency tracking
 *
 * @param factory - Function that computes the value
 * @param deps - Dependencies array
 * @returns Memoized value
 */
export function useMemoized<T>(factory: () => T, deps: unknown[]): T {
  return useMemo(() => factory(), deps);
}

/**
 * Hook to create a stable callback reference
 *
 * @param callback - Function to memoize
 * @param deps - Dependencies array
 * @returns Memoized callback
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: unknown[]
): T {
  return useCallback(callback, deps) as T;
}

/**
 * Hook to debounce a function call
 *
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * Hook to throttle a function call
 *
 * @param callback - Function to throttle
 * @param delay - Delay in milliseconds
 * @returns Throttled function
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRunRef = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRunRef.current >= delay) {
        callback(...args);
        lastRunRef.current = now;
      }
    },
    [callback, delay]
  );
}

/**
 * Hook to memoize filtered/transformed arrays
 * Prevents unnecessary recalculations when array reference changes but contents don't
 *
 * @param items - Array to filter/transform
 * @param predicate - Filter function or transform function
 * @param deps - Additional dependencies
 * @returns Memoized filtered/transformed array
 */
export function useFilteredArray<T, U = T>(
  items: T[],
  predicate: (item: T) => boolean | U,
  deps: unknown[] = []
): T[] | U[] {
  return useMemo(() => {
    const result = items.map(item => predicate(item));
    // If predicate returns boolean, it's a filter
    if (result.length > 0 && typeof result[0] === 'boolean') {
      return items.filter((item, index) => result[index] as boolean);
    }
    // Otherwise it's a map
    return result as U[];
  }, [items, ...deps]);
}

/**
 * Hook to track previous value
 * Useful for detecting changes in props/state
 *
 * @param value - Current value
 * @returns Previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Hook to detect if a value has changed from previous render
 *
 * @param value - Current value
 * @returns True if value changed, false otherwise
 */
export function useValueChanged<T>(value: T): boolean {
  const prevValue = usePrevious(value);
  return prevValue !== value;
}

/**
 * Hook to lazy initialize a value
 * Only runs the initializer once
 *
 * @param initializer - Function to initialize value
 * @returns Initialized value
 */
export function useLazyInitializer<T>(initializer: () => T): T {
  const ref = useRef<T>();

  if (ref.current === undefined) {
    ref.current = initializer();
  }

  return ref.current;
}

/**
 * Hook to perform an action only when dependencies change
 * Skips the first render
 *
 * @param effect - Function to run when dependencies change
 * @param deps - Dependencies array
 */
export function useUpdateEffect(effect: () => void, deps: unknown[]): void {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    return effect();
  }, deps);
}

/**
 * Hook to create a stable, memoized set
 *
 * @param initialSet - Initial set values
 * @returns Memoized Set with stable reference
 */
export function useStableSet<T>(initialSet: Iterable<T> = []): Set<T> {
  return useMemo(() => new Set(initialSet), []);
}

/**
 * Hook to create a stable, memoized map
 *
 * @param initialMap - Initial map entries
 * @returns Memoized Map with stable reference
 */
export function useStableMap<K, V>(initialMap: Iterable<readonly [K, V]> = []): Map<K, V> {
  return useMemo(() => new Map(initialMap), []);
}
