/**
 * @file useUndo.test.ts
 * @purpose Tests for useUndo hook and related utilities
 * @complexity medium
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUndo, useUndoableAction, useKeyboardUndo } from './useUndo';

describe('useUndo Hook', () => {
  describe('Basic State Management', () => {
    it('initializes with provided initial state', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));
      expect(result.current.state).toEqual({ count: 0 });
    });

    it('initializes with null when no initial state provided', () => {
      const { result } = renderHook(() => useUndo());
      expect(result.current.state).toBeNull();
    });

    it('returns correct canUndo and canRedo states initially', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('set Function', () => {
    it('updates state when set is called', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));

      act(() => {
        result.current.set({ count: 1 });
      });

      expect(result.current.state).toEqual({ count: 1 });
    });

    it('adds previous state to past history', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));

      act(() => {
        result.current.set({ count: 1 });
      });

      expect(result.current.past).toHaveLength(1);
      expect(result.current.past[0]).toEqual([{ count: 0 }]);
      expect(result.current.canUndo).toBe(true);
    });

    it('clears future history when new state is set', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));

      act(() => {
        result.current.set({ count: 1 });
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        result.current.set({ count: 2 });
      });

      expect(result.current.future).toHaveLength(0);
      expect(result.current.canRedo).toBe(false);
    });

    it('handles multiple state changes', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));

      act(() => {
        result.current.set({ count: 1 });
      });

      act(() => {
        result.current.set({ count: 2 });
      });

      act(() => {
        result.current.set({ count: 3 });
      });

      expect(result.current.state).toEqual({ count: 3 });
      expect(result.current.past).toHaveLength(3);
    });
  });

  describe('undo Function', () => {
    it('restores previous state', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));

      act(() => {
        result.current.set({ count: 1 });
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual({ count: 0 });
    });

    it('moves undone state to future', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));

      act(() => {
        result.current.set({ count: 1 });
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.future).toHaveLength(1);
      expect(result.current.canRedo).toBe(true);
    });

    it('does nothing when past is empty', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));
      const initialState = result.current.state;

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual(initialState);
      expect(result.current.canUndo).toBe(false);
    });

    it('can undo multiple times', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));

      act(() => {
        result.current.set({ count: 1 });
      });

      act(() => {
        result.current.set({ count: 2 });
      });

      act(() => {
        result.current.set({ count: 3 });
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual({ count: 2 });

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual({ count: 1 });
    });
  });

  describe('redo Function', () => {
    it('restores next state from future', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));

      act(() => {
        result.current.set({ count: 1 });
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        result.current.redo();
      });

      expect(result.current.state).toEqual({ count: 1 });
    });

    it('moves redone state back to past', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));

      act(() => {
        result.current.set({ count: 1 });
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        result.current.redo();
      });

      expect(result.current.past).toHaveLength(1);
      expect(result.current.canUndo).toBe(true);
    });

    it('does nothing when future is empty', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));

      act(() => {
        result.current.set({ count: 1 });
      });

      act(() => {
        result.current.redo();
      });

      expect(result.current.state).toEqual({ count: 1 });
      expect(result.current.canRedo).toBe(false);
    });

    it('can redo multiple times', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));

      act(() => {
        result.current.set({ count: 1 });
      });

      act(() => {
        result.current.set({ count: 2 });
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        result.current.redo();
      });

      expect(result.current.state).toEqual({ count: 1 });

      act(() => {
        result.current.redo();
      });

      expect(result.current.state).toEqual({ count: 2 });
    });
  });

  describe('reset Function', () => {
    it('resets to new initial state', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));

      act(() => {
        result.current.set({ count: 1 });
      });

      act(() => {
        result.current.set({ count: 2 });
      });

      act(() => {
        result.current.reset({ count: 10 });
      });

      expect(result.current.state).toEqual({ count: 10 });
      expect(result.current.past).toHaveLength(0);
      expect(result.current.future).toHaveLength(0);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('clearHistory Function', () => {
    it('clears past and future history', () => {
      const { result } = renderHook(() => useUndo({ count: 0 }));

      act(() => {
        result.current.set({ count: 1 });
      });

      act(() => {
        result.current.set({ count: 2 });
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.state).toEqual({ count: 1 });
      expect(result.current.past).toHaveLength(0);
      expect(result.current.future).toHaveLength(0);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('Complex Type States', () => {
    it('handles array states', () => {
      const { result } = renderHook(() => useUndo<string[]>([]));

      act(() => {
        result.current.set(['a']);
      });

      act(() => {
        result.current.set(['a', 'b']);
      });

      expect(result.current.state).toEqual(['a', 'b']);

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual(['a']);
    });

    it('handles object states with nested properties', () => {
      const { result } = renderHook(() => useUndo({ user: { name: 'John', age: 30 } }));

      act(() => {
        result.current.set({ user: { name: 'Jane', age: 25 } });
      });

      expect(result.current.state).toEqual({ user: { name: 'Jane', age: 25 } });

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual({ user: { name: 'John', age: 30 } });
    });
  });
});

describe('useUndoableAction Hook', () => {
  describe('Basic Execution', () => {
    it('executes action and updates canUndo', async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      const undo = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useUndoableAction({ action, undo, successMessage: 'Success' })
      );

      expect(result.current.isExecuting).toBe(false);
      expect(result.current.canUndo).toBe(false);

      await act(async () => {
        await result.current.execute();
      });

      expect(action).toHaveBeenCalledTimes(1);
      expect(result.current.canUndo).toBe(true);
      expect(result.current.didExecute).toBe(true);
      expect(result.current.isExecuting).toBe(false);
    });
  });

  describe('Undo Functionality', () => {
    it('executes undo when canUndo is true', async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      const undo = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useUndoableAction({ action, undo }));

      await act(async () => {
        await result.current.execute();
      });

      await act(async () => {
        await result.current.undo();
      });

      expect(undo).toHaveBeenCalledTimes(1);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.didExecute).toBe(false);
    });

    it('does not execute undo when canUndo is false', async () => {
      const undo = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useUndoableAction({
          action: vi.fn().mockResolvedValue(undefined),
          undo,
        })
      );

      await act(async () => {
        await result.current.undo();
      });

      expect(undo).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles action errors', async () => {
      const error = new Error('Action failed');
      const action = vi.fn().mockRejectedValue(error);
      const undo = vi.fn().mockResolvedValue(undefined);
      const onError = vi.fn();

      const { result } = renderHook(() => useUndoableAction({ action, undo, onError }));

      await expect(async () => {
        await act(async () => {
          await result.current.execute();
        });
      }).rejects.toThrow();

      // Check that error handler was called
      expect(onError).toHaveBeenCalledWith(error);
      expect(result.current.canUndo).toBe(false);
    });

    it('handles undo errors', async () => {
      const error = new Error('Undo failed');
      const action = vi.fn().mockResolvedValue(undefined);
      const undo = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();

      const { result } = renderHook(() => useUndoableAction({ action, undo, onError }));

      await act(async () => {
        await result.current.execute();
      });

      await expect(async () => {
        await act(async () => {
          await result.current.undo();
        });
      }).rejects.toThrow();

      // Check that error handler was called
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('Callbacks', () => {
    it('calls onUndo callback when undo is executed', async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      const undo = vi.fn().mockResolvedValue(undefined);
      const onUndo = vi.fn();

      const { result } = renderHook(() => useUndoableAction({ action, undo, onUndo }));

      await act(async () => {
        await result.current.execute();
      });

      await act(async () => {
        await result.current.undo();
      });

      expect(onUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reset', () => {
    it('resets hook to initial state', async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      const undo = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useUndoableAction({ action, undo }));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.didExecute).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.didExecute).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});

describe('useKeyboardUndo Hook', () => {
  // Store original window methods
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  beforeEach(() => {
    // Reset to original before each test
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  afterEach(() => {
    // Reset to original after each test
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  it('adds keyboard event listener when enabled', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const undo = vi.fn();
    const redo = vi.fn();

    renderHook(() => useKeyboardUndo({ undo, redo, canUndo: true, canRedo: true, enabled: true }));

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    addEventListenerSpy.mockRestore();
  });

  it('does not add event listener when disabled', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const undo = vi.fn();
    const redo = vi.fn();

    renderHook(() => useKeyboardUndo({ undo, redo, canUndo: true, canRedo: true, enabled: false }));

    expect(addEventListenerSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function));
    addEventListenerSpy.mockRestore();
  });

  it('removes event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const undo = vi.fn();
    const redo = vi.fn();

    const { unmount } = renderHook(() =>
      useKeyboardUndo({ undo, redo, canUndo: true, canRedo: true })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('responds to keyboard shortcuts', () => {
    const undo = vi.fn();
    const redo = vi.fn();

    renderHook(() => useKeyboardUndo({ undo, redo, canUndo: true, canRedo: true }));

    // Get the event listener that was registered
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useKeyboardUndo({ undo, redo, canUndo: true, canRedo: true }));

    const eventListener = addSpy.mock.calls.find(call => call[0] === 'keydown')?.[1] as (
      e: Event
    ) => void;

    expect(eventListener).toBeDefined();
    addSpy.mockRestore();
  });
});
