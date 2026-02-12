/**
 * useFocusTrap - Focus trap hook for modals and dialogs
 *
 * Traps keyboard focus within a container element (like a modal),
 * ensuring keyboard users can't accidentally navigate outside.
 * Follows WCAG 2.1 focus management guidelines.
 *
 * @example
 * const { containerRef, activate, deactivate } = useFocusTrap(isOpen);
 *
 * return (
 *   <div ref={containerRef} role="dialog" aria-modal="true">
 *     <button>Focus stays here</button>
 *   </div>
 * );
 */

import { useCallback, useEffect, useRef } from 'react';

interface FocusTrapOptions {
  /** Whether the focus trap is active */
  active?: boolean;
  /** Whether to autofocus the first focusable element when activated */
  autoFocus?: boolean;
  /** Selector for elements that should receive initial focus */
  initialFocusSelector?: string;
  /** Callback when escape key is pressed */
  onEscape?: () => void;
  /** Whether to restore focus to the previously focused element on deactivation */
  restoreFocus?: boolean;
}

interface FocusTrapReturn {
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Manually activate the focus trap */
  activate: () => void;
  /** Manually deactivate the focus trap */
  deactivate: () => void;
}

// Elements that can receive keyboard focus
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
]
  .map((s) => `${s}:not([inert])`)
  .join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null && !el.hasAttribute('aria-hidden')
  );
}

export function useFocusTrap(options: FocusTrapOptions = {}): FocusTrapReturn {
  const {
    active = true,
    autoFocus = true,
    initialFocusSelector,
    onEscape,
    restoreFocus = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isActiveRef = useRef(false);

  const activate = useCallback(() => {
    if (!containerRef.current || isActiveRef.current) return;

    // Store the currently focused element to restore later
    previousFocusRef.current = document.activeElement as HTMLElement;

    isActiveRef.current = true;

    if (autoFocus) {
      // Use timeout to ensure element is rendered
      setTimeout(() => {
        if (!containerRef.current) return;

        let elementToFocus: HTMLElement | null = null;

        // Try to find element matching initial focus selector
        if (initialFocusSelector) {
          elementToFocus = containerRef.current.querySelector<HTMLElement>(initialFocusSelector);
        }

        // Fall back to first focusable element
        if (!elementToFocus) {
          const focusableElements = getFocusableElements(containerRef.current);
          elementToFocus = focusableElements[0];
        }

        elementToFocus?.focus();
      }, 0);
    }
  }, [autoFocus, initialFocusSelector]);

  const deactivate = useCallback(() => {
    if (!isActiveRef.current) return;

    isActiveRef.current = false;

    // Restore focus to the previously focused element
    if (restoreFocus && previousFocusRef.current) {
      setTimeout(() => {
        previousFocusRef.current?.focus();
        previousFocusRef.current = null;
      }, 0);
    }
  }, [restoreFocus]);

  // Handle keyboard events
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isActiveRef.current || !containerRef.current) return;

      // Handle escape key
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      // Handle tab key for focus trapping
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements(containerRef.current);

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift+Tab: go to last element if on first
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: go to first element if on last
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onEscape]);

  // Activate/deactivate based on active prop
  useEffect(() => {
    if (active) {
      activate();
    } else {
      deactivate();
    }
  }, [active, activate, deactivate]);

  return {
    containerRef,
    activate,
    deactivate,
  };
}

export default useFocusTrap;
