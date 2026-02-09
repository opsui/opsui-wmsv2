/**
 * Tests for BinLocationsPage component
 *
 * Core tests for the Bin Locations management page functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { BinLocationsPage } from '../BinLocationsPage';

// Mock all the external dependencies
vi.mock('@/stores', () => ({
  useAuthStore: vi.fn(selector => {
    const state = {
      user: {
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'STOCK_CONTROLLER',
      },
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      activeRole: null,
      getEffectiveRole: () => 'STOCK_CONTROLLER',
      hasRole: () => false,
      canPick: () => false,
      canPack: () => false,
      setUser: vi.fn(),
      setActiveRole: vi.fn(),
      clearAuth: vi.fn(),
      updateTokens: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('@/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    useBinLocationsManagement: vi.fn(() => ({
      data: {
        locations: [
          {
            binId: 'A-01-01',
            zone: 'A',
            aisle: '01',
            shelf: '01',
            type: 'SHELF',
            active: true,
          },
          {
            binId: 'A-01-02',
            zone: 'A',
            aisle: '01',
            shelf: '02',
            type: 'SHELF',
            active: true,
          },
          {
            binId: 'B-05-03',
            zone: 'B',
            aisle: '05',
            shelf: '03',
            type: 'FLOOR',
            active: false,
          },
        ],
        total: 3,
      },
      isLoading: false,
    })),
    useBinLocationZones: vi.fn(() => ({
      data: {
        zones: ['A', 'B', 'C'],
      },
    })),
    useCreateBinLocation: vi.fn(() => ({
      mutateAsync: vi.fn(),
      isPending: false,
    })),
    useUpdateBinLocation: vi.fn(() => ({
      mutateAsync: vi.fn(),
      isPending: false,
    })),
    useDeleteBinLocation: vi.fn(() => ({
      mutateAsync: vi.fn(),
      isPending: false,
    })),
    useBatchCreateBinLocations: vi.fn(() => ({
      mutateAsync: vi.fn(),
      isPending: false,
    })),
  };
});

vi.mock('@/hooks/useFormValidation', () => ({
  useFormValidation: vi.fn(() => ({
    values: {
      binId: '',
      zone: 'A',
      aisle: '',
      shelf: '',
      type: 'SHELF',
      active: true,
    },
    errors: {},
    handleChange: vi.fn(),
    handleSubmit: vi.fn(e => {
      e?.preventDefault?.();
    }),
    isSubmitting: false,
    setFieldValue: vi.fn(),
    resetForm: vi.fn(),
  })),
}));

vi.mock('@/components/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/shared')>();
  return {
    ...actual,
    useToast: vi.fn(() => ({
      showToast: vi.fn(),
    })),
  };
});

describe('BinLocationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<BinLocationsPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays page title', () => {
      renderWithProviders(<BinLocationsPage />);
      expect(screen.getByText('Bin Locations')).toBeInTheDocument();
    });

    it('displays page description', () => {
      renderWithProviders(<BinLocationsPage />);
      expect(screen.getByText('Manage warehouse bin locations')).toBeInTheDocument();
    });
  });

  describe('Search and Filters', () => {
    it('has search input field', () => {
      renderWithProviders(<BinLocationsPage />);
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('has filter dropdowns', () => {
      renderWithProviders(<BinLocationsPage />);
      expect(screen.getByText(/All Zones/i)).toBeInTheDocument();
      expect(screen.getByText(/All Types/i)).toBeInTheDocument();
      expect(screen.getByText(/All Status/i)).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('has back button', () => {
      renderWithProviders(<BinLocationsPage />);
      expect(screen.getByText(/Back to Dashboard/i)).toBeInTheDocument();
    });

    it('has create location button', () => {
      renderWithProviders(<BinLocationsPage />);
      expect(screen.getByText(/New Location/i)).toBeInTheDocument();
    });

    it('has batch create button', () => {
      renderWithProviders(<BinLocationsPage />);
      expect(screen.getByText(/Batch Create/i)).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('is a valid React component', () => {
      expect(typeof BinLocationsPage).toBe('function');
    });

    it('has default export', () => {
      expect(BinLocationsPage).toBeDefined();
    });
  });
});
