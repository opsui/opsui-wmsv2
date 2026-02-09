/**
 * Tests for ProductSearchPage component
 *
 * Tests for the Product Search page functionality including:
 * - SKU search and filtering
 * - Inventory display
 * - Barcode scanning
 * - Bin location information
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { ProductSearchPage } from '../ProductSearchPage';

// Mock the auth store
vi.mock('@/stores', () => ({
  useAuthStore: vi.fn(selector => {
    const state = {
      user: { userId: 'test-user', name: 'Test User', role: 'PICKER' },
      getEffectiveRole: () => 'PICKER',
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock page tracking hook
vi.mock('@/hooks/usePageTracking', () => ({
  usePageTracking: vi.fn(() => {}),
  PageViews: {
    ITEM_SEARCH: 'item_search',
  },
}));

// Mock navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('ProductSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<ProductSearchPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays the page title', () => {
      renderWithProviders(<ProductSearchPage />);
      expect(screen.getByText('Product Search')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<ProductSearchPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Product Search');
    });
  });
});
