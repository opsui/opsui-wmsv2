/**
 * useSwipe - Swipe gesture detection hook for mobile
 *
 * Detects swipe gestures on touch-enabled devices with configurable
 * thresholds and direction callbacks.
 *
 * @example
 * const swipeHandlers = useSwipe({
 *   onSwipeLeft: () => nextSlide(),
 *   onSwipeRight: () => prevSlide(),
 *   threshold: 50,
 * });
 *
 * return <div {...swipeHandlers}>Swipe me</div>;
 */

import { useCallback, useRef, useState } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeConfig {
  /** Minimum distance in pixels to trigger swipe (default: 50) */
  threshold?: number;
  /** Maximum time in ms for swipe (default: 300) */
  maxDuration?: number;
  /** Callback for left swipe */
  onSwipeLeft?: () => void;
  /** Callback for right swipe */
  onSwipeRight?: () => void;
  /** Callback for up swipe */
  onSwipeUp?: () => void;
  /** Callback for down swipe */
  onSwipeDown?: () => void;
  /** Callback for any swipe, receives direction */
  onSwipe?: (direction: SwipeDirection) => void;
  /** Prevent default touch behavior */
  preventDefault?: boolean;
  /** Enable/disable swipe detection */
  enabled?: boolean;
}

export interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export interface SwipeState {
  /** Current swipe direction (null if not swiping) */
  direction: SwipeDirection | null;
  /** Horizontal distance of current swipe */
  deltaX: number;
  /** Vertical distance of current swipe */
  deltaY: number;
  /** Whether a swipe is in progress */
  isSwiping: boolean;
}

export function useSwipe(config: SwipeConfig = {}): SwipeHandlers & SwipeState {
  const {
    threshold = 50,
    maxDuration = 300,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipe,
    preventDefault = false,
    enabled = true,
  } = config;

  const [state, setState] = useState<SwipeState>({
    direction: null,
    deltaX: 0,
    deltaY: 0,
    isSwiping: false,
  });

  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      setState({
        direction: null,
        deltaX: 0,
        deltaY: 0,
        isSwiping: false,
      });
    },
    [enabled]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !touchStartRef.current) return;

      if (preventDefault) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Determine direction based on larger delta
      let direction: SwipeDirection | null = null;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > threshold) {
          direction = deltaX > 0 ? 'right' : 'left';
        }
      } else {
        if (Math.abs(deltaY) > threshold) {
          direction = deltaY > 0 ? 'down' : 'up';
        }
      }

      setState({
        direction,
        deltaX,
        deltaY,
        isSwiping: true,
      });
    },
    [enabled, preventDefault, threshold]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !touchStartRef.current) return;

      const { deltaX, deltaY } = state;
      const duration = Date.now() - touchStartRef.current.time;

      // Check if it was a valid swipe
      if (duration <= maxDuration) {
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
          // Horizontal swipe
          if (deltaX > 0) {
            onSwipeRight?.();
            onSwipe?.('right');
          } else {
            onSwipeLeft?.();
            onSwipe?.('left');
          }
        } else if (Math.abs(deltaY) > threshold) {
          // Vertical swipe
          if (deltaY > 0) {
            onSwipeDown?.();
            onSwipe?.('down');
          } else {
            onSwipeUp?.();
            onSwipe?.('up');
          }
        }
      }

      touchStartRef.current = null;
      setState({
        direction: null,
        deltaX: 0,
        deltaY: 0,
        isSwiping: false,
      });
    },
    [enabled, state, maxDuration, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipe]
  );

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    ...state,
  };
}

export default useSwipe;
