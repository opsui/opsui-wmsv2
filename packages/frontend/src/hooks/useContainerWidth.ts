/**
 * useContainerWidth - Hook to get container width using ResizeObserver
 *
 * Returns a ref to attach to the container and the current width.
 * This is useful for charts that need explicit numeric dimensions.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const containerRef = useRef<T>(null);
  const [width, setWidth] = useState(300); // Default width

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial measurement
    const updateWidth = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0) {
        setWidth(rect.width);
      }
    };

    updateWidth();

    // Use ResizeObserver for responsive updates
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: newWidth } = entry.contentRect;
        if (newWidth > 0) {
          setWidth(newWidth);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return [containerRef, width];
}

export default useContainerWidth;
