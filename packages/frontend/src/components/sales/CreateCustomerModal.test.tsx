/**
 * CreateCustomerModal Component Tests
 * @complexity medium
 * @tested yes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { CreateCustomerModal } from './CreateCustomerModal';

// Mock the API hooks
vi.mock('@/services/api', () => ({
  useCreateCustomer: vi.fn(),
}));

// Mock the toast hook
vi.mock('@/components/shared', async () => {
  const actual = await vi.importActual<typeof import('@/components/shared')>('@/components/shared');
  return {
    ...actual,
    useToast: vi.fn(() => ({ showToast: vi.fn() })),
  };
});

import { useCreateCustomer } from '@/services/api';
import { useToast } from '@/components/shared';

const mockMutateAsync = vi.fn();

describe('CreateCustomerModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateCustomer).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      mutate: vi.fn(),
    } as any);
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast } as any);
  });

  describe('Rendering', () => {
    it('renders modal when isOpen is true', () => {
      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      expect(screen.getByText('Create New Customer')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderWithProviders(
        <CreateCustomerModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      expect(screen.queryByText('Create New Customer')).not.toBeInTheDocument();
    });

    it('renders all form field labels', () => {
      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      expect(screen.getByText('Company Name')).toBeInTheDocument();
      expect(screen.getByText('Contact Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Create Customer')).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('updates company name input', () => {
      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      const input = screen.getByPlaceholderText('Enter company name');
      fireEvent.change(input, { target: { value: 'Test Company' } });
      expect(input).toHaveValue('Test Company');
    });

    it('updates contact name input', () => {
      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      const input = screen.getByPlaceholderText('Enter contact person name');
      fireEvent.change(input, { target: { value: 'John Doe' } });
      expect(input).toHaveValue('John Doe');
    });

    it('updates email input', () => {
      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      const input = screen.getByPlaceholderText('contact@company.com');
      fireEvent.change(input, { target: { value: 'test@example.com' } });
      expect(input).toHaveValue('test@example.com');
    });

    it('updates phone input', () => {
      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      const input = screen.getByPlaceholderText('+1 (555) 123-4567');
      fireEvent.change(input, { target: { value: '+1 555-123-4567' } });
      expect(input).toHaveValue('+1 555-123-4567');
    });
  });

  describe('Status Dropdown', () => {
    it('renders status dropdown with Prospect as default', () => {
      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      // Check that the status select exists and has PROSPECT as initial value
      const statusSelect = screen.getByDisplayValue('Prospect');
      expect(statusSelect).toBeInTheDocument();
    });
  });

  describe('Modal Actions', () => {
    it('calls onClose when Cancel button is clicked', () => {
      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('submits form and shows success toast on successful creation', async () => {
      mockMutateAsync.mockResolvedValue({ success: true });

      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('Enter company name'), {
        target: { value: 'Test Company' },
      });
      fireEvent.change(screen.getByPlaceholderText('Enter contact person name'), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByPlaceholderText('contact@company.com'), {
        target: { value: 'john@test.com' },
      });

      // Submit form
      fireEvent.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Customer created successfully', 'success');
      });
    });

    it('calls onSuccess callback after successful creation', async () => {
      mockMutateAsync.mockResolvedValue({ success: true });

      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('Enter company name'), {
        target: { value: 'Test Company' },
      });
      fireEvent.change(screen.getByPlaceholderText('Enter contact person name'), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByPlaceholderText('contact@company.com'), {
        target: { value: 'john@test.com' },
      });

      // Submit form
      fireEvent.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('shows error toast on failed creation', async () => {
      mockMutateAsync.mockRejectedValue({
        response: { data: { error: 'Customer already exists' } },
      });

      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('Enter company name'), {
        target: { value: 'Test Company' },
      });
      fireEvent.change(screen.getByPlaceholderText('Enter contact person name'), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByPlaceholderText('contact@company.com'), {
        target: { value: 'john@test.com' },
      });

      // Submit form
      fireEvent.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Customer already exists', 'error');
      });
    });

    it('does not call onSuccess when creation fails', async () => {
      mockMutateAsync.mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('Enter company name'), {
        target: { value: 'Test Company' },
      });
      fireEvent.change(screen.getByPlaceholderText('Enter contact person name'), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByPlaceholderText('contact@company.com'), {
        target: { value: 'john@test.com' },
      });

      // Submit form
      fireEvent.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Submitting State', () => {
    it('shows Creating... button text while submitting', async () => {
      // Mock a slow mutation
      mockMutateAsync.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('Enter company name'), {
        target: { value: 'Test Company' },
      });
      fireEvent.change(screen.getByPlaceholderText('Enter contact person name'), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByPlaceholderText('contact@company.com'), {
        target: { value: 'john@test.com' },
      });

      // Submit form
      fireEvent.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });
    });

    it('disables buttons while submitting', async () => {
      mockMutateAsync.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('Enter company name'), {
        target: { value: 'Test Company' },
      });
      fireEvent.change(screen.getByPlaceholderText('Enter contact person name'), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByPlaceholderText('contact@company.com'), {
        target: { value: 'john@test.com' },
      });

      // Submit form
      fireEvent.click(screen.getByText('Create Customer'));

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /Creating/i });
        expect(createButton).toBeDisabled();
      });
    });
  });

  describe('Form Reset', () => {
    it('calls onClose when modal closes', async () => {
      mockMutateAsync.mockResolvedValue({ success: true });

      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill in form
      const input = screen.getByPlaceholderText('Enter company name');
      fireEvent.change(input, { target: { value: 'Test Company' } });
      expect(input).toHaveValue('Test Company');

      // Close modal
      fireEvent.click(screen.getByText('Cancel'));

      // Modal should be closed (onClose called)
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Placeholder Text', () => {
    it('shows correct placeholders', () => {
      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      expect(screen.getByPlaceholderText('Enter company name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter contact person name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('contact@company.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('+1 (555) 123-4567')).toBeInTheDocument();
    });
  });

  describe('Initial Values', () => {
    it('initializes with empty form', () => {
      renderWithProviders(
        <CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );
      expect(screen.getByPlaceholderText('Enter company name')).toHaveValue('');
      expect(screen.getByPlaceholderText('Enter contact person name')).toHaveValue('');
      expect(screen.getByPlaceholderText('contact@company.com')).toHaveValue('');
      expect(screen.getByPlaceholderText('+1 (555) 123-4567')).toHaveValue('');
      expect(screen.getByDisplayValue('Prospect')).toBeInTheDocument();
    });
  });
});
