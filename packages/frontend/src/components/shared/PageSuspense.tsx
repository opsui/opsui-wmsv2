/**
 * Page loading fallback component with spinner
 */

import { classNames } from '@/lib/utils';

export function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Suspense wrapper component for lazy-loaded pages
 */

import { Suspense, ComponentType, ReactNode } from 'react';

interface PageSuspenseProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function PageSuspense({ children, fallback = <PageLoadingFallback /> }: PageSuspenseProps) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

/**
 * Higher-order component to wrap a lazy-loaded page with Suspense
 */
export function withPageSuspense<P extends object>(
  WrappedComponent: ComponentType<P>,
  fallback?: ReactNode
): ComponentType<P> {
  return function WrappedWithSuspense(props: P) {
    return (
      <PageSuspense fallback={fallback}>
        <WrappedComponent {...props} />
      </PageSuspense>
    );
  };
}
