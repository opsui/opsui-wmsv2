/**
 * UI store using Zustand
 *
 * Manages UI state that doesn't need to be on the server
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

type SoundEnabled = boolean;
type Theme = 'light' | 'dark' | 'auto';

interface UIState {
  // Sound settings
  soundEnabled: SoundEnabled;
  setSoundEnabled: (enabled: SoundEnabled) => void;
  toggleSound: () => void;

  // Theme settings
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Scan input focus
  scanInputFocused: boolean;
  setScanInputFocused: (focused: boolean) => void;

  // Notification state
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>;
  addNotification: (notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Loading state for various operations
  loadingStates: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      soundEnabled: true,
      theme: 'auto',
      sidebarOpen: true,
      scanInputFocused: false,
      notifications: [],
      loadingStates: {},

      // Sound actions
      setSoundEnabled: (enabled: SoundEnabled) => {
        set({ soundEnabled: enabled });
      },
      toggleSound: () => {
        set(state => ({ soundEnabled: !state.soundEnabled }));
      },

      // Theme actions
      setTheme: (theme: Theme) => {
        set({ theme });
      },

      // Sidebar actions
      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },
      toggleSidebar: () => {
        set(state => ({ sidebarOpen: !state.sidebarOpen }));
      },

      // Scan input focus
      setScanInputFocused: (focused: boolean) => {
        set({ scanInputFocused: focused });
      },

      // Notification actions
      addNotification: notification => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set(state => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id,
              timestamp: Date.now(),
            },
          ],
        }));

        // Auto-remove after 5 seconds
        setTimeout(() => {
          get().removeNotification(id);
        }, 5000);
      },
      removeNotification: (id: string) => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id),
        }));
      },
      clearNotifications: () => {
        set({ notifications: [] });
      },

      // Loading state actions
      setLoading: (key: string, loading: boolean) => {
        set(state => ({
          loadingStates: {
            ...state.loadingStates,
            [key]: loading,
          },
        }));
      },
    }),
    {
      name: 'wms-ui-storage',
      // Only persist these fields
      partialize: state => ({
        soundEnabled: state.soundEnabled,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectSoundEnabled = (state: UIState) => state.soundEnabled;
export const selectTheme = (state: UIState) => state.theme;
export const selectSidebarOpen = (state: UIState) => state.sidebarOpen;
export const selectNotifications = (state: UIState) => state.notifications;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Play a sound notification
 * Uses clean, Apple-like sounds with proper envelopes and harmonics
 */
export function playSound(type: 'success' | 'error' | 'warning' | 'info'): void {
  const soundEnabled = useUIStore.getState().soundEnabled;
  if (!soundEnabled) return;

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const currentTime = audioContext.currentTime;

  // Create gain node for envelope shaping
  const masterGain = audioContext.createGain();
  masterGain.connect(audioContext.destination);

  switch (type) {
    case 'success':
      // Clean, pleasant "ding" - like macOS notification
      // Primary tone
      createTone(audioContext, masterGain, 783.99, 'sine', 0, 0.15, 0.15); // G5
      // Harmonic for brightness
      createTone(audioContext, masterGain, 1567.98, 'sine', 0, 0.1, 0.1); // G6
      masterGain.gain.setValueAtTime(0.08, currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.3);
      break;

    case 'error':
      // Clean, low "thud" - gentle but clear error sound
      createTone(audioContext, masterGain, 196.0, 'sine', 0, 0.2, 0.15); // G3
      createTone(audioContext, masterGain, 156.8, 'triangle', 0, 0.15, 0.1); // Eb3
      masterGain.gain.setValueAtTime(0.1, currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.25);
      break;

    case 'warning':
      // Clean "chirp" - attention-getting but pleasant
      createTone(audioContext, masterGain, 659.25, 'sine', 0, 0.08, 0.08); // E5
      createTone(audioContext, masterGain, 783.99, 'sine', 0.08, 0.08, 0.08); // G5
      masterGain.gain.setValueAtTime(0.06, currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.2);
      break;

    case 'info':
      // Subtle "pop" - like iOS UI sounds
      createTone(audioContext, masterGain, 880.0, 'sine', 0, 0.05, 0.05); // A5
      masterGain.gain.setValueAtTime(0.05, currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.1);
      break;
  }

  // Clean up
  setTimeout(() => {
    masterGain.disconnect();
    audioContext.close();
  }, 400);
}

/**
 * Helper function to create a tone with proper envelope
 */
function createTone(
  audioContext: AudioContext,
  output: AudioNode,
  frequency: number,
  type: OscillatorType,
  startTime: number,
  attackTime: number,
  releaseTime: number
): void {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(output);

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  const currentTime = audioContext.currentTime;
  const attackEnd = currentTime + startTime + attackTime;
  const releaseEnd = attackEnd + releaseTime;

  // ADSR envelope for smooth, natural sound
  gainNode.gain.setValueAtTime(0, currentTime + startTime);
  gainNode.gain.linearRampToValueAtTime(0.3, attackEnd);
  gainNode.gain.exponentialRampToValueAtTime(0.001, releaseEnd);

  oscillator.start(currentTime + startTime);
  oscillator.stop(releaseEnd);

  // Clean up
  setTimeout(
    () => {
      gainNode.disconnect();
      oscillator.disconnect();
    },
    (releaseEnd - currentTime) * 1000 + 100
  );
}

/**
 * Show a notification
 */
export function showNotification(
  type: 'success' | 'error' | 'warning' | 'info',
  message: string
): void {
  useUIStore.getState().addNotification({ type, message });
  playSound(type);
}

/**
 * Show success notification
 */
export function showSuccess(message: string): void {
  showNotification('success', message);
}

/**
 * Show error notification
 */
export function showError(message: string): void {
  showNotification('error', message);
}

/**
 * Show warning notification
 */
export function showWarning(message: string): void {
  showNotification('warning', message);
}

/**
 * Show info notification
 */
export function showInfo(message: string): void {
  showNotification('info', message);
}
