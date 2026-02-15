/**
 * useContainerWidth - Hook to get container width using ResizeObserver
 *
 * Returns a ref to attach to the container and the current width.
 * This is useful for charts that need explicit numeric dimensions.
 * Includes retry mechanism for mobile devices where layout may be delayed.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const containerRef = useRef<T>(null);
  const [width, setWidth] = useState(0);

  // Use refs for cleanup tracking to prevent race conditions
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const measurementInProgressRef = useRef(false);

  const maxRetries = 10;

  useEffect(() => {
    isMountedRef.current = true;
    retryCountRef.current = 0;
    measurementInProgressRef.current = false;

    const container = containerRef.current;
    if (!container) return;

    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let rafId: number | null = null;

    const updateWidth = useCallback(() => {
      if (!isMountedRef.current) return false;

      const rect = container.getBoundingClientRect();
      if (rect.width > 0) {
        setWidth(rect.width);
        retryCountRef.current = 0;
        measurementInProgressRef.current = false;
        return true;
      }
      return false;
    }, [container]);

    const attemptMeasurement = useCallback(() => {
      if (!isMountedRef.current || measurementInProgressRef.current) return;

      measurementInProgressRef.current = true;
      const success = updateWidth();

      if (!success && retryCountRef.current < maxRetries && isMountedRef.current) {
        retryCountRef.current++;
        measurementInProgressRef.current = false;

        // Stagger retries: use timeout every 3rd attempt for mobile reliability
        if (retryCountRef.current % 3 === 0) {
          retryTimeoutId = setTimeout(() => {
            if (isMountedRef.current) {
              rafId = requestAnimationFrame(attemptMeasurement);
            }
          }, 100);
        } else {
          rafId = requestAnimationFrame(attemptMeasurement);
        }
      } else {
        measurementInProgressRef.current = false;
      }
    }, [updateWidth]);

    // Start measurement after a small delay to allow layout to settle
    rafId = requestAnimationFrame(() => {
      if (isMountedRef.current) {
        attemptMeasurement();
      }
    });

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
          }
        }
      });

      resizeObserver.observe(container);
    } catch {
      // ResizeObserver not supported, fall back to window resize
      console.warn('ResizeObserver not supported');
    }

    // Cleanup function
    return () => {
      isMountedRef.current = false;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (retryTimeoutId !== null) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }

      // Reset width on unmount to ensure fresh measurement on remount
      setWidth(0);
    };
  }, []); // Empty deps - only run once per mount

  return [containerRef, width];
}

export default useContainerWidth;
