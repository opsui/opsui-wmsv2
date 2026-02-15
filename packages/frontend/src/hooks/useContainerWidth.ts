/**
 * useContainerWidth - Hook to get container width using ResizeObserver
 *
 * Returns a ref to attach to the container and the current width.
 * This is useful for charts that need explicit numeric dimensions.
 * Includes retry mechanism and fallback for mobile devices.
 */

import { useEffect, useRef, useState } from 'react';

export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const containerRef = useRef<T>(null);
  const [width, setWidth] = useState(0);

  // Use refs for cleanup tracking to prevent race conditions
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const hasGivenUpRef = useRef(false);

  const maxRetries = 15; // More retries for mobile
  const retryDelay = 50; // Base delay between retries

  useEffect(() => {
    isMountedRef.current = true;
    retryCountRef.current = 0;
    hasGivenUpRef.current = false;

    const container = containerRef.current;

    // Helper to get a reasonable fallback width
    const getFallbackWidth = (): number => {
      // Try to use window width with some padding
      if (typeof window !== 'undefined') {
        // Use 90% of viewport width, max 800px, with minimum 300px
        const viewportWidth = window.innerWidth;
        return Math.max(300, Math.min(800, viewportWidth * 0.9));
      }
      return 400; // Default fallback
    };

    // If container doesn't exist, use fallback immediately
    if (!container) {
      setWidth(getFallbackWidth());
      return;
    }

    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const attemptMeasurement = () => {
      if (!isMountedRef.current) return;

      const rect = container.getBoundingClientRect();

      if (rect.width > 0) {
        setWidth(rect.width);
        retryCountRef.current = 0;
        hasGivenUpRef.current = false;
      } else if (retryCountRef.current < maxRetries) {
        // Retry with exponential backoff
        retryCountRef.current++;
        const delay = retryDelay * Math.min(retryCountRef.current, 5);
        retryTimeoutId = setTimeout(attemptMeasurement, delay);
      } else if (!hasGivenUpRef.current) {
        // Give up and use fallback - but only once
        hasGivenUpRef.current = true;
        console.warn('[useContainerWidth] Container measurement failed, using fallback width');
        setWidth(getFallbackWidth());
      }
    };

    // Start measurement immediately
    attemptMeasurement();

    // Use ResizeObserver for responsive updates
    let resizeObserver: ResizeObserver | null = null;
    try {
      resizeObserver = new ResizeObserver(entries => {
        if (!isMountedRef.current) return;

        for (const entry of entries) {
          const { width: newWidth } = entry.contentRect;
          if (newWidth > 0) {
            setWidth(newWidth);
            retryCountRef.current = 0;
            hasGivenUpRef.current = false;
          }
        }
      });

      resizeObserver.observe(container);
    } catch {
      // ResizeObserver not supported
    }

    // Also listen for window resize as backup
    const handleWindowResize = () => {
      if (!isMountedRef.current) return;

      const rect = container.getBoundingClientRect();
      if (rect.width > 0) {
        setWidth(rect.width);
      } else if (hasGivenUpRef.current) {
        // Update fallback on resize
        setWidth(getFallbackWidth());
      }
    };

    window.addEventListener('resize', handleWindowResize);

    // Cleanup function
    return () => {
      isMountedRef.current = false;

      if (retryTimeoutId !== null) {
        clearTimeout(retryTimeoutId);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleWindowResize);

      // Reset state for next mount
      setWidth(0);
    };
  }, []);

  return [containerRef, width];
}

export default useContainerWidth;
