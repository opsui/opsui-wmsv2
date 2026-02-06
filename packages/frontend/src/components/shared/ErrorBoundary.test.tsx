/**
 * @file ErrorBoundary.test.tsx
 * @purpose Tests for ErrorBoundary component
 * @complexity medium
 * @tested yes
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';

// Component that throws on render
const ThrowingComponent = () => {
  throw new Error('Render error');
};

// Suppress console.error during tests
const mockConsoleError = () => {
  const originalError = console.error;
  console.error = vi.fn();
  return () => {
    console.error = originalError;
  };
};

describe('ErrorBoundary Component', () => {
  describe('Normal Rendering', () => {
    it('renders children when no error occurs', () => {
      const cleanup = mockConsoleError();
      renderWithProviders(
        <ErrorBoundary>
          <div>Child Content</div>
        </ErrorBoundary>
      );
      expect(screen.getByText('Child Content')).toBeInTheDocument();
      cleanup();
    });

    it('renders multiple children', () => {
      const cleanup = mockConsoleError();
      renderWithProviders(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
        </ErrorBoundary>
      );
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      cleanup();
    });

    it('renders nested components', () => {
      const cleanup = mockConsoleError();
      renderWithProviders(
        <ErrorBoundary>
          <div>
            <span>Nested</span>
          </div>
        </ErrorBoundary>
      );
      expect(screen.getByText('Nested')).toBeInTheDocument();
      cleanup();
    });
  });

  describe('Error Handling', () => {
    it('catches errors in child components', () => {
      const cleanup = mockConsoleError();

      renderWithProviders(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Should show error UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      cleanup();
    });

    it('calls onError callback when provided', () => {
      const cleanup = mockConsoleError();
      const handleError = vi.fn();

      renderWithProviders(
        <ErrorBoundary onError={handleError}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(handleError).toHaveBeenCalled();
      cleanup();
    });
  });

  describe('Default Error UI', () => {
    it('shows error title', () => {
      const cleanup = mockConsoleError();

      renderWithProviders(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      cleanup();
    });

    it('shows error message', () => {
      const cleanup = mockConsoleError();

      renderWithProviders(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
      cleanup();
    });

    it('shows Try Again button', () => {
      const cleanup = mockConsoleError();

      renderWithProviders(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
      cleanup();
    });

    it('shows Go Home button', () => {
      const cleanup = mockConsoleError();

      renderWithProviders(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Go Home')).toBeInTheDocument();
      cleanup();
    });

    it('shows Copy Error button', () => {
      const cleanup = mockConsoleError();

      renderWithProviders(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Copy Error')).toBeInTheDocument();
      cleanup();
    });
  });

  describe('Custom Fallback', () => {
    it('uses custom fallback when provided', () => {
      const cleanup = mockConsoleError();

      const customFallback = <div>Custom Error UI</div>;

      renderWithProviders(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      cleanup();
    });

    it('can use complex custom fallback', () => {
      const cleanup = mockConsoleError();

      const customFallback = (
        <div>
          <h1>Oops!</h1>
          <p>Something broke</p>
          <button>Reload</button>
        </div>
      );

      renderWithProviders(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops!')).toBeInTheDocument();
      expect(screen.getByText('Something broke')).toBeInTheDocument();
      expect(screen.getByText('Reload')).toBeInTheDocument();
      cleanup();
    });
  });

  describe('Error Layout and Styling', () => {
    it('has centered layout', () => {
      const cleanup = mockConsoleError();

      const { container } = renderWithProviders(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const center = container.querySelector('.items-center.justify-center');
      expect(center).toBeInTheDocument();
      cleanup();
    });

    it('has glass card styling', () => {
      const cleanup = mockConsoleError();

      const { container } = renderWithProviders(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const card = container.querySelector('.glass-card');
      expect(card).toBeInTheDocument();
      cleanup();
    });
  });
});

describe('withErrorBoundary HOC', () => {
  describe('Basic Wrapping', () => {
    it('wraps component with ErrorBoundary', () => {
      const cleanup = mockConsoleError();

      const TestComponent = () => <div>Test Component</div>;
      const WrappedComponent = withErrorBoundary(TestComponent);

      renderWithProviders(<WrappedComponent />);
      expect(screen.getByText('Test Component')).toBeInTheDocument();
      cleanup();
    });

    it('passes props to wrapped component', () => {
      const cleanup = mockConsoleError();

      interface TestProps {
        message: string;
      }
      const TestComponent = ({ message }: TestProps) => <div>{message}</div>;
      const WrappedComponent = withErrorBoundary(TestComponent);

      renderWithProviders(<WrappedComponent message="Hello from wrapped" />);
      expect(screen.getByText('Hello from wrapped')).toBeInTheDocument();
      cleanup();
    });
  });

  describe('Error Handling in HOC', () => {
    it('catches errors from wrapped component', () => {
      const cleanup = mockConsoleError();

      const ThrowingComp = () => {
        throw new Error('HOC error');
      };
      const WrappedComponent = withErrorBoundary(ThrowingComp);

      renderWithProviders(<WrappedComponent />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      cleanup();
    });

    it('passes custom fallback to ErrorBoundary', () => {
      const cleanup = mockConsoleError();

      const customFallback = <div>Custom Fallback</div>;
      const ThrowingComp = () => {
        throw new Error('Test');
      };
      const WrappedComponent = withErrorBoundary(ThrowingComp, {
        fallback: customFallback,
      });

      renderWithProviders(<WrappedComponent />);
      expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
      cleanup();
    });

    it('passes onError callback', () => {
      const cleanup = mockConsoleError();
      const handleError = vi.fn();

      const ThrowingComp = () => {
        throw new Error('Test');
      };
      const WrappedComponent = withErrorBoundary(ThrowingComp, {
        onError: handleError,
      });

      renderWithProviders(<WrappedComponent />);
      expect(handleError).toHaveBeenCalled();
      cleanup();
    });
  });

  describe('Component Names and Types', () => {
    it('preserves component functionality', () => {
      const cleanup = mockConsoleError();

      const TestComponent = () => <div>Test</div>;
      const WrappedComponent = withErrorBoundary(TestComponent);

      const { container } = renderWithProviders(<WrappedComponent />);
      expect(container.querySelector('div')).toBeInTheDocument();
      cleanup();
    });

    it('works with components with generic props', () => {
      const cleanup = mockConsoleError();

      interface GenericProps<T> {
        data: T;
        render: (item: T) => React.ReactNode;
      }
      const GenericComponent = <T,>({ data, render }: GenericProps<T>) => <div>{render(data)}</div>;
      const WrappedComponent = withErrorBoundary(GenericComponent);

      renderWithProviders(<WrappedComponent data={123} render={item => `Value: ${item}`} />);
      expect(screen.getByText('Value: 123')).toBeInTheDocument();
      cleanup();
    });
  });
});
