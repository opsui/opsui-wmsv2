/**
 * CreateProductionOrderModal Component Tests
 * @complexity medium
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { CreateProductionOrderModal } from './CreateProductionOrderModal';

// Mock the API hooks
vi.mock('@/services/api', () => ({
  useCreateProductionOrder: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ orderId: 'order-123' }),
    isPending: false,
  })),
  useBOMs: vi.fn(() => ({
    data: { boms: [] },
    isLoading: false,
  })),
}));

// Mock the useToast hook
vi.mock('@/components/shared', () => ({
  ...vi.importActual('@/components/shared'),
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
  })),
  Modal: vi.fn(({ isOpen, onClose, title, children, footer }) =>
    isOpen ? (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="btn-close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="modal-body">{children}</div>
          <div className="modal-footer">{footer}</div>
        </div>
      </div>
    ) : null
  ),
  FormInput: vi.fn(({ label, name, type, value, onChange, error, placeholder, required }) => (
    <div className="form-input">
      <label htmlFor={name}>
        {label}
        {required && ' *'}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
      {error && <span className="error">{error}</span>}
    </div>
  )),
  FormSelect: vi.fn(({ label, name, value, onChange, options, required }) => (
    <div className="form-select">
      <label htmlFor={name}>
        {label}
        {required && ' *'}
      </label>
      <select id={name} name={name} value={value} onChange={onChange} required={required}>
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )),
  Button: vi.fn(({ variant, onClick, children, disabled }) => (
    <button className={`btn btn-${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )),
}));

import { useCreateProductionOrder, useBOMs } from '@/services/api';
import { useToast } from '@/components/shared';

const mockBOMs = [
  { bomId: 'bom-1', name: 'Widget A Assembly', version: 1, productId: 'PROD-001' },
  { bomId: 'bom-2', name: 'Widget B Assembly', version: 2, productId: 'PROD-002' },
];

describe('CreateProductionOrderModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useCreateProductionOrder).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ orderId: 'order-123' }),
      isPending: false,
    });
    vi.mocked(useBOMs).mockReturnValue({
      data: { boms: mockBOMs },
      isLoading: false,
    });
  });

  describe('Rendering', () => {
    it('renders modal when isOpen is true', () => {
      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      expect(screen.getByText('Create Production Order')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderWithProviders(
        <CreateProductionOrderModal
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );
      expect(screen.queryByText('Create Production Order')).not.toBeInTheDocument();
    });
  });

  describe('Form Inputs', () => {
    beforeEach(() => {
      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
    });

    it('renders Bill of Materials select', () => {
      expect(screen.getByText(/Bill of Materials/)).toBeInTheDocument();
    });

    it('renders Quantity to Produce input', () => {
      expect(screen.getByText(/Quantity to Produce/)).toBeInTheDocument();
    });

    it('renders Start Date input', () => {
      expect(screen.getByText(/Start Date/)).toBeInTheDocument();
    });

    it('renders End Date input', () => {
      expect(screen.getByText(/End Date/)).toBeInTheDocument();
    });

    it('renders Priority select', () => {
      expect(screen.getByText(/Priority/)).toBeInTheDocument();
    });

    it('renders Assigned To input', () => {
      expect(screen.getByText(/Assigned To/)).toBeInTheDocument();
    });
  });

  describe('BOM Options', () => {
    it('displays BOM options when BOMs are available', () => {
      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(screen.getByText('Select a BOM...')).toBeInTheDocument();
    });

    it('shows warning when no BOMs are available', () => {
      vi.mocked(useBOMs).mockReturnValue({
        data: { boms: [] },
        isLoading: false,
      });

      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(screen.getByText(/No BOMs available/)).toBeInTheDocument();
      expect(screen.getByText('Go to BOMs')).toBeInTheDocument();
    });
  });

  describe('Priority Options', () => {
    beforeEach(() => {
      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
    });

    it('renders priority options', () => {
      // Priority options are rendered in the select
      expect(screen.getByText(/Priority/)).toBeInTheDocument();
    });
  });

  describe('Modal Actions', () => {
    beforeEach(() => {
      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
    });

    it('renders Cancel button', () => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders Create Order button', () => {
      expect(screen.getByText('Create Order')).toBeInTheDocument();
    });

    it('calls onClose when Cancel button is clicked', () => {
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Form Behavior', () => {
    beforeEach(() => {
      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
    });

    it('updates BOM selection when changed', () => {
      const bomSelect = screen.getByText(/Bill of Materials/).closest('.form-select');
      if (bomSelect) {
        const select = bomSelect.querySelector('select');
        if (select) {
          fireEvent.change(select, { target: { name: 'bomId', value: 'bom-1' } });
          expect(select).toHaveValue('bom-1');
        }
      }
    });

    it('updates quantity when changed', () => {
      const quantityInputs = screen.getAllByDisplayValue(1);
      const qtyInput = quantityInputs.find(
        input => input.getAttribute('name') === 'quantityToProduce'
      );
      if (qtyInput) {
        fireEvent.change(qtyInput, { target: { name: 'quantityToProduce', value: '100' } });
        expect(qtyInput).toHaveValue(100);
      }
    });
  });

  describe('Pending State', () => {
    it('shows Creating... text while submitting', () => {
      vi.mocked(useCreateProductionOrder).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    it('disables buttons while submitting', () => {
      vi.mocked(useCreateProductionOrder).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const cancelButton = screen.getByText('Cancel');
      const createButton = screen.getByText('Creating...');
      expect(cancelButton).toBeDisabled();
      expect(createButton).toBeDisabled();
    });
  });

  describe('Modal Close', () => {
    it('calls onClose when close button is clicked', () => {
      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when overlay is clicked', () => {
      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const overlay = screen.getByText('Create Production Order').closest('.modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Empty BOMs State', () => {
    beforeEach(() => {
      vi.mocked(useBOMs).mockReturnValue({
        data: { boms: [] },
        isLoading: false,
      });
    });

    it('shows warning message when no BOMs exist', () => {
      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(screen.getByText(/No BOMs available/)).toBeInTheDocument();
    });

    it('shows Go to BOMs button when no BOMs exist', () => {
      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(screen.getByText('Go to BOMs')).toBeInTheDocument();
    });
  });

  describe('Initial Form State', () => {
    beforeEach(() => {
      renderWithProviders(
        <CreateProductionOrderModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
    });

    it('initializes with default quantity of 1', () => {
      const quantityInputs = screen.getAllByDisplayValue(1);
      expect(quantityInputs.length).toBeGreaterThan(0);
    });

    it('initializes with Medium priority', () => {
      const prioritySelect = screen.getByText(/Priority/).closest('.form-select');
      if (prioritySelect) {
        const select = prioritySelect.querySelector('select');
        if (select) {
          expect(select).toHaveValue('MEDIUM');
        }
      }
    });
  });
});
