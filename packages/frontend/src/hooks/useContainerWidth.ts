/**
 * useContainerWidth - Hook to get container width using ResizeObserver
 *
 * Returns a ref to attach to the container and the current width.
 * This is useful for charts that need explicit numeric dimensions.
 * Initializes with a fallback width so charts always render immediately.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setWidthDebounced = useCallback((newWidth: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (isMountedRef.current) setWidth(newWidth);
    }, 200);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const container = containerRef.current;

    // If no container, keep using fallback
    if (!container) return;

    // Measure and update width (immediate for initial mount, debounced for resize)
    const updateWidth = (debounce = false) => {
      if (!isMountedRef.current) return;
      const rect = container.getBoundingClientRect();
      if (rect.width > 0) {
        if (debounce) {
          setWidthDebounced(rect.width);
        } else {
          setWidth(rect.width);
        }
      }
    };

    // Initial measurement (immediate, no debounce)
    updateWidth(false);

    // Use ResizeObserver for responsive updates (debounced)
    let resizeObserver: ResizeObserver | null = null;
    try {
      resizeObserver = new ResizeObserver(entries => {
        if (!isMountedRef.current) return;
        for (const entry of entries) {
          const { width: newWidth } = entry.contentRect;
          if (newWidth > 0) {
            setWidthDebounced(newWidth);
          }
        }
      });
      resizeObserver.observe(container);
    } catch {
      // ResizeObserver not supported
    }

    // Window resize as backup (debounced)
    const handleWindowResize = () => updateWidth(true);
    window.addEventListener('resize', handleWindowResize);

    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [setWidthDebounced]);

  return [containerRef, width];
}

export default useContainerWidth;
