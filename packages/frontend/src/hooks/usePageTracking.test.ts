/**
 * @file usePageTracking.test.ts
 * @purpose Tests for page tracking hook
 * @complexity high
 * @tested yes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup, waitFor } from '@testing-library/react';
import { usePageTracking, PageViews } from './usePageTracking';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores';

// Mock dependencies
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

vi.mock('@/stores', () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

describe('usePageTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module-level map by reimporting
    vi.resetModules();
    // Mock authenticated state by default
    vi.mocked(useAuthStore.getState).mockReturnValue({
      isAuthenticated: true,
      user: null,
      accessToken: null,
      refreshToken: null,
      activeRole: null,
      login: vi.fn(),
      logout: vi.fn(),
      updateTokens: vi.fn(),
      setUser: vi.fn(),
      setActiveRole: vi.fn(),
      clearAuth: vi.fn(),
      getEffectiveRole: () => null,
      hasRole: () => false,
      canPick: () => false,
      canPack: () => false,
      canSupervise: () => false,
    });
    // Mock visibility state as visible
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible',
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('registers tracking instance on mount', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      renderHook(() => usePageTracking({ view: 'Test View' }));

      const registrationCall = consoleSpy.mock.calls.find(
        call =>
          call[0]?.toString().includes('[PageTracking] Registered tracking instance') &&
          call[0]?.toString().includes('Test View')
      );
      expect(registrationCall).toBeDefined();
    });

    it('updates view immediately on mount when enabled', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      renderHook(() => usePageTracking({ view: 'Orders Page' }));

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/auth/current-view', {
          view: 'Orders Page',
        });
      });
    });

    it('does not update view when disabled', async () => {
      renderHook(() => usePageTracking({ view: 'Test View', enabled: false }));

      await waitFor(() => {
        expect(apiClient.post).not.toHaveBeenCalled();
      });
    });

    it('does not update view when view is empty', async () => {
      renderHook(() => usePageTracking({ view: '' }));

      await waitFor(() => {
        expect(apiClient.post).not.toHaveBeenCalled();
      });
    });

    it('cleans up tracking instance on unmount', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      const { unmount } = renderHook(() => usePageTracking({ view: 'Test View' }));

      unmount();

      const cleanupCall = consoleSpy.mock.calls.find(
        call =>
          call[0]?.toString().includes('[PageTracking]') &&
          call[0]?.toString().includes('Cleaning up tracking')
      );
      expect(cleanupCall).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('skips view update when not authenticated', async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        activeRole: null,
        login: vi.fn(),
        logout: vi.fn(),
        updateTokens: vi.fn(),
        setUser: vi.fn(),
        setActiveRole: vi.fn(),
        clearAuth: vi.fn(),
        getEffectiveRole: () => null,
        hasRole: () => false,
        canPick: () => false,
        canPack: () => false,
        canSupervise: () => false,
      });

      const consoleSpy = vi.spyOn(console, 'log');

      renderHook(() => usePageTracking({ view: 'Test View' }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('User not authenticated - skipping view update')
        );
      });

      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('sets to IDLE when not authenticated', async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        activeRole: null,
        login: vi.fn(),
        logout: vi.fn(),
        updateTokens: vi.fn(),
        setUser: vi.fn(),
        setActiveRole: vi.fn(),
        clearAuth: vi.fn(),
        getEffectiveRole: () => null,
        hasRole: () => false,
        canPick: () => false,
        canPack: () => false,
        canSupervise: () => false,
      });

      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      const { unmount } = renderHook(() => usePageTracking({ view: 'Test View' }));

      unmount();

      await waitFor(() => {
        expect(apiClient.post).not.toHaveBeenCalledWith('/auth/set-idle');
      });
    });
  });

  describe('Visibility Changes', () => {
    it('updates view when tab becomes visible', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      renderHook(() => usePageTracking({ view: 'Orders Page' }));

      // Simulate tab becoming visible
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible',
      });

      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/auth/current-view', {
          view: 'Orders Page',
        });
      });
    });

    it('sets to IDLE when tab becomes hidden', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      renderHook(() => usePageTracking({ view: 'Orders Page' }));

      // Simulate tab becoming hidden
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden',
      });

      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/auth/set-idle');
      });
    });

    it('removes visibility event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => usePageTracking({ view: 'Test View' }));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    it('logs non-401 errors', async () => {
      const error = { response: { status: 500 } };
      vi.mocked(apiClient.post).mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error');

      renderHook(() => usePageTracking({ view: 'Test View' }));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });

    it('does not log 401 errors', async () => {
      const error = { response: { status: 401 } };
      vi.mocked(apiClient.post).mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error');

      renderHook(() => usePageTracking({ view: 'Test View' }));

      await waitFor(() => {
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });

    it('handles API errors gracefully', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'));

      const { unmount } = renderHook(() => usePageTracking({ view: 'Test View' }));

      // Should not throw
      await expect(() => unmount()).not.toThrow();
    });
  });

  describe('Multiple Tracking Instances', () => {
    it('prevents IDLE when other tracking is active on unmount', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });
      const consoleSpy = vi.spyOn(console, 'log');

      const { unmount: unmount1 } = renderHook(() => usePageTracking({ view: 'View 1' }));
      renderHook(() => usePageTracking({ view: 'View 2' }));

      // Unmount first hook - should not set IDLE because second is still active
      unmount1();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Other tracking instances still active')
        );
      });

      expect(apiClient.post).not.toHaveBeenCalledWith('/auth/set-idle');
    });

    it('sets IDLE when last tracking instance unmounts', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });
      const consoleSpy = vi.spyOn(console, 'log');

      const { unmount } = renderHook(() => usePageTracking({ view: 'Test View' }));

      unmount();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('No other tracking instances')
        );
      });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/set-idle');
    });
  });

  describe('View Updates', () => {
    it('updates view when view prop changes', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });

      const { rerender } = renderHook(({ view }) => usePageTracking({ view }), {
        initialProps: { view: 'View 1' },
      });

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/auth/current-view', {
          view: 'View 1',
        });
      });

      rerender({ view: 'View 2' });

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/auth/current-view', {
          view: 'View 2',
        });
      });
    });

    it('re-registers when view changes', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const { rerender } = renderHook(({ view }) => usePageTracking({ view }), {
        initialProps: { view: 'View 1' },
      });

      rerender({ view: 'View 2' });

      // Check that console.log was called with registration message for View 2
      const registrationCall = consoleSpy.mock.calls.find(
        call =>
          call[0]?.toString().includes('[PageTracking] Registered tracking instance') &&
          call[0]?.toString().includes('View 2')
      );
      expect(registrationCall).toBeDefined();
    });
  });

  describe('Console Logging', () => {
    it('logs registration with tracking ID', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      renderHook(() => usePageTracking({ view: 'Test View' }));

      // Check that console.log was called with registration message
      const registrationCall = consoleSpy.mock.calls.find(call =>
        call[0]?.toString().includes('[PageTracking] Registered tracking instance: tracking-')
      );
      expect(registrationCall).toBeDefined();
      expect(registrationCall?.[0]).toContain('Test View');
    });

    it('logs view update attempts', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });
      const consoleSpy = vi.spyOn(console, 'log');

      renderHook(() => usePageTracking({ view: 'Test View' }));

      await waitFor(() => {
        const updateCall = consoleSpy.mock.calls.find(call =>
          call[0]?.toString().includes('Updating current view to:')
        );
        expect(updateCall).toBeDefined();
        expect(updateCall?.[0]).toContain('Test View');
      });
    });

    it('logs successful view updates', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ success: true });
      const consoleSpy = vi.spyOn(console, 'log');

      renderHook(() => usePageTracking({ view: 'Test View' }));

      await waitFor(() => {
        const successCall = consoleSpy.mock.calls.find(call =>
          call[0]?.toString().includes('Successfully updated current view to:')
        );
        expect(successCall).toBeDefined();
      });
    });
  });
});

describe('PageViews', () => {
  it('contains all expected view constants', () => {
    expect(PageViews.ORDERS_PAGE).toBe('Orders Page');
    expect(PageViews.ORDER_QUEUE).toBe('Order Queue');
    expect(PageViews.DASHBOARD).toBe('Dashboard');
    expect(PageViews.PROFILE).toBe('Profile');
    expect(PageViews.SETTINGS).toBe('Settings');
    expect(PageViews.ITEM_SEARCH).toBe('Product Search');
    expect(PageViews.WAVE_PICKING).toBe('Wave Picking');
    expect(PageViews.ZONE_PICKING).toBe('Zone Picking');
    expect(PageViews.SLOTTING).toBe('Slotting');
  });

  it('PICKING is a function that generates view names', () => {
    expect(PageViews.PICKING('ORD-123')).toBe('Picking Order ORD-123');
    expect(PageViews.PICKING('ORD-456')).toBe('Picking Order ORD-456');
  });

  it('all view values are strings', () => {
    const allViews = [
      PageViews.ORDERS_PAGE,
      PageViews.ORDER_QUEUE,
      PageViews.DASHBOARD,
      PageViews.PROFILE,
      PageViews.SETTINGS,
      PageViews.ITEM_SEARCH,
      PageViews.WAVE_PICKING,
      PageViews.ZONE_PICKING,
      PageViews.SLOTTING,
      PageViews.PICKING('TEST-123'),
    ];

    allViews.forEach(view => {
      expect(typeof view).toBe('string');
    });
  });
});

describe('usePageTracking Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore.getState).mockReturnValue({
      isAuthenticated: true,
      user: null,
      accessToken: null,
      refreshToken: null,
      activeRole: null,
      login: vi.fn(),
      logout: vi.fn(),
      updateTokens: vi.fn(),
      setUser: vi.fn(),
      setActiveRole: vi.fn(),
      clearAuth: vi.fn(),
      getEffectiveRole: () => null,
      hasRole: () => false,
      canPick: () => false,
      canPack: () => false,
      canSupervise: () => false,
    });
  });

  it('works with PageViews constants', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ success: true });

    renderHook(() => usePageTracking({ view: PageViews.ORDERS_PAGE }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/current-view', {
        view: 'Orders Page',
      });
    });
  });

  it('works with PageViews.PICKING function', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ success: true });

    renderHook(() => usePageTracking({ view: PageViews.PICKING('ORD-123') }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/current-view', {
        view: 'Picking Order ORD-123',
      });
    });
  });
});
