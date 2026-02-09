/**
 * Tests for IntegrationsPage component
 *
 * Tests for the Integrations page functionality including:
 * - Integration management (ERP, e-commerce, carriers)
 * - Connection testing
 * - Sync jobs monitoring
 * - Webhook events
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { IntegrationsPage } from '../IntegrationsPage';

// Mock the Header component
vi.mock('@/components/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/shared')>();
  return {
    ...actual,
    Header: () => <div data-testid="header">Header</div>,
    Breadcrumb: () => <div data-testid="breadcrumb">Breadcrumb</div>,
    Button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
    Pagination: ({ currentPage, totalItems, pageSize, onPageChange }: any) => (
      <div data-testid="pagination">
        Page {currentPage} of {Math.ceil(totalItems / pageSize)}
      </div>
    ),
    ConfirmDialog: ({ isOpen, onClose }: any) =>
      isOpen ? <div data-testid="confirm-dialog">Confirm Dialog</div> : null,
  };
});

// Mock API services - use importOriginal to preserve all exports
const mockIntegrations = [
  {
    integrationId: 'int-001',
    name: 'SAP ERP',
    description: 'Main SAP integration',
    type: 'ERP',
    provider: 'SAP',
    status: 'CONNECTED',
    enabled: true,
    lastSyncAt: '2025-01-15T10:00:00Z',
  },
  {
    integrationId: 'int-002',
    name: 'Shopify Store',
    description: 'Main online store',
    type: 'ECOMMERCE',
    provider: 'SHOPIFY',
    status: 'CONNECTED',
    enabled: true,
    lastSyncAt: '2025-01-15T09:30:00Z',
  },
];

vi.mock('@/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    useIntegrations: vi.fn(() => ({
      data: { integrations: mockIntegrations },
      isLoading: false,
    })),
    useCreateIntegration: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useUpdateIntegration: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useDeleteIntegration: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useTestConnection: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({ success: true, latency: 50 }),
    })),
    useToggleIntegration: vi.fn(() => ({
      mutate: vi.fn(),
    })),
    useWebhookEvents: vi.fn(() => ({
      data: { events: [] },
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

describe('IntegrationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<IntegrationsPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays the page title', () => {
      renderWithProviders(<IntegrationsPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Integrations');
      expect(
        screen.getByText('Connect and manage external systems (ERP, e-commerce, carriers)')
      ).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders all tabs', () => {
      renderWithProviders(<IntegrationsPage />);
      const integrationsTabs = screen.getAllByText('Integrations');
      expect(integrationsTabs.length).toBeGreaterThan(0);
      expect(screen.getByText('Sync Jobs')).toBeInTheDocument();
      expect(screen.getByText('Webhooks')).toBeInTheDocument();
    });
  });

  describe('Integrations Tab', () => {
    it('displays integration cards', () => {
      renderWithProviders(<IntegrationsPage />);
      expect(screen.getByText('SAP ERP')).toBeInTheDocument();
      expect(screen.getByText('Shopify Store')).toBeInTheDocument();
    });

    it('displays filter buttons', () => {
      renderWithProviders(<IntegrationsPage />);
      const allButton = screen.getAllByText('All')[0];
      expect(allButton).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('renders search input', () => {
      renderWithProviders(<IntegrationsPage />);
      expect(screen.getByPlaceholderText('Search integrations...')).toBeInTheDocument();
    });

    it('renders add integration button', () => {
      renderWithProviders(<IntegrationsPage />);
      expect(screen.getByText('Add Integration')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<IntegrationsPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Integrations');
    });
  });
});
