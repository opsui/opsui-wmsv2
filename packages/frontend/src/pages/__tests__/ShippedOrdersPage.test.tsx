/**
 * Tests for ShippedOrdersPage component
 *
 * Tests for the Shipped Orders page functionality including:
 * - Shipped orders list with tracking
 * - Filtering and search
 * - Export functionality
 * - Statistics display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import ShippedOrdersPage from '../ShippedOrdersPage';

// Mock the shared components
vi.mock('@/components/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/shared')>();
  return {
    ...actual,
    Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    Button: ({ children, onClick, disabled, ...props }: any) => (
      <button onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
    Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
    Pagination: ({ currentPage, totalItems, pageSize, onPageChange }: any) => (
      <div data-testid="pagination">
        Page {currentPage} of {Math.ceil(totalItems / pageSize)}
      </div>
    ),
  };
});

// Mock API services - use importOriginal to preserve all exports
const mockShippedOrders = [
  {
    id: 'ship-001',
    orderId: 'ORD-001',
    customerName: 'Acme Corporation',
    status: 'SHIPPED',
    itemCount: 5,
    totalValue: 2500,
    shippedAt: '2025-01-15T10:00:00Z',
    deliveredAt: null,
    trackingNumber: 'TRACK123456',
    carrier: 'FedEx',
    shippingAddress: '123 Main St, City, State 12345',
    shippedBy: 'user-001',
  },
  {
    id: 'ship-002',
    orderId: 'ORD-002',
    customerName: 'Beta Industries',
    status: 'SHIPPED',
    itemCount: 3,
    totalValue: 1500,
    shippedAt: '2025-01-14T15:30:00Z',
    deliveredAt: '2025-01-15T09:00:00Z',
    trackingNumber: 'TRACK789012',
    carrier: 'UPS',
    shippingAddress: '456 Oak Ave, Town, State 67890',
    shippedBy: 'user-002',
  },
];

vi.mock('@/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    useShippedOrders: vi.fn(() => ({
      data: { data: { orders: mockShippedOrders, total: 2 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })),
    useExportShippedOrders: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
  };
});

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useToast
vi.mock('@/components/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/shared')>();
  return {
    ...actual,
    useToast: () => ({
      showToast: vi.fn(),
    }),
  };
});

describe('ShippedOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<ShippedOrdersPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays the page title', () => {
      renderWithProviders(<ShippedOrdersPage />);
      expect(screen.getByText('Shipped Orders')).toBeInTheDocument();
      expect(screen.getByText('View and manage all shipped orders')).toBeInTheDocument();
    });

    it('displays back button', () => {
      renderWithProviders(<ShippedOrdersPage />);
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    });
  });

  describe('Search and Filters', () => {
    it('renders search input', () => {
      renderWithProviders(<ShippedOrdersPage />);
      expect(screen.getByPlaceholderText('Search by order ID, customer...')).toBeInTheDocument();
    });

    it('renders filter button', () => {
      renderWithProviders(<ShippedOrdersPage />);
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('renders export button', () => {
      renderWithProviders(<ShippedOrdersPage />);
      expect(screen.getByText(/Export \(/)).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      renderWithProviders(<ShippedOrdersPage />);
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  describe('Orders Table', () => {
    it('displays order IDs', () => {
      renderWithProviders(<ShippedOrdersPage />);
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.getByText('ORD-002')).toBeInTheDocument();
    });

    it('displays customer names', () => {
      renderWithProviders(<ShippedOrdersPage />);
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
      expect(screen.getByText('Beta Industries')).toBeInTheDocument();
    });

    it('displays tracking numbers', () => {
      renderWithProviders(<ShippedOrdersPage />);
      expect(screen.getByText('TRACK123456')).toBeInTheDocument();
      expect(screen.getByText('TRACK789012')).toBeInTheDocument();
    });

    it('displays carriers', () => {
      renderWithProviders(<ShippedOrdersPage />);
      expect(screen.getByText('FedEx')).toBeInTheDocument();
      expect(screen.getByText('UPS')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<ShippedOrdersPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Shipped Orders');
    });
  });
});
