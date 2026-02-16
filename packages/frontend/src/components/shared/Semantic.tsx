/**
 * Semantic HTML Components
 *
 * Semantic wrapper components for better SEO and accessibility.
 * These components provide proper HTML5 semantic structure.
 */

import { forwardRef, HTMLAttributes } from 'react';

// ============================================================================
// MAIN CONTENT STRUCTURE
// ============================================================================

/**
 * Main content wrapper - should be used once per page
 * Maps to <main> element
 */
export interface MainContentProps extends HTMLAttributes<HTMLElement> {
  /** Skip to main content link target ID */
  id?: string;
}

export const MainContent = forwardRef<HTMLElement, MainContentProps>(
  ({ children, className = '', id = 'main-content', ...props }, ref) => {
    return (
      <main ref={ref} id={id} className={className} role="main" tabIndex={-1} {...props}>
        {children}
      </main>
    );
  }
);

MainContent.displayName = 'MainContent';

/**
 * Article component for self-contained content
 * Maps to <article> element
 */
export const Article = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <article ref={ref} className={className} {...props}>
        {children}
      </article>
    );
  }
);

Article.displayName = 'Article';

/**
 * Section component for thematic grouping
 * Maps to <section> element
 */
export const Section = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <section ref={ref} className={className} {...props}>
        {children}
      </section>
    );
  }
);

Section.displayName = 'Section';

/**
 * Aside component for tangentially related content
 * Maps to <aside> element
 */
export const Aside = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <aside ref={ref} className={className} {...props}>
        {children}
      </aside>
    );
  }
);

Aside.displayName = 'Aside';

// ============================================================================
// NAVIGATION
// ============================================================================

/**
 * Navigation component
 * Maps to <nav> element
 */
export interface NavigationProps extends HTMLAttributes<HTMLElement> {
  /** Accessible label for the navigation */
  'aria-label'?: string;
}

export const Navigation = forwardRef<HTMLElement, NavigationProps>(
  ({ children, className = '', 'aria-label': ariaLabel = 'Navigation', ...props }, ref) => {
    return (
      <nav ref={ref} className={className} aria-label={ariaLabel} {...props}>
        {children}
      </nav>
    );
  }
);

Navigation.displayName = 'Navigation';

// ============================================================================
// HEADERS AND FOOTERS
// ============================================================================

/**
 * Page header component
 * Maps to <header> element
 */
export const PageHeader = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <header ref={ref} className={className} {...props}>
        {children}
      </header>
    );
  }
);

PageHeader.displayName = 'PageHeader';

/**
 * Page footer component
 * Maps to <footer> element
 */
export const PageFooter = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <footer ref={ref} className={className} {...props}>
        {children}
      </footer>
    );
  }
);

PageFooter.displayName = 'PageFooter';

// ============================================================================
// FIGURES AND MEDIA
// ============================================================================

/**
 * Figure component for self-contained content like images, diagrams, code
 * Maps to <figure> element
 */
export interface FigureProps extends HTMLAttributes<HTMLElement> {
  /** Caption for the figure */
  caption?: string;
}

export const Figure = forwardRef<HTMLElement, FigureProps>(
  ({ children, caption, className = '', ...props }, ref) => {
    return (
      <figure ref={ref} className={className} {...props}>
        {children}
        {caption && <figcaption className="text-sm text-gray-500 mt-2">{caption}</figcaption>}
      </figure>
    );
  }
);

Figure.displayName = 'Figure';

// ============================================================================
// DATA AND TIME
// ============================================================================

/**
 * Time component for machine-readable dates/times
 * Maps to <time> element
 */
export interface TimeProps extends HTMLAttributes<HTMLTimeElement> {
  /** Machine-readable datetime */
  dateTime: string;
  /** Human-readable display text */
  display?: string;
}

export const Time = forwardRef<HTMLTimeElement, TimeProps>(
  ({ dateTime, display, children, className = '', ...props }, ref) => {
    return (
      <time ref={ref} dateTime={dateTime} className={className} {...props}>
        {display || children || dateTime}
      </time>
    );
  }
);

Time.displayName = 'Time';

// ============================================================================
// ADDRESS AND CONTACT
// ============================================================================

/**
 * Address component for contact information
 * Maps to <address> element
 */
export const Address = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <address ref={ref} className={`not-italic ${className}`} {...props}>
        {children}
      </address>
    );
  }
);

Address.displayName = 'Address';

// ============================================================================
// DETAILS AND SUMMARY
// ============================================================================

/**
 * Details component for expandable content
 * Maps to <details> element
 */
export interface DetailsProps extends HTMLAttributes<HTMLDetailsElement> {
  /** Whether the details are open */
  open?: boolean;
  /** Summary text */
  summary?: string;
}

export const Details = forwardRef<HTMLDetailsElement, DetailsProps>(
  ({ children, open = false, summary, className = '', ...props }, ref) => {
    return (
      <details ref={ref} open={open} className={className} {...props}>
        {summary && <summary className="cursor-pointer font-medium">{summary}</summary>}
        {children}
      </details>
    );
  }
);

Details.displayName = 'Details';

// ============================================================================
// MARK AND HIGHLIGHTS
// ============================================================================

/**
 * Mark component for highlighted text
 * Maps to <mark> element
 */
export const Mark = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <mark ref={ref} className={`bg-yellow-200 px-1 ${className}`} {...props}>
        {children}
      </mark>
    );
  }
);

Mark.displayName = 'Mark';

// ============================================================================
// CITE AND QUOTES
// ============================================================================

/**
 * Cite component for citations
 * Maps to <cite> element
 */
export const Cite = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <cite ref={ref} className={`italic ${className}`} {...props}>
        {children}
      </cite>
    );
  }
);

Cite.displayName = 'Cite';

/**
 * Blockquote component for extended quotations
 * Maps to <blockquote> element
 */
export interface BlockquoteProps extends HTMLAttributes<HTMLQuoteElement> {
  /** Source URL for the quote */
  cite?: string;
}

export const Blockquote = forwardRef<HTMLQuoteElement, BlockquoteProps>(
  ({ children, cite, className = '', ...props }, ref) => {
    return (
      <blockquote
        ref={ref}
        cite={cite}
        className={`border-l-4 border-gray-300 pl-4 italic ${className}`}
        {...props}
      >
        {children}
      </blockquote>
    );
  }
);

Blockquote.displayName = 'Blockquote';

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  MainContent,
  Article,
  Section,
  Aside,
  Navigation,
  PageHeader,
  PageFooter,
  Figure,
  Time,
  Address,
  Details,
  Mark,
  Cite,
  Blockquote,
};
