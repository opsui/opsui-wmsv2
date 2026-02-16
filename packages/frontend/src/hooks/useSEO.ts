/**
 * useSEO Hook
 *
 * React hook for managing SEO meta tags dynamically.
 * Automatically updates meta tags when component mounts or config changes.
 */

import {
  addStructuredData,
  applySEOConfig,
  applySEOForRoute,
  generateBreadcrumbSchema,
  getSEOConfigForRoute,
  initializeSEO,
  SEOConfig,
  StructuredData,
} from '@/utils/seo';
import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface UseSEOOptions extends Partial<SEOConfig> {
  /** Skip automatic route-based SEO */
  skipAutoSEO?: boolean;
  /** Additional structured data to add */
  structuredData?: StructuredData | StructuredData[];
  /** Breadcrumb items for structured data */
  breadcrumbs?: Array<{ name: string; url: string }>;
}

/**
 * Hook for managing SEO in React components
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   useSEO({
 *     title: 'Custom Page Title',
 *     description: 'Custom page description',
 *     keywords: ['custom', 'page'],
 *   });
 *
 *   return <div>Page content</div>;
 * }
 * ```
 */
export function useSEO(options: UseSEOOptions = {}): {
  updateSEO: (config: Partial<SEOConfig>) => void;
  addBreadcrumbs: (items: Array<{ name: string; url: string }>) => void;
} {
  const location = useLocation();
  const { skipAutoSEO = false, structuredData, breadcrumbs, ...customConfig } = options;

  // Update SEO when route or config changes
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

    // Cleanup on unmount
    return () => {
      // Note: We don't cleanup SEO on unmount to prevent flickering
      // The next page will set its own SEO
    };
  }, [
    location.pathname,
    skipAutoSEO,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(customConfig),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(structuredData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(breadcrumbs),
  ]);

  // Manual SEO update function
  const updateSEO = useCallback(
    (config: Partial<SEOConfig>) => {
      const currentConfig = getSEOConfigForRoute(location.pathname);
      applySEOConfig({
        ...currentConfig,
        ...config,
        canonicalUrl: `${import.meta.env.VITE_APP_URL || 'https://opsui.app'}${location.pathname}`,
      });
    },
    [location.pathname]
  );

  // Add breadcrumbs function
  const addBreadcrumbs = useCallback((items: Array<{ name: string; url: string }>) => {
    addStructuredData(generateBreadcrumbSchema(items));
  }, []);

  return { updateSEO, addBreadcrumbs };
}

/**
 * Hook for initializing SEO on app mount
 * Call this once in your root component
 */
export function useSEOInitializer(): void {
  useEffect(() => {
    initializeSEO();
  }, []);
}

/**
 * Hook for page-level SEO with automatic title formatting
 *
 * @example
 * ```tsx
 * function ProductPage({ product }) {
 *   usePageSEO(
 *     product.name,
 *     product.description,
 *     ['product', product.category]
 *   );
 *
 *   return <div>{product.name}</div>;
 * }
 * ```
 */
export function usePageSEO(
  title: string,
  description: string,
  keywords?: string[],
  options?: Omit<UseSEOOptions, 'title' | 'description' | 'keywords'>
): void {
  useSEO({
    title: `${title} - OpsUI`,
    description,
    keywords,
    ...options,
  });
}

export default useSEO;
