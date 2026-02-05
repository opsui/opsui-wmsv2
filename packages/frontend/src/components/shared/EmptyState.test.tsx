/**
 * @file EmptyState.test.tsx
 * @purpose Tests for EmptyState component and variants
 * @complexity medium
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { EmptyState, NoSearchResults, NoData, ErrorState, LoadingState } from './EmptyState';

describe('EmptyState Component', () => {
  describe('Basic Rendering', () => {
    it('renders title', () => {
      renderWithProviders(<EmptyState title="No items found" />);
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('renders icon', () => {
      const { container } = renderWithProviders(<EmptyState title="No data" />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders description when provided', () => {
      renderWithProviders(
        <EmptyState title="No items" description="Get started by adding items" />
      );
      expect(screen.getByText('Get started by adding items')).toBeInTheDocument();
    });

    it('does not render description when not provided', () => {
      renderWithProviders(<EmptyState title="No items" />);
      const description = screen.queryByText('Get started');
      expect(description).not.toBeInTheDocument();
    });
  });

  describe('Types', () => {
    it('renders no-data type with DocumentTextIcon', () => {
      const { container } = renderWithProviders(<EmptyState type="no-data" title="No data" />);
      // Check for icon background
      const iconBg = container.querySelector('.bg-gray-500\\/10');
      expect(iconBg).toBeInTheDocument();
    });

    it('renders no-results type with magnifying glass icon', () => {
      const { container } = renderWithProviders(
        <EmptyState type="no-results" title="No results" />
      );
      const iconBg = container.querySelector('.bg-gray-500\\/10');
      expect(iconBg).toBeInTheDocument();
    });

    it('renders no-items type with InboxIcon', () => {
      const { container } = renderWithProviders(<EmptyState type="no-items" title="No items" />);
      const iconBg = container.querySelector('.bg-gray-500\\/10');
      expect(iconBg).toBeInTheDocument();
    });

    it('renders no-users type', () => {
      const { container } = renderWithProviders(<EmptyState type="no-users" title="No users" />);
      const iconBg = container.querySelector('.bg-gray-500\\/10');
      expect(iconBg).toBeInTheDocument();
    });

    it('renders no-orders type', () => {
      const { container } = renderWithProviders(<EmptyState type="no-orders" title="No orders" />);
      const iconBg = container.querySelector('.bg-gray-500\\/10');
      expect(iconBg).toBeInTheDocument();
    });

    it('renders error type with error icon', () => {
      const { container } = renderWithProviders(<EmptyState type="error" title="Error" />);
      const iconBg = container.querySelector('.bg-error-500\\/10');
      expect(iconBg).toBeInTheDocument();
    });

    it('renders success type with success icon', () => {
      const { container } = renderWithProviders(<EmptyState type="success" title="Success" />);
      const iconBg = container.querySelector('.bg-success-500\\/10');
      expect(iconBg).toBeInTheDocument();
    });

    it('renders loading type with spinning icon', () => {
      const { container } = renderWithProviders(<EmptyState type="loading" title="Loading" />);
      const icon = container.querySelector('.animate-spin');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Icon Styling', () => {
    it('has correct icon size', () => {
      const { container } = renderWithProviders(<EmptyState title="No data" />);
      const icon = container.querySelector('.h-8.w-8');
      expect(icon).toBeInTheDocument();
    });

    it('has rounded icon container', () => {
      const { container } = renderWithProviders(<EmptyState title="No data" />);
      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toBeInTheDocument();
    });

    it('has correct icon container size', () => {
      const { container } = renderWithProviders(<EmptyState title="No data" />);
      const iconContainer = container.querySelector('.w-16.h-16');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Action Button', () => {
    it('renders action button when provided', () => {
      renderWithProviders(
        <EmptyState title="No items" action={{ label: 'Add Item', onClick: vi.fn() }} />
      );
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });

    it('calls onClick when action button is clicked', () => {
      const handleClick = vi.fn();
      renderWithProviders(
        <EmptyState title="No items" action={{ label: 'Add Item', onClick: handleClick }} />
      );

      fireEvent.click(screen.getByText('Add Item'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies primary variant styles by default', () => {
      const { container } = renderWithProviders(
        <EmptyState
          title="No items"
          action={{ label: 'Add Item', onClick: vi.fn(), variant: 'primary' }}
        />
      );
      const button = screen.getByText('Add Item');
      expect(button).toHaveClass('bg-primary-600', 'text-white');
    });

    it('applies secondary variant styles', () => {
      const { container } = renderWithProviders(
        <EmptyState
          title="No items"
          action={{ label: 'Add Item', onClick: vi.fn(), variant: 'secondary' }}
        />
      );
      const button = screen.getByText('Add Item');
      expect(button).toHaveClass('bg-gray-700', 'text-gray-300');
    });
  });

  describe('Layout', () => {
    it('has centered flex layout', () => {
      const { container } = renderWithProviders(<EmptyState title="No data" />);
      const wrapper = container.querySelector('.flex.flex-col.items-center.justify-center');
      expect(wrapper).toBeInTheDocument();
    });

    it('has vertical padding', () => {
      const { container } = renderWithProviders(<EmptyState title="No data" />);
      const wrapper = container.querySelector('.py-12');
      expect(wrapper).toBeInTheDocument();
    });

    it('has horizontal padding', () => {
      const { container } = renderWithProviders(<EmptyState title="No data" />);
      const wrapper = container.querySelector('.px-4');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Title Styling', () => {
    it('has correct title styling', () => {
      const { container } = renderWithProviders(<EmptyState title="No items found" />);
      const title = container.querySelector('h3');
      expect(title).toHaveClass('text-lg', 'font-semibold', 'text-white');
    });
  });

  describe('Description Styling', () => {
    it('has correct description styling', () => {
      const { container } = renderWithProviders(
        <EmptyState title="No items" description="Add items to get started" />
      );
      const description = container.querySelector('p');
      expect(description).toHaveClass('text-sm', 'text-gray-400', 'text-center');
    });

    it('has max width on description', () => {
      const { container } = renderWithProviders(
        <EmptyState title="No items" description="Description text" />
      );
      const description = container.querySelector('p');
      expect(description).toHaveClass('max-w-md');
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className', () => {
      const { container } = renderWithProviders(
        <EmptyState title="No items" className="custom-empty-state" />
      );
      const wrapper = container.querySelector('.custom-empty-state');
      expect(wrapper).toBeInTheDocument();
    });
  });
});

describe('NoSearchResults Component', () => {
  describe('Basic Rendering', () => {
    it('renders No results found title', () => {
      renderWithProviders(<NoSearchResults searchTerm="test" onClear={vi.fn()} />);
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('renders description with search term', () => {
      renderWithProviders(<NoSearchResults searchTerm="apple" onClear={vi.fn()} />);
      expect(screen.getByText(/apple/)).toBeInTheDocument();
    });

    it('renders Clear search action button', () => {
      renderWithProviders(<NoSearchResults searchTerm="test" onClear={vi.fn()} />);
      expect(screen.getByText('Clear search')).toBeInTheDocument();
    });
  });

  describe('Action Handler', () => {
    it('calls onClear when Clear search is clicked', () => {
      const handleClear = vi.fn();
      renderWithProviders(<NoSearchResults searchTerm="test" onClear={handleClear} />);

      fireEvent.click(screen.getByText('Clear search'));

      expect(handleClear).toHaveBeenCalledTimes(1);
    });
  });
});

describe('NoData Component', () => {
  describe('Basic Rendering', () => {
    it('renders message as title', () => {
      renderWithProviders(<NoData message="No products found" />);
      expect(screen.getByText('No products found')).toBeInTheDocument();
    });

    it('renders default message when not provided', () => {
      renderWithProviders(<NoData />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders description', () => {
      renderWithProviders(<NoData message="No items" />);
      expect(screen.getByText('Get started by adding your first item')).toBeInTheDocument();
    });
  });

  describe('Action Handler', () => {
    it('renders action button when provided', () => {
      renderWithProviders(
        <NoData message="No items" action={{ label: 'Add Item', onClick: vi.fn() }} />
      );
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });

    it('calls action onClick when clicked', () => {
      const handleClick = vi.fn();
      renderWithProviders(
        <NoData message="No items" action={{ label: 'Add Item', onClick: handleClick }} />
      );

      fireEvent.click(screen.getByText('Add Item'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ErrorState Component', () => {
  describe('Basic Rendering', () => {
    it('renders Error title', () => {
      renderWithProviders(<ErrorState />);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('renders default message when not provided', () => {
      renderWithProviders(<ErrorState />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders custom message when provided', () => {
      renderWithProviders(<ErrorState message="Failed to load data" />);
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });
  });

  describe('Retry Action', () => {
    it('does not render retry button when onRetry not provided', () => {
      renderWithProviders(<ErrorState />);
      expect(screen.queryByText('Try again')).not.toBeInTheDocument();
    });

    it('renders retry button when onRetry is provided', () => {
      renderWithProviders(<ErrorState onRetry={vi.fn()} />);
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('calls onRetry when Try again is clicked', () => {
      const handleRetry = vi.fn();
      renderWithProviders(<ErrorState onRetry={handleRetry} />);

      fireEvent.click(screen.getByText('Try again'));

      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });
});

describe('LoadingState Component', () => {
  describe('Basic Rendering', () => {
    it('renders spinning icon', () => {
      const { container } = renderWithProviders(<LoadingState />);
      const icon = container.querySelector('.animate-spin');
      expect(icon).toBeInTheDocument();
    });

    it('renders default message', () => {
      renderWithProviders(<LoadingState />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders custom message', () => {
      renderWithProviders(<LoadingState message="Please wait..." />);
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });
  });

  describe('Icon Styling', () => {
    it('has correct icon size', () => {
      const { container } = renderWithProviders(<LoadingState />);
      const icon = container.querySelector('.h-12.w-12');
      expect(icon).toBeInTheDocument();
    });

    it('has primary color', () => {
      const { container } = renderWithProviders(<LoadingState />);
      const icon = container.querySelector('.text-primary-500');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('has centered flex layout', () => {
      const { container } = renderWithProviders(<LoadingState />);
      const wrapper = container.querySelector('.flex.flex-col.items-center.justify-center');
      expect(wrapper).toBeInTheDocument();
    });
  });
});
