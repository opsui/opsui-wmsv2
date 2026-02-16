/**
 * SEO Component
 *
 * Declarative SEO component for use in React pages.
 * Handles meta tags, Open Graph, Twitter Cards, and structured data.
 */

import {
  addStructuredData,
  applySEOConfig,
  applySEOForRoute,
  generateBreadcrumbSchema,
  removeStructuredData,
  SEOConfig,
  StructuredData,
} from '@/utils/seo';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface SEOProps extends Partial<SEOConfig> {
  /** Skip automatic route-based SEO */
  skipAutoSEO?: boolean;
  /** Additional structured data to add */
  structuredData?: StructuredData | StructuredData[];
  /** Breadcrumb items for structured data */
  breadcrumbs?: Array<{ name: string; url: string }>;
  /** Children (optional, for composition) */
  children?: React.ReactNode;
}

/**
 * SEO component for declarative meta tag management
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   return (
 *     <>
 *       <SEO
 *         title="Custom Page Title"
 *         description="Custom page description"
 *         keywords={['custom', 'page']}
 *       />
 *       <div>Page content</div>
 *     </>
 *   );
 * }
 * ```
 */
export function SEO({
  skipAutoSEO = false,
  structuredData,
  breadcrumbs,
  children,
  ...customConfig
}: SEOProps): React.ReactElement | null {
  const location = useLocation();

  useEffect(() => {
    if (!skipAutoSEO) {
      applySEOForRoute(location.pathname, customConfig);
    } else if (Object.keys(customConfig).length > 0) {
      applySEOConfig({
        title: customConfig.title || 'OpsUI',
        description: customConfig.description || '',
        ...customConfig,
      });
    }

    // Add structured data if provided
    if (structuredData) {
      addStructuredData(structuredData);
    }

    // Add breadcrumb structured data
    if (breadcrumbs && breadcrumbs.length > 0) {
      addStructuredData(generateBreadcrumbSchema(breadcrumbs));
    }

    return () => {
      // Cleanup structured data on unmount
      if (structuredData || breadcrumbs) {
        removeStructuredData();
      }
    };
  }, [
    location.pathname,
    skipAutoSEO,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(customConfig),
    structuredData,
    breadcrumbs,
  ]);

  // This component doesn't render anything by default
  // But it can render children if provided (for composition)
  return children ? <>{children}</> : null;
}

/**
 * PageSEO component for simple page-level SEO
 *
 * @example
 * ```tsx
 * function ProductPage({ product }) {
 *   return (
 *     <>
 *       <PageSEO
 *         title={product.name}
 *         description={product.description}
 *         keywords={[product.category]}
 *       />
 *       <ProductDetails product={product} />
 *     </>
 *   );
 * }
 * ```
 */
export function PageSEO({
  title,
  description,
  keywords,
  ...props
}: Omit<SEOProps, 'skipAutoSEO'>): React.ReactElement | null {
  return (
    <SEO
      title={title ? `${title} - OpsUI` : undefined}
      description={description}
      keywords={keywords}
      {...props}
    />
  );
}

/**
 * NoIndexSEO component for pages that shouldn't be indexed
 *
 * @example
 * ```tsx
 * function AdminPage() {
 *   return (
 *     <>
 *       <NoIndexSEO />
 *       <AdminContent />
 *     </>
 *   );
 * }
 * ```
 */
export function NoIndexSEO(): React.ReactElement {
  return <SEO noIndex noFollow />;
}

export default SEO;
