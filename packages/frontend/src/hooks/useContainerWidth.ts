/**
 * useContainerWidth - Hook to get container width using ResizeObserver
 *
 * Returns a ref to attach to the container and the current width.
 * This is useful for charts that need explicit numeric dimensions.
 */

import { useEffect, useRef, useState } from 'react';

export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const containerRef = useRef<T>(null);
  const [width, setWidth] = useState(0); // Start at 0 to indicate not yet measured
  const [isMeasured, setIsMeasured] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial measurement with requestAnimationFrame to ensure DOM is ready
    const updateWidth = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0) {
        setWidth(rect.width);
        setIsMeasured(true);
      }
    };

    // Use requestAnimationFrame to ensure layout is complete
    const rafId = requestAnimationFrame(() => {
      updateWidth();
    });

    // Use ResizeObserver for responsive updates
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: newWidth } = entry.contentRect;
        if (newWidth > 0) {
          setWidth(newWidth);
          setIsMeasured(true);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, []);

  // Return a stable width - if not measured yet, use a percentage-based fallback
  // This prevents the chart from rendering at wrong size initially
  return [containerRef, isMeasured ? width : 0];
}

export default useContainerWidth;
