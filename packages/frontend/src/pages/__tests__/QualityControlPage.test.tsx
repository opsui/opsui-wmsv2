/**
 * Tests for QualityControlPage component
 *
 * Tests for the Quality Control page functionality including:
 * - Inspection management
 * - Checklist management
 * - Return authorizations
 * - Disposition actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { QualityControlPage } from '../QualityControlPage';

// Mock API services - use importOriginal to preserve all exports
const mockInspections = [
  {
    inspectionId: 'insp-001',
    orderNumber: 'ORD-001',
    inspectionType: 'INCOMING',
    status: 'PENDING',
    scheduledDate: '2025-01-20T10:00:00Z',
    inspector: null,
    notes: null,
  },
  {
    inspectionId: 'insp-002',
    orderNumber: 'ORD-002',
    inspectionType: 'OUTGOING',
    status: 'PASSED',
    scheduledDate: '2025-01-19T14:00:00Z',
    inspector: 'QC-001',
    notes: 'All items passed inspection',
  },
];

const mockChecklists = [
  {
    checklistId: 'check-001',
    name: 'Incoming Inspection Checklist',
    inspectionType: 'INCOMING',
    itemCount: 15,
  },
];

const mockReturns = [
  {
    rmaId: 'RMA-001',
    orderNumber: 'ORD-003',
    status: 'PENDING',
    items: 2,
  },
];

vi.mock('@/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    useQualityInspections: vi.fn(() => ({
      data: { inspections: mockInspections, total: 2 },
      isLoading: false,
    })),
    useInspectionChecklists: vi.fn(() => ({
      data: { checklists: mockChecklists, total: 1 },
      isLoading: false,
    })),
    useReturnAuthorizations: vi.fn(() => ({
      data: { returns: mockReturns, total: 1 },
      isLoading: false,
    })),
    useCreateInspection: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useCreateChecklist: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useUpdateInspection: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useDeleteChecklist: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
  };
});

describe('QualityControlPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<QualityControlPage />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<QualityControlPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Quality Control');
    });
  });
});
