/**
 * useContainerWidth - Hook to get container width using ResizeObserver
 *
 * Returns a ref to attach to the container and the current width.
 * This is useful for charts that need explicit numeric dimensions.
 * Includes retry mechanism for mobile devices where layout may be delayed.
 */

import { useEffect, useRef, useState } from 'react';

export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const containerRef = useRef<T>(null);
  const [width, setWidth] = useState(0);
  const retryCountRef = useRef(0);
  const maxRetries = 10; // Retry up to 10 times (with 100ms between retries = 1 second max)

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let rafId: number | null = null;

    const updateWidth = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0) {
        setWidth(rect.width);
        retryCountRef.current = 0; // Reset retry count on success
        return true;
      }
      return false;
    };

    const attemptMeasurement = () => {
      const success = updateWidth();

      // If measurement failed and we haven't exhausted retries, try again
      if (!success && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        // Use a combination of rAF and timeout for mobile reliability
        if (retryCountRef.current % 3 === 0) {
          // Every 3rd attempt, use a timeout to allow more time for layout
          retryTimeoutId = setTimeout(() => {
            rafId = requestAnimationFrame(attemptMeasurement);
          }, 100);
        } else {
          rafId = requestAnimationFrame(attemptMeasurement);
        }
      }
    };

    // Start measurement process
    rafId = requestAnimationFrame(attemptMeasurement);

    // Use ResizeObserver for responsive updates
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: newWidth } = entry.contentRect;
        if (newWidth > 0) {
          setWidth(newWidth);
          retryCountRef.current = 0;
        }
      }
    });

    resizeObserver.observe(container);

    // Also observe parent elements for size changes (helps with nested containers)
    let parentObserver: ResizeObserver | null = null;
    const parent = container.parentElement;
    if (parent) {
      parentObserver = new ResizeObserver(() => {
        // When parent resizes, re-measure our container
        updateWidth();
      });
      parentObserver.observe(parent);
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (retryTimeoutId !== null) {
        clearTimeout(retryTimeoutId);
      }
      resizeObserver.disconnect();
      if (parentObserver) {
        parentObserver.disconnect();
      }
    };
  }, []);

  return [containerRef, width];
}

export default useContainerWidth;
