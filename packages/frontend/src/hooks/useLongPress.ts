/**
 * useLongPress - Long press gesture detection hook for mobile
 *
 * Detects long press gestures with haptic feedback support.
 * Useful for context menus, delete actions, etc.
 *
 * @example
 * const longPressHandlers = useLongPress({
 *   onLongPress: () => showContextMenu(),
 *   duration: 500,
 * });
 *
 * return <button {...longPressHandlers}>Hold me</button>;
 */

import { useCallback, useRef, useState } from 'react';

export interface LongPressConfig {
  /** Duration in ms to trigger long press (default: 500) */
  duration?: number;
  /** Callback when long press is triggered */
  onLongPress?: (event: React.MouseEvent | React.TouchEvent) => void;
  /** Callback when press starts */
  onPressStart?: (event: React.MouseEvent | React.TouchEvent) => void;
  /** Callback when press ends (before long press triggers) */
  onPressEnd?: (event: React.MouseEvent | React.TouchEvent) => void;
  /** Callback for long press progress (0-1) */
  onProgress?: (progress: number) => void;
  /** Enable haptic feedback on long press (default: true) */
  hapticFeedback?: boolean;
  /** Enable/disable long press detection */
  enabled?: boolean;
  /** Prevent context menu on mobile */
  preventContextMenu?: boolean;
}

export interface LongPressHandlers {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export interface LongPressState {
  /** Whether a long press is in progress */
  isPressed: boolean;
  /** Whether the long press has triggered */
  isLongPressTriggered: boolean;
  /** Progress towards long press (0-1) */
  progress: number;
}

export function useLongPress(config: LongPressConfig = {}): LongPressHandlers & LongPressState {
  const {
    duration = 500,
    onLongPress,
    onPressStart,
    onPressEnd,
    onProgress,
    hapticFeedback = true,
    enabled = true,
    preventContextMenu = true,
  } = config;

  const [state, setState] = useState<LongPressState>({
    isPressed: false,
    isLongPressTriggered: false,
    progress: 0,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const triggerHaptic = useCallback(() => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [hapticFeedback]);

  const startPress = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!enabled) return;

      onPressStart?.(event);

      startTimeRef.current = Date.now();
      setState({
        isPressed: true,
        isLongPressTriggered: false,
        progress: 0,
      });

      // Start progress tracking
      const progressStep = 50; // Update every 50ms
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        onProgress?.(progress);
        setState(prev => ({ ...prev, progress }));
      }, progressStep);

      // Set long press timeout
      timeoutRef.current = setTimeout(() => {
        clearTimers();
        triggerHaptic();
        onLongPress?.(event);
        setState({
          isPressed: false,
          isLongPressTriggered: true,
          progress: 1,
        });
      }, duration);
    },
    [enabled, onPressStart, onProgress, onLongPress, duration, clearTimers, triggerHaptic]
  );

  const endPress = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      clearTimers();

      setState(prev => {
        // Only call onPressEnd if we haven't triggered long press
        if (!prev.isLongPressTriggered && prev.isPressed) {
          onPressEnd?.(event);
        }
        return {
          isPressed: false,
          isLongPressTriggered: false,
          progress: 0,
        };
      });
    },
    [clearTimers, onPressEnd]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only respond to left click
      if (e.button !== 0) return;
      startPress(e);
    },
    [startPress]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      endPress(e);
    },
    [endPress]
  );

  const onMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      if (state.isPressed) {
        clearTimers();
        setState({
          isPressed: false,
          isLongPressTriggered: false,
          progress: 0,
        });
      }
    },
    [state.isPressed, clearTimers]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      startPress(e);
    },
    [startPress]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      endPress(e);
    },
    [endPress]
  );

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (preventContextMenu) {
        e.preventDefault();
      }
    },
    [preventContextMenu]
  );

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    onContextMenu,
    ...state,
  };
}

export default useLongPress;
