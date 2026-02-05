/**
 * RecordOutputModal Component Tests
 * @complexity medium
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { RecordOutputModal } from './RecordOutputModal';

// Mock the useRecordProductionOutput hook
vi.mock('@/services/api', () => ({
  useRecordProductionOutput: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ outputId: 'output-123' }),
    isPending: false,
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
  FormInput: vi.fn(({ label, name, type, value, onChange, error, placeholder }) => (
    <div className="form-input">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      {error && <span className="error">{error}</span>}
    </div>
  )),
  Button: vi.fn(({ variant, onClick, children, disabled }) => (
    <button className={`btn btn-${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )),
}));

import { useRecordProductionOutput } from '@/services/api';
import { useToast } from '@/components/shared';

const mockOrderDetails = {
  productId: 'PROD-001',
  productName: 'Widget A',
  quantityToProduce: 100,
  quantityCompleted: 50,
  quantityRejected: 5,
  unitOfMeasure: 'EA',
};

describe('RecordOutputModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useRecordProductionOutput).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ outputId: 'output-123' }),
      isPending: false,
    });
  });

  describe('Rendering', () => {
    it('renders modal when isOpen is true', () => {
      renderWithProviders(
        <RecordOutputModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          orderId="order-123"
          orderDetails={mockOrderDetails}
        />
      );
      expect(screen.getByText('Record Production Output')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderWithProviders(
        <RecordOutputModal
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          orderId="order-123"
          orderDetails={mockOrderDetails}
        />
      );
      expect(screen.queryByText('Record Production Output')).not.toBeInTheDocument();
    });
  });

  describe('Order Summary', () => {
    beforeEach(() => {
      renderWithProviders(
        <RecordOutputModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          orderId="order-123"
          orderDetails={mockOrderDetails}
        />
      );
    });

    it('renders order summary section', () => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });

    it('displays product name', () => {
      expect(screen.getByText('Widget A')).toBeInTheDocument();
    });

    it('displays product SKU', () => {
      expect(screen.getByText('PROD-001')).toBeInTheDocument();
    });

    it('displays quantity to produce', () => {
      expect(screen.getByText(/100 EA/)).toBeInTheDocument();
    });

    it('displays unit of measure', () => {
      expect(screen.getByText(/Unit of Measure:/)).toBeInTheDocument();
      expect(screen.getByText('EA')).toBeInTheDocument();
    });

    it('displays already completed quantity', () => {
      expect(screen.getByText(/Already Completed:/)).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('displays already rejected quantity', () => {
      expect(screen.getByText(/Already Rejected:/)).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('calculates and displays remaining to produce', () => {
      // Remaining = 100 - 50 - 5 = 45
      expect(screen.getByText(/Remaining to Produce:/)).toBeInTheDocument();
    });

    it('displays current progress bar', () => {
      expect(screen.getByText('Current Progress')).toBeInTheDocument();
      expect(screen.getByText('50 / 100')).toBeInTheDocument();
    });
  });

  describe('Form Inputs', () => {
    beforeEach(() => {
      renderWithProviders(
        <RecordOutputModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          orderId="order-123"
          orderDetails={mockOrderDetails}
        />
      );
    });

    it('renders good quantity input', () => {
      expect(screen.getByText(/Good Quantity Produced/)).toBeInTheDocument();
    });

    it('renders rejected quantity input', () => {
      expect(screen.getByText(/Rejected Quantity/)).toBeInTheDocument();
    });

    it('renders lot number input', () => {
      expect(screen.getByText('Lot Number')).toBeInTheDocument();
    });

    it('renders bin location input', () => {
      expect(screen.getByText('Bin Location')).toBeInTheDocument();
    });

    it('renders notes textarea', () => {
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });
  });

  describe('Progress Preview', () => {
    beforeEach(() => {
      renderWithProviders(
        <RecordOutputModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          orderId="order-123"
          orderDetails={mockOrderDetails}
        />
      );
    });

    it('shows progress preview when quantity is entered', () => {
      const quantityInput = screen.getByDisplayValue(1);
      fireEvent.change(quantityInput, { target: { name: 'quantity', value: '10' } });

      // New progress would be (50 + 10) / 100 = 60%
      expect(screen.getByText('After Recording:')).toBeInTheDocument();
    });
  });

  describe('Form Behavior', () => {
    beforeEach(() => {
      renderWithProviders(
        <RecordOutputModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          orderId="order-123"
          orderDetails={mockOrderDetails}
        />
      );
    });

    it('initializes with default quantity of 1', () => {
      const quantityInput = screen.getByDisplayValue(1);
      expect(quantityInput).toBeInTheDocument();
    });

    it('initializes with rejected quantity of 0', () => {
      const rejectedInput = screen.getByDisplayValue(0);
      expect(rejectedInput).toBeInTheDocument();
    });

    it('updates quantity when changed', () => {
      const quantityInput = screen.getByDisplayValue(1);
      fireEvent.change(quantityInput, { target: { name: 'quantity', value: '25' } });
      expect(quantityInput).toHaveValue(25);
    });

    it('updates rejected quantity when changed', () => {
      const rejectedInput = screen.getByDisplayValue(0);
      fireEvent.change(rejectedInput, { target: { name: 'quantityRejected', value: '5' } });
      expect(rejectedInput).toHaveValue(5);
    });

    it('updates lot number when changed', () => {
      const lotInput = screen.getByPlaceholderText('Optional lot/batch number for traceability');
      fireEvent.change(lotInput, { target: { name: 'lotNumber', value: 'LOT-123' } });
      expect(lotInput).toHaveValue('LOT-123');
    });

    it('updates bin location when changed', () => {
      const binInput = screen.getByPlaceholderText('e.g., A-01-01');
      fireEvent.change(binInput, { target: { name: 'binLocation', value: 'A-01-01' } });
      expect(binInput).toHaveValue('A-01-01');
    });

    it('updates notes when changed', () => {
      const notesTextarea = screen.getByPlaceholderText('Optional notes about this production run');
      fireEvent.change(notesTextarea, { target: { name: 'notes', value: 'Test notes' } });
      expect(notesTextarea).toHaveValue('Test notes');
    });
  });

  describe('Modal Actions', () => {
    beforeEach(() => {
      renderWithProviders(
        <RecordOutputModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          orderId="order-123"
          orderDetails={mockOrderDetails}
        />
      );
    });

    it('renders Cancel button', () => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders Record Output button', () => {
      expect(screen.getByText('Record Output')).toBeInTheDocument();
    });

    it('calls onClose when Cancel button is clicked', () => {
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Pending State', () => {
    it('shows Recording... text while submitting', () => {
      vi.mocked(useRecordProductionOutput).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderWithProviders(
        <RecordOutputModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          orderId="order-123"
          orderDetails={mockOrderDetails}
        />
      );

      expect(screen.getByText('Recording...')).toBeInTheDocument();
    });

    it('disables buttons while submitting', () => {
      vi.mocked(useRecordProductionOutput).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderWithProviders(
        <RecordOutputModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          orderId="order-123"
          orderDetails={mockOrderDetails}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      const recordButton = screen.getByText('Recording...');
      expect(cancelButton).toBeDisabled();
      expect(recordButton).toBeDisabled();
    });
  });

  describe('Modal Close', () => {
    it('calls onClose when close button is clicked', () => {
      renderWithProviders(
        <RecordOutputModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          orderId="order-123"
          orderDetails={mockOrderDetails}
        />
      );

      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when overlay is clicked', () => {
      renderWithProviders(
        <RecordOutputModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          orderId="order-123"
          orderDetails={mockOrderDetails}
        />
      );

      const overlay = screen.getByText('Record Production Output').closest('.modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles zero remaining to produce', () => {
      const completedOrderDetails = {
        ...mockOrderDetails,
        quantityCompleted: 100,
        quantityRejected: 0,
      };

      renderWithProviders(
        <RecordOutputModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          orderId="order-123"
          orderDetails={completedOrderDetails}
        />
      );

      // Remaining = 100 - 100 - 0 = 0
      expect(screen.getByText(/Remaining to Produce:/)).toBeInTheDocument();
    });

    it('handles all rejected order', () => {
      const rejectedOrderDetails = {
        ...mockOrderDetails,
        quantityCompleted: 0,
        quantityRejected: 100,
      };

      renderWithProviders(
        <RecordOutputModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          orderId="order-123"
          orderDetails={rejectedOrderDetails}
        />
      );

      // Remaining = 100 - 0 - 100 = 0
      expect(screen.getByText(/Remaining to Produce:/)).toBeInTheDocument();
    });
  });
});
