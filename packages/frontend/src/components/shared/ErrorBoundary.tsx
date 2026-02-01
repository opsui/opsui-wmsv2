/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI
 */

import { Component, ReactNode } from 'react';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  HomeIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyError = async () => {
    const errorText = [
      'Error Details:',
      this.state.error?.toString() || 'Unknown error',
      '',
      'Component Stack:',
      this.state.errorInfo?.componentStack || 'No stack trace available',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(errorText);
      alert('Error details copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy error:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card rounded-2xl p-8 border border-white/[0.08]">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-error-500/20">
                <ExclamationTriangleIcon className="h-12 w-12 text-error-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white text-center mb-2">Something went wrong</h1>

            {/* Message */}
            <p className="text-gray-400 text-center mb-6">
              We encountered an unexpected error. You can try refreshing the page or go back to the
              home screen.
            </p>

            {/* Error Details (Development Only) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 bg-gray-800/50 rounded-lg p-4 border border-white/[0.08]">
                <summary className="text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors">
                  Error Details
                </summary>
                <div className="mt-3 text-xs text-gray-400 space-y-2">
                  <div className="font-mono bg-gray-900/50 p-2 rounded overflow-x-auto">
                    {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && (
                    <div className="font-mono bg-gray-900/50 p-2 rounded overflow-x-auto">
                      <pre className="whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <HomeIcon className="h-5 w-5" />
                  Go Home
                </button>
              </div>
              <button
                onClick={this.handleCopyError}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-gray-300 transition-colors border border-white/[0.08]"
              >
                <ClipboardDocumentIcon className="h-5 w-5" />
                Copy Error
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// FUNCTIONAL ERROR BOUNDARY WRAPPER
// ============================================================================

interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Functional wrapper for ErrorBoundary
 * Use this for simpler integration with functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  return (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
}
