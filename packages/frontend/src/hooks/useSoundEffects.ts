/**
 * useSoundEffects hook
 *
 * Provides hover and click sound effects for interactive elements
 * Integrates with the global sound system in uiStore
 */

import { useCallback, useMemo } from 'react';
import { playSound, useUIStore } from '@/stores';

export interface SoundEffectOptions {
  /** Enable hover sound (default: true) */
  hover?: boolean;
  /** Enable click sound (default: true) */
  click?: boolean;
  /** Disable all sounds (overrides hover/click) */
  disabled?: boolean;
}

export interface SoundEffectHandlers {
  /** Attach to onMouseEnter for hover sounds */
  onMouseEnter: () => void;
  /** Attach to onTouchStart for mobile feedback */
  onTouchStart: () => void;
  /** Call this in your onClick handler for click sounds */
  playClickSound: () => void;
}

/**
 * Hook for adding sound effects to interactive elements
 *
 * @example
 * ```tsx
 * const soundHandlers = useSoundEffects({ hover: true, click: true });
 *
 * <button
 *   onMouseEnter={soundHandlers.onMouseEnter}
 *   onClick={() => {
 *     soundHandlers.playClickSound();
 *     // your click logic
 *   }}
 * >
 *   Click me
 * </button>
 * ```
 */
export function useSoundEffects(options: SoundEffectOptions = {}): SoundEffectHandlers {
  const { hover = true, click = true, disabled = false } = options;
  const soundEnabled = useUIStore(state => state.soundEnabled);

  const onMouseEnter = useCallback(() => {
    if (disabled || !soundEnabled || !hover) return;
    playSound('hover');
  }, [disabled, soundEnabled, hover]);

  const onTouchStart = useCallback(() => {
    if (disabled || !soundEnabled || !click) return;
    // On mobile, play click sound on touch for immediate feedback
    playSound('click');
  }, [disabled, soundEnabled, click]);

  const playClickSound = useCallback(() => {
    if (disabled || !soundEnabled || !click) return;
    playSound('click');
  }, [disabled, soundEnabled, click]);

  return useMemo(
    () => ({
      onMouseEnter,
      onTouchStart,
      playClickSound,
    }),
    [onMouseEnter, onTouchStart, playClickSound]
  );
}

/**
 * Hook for playing success/error sounds (useful for scan feedback)
 *
 * @example
 * ```tsx
 * const { playSuccess, playError } = useFeedbackSounds();
 *
 * if (scanSuccessful) {
 *   playSuccess();
 * } else {
 *   playError();
 * }
 * ```
 */
export function useFeedbackSounds() {
  const soundEnabled = useUIStore(state => state.soundEnabled);

  const playSuccess = useCallback(() => {
    if (!soundEnabled) return;
    playSound('success');
  }, [soundEnabled]);

  const playError = useCallback(() => {
    if (!soundEnabled) return;
    playSound('error');
  }, [soundEnabled]);

  const playWarning = useCallback(() => {
    if (!soundEnabled) return;
    playSound('warning');
  }, [soundEnabled]);

  const playInfo = useCallback(() => {
    if (!soundEnabled) return;
    playSound('info');
  }, [soundEnabled]);

  return useMemo(
    () => ({
      playSuccess,
      playError,
      playWarning,
      playInfo,
    }),
    [playSuccess, playError, playWarning, playInfo]
  );
}
