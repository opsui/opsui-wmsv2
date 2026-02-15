/**
 * useContainerWidth - Hook to get container width using ResizeObserver
 *
 * Returns a ref to attach to the container and the current width.
 * This is useful for charts that need explicit numeric dimensions.
 * Initializes with a fallback width so charts always render immediately.
 */

import { useEffect, useRef, useState } from 'react';

/**
 * Get a fallback width based on viewport size
 */
function getFallbackWidth(): number {
  if (typeof window !== 'undefined') {
    const viewportWidth = window.innerWidth;
    // Use 90% of viewport width, clamped between 300-800px
    return Math.max(300, Math.min(800, viewportWidth * 0.9));
  }
  return 400;
}

export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const containerRef = useRef<T>(null);
  // Initialize with fallback immediately so charts always render
  const [width, setWidth] = useState(getFallbackWidth);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const container = containerRef.current;

    // If no container, keep using fallback
    if (!container) return;

    // Measure and update width
    const updateWidth = () => {
      if (!isMountedRef.current) return;
      const rect = container.getBoundingClientRect();
      if (rect.width > 0) {
        setWidth(rect.width);
      }
    };

    // Initial measurement
    updateWidth();

    // Use ResizeObserver for responsive updates
    let resizeObserver: ResizeObserver | null = null;
    try {
      resizeObserver = new ResizeObserver(entries => {
        if (!isMountedRef.current) return;
        for (const entry of entries) {
          const { width: newWidth } = entry.contentRect;
          if (newWidth > 0) {
            setWidth(newWidth);
          }
        }
      });
      resizeObserver.observe(container);
    } catch {
      // ResizeObserver not supported
    }

    // Window resize as backup
    const handleWindowResize = () => {
      if (!isMountedRef.current) return;
      updateWidth();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      isMountedRef.current = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  return [containerRef, width];
}

export default useContainerWidth;
