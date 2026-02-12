/**
 * SkipLink - Skip to main content link for keyboard navigation
 *
 * Allows keyboard users to bypass navigation and jump directly
 * to the main content. Required for WCAG 2.1 compliance.
 *
 * @example
 * <SkipLink />
 * <Header />
 * <main id="main-content">
 *   <h1>Page content</h1>
 * </main>
 */

import React from 'react';

interface SkipLinkProps {
  /** The ID of the main content element to skip to */
  targetId?: string;
  /** Custom label for the skip link */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

export function SkipLink({
  targetId = 'main-content',
  label = 'Skip to main content',
  className = '',
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);

    if (target) {
      // Make the target focusable if it isn't already
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }

      // Focus the target element
      target.focus();

      // Update URL hash without scrolling
      if (history.pushState) {
        history.pushState(null, '', `#${targetId}`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const target = document.getElementById(targetId);

      if (target) {
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
        }
        target.focus();
      }
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        skip-link
        fixed top-4 left-4 z-[9999]
        px-4 py-2
        bg-primary-600 text-white
        rounded-lg shadow-lg
        font-medium text-sm
        no-underline
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600
        ${className}
      `.trim()}
    >
      {label}
    </a>
  );
}

export default SkipLink;
