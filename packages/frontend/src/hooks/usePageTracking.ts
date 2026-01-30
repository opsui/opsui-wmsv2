/**
 * usePageTracking hook
 *
 * Tracks of current page/view of a picker for admin dashboard
 */

import { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores';

interface UsePageTrackingOptions {
  /**
   * The view name to track
   * Examples: "Orders Page", "Order Queue", "Picking Order ORD-123"
   */
  view: string;
  /**
   * Whether tracking is enabled
   * @default true
   */
  enabled?: boolean;
}

// Use a module-level map to track active tracking instances
// This prevents race conditions when multiple components track views
const activeTrackingIds = new Map<string, boolean>();
let globalIdCounter = 0;

/**
 * Hook to track of current page/view of a picker
 * This updates picker's current_view in the database,
 * which is displayed in the admin dashboard
 *
 * Logic:
 * - Update immediately when page mounts (picker arrives)
 * - Update when tab becomes visible (picker returns to window)
 * - Set to IDLE when tab becomes hidden (picker leaves window)
 * - Set to IDLE when component unmounts, ONLY if no other tracking is active
 * - Uses global tracking registry to prevent race conditions
 */
export function usePageTracking({ view, enabled = true }: UsePageTrackingOptions) {
  const trackingIdRef = useRef<string>(`tracking-${globalIdCounter++}`);

  useEffect(() => {
    if (!enabled || !view) {
      return;
    }

    const trackingId = trackingIdRef.current;

    // Register this tracking instance as active
    activeTrackingIds.set(trackingId, true);
    console.log(`[PageTracking] Registered tracking instance: ${trackingId} for view: ${view}`);

    // Function to update current view (ACTIVE)
    const updateView = async () => {
      // Check if user is authenticated before making API call
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      if (!isAuthenticated) {
        console.log(`[PageTracking] [${trackingId}] User not authenticated - skipping view update`);
        return;
      }

      try {
        console.log(`[PageTracking] [${trackingId}] Updating current view to: ${view}`);
        await apiClient.post('/auth/current-view', { view });
        console.log(`[PageTracking] [${trackingId}] Successfully updated current view to: ${view}`);
      } catch (error) {
        // Only log non-401 errors to reduce console noise during tests
        const isAuthError = error && typeof error === 'object' && 'response' in error &&
          (error as { response?: { status?: number } }).response?.status === 401;
        if (!isAuthError) {
          console.error(`[PageTracking] [${trackingId}] Failed to update current view:`, error);
        }
      }
    };

    // Function to set picker to IDLE
    const setIdle = async () => {
      // Only set to IDLE if this is the last active tracking instance
      const hasOtherActiveTracking = Array.from(activeTrackingIds.keys()).some(
        id => id !== trackingId && activeTrackingIds.get(id)
      );

      if (hasOtherActiveTracking) {
        console.log(
          `[PageTracking] [${trackingId}] Skipping IDLE - other tracking instances active`
        );
        return;
      }

      // Check if user is authenticated before making API call
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      if (!isAuthenticated) {
        console.log(`[PageTracking] [${trackingId}] User not authenticated - skipping IDLE set`);
        return;
      }

      try {
        console.log(`[PageTracking] [${trackingId}] Setting picker to IDLE (last active instance)`);
        await apiClient.post('/auth/set-idle');
        console.log(`[PageTracking] [${trackingId}] Successfully set picker to IDLE`);
      } catch (error) {
        // Only log non-401 errors to reduce console noise during tests
        const isAuthError = error && typeof error === 'object' && 'response' in error &&
          (error as { response?: { status?: number } }).response?.status === 401;
        if (!isAuthError) {
          console.error(`[PageTracking] [${trackingId}] Failed to set picker to IDLE:`, error);
        }
      }
    };

    // Immediate update on mount (picker arrives)
    updateView();

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible - picker is ACTIVE
        console.log(`[PageTracking] [${trackingId}] Tab became visible, updating view: ${view}`);
        updateView();
      } else {
        // Tab became hidden - picker is IDLE
        console.log(`[PageTracking] [${trackingId}] Tab became hidden, setting picker to IDLE`);
        setIdle();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup when component unmounts
    return () => {
      console.log(`[PageTracking] [${trackingId}] Cleaning up tracking for view: ${view}`);

      // Unregister this tracking instance
      activeTrackingIds.delete(trackingId);

      // Remove visibility listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Only set to IDLE if no other tracking instances are active
      // This prevents race conditions when navigating between pages
      const hasOtherActiveTracking = Array.from(activeTrackingIds.values()).some(Boolean);

      if (!hasOtherActiveTracking) {
        console.log(
          `[PageTracking] [${trackingId}] No other tracking instances - setting IDLE on cleanup`
        );
        setIdle();
      } else {
        console.log(
          `[PageTracking] [${trackingId}] Other tracking instances still active - skipping IDLE on cleanup`
        );
      }
    };
  }, [view, enabled]); // Only depend on view and enabled
}

/**
 * Helper to generate view names for common pages
 */
export const PageViews = {
  ORDERS_PAGE: 'Orders Page',
  ORDER_QUEUE: 'Order Queue',
  PICKING: (orderId: string) => `Picking Order ${orderId}`,
  DASHBOARD: 'Dashboard',
  PROFILE: 'Profile',
  SETTINGS: 'Settings',
  ITEM_SEARCH: 'Product Search',
  WAVE_PICKING: 'Wave Picking',
  ZONE_PICKING: 'Zone Picking',
  SLOTTING: 'Slotting',
} as const;
