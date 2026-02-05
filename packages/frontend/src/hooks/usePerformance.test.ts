/**
 * @file usePerformance.test.ts
 * @purpose Tests for performance optimization hooks
 * @complexity medium
 * @tested yes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMemoized,
  useStableCallback,
  useDebouncedCallback,
  useThrottledCallback,
  useFilteredArray,
  usePrevious,
  useValueChanged,
  useLazyInitializer,
  useUpdateEffect,
  useStableSet,
  useStableMap,
} from './usePerformance';

describe('useMemoized', () => {
  it('memoizes expensive calculations', () => {
    let callCount = 0;
    const factory = () => {
      callCount++;
      return 42;
    };

    const { result, rerender } = renderHook(({ deps }) => useMemoized(factory, deps), {
      initialProps: { deps: [1] } as { deps: unknown[] },
    });

    expect(result.current).toBe(42);
    expect(callCount).toBe(1);

    rerender({ deps: [1] });
    expect(callCount).toBe(1);

    rerender({ deps: [2] });
    expect(callCount).toBe(2);
    expect(result.current).toBe(42);
  });

  it('returns factory result', () => {
    const { result } = renderHook(() => useMemoized(() => ({ foo: 'bar' }), []));

    expect(result.current).toEqual({ foo: 'bar' });
  });
});

describe('useStableCallback', () => {
  it('creates stable callback reference', () => {
    const callback = vi.fn();
    const { result, rerender } = renderHook(
      ({ cb, deps }: { cb: () => void; deps: unknown[] }) => useStableCallback(cb, deps),
      {
        initialProps: { cb: callback, deps: [1] },
      }
    );

    const firstRef = result.current;
    expect(firstRef).toBeInstanceOf(Function);

    rerender({ cb: callback, deps: [1] });
    expect(result.current).toBe(firstRef);

    const newCallback = vi.fn();
    rerender({ cb: newCallback, deps: [2] });
    expect(result.current).not.toBe(firstRef);
  });

  it('calls the callback with correct arguments', () => {
    const callback = vi.fn((a: number, b: number) => a + b) as (...args: unknown[]) => unknown;
    const { result } = renderHook(() => useStableCallback(callback, [callback] as unknown[]));

    act(() => {
      result.current(2, 3);
    });

    expect(callback).toHaveBeenCalledWith(2, 3);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debounces function calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    act(() => {
      result.current('test1');
      result.current('test2');
      result.current('test3');
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('test3');
  });

  it('cancels previous pending calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    act(() => {
      result.current('first');
      vi.advanceTimersByTime(300);
      result.current('second');
      vi.advanceTimersByTime(300);
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('second');
  });

  it('cleans up timeout on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 500));

    act(() => {
      result.current('test');
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('respects delay parameter', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 1000));

    act(() => {
      result.current('test');
      vi.advanceTimersByTime(500);
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe('useThrottledCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throttles function calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 500));

    act(() => {
      result.current('call1');
      result.current('call2');
      result.current('call3');
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('call1');
  });

  it('allows calls after delay period', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 500));

    act(() => {
      result.current('first');
      vi.advanceTimersByTime(500);
      result.current('second');
    });

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(1, 'first');
    expect(callback).toHaveBeenNthCalledWith(2, 'second');
  });

  it('respects throttle delay', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 1000));

    act(() => {
      result.current('test1');
      vi.advanceTimersByTime(500);
      result.current('test2');
    });

    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(500);
      result.current('test3');
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });
});

describe('useFilteredArray', () => {
  it('filters array when predicate returns boolean', () => {
    const items = [1, 2, 3, 4, 5];
    const { result } = renderHook(() => useFilteredArray(items, item => item > 2, []));

    expect(result.current).toEqual([3, 4, 5]);
  });

  it('maps array when predicate returns non-boolean', () => {
    const items = [1, 2, 3];
    const { result } = renderHook(() => useFilteredArray(items, item => item * 2, []));

    expect(result.current).toEqual([2, 4, 6]);
  });

  it('memoizes result when items and deps are unchanged', () => {
    const items = [1, 2, 3];
    let renderCount = 0;

    const { result, rerender } = renderHook(
      ({ arr, predicate }) => {
        renderCount++;
        return useFilteredArray(arr, predicate, []);
      },
      { initialProps: { arr: items, predicate: (x: number) => x > 1 } }
    );

    const firstResult = result.current;
    expect(firstResult).toEqual([2, 3]);

    rerender({ arr: items, predicate: (x: number) => x > 1 });
    const secondResult = result.current;
    expect(secondResult).toBe(firstResult);

    rerender({ arr: [1, 2, 3, 4], predicate: (x: number) => x > 1 });
    const thirdResult = result.current;
    expect(thirdResult).toEqual([2, 3, 4]);
    expect(thirdResult).not.toBe(firstResult);
  });

  it('handles empty arrays', () => {
    const { result } = renderHook(() => useFilteredArray([], item => item > 0, []));

    expect(result.current).toEqual([]);
  });
});

describe('usePrevious', () => {
  it('returns undefined on first render', () => {
    const { result } = renderHook(() => usePrevious(10));

    expect(result.current).toBeUndefined();
  });

  it('returns previous value on subsequent renders', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 10 },
    });

    expect(result.current).toBeUndefined();

    rerender({ value: 20 });
    expect(result.current).toBe(10);

    rerender({ value: 30 });
    expect(result.current).toBe(20);
  });

  it('handles different value types', () => {
    const { result, rerender } = renderHook(({ value }: { value: unknown }) => usePrevious(value), {
      initialProps: { value: 'first' as unknown },
    });

    rerender({ value: 'second' as unknown });
    expect(result.current).toBe('first');

    rerender({ value: { foo: 'bar' } as unknown });
    expect(result.current).toBe('second');
  });
});

describe('useValueChanged', () => {
  it('returns true on first render (undefined to value)', () => {
    const { result } = renderHook(() => useValueChanged(10));

    // On first render, prevValue is undefined, so undefined !== 10 is true
    expect(result.current).toBe(true);
  });

  it('returns true when value changes', () => {
    const { result, rerender } = renderHook(({ value }) => useValueChanged(value), {
      initialProps: { value: 10 },
    });

    // First render: undefined !== 10 is true
    expect(result.current).toBe(true);

    rerender({ value: 20 });
    // 10 !== 20 is true
    expect(result.current).toBe(true);

    rerender({ value: 20 });
    // 20 !== 20 is false
    expect(result.current).toBe(false);

    rerender({ value: 30 });
    // 20 !== 30 is true
    expect(result.current).toBe(true);
  });

  it('returns false when starting with undefined', () => {
    const { result } = renderHook(() => useValueChanged(undefined));

    // undefined !== undefined is false
    expect(result.current).toBe(false);
  });
});

describe('useLazyInitializer', () => {
  it('initializes value once', () => {
    let initCount = 0;
    const initializer = () => {
      initCount++;
      return { data: 'test' };
    };

    const { result, rerender } = renderHook(() => useLazyInitializer(initializer));

    expect(initCount).toBe(1);
    expect(result.current).toEqual({ data: 'test' });

    rerender();
    expect(initCount).toBe(1);
    expect(result.current).toEqual({ data: 'test' });

    rerender();
    expect(initCount).toBe(1);
  });

  it('returns initialized value', () => {
    const { result } = renderHook(() => useLazyInitializer(() => 42));

    expect(result.current).toBe(42);
  });

  it('handles complex initializers', () => {
    const complexData = { nested: { value: 123 } };
    const { result } = renderHook(() => useLazyInitializer(() => ({ ...complexData })));

    expect(result.current).toEqual(complexData);
  });
});

describe('useUpdateEffect', () => {
  it('skips first render', () => {
    const effect = vi.fn();
    const { rerender } = renderHook(({ deps }) => useUpdateEffect(effect, deps), {
      initialProps: { deps: [1] } as { deps: unknown[] },
    });

    expect(effect).not.toHaveBeenCalled();

    rerender({ deps: [2] });
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('runs on dependency changes after first render', () => {
    const effect = vi.fn();
    const { rerender } = renderHook(({ deps }) => useUpdateEffect(effect, deps), {
      initialProps: { deps: [1] } as { deps: unknown[] },
    });

    rerender({ deps: [2] });
    expect(effect).toHaveBeenCalledTimes(1);

    rerender({ deps: [3] });
    expect(effect).toHaveBeenCalledTimes(2);
  });

  it('does not run when dependencies unchanged', () => {
    const effect = vi.fn();
    const { rerender } = renderHook(({ deps }) => useUpdateEffect(effect, deps), {
      initialProps: { deps: [1] } as { deps: unknown[] },
    });

    rerender({ deps: [1] });
    expect(effect).not.toHaveBeenCalled();

    rerender({ deps: [2] });
    expect(effect).toHaveBeenCalledTimes(1);

    rerender({ deps: [2] });
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('supports cleanup function', () => {
    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);

    const { rerender } = renderHook(({ deps }) => useUpdateEffect(effect, deps), {
      initialProps: { deps: [1] } as { deps: unknown[] },
    });

    rerender({ deps: [2] });
    expect(effect).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();

    rerender({ deps: [3] });
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe('useStableSet', () => {
  it('creates a stable Set reference', () => {
    const { result, rerender } = renderHook(() => useStableSet([1, 2, 3]));

    const firstSet = result.current;
    expect(firstSet).toBeInstanceOf(Set);
    expect(Array.from(firstSet)).toEqual([1, 2, 3]);

    rerender();
    expect(result.current).toBe(firstSet);
  });

  it('initializes with empty set by default', () => {
    const { result } = renderHook(() => useStableSet());

    expect(result.current).toBeInstanceOf(Set);
    expect(result.current.size).toBe(0);
  });

  it('initializes with provided values', () => {
    const { result } = renderHook(() => useStableSet(['a', 'b', 'c']));

    expect(result.current.has('a')).toBe(true);
    expect(result.current.has('b')).toBe(true);
    expect(result.current.has('c')).toBe(true);
    expect(result.current.size).toBe(3);
  });

  it('maintains Set operations', () => {
    const { result } = renderHook(() => useStableSet([1, 2]));

    act(() => {
      result.current.add(3);
    });

    expect(result.current.has(3)).toBe(true);
    expect(result.current.size).toBe(3);
  });
});

describe('useStableMap', () => {
  it('creates a stable Map reference', () => {
    const { result, rerender } = renderHook(() =>
      useStableMap([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ])
    );

    const firstMap = result.current;
    expect(firstMap).toBeInstanceOf(Map);
    expect(firstMap.get('key1')).toBe('value1');
    expect(firstMap.get('key2')).toBe('value2');

    rerender();
    expect(result.current).toBe(firstMap);
  });

  it('initializes with empty map by default', () => {
    const { result } = renderHook(() => useStableMap());

    expect(result.current).toBeInstanceOf(Map);
    expect(result.current.size).toBe(0);
  });

  it('initializes with provided entries', () => {
    const { result } = renderHook(() =>
      useStableMap([
        ['a', 1],
        ['b', 2],
      ])
    );

    expect(result.current.get('a')).toBe(1);
    expect(result.current.get('b')).toBe(2);
    expect(result.current.size).toBe(2);
  });

  it('maintains Map operations', () => {
    const { result } = renderHook(() => useStableMap([['key', 'value']]));

    act(() => {
      result.current.set('key2', 'value2');
    });

    expect(result.current.get('key2')).toBe('value2');
    expect(result.current.size).toBe(2);
  });
});
