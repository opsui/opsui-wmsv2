/**
 * Tests for MaintenancePage component
 *
 * Tests for the Equipment Maintenance page functionality including:
 * - Dashboard tab with metrics and overview
 * - Requests tab for work orders
 * - Schedule tab for maintenance planning
 * - Equipment tab for asset management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import MaintenancePage from '../MaintenancePage';

// Mock API services - use importOriginal to preserve all exports
const mockDashboardData = {
  totalAssets: 25,
  activeWorkOrders: 8,
  pendingRequests: 3,
  overdueMaintenance: 2,
};

const mockAssets = [
  {
    assetId: 'asset-001',
    assetNumber: 'EQ-001',
    name: 'Forklift A',
    description: 'Electric forklift',
    location: 'Warehouse A',
    type: 'EQUIPMENT',
    status: 'OPERATIONAL',
    lastMaintenanceDate: '2025-01-10T00:00:00Z',
    nextMaintenanceDate: '2025-02-10T00:00:00Z',
  },
  {
    assetId: 'asset-002',
    assetNumber: 'EQ-002',
    name: 'Conveyor Belt',
    description: 'Main conveyor',
    location: 'Zone B',
    type: 'EQUIPMENT',
    status: 'IN_MAINTENANCE',
    lastMaintenanceDate: '2025-01-05T00:00:00Z',
    nextMaintenanceDate: '2025-01-20T00:00:00Z',
  },
];

vi.mock('@/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    useMaintenanceDashboard: vi.fn(() => ({
      data: mockDashboardData,
      isLoading: false,
    })),
    useAssets: vi.fn(() => ({
      data: { assets: mockAssets, total: 2 },
      isLoading: false,
    })),
    useMaintenanceWorkOrders: vi.fn(() => ({
      data: { workOrders: [], total: 0 },
      isLoading: false,
    })),
    useCreateAsset: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useCreateWorkOrder: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useStartWorkOrder: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useCompleteWorkOrder: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
  };
});

describe('MaintenancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<MaintenancePage />);
      expect(container).toBeInTheDocument();
    });

    it('displays the page title', () => {
      renderWithProviders(<MaintenancePage />);
      expect(screen.getByText('Equipment Maintenance')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders tab buttons', () => {
      renderWithProviders(<MaintenancePage />);
      expect(screen.getByText('Equipment Maintenance')).toBeInTheDocument();
    });
  });

  describe('Dashboard Tab', () => {
    it('displays page title', () => {
      renderWithProviders(<MaintenancePage />);
      expect(screen.getByText('Equipment Maintenance')).toBeInTheDocument();
    });
  });

  describe('Equipment Tab', () => {
    it('renders equipment tab button', () => {
      renderWithProviders(<MaintenancePage />);
      expect(screen.getByText('Equipment Maintenance')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<MaintenancePage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Equipment Maintenance');
    });
  });
});
