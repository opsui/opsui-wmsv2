/**
 * Testing Utilities
 *
 * Helper functions for writing frontend tests
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/shared/Toast';

// Create a custom render function that includes providers
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  return {
    ...render(ui, { wrapper: AllTheProviders, ...options }),
    queryClient,
  };
}

// Re-export everything from Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
