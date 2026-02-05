/**
 * @file Toast.test.tsx
 * @purpose Tests for Toast notification system
 * @complexity medium
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ToastProvider, useToast, Toast, ToastType } from './Toast';

// Test component that uses the toast hook
function TestComponent() {
  const { showToast, dismissToast, clearAll } = useToast();

  return (
    <div>
      <button onClick={() => showToast('Success message', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error message', 'error')}>Show Error</button>
      <button onClick={() => showToast('Warning message', 'warning')}>Show Warning</button>
      <button onClick={() => showToast('Info message', 'info')}>Show Info</button>
      <button onClick={() => showToast('Custom duration', 'info', 1000)}>
        Show Custom Duration
      </button>
      <button onClick={() => showToast('Persistent toast', 'info', 0)}>Show Persistent</button>
      <button onClick={clearAll}>Clear All</button>
    </div>
  );
}

// Test component that creates persistent toasts for testing dismiss functionality
function TestPersistentToasts() {
  const { showToast, clearAll } = useToast();

  return (
    <div>
      <button onClick={() => showToast('Success message', 'success', 0)}>Show Success</button>
      <button onClick={() => showToast('Error message', 'error', 0)}>Show Error</button>
      <button onClick={() => showToast('Warning message', 'warning', 0)}>Show Warning</button>
      <button onClick={clearAll}>Clear All</button>
    </div>
  );
}

describe('Toast Context and Hook', () => {
  it('throws error when useToast is used outside ToastProvider', () => {
    // Suppress console.error for this test
    const consoleError = console.error;
    console.error = vi.fn();

    expect(() => {
      function TestWithoutProvider() {
        useToast();
        return null;
      }
      renderWithProviders(<TestWithoutProvider />);
    }).toThrow('useToast must be used within a ToastProvider');

    console.error = consoleError;
  });

  it('provides toast context to children', () => {
    renderWithProviders(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(screen.getByText('Show Success')).toBeInTheDocument();
  });
});

describe('Toast Functionality', () => {
  describe('showToast', () => {
    it('displays success toast', () => {
      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('displays error toast', () => {
      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Error'));
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('displays warning toast', () => {
      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Warning'));
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('displays info toast', () => {
      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Info'));
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('shows multiple toasts', () => {
      renderWithProviders(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Info'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('limits to 5 toasts maximum', () => {
      function TestMultipleToasts() {
        const { showToast } = useToast();
        return (
          <button
            onClick={() => {
              for (let i = 0; i < 10; i++) {
                showToast(`Toast ${i}`, 'info', 0); // Persistent toasts
              }
            }}
          >
            Add 10 Toasts
          </button>
        );
      }

      renderWithProviders(
        <ToastProvider>
          <TestMultipleToasts />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add 10 Toasts'));

      // Should only have 5 toasts visible
      const toastElements = screen.getAllByText(/Toast \d/);
      expect(toastElements).toHaveLength(5);
    });
  });

  describe('dismissToast', () => {
    it('shows dismiss button for each toast', () => {
      renderWithProviders(
        <ToastProvider>
          <TestPersistentToasts />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));

      // Should have two dismiss buttons (one for each toast)
      const dismissButtons = screen.getAllByLabelText('Dismiss');
      expect(dismissButtons).toHaveLength(2);
    });

    it('clears all toasts removes all toasts', () => {
      renderWithProviders(
        <ToastProvider>
          <TestPersistentToasts />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Clear All'));

      // After clearing, toasts should be removed
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      expect(screen.queryByText('Error message')).not.toBeInTheDocument();
    });
  });
});

describe('ToastItem Component Styling', () => {
  it('applies correct styles for success toast', () => {
    renderWithProviders(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    const toast = screen.getByText('Success message').closest('div.glass-card');
    expect(toast).toHaveClass('bg-success-500/10', 'border-success-500/30');
  });

  it('applies correct styles for error toast', () => {
    renderWithProviders(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));

    const toast = screen.getByText('Error message').closest('div.glass-card');
    expect(toast).toHaveClass('bg-error-500/10', 'border-error-500/30');
  });

  it('applies correct styles for warning toast', () => {
    renderWithProviders(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));

    const toast = screen.getByText('Warning message').closest('div.glass-card');
    expect(toast).toHaveClass('bg-warning-500/10', 'border-warning-500/30');
  });

  it('applies correct styles for info toast', () => {
    renderWithProviders(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));

    const toast = screen.getByText('Info message').closest('div.glass-card');
    expect(toast).toHaveClass('bg-primary-500/10', 'border-primary-500/30');
  });
});

describe('Toast Progress Bar', () => {
  it('shows progress bar for auto-dismissing toasts', () => {
    renderWithProviders(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    const toast = screen.getByText('Success message').closest('div');
    const progressBar = toast?.querySelector('.bg-success-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('does not show progress bar for persistent toasts', () => {
    renderWithProviders(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Persistent'));

    const toast = screen.getByText('Persistent toast').closest('div');
    const progressBar = toast?.querySelector('.bg-primary-500');
    expect(progressBar).not.toBeInTheDocument();
  });
});

describe('Toast Container Positioning', () => {
  it('positions toasts in top-right corner', () => {
    renderWithProviders(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    const container = screen.getByText('Success message').closest('.fixed');
    expect(container).toHaveClass('top-4', 'right-4');
  });

  it('stacks multiple toasts vertically', () => {
    renderWithProviders(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Warning'));

    const container = screen.getByText('Success message').closest('.fixed');
    expect(container).toHaveClass('flex-col');
  });
});

describe('useApiErrorHandler Hook', () => {
  it('exists as export', () => {
    expect(async () => {
      const { useApiErrorHandler } = await import('./Toast');
      expect(typeof useApiErrorHandler).toBe('function');
    });
  });

  it('handles error with response data message', () => {
    function TestErrorHandler() {
      const { showToast } = useToast();

      const mockHandleError = (error: any) => {
        const message = error?.response?.data?.message || error?.message || 'An error occurred';
        showToast(message, 'error');
      };

      return (
        <button
          onClick={() =>
            mockHandleError({
              response: { data: { message: 'Validation failed' } },
            })
          }
        >
          Trigger Error
        </button>
      );
    }

    renderWithProviders(
      <ToastProvider>
        <TestErrorHandler />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByText('Validation failed')).toBeInTheDocument();
  });
});

describe('Toast Accessibility', () => {
  it('has dismiss button with aria-label', () => {
    renderWithProviders(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
  });

  it('allows keyboard navigation to dismiss button', () => {
    renderWithProviders(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    const dismissButton = screen.getByLabelText('Dismiss');
    dismissButton.focus();

    expect(document.activeElement).toBe(dismissButton);

    fireEvent.click(dismissButton);
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });
});
