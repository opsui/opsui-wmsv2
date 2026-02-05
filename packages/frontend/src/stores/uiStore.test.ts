/**
 * Tests for uiStore
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useUIStore,
  showNotification,
  showSuccess,
  showError,
  showWarning,
  showInfo,
} from './uiStore';

// Mock AudioContext
class MockAudioContext {
  readonly currentTime: number = 0;
  createGain = vi.fn(() => ({
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    disconnect: vi.fn(),
  }));
  createOscillator = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 0 },
    type: 'sine' as OscillatorType,
  }));
  close = vi.fn().mockResolvedValue(undefined);
}

vi.stubGlobal('AudioContext', MockAudioContext);

describe('uiStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useUIStore.setState({
      soundEnabled: true,
      theme: 'dark',
      sidebarOpen: true,
      scanInputFocused: false,
      notifications: [],
      loadingStates: {},
    });
  });

  describe('Sound settings', () => {
    it('should have sound enabled by default', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.soundEnabled).toBe(true);
    });

    it('should set sound enabled', () => {
      const { result } = renderHook(() => useUIStore());
      act(() => {
        result.current.setSoundEnabled(false);
      });
      expect(result.current.soundEnabled).toBe(false);
    });

    it('should toggle sound', () => {
      const { result } = renderHook(() => useUIStore());
      act(() => {
        result.current.toggleSound();
      });
      expect(result.current.soundEnabled).toBe(false);
      act(() => {
        result.current.toggleSound();
      });
      expect(result.current.soundEnabled).toBe(true);
    });
  });

  describe('Theme settings', () => {
    it('should have dark theme by default', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.theme).toBe('dark');
    });

    it('should set theme', () => {
      const { result } = renderHook(() => useUIStore());
      act(() => {
        result.current.setTheme('light');
      });
      expect(result.current.theme).toBe('light');
    });
  });

  describe('Sidebar state', () => {
    it('should have sidebar open by default', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.sidebarOpen).toBe(true);
    });

    it('should set sidebar open', () => {
      const { result } = renderHook(() => useUIStore());
      act(() => {
        result.current.setSidebarOpen(false);
      });
      expect(result.current.sidebarOpen).toBe(false);
    });

    it('should toggle sidebar', () => {
      const { result } = renderHook(() => useUIStore());
      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(false);
      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(true);
    });
  });

  describe('Scan input focus', () => {
    it('should have scan input not focused by default', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.scanInputFocused).toBe(false);
    });

    it('should set scan input focused', () => {
      const { result } = renderHook(() => useUIStore());
      act(() => {
        result.current.setScanInputFocused(true);
      });
      expect(result.current.scanInputFocused).toBe(true);
    });
  });

  describe('Notifications', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should have empty notifications by default', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.notifications).toEqual([]);
    });

    it('should add notification', () => {
      const { result } = renderHook(() => useUIStore());
      act(() => {
        result.current.addNotification({ type: 'success', message: 'Test message' });
      });
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        type: 'success',
        message: 'Test message',
      });
      expect(result.current.notifications[0]).toHaveProperty('id');
      expect(result.current.notifications[0]).toHaveProperty('timestamp');
    });

    it('should remove notification', () => {
      const { result } = renderHook(() => useUIStore());
      act(() => {
        result.current.addNotification({ type: 'error', message: 'Error' });
      });
      const notificationId = result.current.notifications[0].id;
      act(() => {
        result.current.removeNotification(notificationId);
      });
      expect(result.current.notifications).toHaveLength(0);
    });

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useUIStore());
      act(() => {
        result.current.addNotification({ type: 'info', message: 'Info 1' });
        result.current.addNotification({ type: 'warning', message: 'Warning' });
      });
      expect(result.current.notifications).toHaveLength(2);
      act(() => {
        result.current.clearNotifications();
      });
      expect(result.current.notifications).toHaveLength(0);
    });

    it('should auto-remove notification after 5 seconds', () => {
      const { result } = renderHook(() => useUIStore());
      act(() => {
        result.current.addNotification({ type: 'success', message: 'Auto remove' });
      });
      expect(result.current.notifications).toHaveLength(1);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.notifications).toHaveLength(0);
    });
  });

  describe('Loading states', () => {
    it('should have empty loading states by default', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.loadingStates).toEqual({});
    });

    it('should set loading state', () => {
      const { result } = renderHook(() => useUIStore());
      act(() => {
        result.current.setLoading('fetchData', true);
      });
      expect(result.current.loadingStates.fetchData).toBe(true);
      act(() => {
        result.current.setLoading('fetchData', false);
      });
      expect(result.current.loadingStates.fetchData).toBe(false);
    });

    it('should handle multiple loading states', () => {
      const { result } = renderHook(() => useUIStore());
      act(() => {
        result.current.setLoading('loading1', true);
        result.current.setLoading('loading2', true);
      });
      expect(result.current.loadingStates.loading1).toBe(true);
      expect(result.current.loadingStates.loading2).toBe(true);
      act(() => {
        result.current.setLoading('loading1', false);
      });
      expect(result.current.loadingStates.loading1).toBe(false);
      expect(result.current.loadingStates.loading2).toBe(true);
    });
  });
});

describe('Notification helper functions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUIStore.setState({
      soundEnabled: true,
      theme: 'dark',
      sidebarOpen: true,
      scanInputFocused: false,
      notifications: [],
      loadingStates: {},
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show notification', () => {
    showNotification('success', 'Test notification');
    const state = useUIStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].type).toBe('success');
    expect(state.notifications[0].message).toBe('Test notification');
  });

  it('should show success notification', () => {
    showSuccess('Success message');
    const state = useUIStore.getState();
    expect(state.notifications[0].type).toBe('success');
    expect(state.notifications[0].message).toBe('Success message');
  });

  it('should show error notification', () => {
    showError('Error message');
    const state = useUIStore.getState();
    expect(state.notifications[0].type).toBe('error');
    expect(state.notifications[0].message).toBe('Error message');
  });

  it('should show warning notification', () => {
    showWarning('Warning message');
    const state = useUIStore.getState();
    expect(state.notifications[0].type).toBe('warning');
    expect(state.notifications[0].message).toBe('Warning message');
  });

  it('should show info notification', () => {
    showInfo('Info message');
    const state = useUIStore.getState();
    expect(state.notifications[0].type).toBe('info');
    expect(state.notifications[0].message).toBe('Info message');
  });

  it('should not play sound when sound is disabled', () => {
    useUIStore.setState({ soundEnabled: false });
    showNotification('success', 'Test');
    const state = useUIStore.getState();
    expect(state.notifications).toHaveLength(1);
  });
});
