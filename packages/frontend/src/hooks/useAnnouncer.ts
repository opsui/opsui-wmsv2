/**
 * useAnnouncer - Screen reader announcement hook
 *
 * Provides a way to announce dynamic content changes to screen readers
 * using ARIA live regions. Follows WCAG 2.1 live region guidelines.
 *
 * @example
 * const { announce } = useAnnouncer();
 *
 * // Announce status change
 * announce('Order submitted successfully');
 *
 * // Announce error (assertive - interrupts current speech)
 * announce('Error: Please fill in all required fields', 'assertive');
 */

import { useCallback, useRef } from 'react';

type AnnouncementPriority = 'polite' | 'assertive' | 'off';

interface AnnouncerOptions {
  /** Default priority for announcements */
  defaultPriority?: AnnouncementPriority;
  /** Delay between announcements in ms (prevents screen readers from dropping messages) */
  delay?: number;
}

interface AnnouncerReturn {
  /** Announce a message to screen readers */
  announce: (message: string, priority?: AnnouncementPriority) => void;
  /** Clear any pending announcements */
  clear: () => void;
}

// Global announcer element to avoid creating multiple live regions
let globalAnnouncerElement: HTMLDivElement | null = null;

function getOrCreateAnnouncer(): HTMLDivElement {
  if (globalAnnouncerElement && document.body.contains(globalAnnouncerElement)) {
    return globalAnnouncerElement;
  }

  // Create a visually hidden live region
  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');

  // Visually hidden but accessible to screen readers
  announcer.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;

  document.body.appendChild(announcer);
  globalAnnouncerElement = announcer;

  return announcer;
}

export function useAnnouncer(options: AnnouncerOptions = {}): AnnouncerReturn {
  const { defaultPriority = 'polite', delay = 150 } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousMessageRef = useRef<string>('');

  const announce = useCallback(
    (message: string, priority: AnnouncementPriority = defaultPriority) => {
      // Clear any pending announcement
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // If same message, add a space to force re-announcement
      const messageToAnnounce =
        previousMessageRef.current === message ? `${message} ` : message;
      previousMessageRef.current = message;

      // Delay slightly to ensure screen reader catches the change
      timeoutRef.current = setTimeout(() => {
        const announcer = getOrCreateAnnouncer();

        // Update aria-live attribute based on priority
        announcer.setAttribute('aria-live', priority);

        // Clear then set message (helps some screen readers announce changes)
        announcer.textContent = '';
        announcer.textContent = messageToAnnounce;
      }, delay);
    },
    [defaultPriority, delay]
  );

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const announcer = globalAnnouncerElement;
    if (announcer) {
      announcer.textContent = '';
    }

    previousMessageRef.current = '';
  }, []);

  return { announce, clear };
}

/**
 * Announce immediately without hook (useful for utility functions)
 */
export function announceGlobal(message: string, priority: AnnouncementPriority = 'polite'): void {
  const announcer = getOrCreateAnnouncer();
  announcer.setAttribute('aria-live', priority);
  announcer.textContent = '';
  announcer.textContent = message;
}

export default useAnnouncer;
