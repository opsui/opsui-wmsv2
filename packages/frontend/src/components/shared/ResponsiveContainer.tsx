/**
 * ResponsiveContainer — Consistent responsive layout wrapper
 *
 * Provides a standardized container component with configurable behavior
 * for different responsive scenarios. Supports fluid, fixed, and constrained layouts.
 *
 * Features:
 * - Fluid width with optional max-width constraints
 * - Responsive padding using clamp() for smooth scaling
 * - Safe area inset support for notched devices
 * - Optional horizontal scroll containment
 * - Accessibility-friendly semantics
 */

import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ResponsiveContainerProps {
  /** Container content */
  children: ReactNode;
  /** Layout variant */
  variant?: 'fluid' | 'fixed' | 'constrained';
  /** Maximum width (only applies to 'constrained' variant) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' | 'none';
  /** Padding control */
  padding?: boolean | 'sm' | 'md' | 'lg';
  /** Enable horizontal scroll containment */
  scrollContain?: boolean;
  /** Add safe area insets for mobile devices */
  safeArea?: boolean;
  /** HTML tag to render */
  as?: 'div' | 'section' | 'article' | 'main' | 'aside';
  /** Additional CSS classes */
  className?: string;
  /** Optional ID for semantic HTML */
  id?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ResponsiveContainer = forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  (
    {
      children,
      variant = 'fluid',
      maxWidth = 'none',
      padding = true,
      scrollContain = false,
      safeArea = false,
      as = 'div',
      className,
      id,
      ...props
    },
    ref
  ) => {
    // Map maxWidth to Tailwind classes
    const maxWidthClasses: Record<string, string> = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      full: 'max-w-full',
      none: '',
    };

    // Map padding to responsive clamp values
    const paddingClasses: Record<string, string> = {
      true: 'px-responsive',
      sm: 'px-responsive-sm',
      md: 'px-responsive',
      lg: 'px-responsive-lg',
      false: '',
    };

    // Variant-specific classes
    const variantClasses: Record<string, string> = {
      fluid: 'w-full',
      fixed: 'w-full',
      constrained: cn('w-full mx-auto', maxWidth !== 'none' && maxWidthClasses[maxWidth]),
    };

    // Build complete class list
    const containerClasses = cn(
      // Base layout
      variantClasses[variant],
      // Padding
      paddingClasses[String(padding)],
      // Vertical padding with responsive scaling
      padding !== false && 'py-responsive',
      // Safe area insets for mobile
      safeArea && 'pb-[env(safe-area-inset-bottom,0px)]',
      // Scroll containment
      scrollContain && 'scroll-contain',
      // Additional classes
      className
    );

    // Render with the appropriate tag
    const sharedProps = { ref, id, className: containerClasses, ...props };
    if (as === 'div') return <div {...sharedProps}>{children}</div>;
    if (as === 'section') return <section {...sharedProps}>{children}</section>;
    if (as === 'article') return <article {...sharedProps}>{children}</article>;
    if (as === 'main') return <main {...sharedProps}>{children}</main>;
    if (as === 'aside') return <aside {...sharedProps}>{children}</aside>;
    return <div {...sharedProps}>{children}</div>;
  }
);

ResponsiveContainer.displayName = 'ResponsiveContainer';

// ============================================================================
// SPECIALIZED VARIANTS
// ============================================================================

/**
 * ResponsiveGrid — Grid container with responsive columns
 */
export interface ResponsiveGridProps {
  children: ReactNode;
  /** Number of columns at largest breakpoint */
  columns?: 1 | 2 | 3 | 4 | 'auto';
  /** Minimum column width in pixels */
  minColumnWidth?: number;
  /** Gap size */
  gap?: 'sm' | 'md' | 'lg';
  /** Enable dense packing for cards of varying sizes */
  dense?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const ResponsiveGrid = forwardRef<HTMLDivElement, ResponsiveGridProps>(
  (
    { children, columns = 'auto', minColumnWidth = 280, gap = 'md', dense = false, className },
    ref
  ) => {
    const gapClasses: Record<string, string> = {
      sm: 'gap-responsive-sm',
      md: 'gap-responsive',
      lg: 'gap-responsive-lg',
    };

    const gridClasses = cn(
      'grid',
      // Auto-fit with minmax for true responsiveness
      columns === 'auto' &&
        `grid-cols-[repeat(auto-fit,minmax(min(100%,${minColumnWidth}px),1fr))]`,
      // Specific column counts
      columns === 1 && 'grid-cols-1',
      columns === 2 && 'grid-cols-1 sm:grid-cols-2',
      columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      gapClasses[gap],
      dense && 'grid-dense',
      className
    );

    return (
      <div ref={ref} className={gridClasses}>
        {children}
      </div>
    );
  }
);

ResponsiveGrid.displayName = 'ResponsiveGrid';

/**
 * ResponsiveSection — Semantic section with responsive container
 */
export interface ResponsiveSectionProps {
  children: ReactNode;
  /** Section identifier */
  id?: string;
  /** Optional section heading */
  title?: string;
  /** Layout variant */
  variant?: 'fluid' | 'constrained';
  /** Maximum width (only for constrained variant) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  /** Padding control */
  padding?: boolean | 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export const ResponsiveSection = forwardRef<HTMLElement, ResponsiveSectionProps>(
  (
    { children, id, title, variant = 'constrained', maxWidth = 'xl', padding = 'lg', className },
    ref
  ) => {
    return (
      <section
        ref={ref}
        id={id}
        className={cn('w-full', padding !== false && 'py-responsive', className)}
      >
        {title && (
          <ResponsiveContainer variant={variant} maxWidth={maxWidth} padding={padding}>
            <h2 className="text-fluid-xl font-semibold mb-4">{title}</h2>
          </ResponsiveContainer>
        )}
        <ResponsiveContainer variant={variant} maxWidth={maxWidth} padding={padding}>
          {children}
        </ResponsiveContainer>
      </section>
    );
  }
);

ResponsiveSection.displayName = 'ResponsiveSection';

export default ResponsiveContainer;
