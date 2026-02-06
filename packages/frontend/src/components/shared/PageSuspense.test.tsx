/**
 * @file PageSuspense.test.tsx
 * @purpose Tests for PageSuspense components
 * @complexity low
 * @tested yes
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { PageLoadingFallback, PageSuspense, withPageSuspense } from './PageSuspense';

describe('PageLoadingFallback Component', () => {
  describe('Basic Rendering', () => {
    it('renders loading spinner', () => {
      const { container } = renderWithProviders(<PageLoadingFallback />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('renders loading text', () => {
      renderWithProviders(<PageLoadingFallback />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders spinner and text in centered layout', () => {
      const { container } = renderWithProviders(<PageLoadingFallback />);
      const center = container.querySelector('.text-center');
      expect(center).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('has full screen height', () => {
      const { container } = renderWithProviders(<PageLoadingFallback />);
      const wrapper = container.querySelector('.min-h-screen');
      expect(wrapper).toBeInTheDocument();
    });

    it('has centered flex layout', () => {
      const { container } = renderWithProviders(<PageLoadingFallback />);
      const center = container.querySelector('.flex.items-center.justify-center');
      expect(center).toBeInTheDocument();
    });
  });

  describe('Spinner Styling', () => {
    it('has correct spinner size', () => {
      const { container } = renderWithProviders(<PageLoadingFallback />);
      const spinner = container.querySelector('.h-12.w-12');
      expect(spinner).toBeInTheDocument();
    });

    it('has rounded full spinner', () => {
      const { container } = renderWithProviders(<PageLoadingFallback />);
      const spinner = container.querySelector('.rounded-full');
      expect(spinner).toBeInTheDocument();
    });

    it('has border styling for spinner', () => {
      const { container } = renderWithProviders(<PageLoadingFallback />);
      const spinner = container.querySelector('.border-b-2');
      expect(spinner).toBeInTheDocument();
    });

    it('has primary color', () => {
      const { container } = renderWithProviders(<PageLoadingFallback />);
      const spinner = container.querySelector('.border-primary-600');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Text Styling', () => {
    it('has correct text color for light mode', () => {
      const { container } = renderWithProviders(<PageLoadingFallback />);
      const text = container.querySelector('p');
      expect(text).toHaveClass('text-gray-600');
    });

    it('has correct text color for dark mode', () => {
      const { container } = renderWithProviders(<PageLoadingFallback />);
      const text = container.querySelector('p');
      expect(text).toHaveClass('dark:text-gray-400');
    });

    it('has margin top for spacing', () => {
      const { container } = renderWithProviders(<PageLoadingFallback />);
      const text = container.querySelector('p');
      expect(text).toHaveClass('mt-4');
    });
  });
});

describe('PageSuspense Component', () => {
  describe('Basic Rendering', () => {
    it('renders children when loaded', () => {
      renderWithProviders(
        <PageSuspense>
          <div>Loaded Content</div>
        </PageSuspense>
      );
      expect(screen.getByText('Loaded Content')).toBeInTheDocument();
    });

    it('renders default fallback during loading', () => {
      // Create a component that suspends
      const SuspenseComponent = () => {
        throw new Promise(() => {}); // Never resolves - triggers Suspense
      };

      renderWithProviders(
        <PageSuspense>
          <SuspenseComponent />
        </PageSuspense>
      );
      // Should show loading fallback
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const SuspenseComponent = () => {
        throw new Promise(() => {});
      };

      renderWithProviders(
        <PageSuspense fallback={<div>Custom Loading...</div>}>
          <SuspenseComponent />
        </PageSuspense>
      );

      expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
    });

    it('does not show default fallback when custom is provided', () => {
      const SuspenseComponent = () => {
        throw new Promise(() => {});
      };

      renderWithProviders(
        <PageSuspense fallback={<div>Custom</div>}>
          <SuspenseComponent />
        </PageSuspense>
      );

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Fallback Element', () => {
    it('accepts React element as fallback', () => {
      const SuspenseComponent = () => {
        throw new Promise(() => {});
      };

      const CustomSpinner = () => <div data-testid="custom-spinner">Spinner</div>;

      renderWithProviders(
        <PageSuspense fallback={<CustomSpinner />}>
          <SuspenseComponent />
        </PageSuspense>
      );

      expect(screen.getByTestId('custom-spinner')).toBeInTheDocument();
    });

    it('accepts null as fallback', () => {
      const SuspenseComponent = () => {
        throw new Promise(() => {});
      };

      renderWithProviders(
        <PageSuspense fallback={null}>
          <SuspenseComponent />
        </PageSuspense>
      );

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Children Rendering', () => {
    it('renders multiple children', () => {
      renderWithProviders(
        <PageSuspense>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </PageSuspense>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('renders nested components', () => {
      renderWithProviders(
        <PageSuspense>
          <div>
            <span>Nested Content</span>
          </div>
        </PageSuspense>
      );

      expect(screen.getByText('Nested Content')).toBeInTheDocument();
    });
  });
});

describe('withPageSuspense HOC', () => {
  describe('Basic Functionality', () => {
    it('wraps component with Suspense', () => {
      const TestComponent = () => <div>Test Content</div>;
      const WrappedComponent = withPageSuspense(TestComponent);

      renderWithProviders(<WrappedComponent />);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('passes props to wrapped component', () => {
      interface TestProps {
        message: string;
      }
      const TestComponent = ({ message }: TestProps) => <div>{message}</div>;
      const WrappedComponent = withPageSuspense(TestComponent);

      renderWithProviders(<WrappedComponent message="Hello World" />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('uses custom fallback when provided', () => {
      const SuspenseComponent = () => {
        throw new Promise(() => {});
      };

      const WrappedComponent = withPageSuspense(SuspenseComponent, <div>Custom Fallback</div>);

      renderWithProviders(<WrappedComponent />);
      expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
    });

    it('uses default fallback when not provided', () => {
      const SuspenseComponent = () => {
        throw new Promise(() => {});
      };

      const WrappedComponent = withPageSuspense(SuspenseComponent);

      renderWithProviders(<WrappedComponent />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Component Name Preservation', () => {
    it('preserves component functionality', () => {
      interface TestProps {
        value: number;
        onIncrement: () => void;
      }
      const TestComponent = ({ value, onIncrement }: TestProps) => (
        <button onClick={onIncrement}>Value: {value}</button>
      );

      const WrappedComponent = withPageSuspense(TestComponent);
      const handleIncrement = vi.fn();

      renderWithProviders(<WrappedComponent value={5} onIncrement={handleIncrement} />);

      const button = screen.getByText('Value: 5');
      expect(button).toBeInTheDocument();

      // Verify it's still a button with onClick handler
      const buttonElement = screen.getByRole('button');
      expect(buttonElement).toBeInTheDocument();
    });
  });

  describe('Generic Types', () => {
    it('works with typed components', () => {
      interface TypedProps {
        id: string;
        name: string;
      }
      const TypedComponent = ({ id, name }: TypedProps) => <div data-id={id}>{name}</div>;

      const WrappedComponent = withPageSuspense(TypedComponent);

      renderWithProviders(<WrappedComponent id="test-1" name="Test Name" />);
      expect(screen.getByText('Test Name')).toBeInTheDocument();
    });
  });
});
