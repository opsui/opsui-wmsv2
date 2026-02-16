/**
 * PageHead Component
 *
 * Semantic page heading component for proper heading hierarchy.
 * Ensures proper H1 usage and heading structure for SEO.
 */

import { forwardRef } from 'react';

export interface PageHeadProps {
  /** Page title (renders as H1) */
  title: string;
  /** Optional subtitle/description */
  description?: string;
  /** Optional breadcrumbs for context */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Optional actions to render in the header */
  actions?: React.ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

/**
 * PageHead component for semantic page headings
 *
 * @example
 * ```tsx
 * function DashboardPage() {
 *   return (
 *     <div>
 *       <PageHead
 *         title="Dashboard"
 *         description="Real-time overview of your warehouse operations"
 *         actions={<Button>Refresh</Button>}
 *       />
 *       <PageContent />
 *     </div>
 *   );
 * }
 * ```
 */
export const PageHead = forwardRef<HTMLDivElement, PageHeadProps>(
  ({ title, description, breadcrumbs, actions, size = 'md', className = '' }, ref) => {
    const sizeClasses = {
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
    };

    return (
      <header ref={ref} className={`mb-6 ${className}`}>
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2">/</span>}
                  {crumb.href ? (
                    <a href={crumb.href} className="hover:text-primary-600 transition-colors">
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-gray-700">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Title and Actions Row */}
        <div className="flex items-center justify-between gap-4">
          <h1 className={`font-semibold text-gray-900 dark:text-gray-100 ${sizeClasses[size]}`}>
            {title}
          </h1>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        {/* Description */}
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </header>
    );
  }
);

PageHead.displayName = 'PageHead';

/**
 * SectionHead component for section headings (H2)
 */
export interface SectionHeadProps {
  /** Section title (renders as H2) */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional actions */
  actions?: React.ReactNode;
  /** Additional className */
  className?: string;
  /** ID for anchor links */
  id?: string;
}

export const SectionHead = forwardRef<HTMLDivElement, SectionHeadProps>(
  ({ title, description, actions, className = '', id }, ref) => {
    return (
      <div ref={ref} className={`mb-4 ${className}`}>
        <div className="flex items-center justify-between gap-4">
          <h2 id={id} className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
    );
  }
);

SectionHead.displayName = 'SectionHead';

/**
 * SubSectionHead component for subsection headings (H3)
 */
export interface SubSectionHeadProps {
  /** Subsection title (renders as H3) */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional actions */
  actions?: React.ReactNode;
  /** Additional className */
  className?: string;
  /** ID for anchor links */
  id?: string;
}

export const SubSectionHead = forwardRef<HTMLDivElement, SubSectionHeadProps>(
  ({ title, description, actions, className = '', id }, ref) => {
    return (
      <div ref={ref} className={`mb-3 ${className}`}>
        <div className="flex items-center justify-between gap-4">
          <h3 id={id} className="text-base font-medium text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
    );
  }
);

SubSectionHead.displayName = 'SubSectionHead';

export default PageHead;
