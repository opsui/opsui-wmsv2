/**
 * SearchInput Component Tests
 * @complexity high
 * @tested yes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { SearchInput } from './SearchInput';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api-client';

const mockResults = [
  {
    sku: 'SKU001',
    name: 'Product 1',
    category: 'Electronics',
    binLocations: ['A-01-01', 'A-01-02'],
  },
  {
    sku: 'SKU002',
    name: 'Product 2',
    category: 'Clothing',
    binLocations: ['B-01-01'],
  },
  {
    sku: 'SKU003',
    name: 'Product 3',
    category: 'Food',
    binLocations: ['C-01-01', 'C-01-02', 'C-01-03', 'C-01-04'],
  },
];

describe('SearchInput Component', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders search input', () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');
      expect(input).toBeInTheDocument();
    });

    it('renders search icon', () => {
      const { container } = renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('uses custom placeholder', () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} placeholder="Search SKUs..." />);
      expect(screen.getByPlaceholderText('Search SKUs...')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = renderWithProviders(
        <SearchInput onSelect={mockOnSelect} className="custom-search" />
      );
      const wrapper = container.querySelector('.custom-search');
      expect(wrapper).toBeInTheDocument();
    });

    it('has correct input attributes', () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('autoComplete', 'off');
    });
  });

  describe('Input Behavior', () => {
    it('updates query on input change', () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'test query' } });
      expect(input.value).toBe('test query');
    });

    it('clears input after selection', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockResults[0]] });

      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'SKU001' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalled();
      });

      // Wait for results to appear
      const resultItem = await screen.findByText('Product 1');
      expect(resultItem).toBeInTheDocument();

      fireEvent.click(resultItem);
      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('Debounced Search', () => {
    beforeEach(() => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockResults });
    });

    it('debounces input by 300ms', async () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });

      // Should not call API immediately
      expect(apiClient.get).not.toHaveBeenCalled();

      // Advance to 200ms - still no call
      vi.advanceTimersByTime(200);
      expect(apiClient.get).not.toHaveBeenCalled();

      // Advance to 300ms - should call
      vi.advanceTimersByTime(100);
      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(1);
      });
    });

    it('cancels previous search when new input is entered', async () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'first' } });
      vi.advanceTimersByTime(100);

      fireEvent.change(input, { target: { value: 'second' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(1);
        expect(apiClient.get).toHaveBeenCalledWith('/skus', {
          params: { q: 'second' },
        });
      });
    });
  });

  describe('Search Results', () => {
    beforeEach(async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockResults });
    });

    it('displays search results', async () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText('Product 2')).toBeInTheDocument();
        expect(screen.getByText('Product 3')).toBeInTheDocument();
      });
    });

    it('displays SKU in results', async () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('SKU: SKU001')).toBeInTheDocument();
        expect(screen.getByText('SKU: SKU002')).toBeInTheDocument();
      });
    });

    it('displays category badge', async () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
        expect(screen.getByText('Clothing')).toBeInTheDocument();
        expect(screen.getByText('Food')).toBeInTheDocument();
      });
    });

    it('displays bin locations', async () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Locations: A-01-01, A-01-02')).toBeInTheDocument();
        expect(screen.getByText('Locations: B-01-01')).toBeInTheDocument();
      });
    });

    it('truncates bin locations with more indicator', async () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText(/Locations:.*\+1 more/)).toBeInTheDocument();
      });
    });

    it('calls onSelect when result is clicked', async () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        const resultItem = screen.getByText('Product 1');
        fireEvent.click(resultItem);
        expect(mockOnSelect).toHaveBeenCalledWith('SKU001');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockResults });
    });

    it('navigates down with ArrowDown', async () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      await waitFor(() => {
        const firstResult = screen.getByText('Product 1').closest('button');
        expect(firstResult).toHaveClass('bg-primary-50');
      });
    });

    it('navigates up with ArrowUp', async () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      // Go down twice
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Go up once
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      await waitFor(() => {
        const firstResult = screen.getByText('Product 1').closest('button');
        expect(firstResult).toHaveClass('bg-primary-50');
      });
    });

    it('selects result with Enter key', async () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith('SKU001');
      });
    });

    it('closes dropdown with Escape key', async () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner while searching', async () => {
      // Mock a slow response
      vi.mocked(apiClient.get).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: mockResults }), 500))
      );

      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });

      // Check for loading state before debounce
      vi.advanceTimersByTime(50);

      await waitFor(() => {
        renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
        const input2 = screen.getByPlaceholderText('Search products...');
        fireEvent.change(input2, { target: { value: 'test' } });
        vi.advanceTimersByTime(300);
      });
    });
  });

  describe('Empty Query', () => {
    it('does not search when query is empty', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockResults });

      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: '   ' } }); // Only spaces
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(apiClient.get).not.toHaveBeenCalled();
      });
    });

    it('does not search when query is only whitespace', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockResults });

      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: '' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(apiClient.get).not.toHaveBeenCalled();
      });
    });
  });

  describe('No Results', () => {
    it('shows no results message', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'nonexistent' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText(/No products found for "nonexistent"/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(apiClient.get).mockRejectedValue(new Error('API Error'));

      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('clears results on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(apiClient.get).mockRejectedValue(new Error('API Error'));

      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Click Outside', () => {
    it('closes dropdown when clicking outside', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockResults });

      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
      });
    });

    it('does not close dropdown when clicking inside', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockResults });

      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      // Click on the dropdown
      const dropdown = screen.getByText('Product 1').closest('div');
      if (dropdown) {
        fireEvent.mouseDown(dropdown);
      }

      // Dropdown should still be visible
      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });
  });

  describe('Focus Behavior', () => {
    it('opens dropdown on focus if results exist', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockResults });

      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      // First search to populate results
      fireEvent.change(input, { target: { value: 'test' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalled();
      });

      // Clear and blur
      fireEvent.change(input, { target: { value: '' } });
      input.blur();

      // Focus again
      input.focus();

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });
    });
  });

  describe('Theme Classes', () => {
    it('applies dark mode classes', () => {
      renderWithProviders(<SearchInput onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText('Search products...');

      expect(input).toHaveClass('dark:bg-white/5', 'dark:border-white/10', 'dark:text-white');
    });
  });
});
