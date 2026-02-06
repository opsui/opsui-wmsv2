/**
 * @file ConfirmDialog.test.tsx
 * @purpose Tests for ConfirmDialog and AlertDialog components
 * @complexity medium
 * @tested yes
 */

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ConfirmDialog, AlertDialog } from './ConfirmDialog';

describe('ConfirmDialog Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  };

  describe('Conditional Rendering', () => {
    it('does not render when isOpen is false', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });
  });

  describe('Basic Rendering', () => {
    it('renders title', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('renders message', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('renders confirm button with default text', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('renders cancel button with default text', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders icon', () => {
      const { container } = renderWithProviders(<ConfirmDialog {...defaultProps} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Custom Button Text', () => {
    it('renders custom confirm text', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} confirmText="Yes, delete it" />);
      expect(screen.getByText('Yes, delete it')).toBeInTheDocument();
    });

    it('renders custom cancel text', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} cancelText="No, keep it" />);
      expect(screen.getByText('No, keep it')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies warning variant styles by default', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} variant="warning" />);
      const button = screen.getByText('Confirm');
      expect(button).toHaveClass('bg-warning-600');
    });

    it('applies danger variant styles', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} variant="danger" />);
      const button = screen.getByText('Confirm');
      expect(button).toHaveClass('bg-error-600');
    });

    it('applies info variant styles', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} variant="info" />);
      const button = screen.getByText('Confirm');
      expect(button).toHaveClass('bg-info-600');
    });

    it('applies success variant styles', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} variant="success" />);
      const button = screen.getByText('Confirm');
      expect(button).toHaveClass('bg-success-600');
    });
  });

  describe('Loading State', () => {
    it('shows spinner when loading', () => {
      const { container } = renderWithProviders(<ConfirmDialog {...defaultProps} isLoading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('disables buttons when loading', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} isLoading />);
      const confirmBtn = screen.getByText('Confirm');
      const cancelBtn = screen.getByText('Cancel');
      expect(confirmBtn).toBeDisabled();
      expect(cancelBtn).toBeDisabled();
    });

    it('does not call onConfirm when clicked while loading', () => {
      const handleConfirm = vi.fn();
      renderWithProviders(<ConfirmDialog {...defaultProps} onConfirm={handleConfirm} isLoading />);

      fireEvent.click(screen.getByText('Confirm'));

      expect(handleConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Button Interactions', () => {
    it('calls onConfirm when confirm button is clicked', () => {
      const handleConfirm = vi.fn();
      renderWithProviders(<ConfirmDialog {...defaultProps} onConfirm={handleConfirm} />);

      fireEvent.click(screen.getByText('Confirm'));

      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button is clicked', () => {
      const handleClose = vi.fn();
      renderWithProviders(<ConfirmDialog {...defaultProps} onClose={handleClose} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const handleClose = vi.fn();
      const { container } = renderWithProviders(
        <ConfirmDialog {...defaultProps} onClose={handleClose} />
      );

      const backdrop = container.querySelector('.bg-black\\/60');
      fireEvent.click(backdrop!);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', () => {
      const handleClose = vi.fn();
      const { container } = renderWithProviders(
        <ConfirmDialog {...defaultProps} onClose={handleClose} />
      );

      const modal = container.querySelector('.glass-card');
      fireEvent.click(modal!);

      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Layout', () => {
    it('has fixed inset positioning', () => {
      const { container } = renderWithProviders(<ConfirmDialog {...defaultProps} />);
      const wrapper = container.querySelector('.fixed.inset-0');
      expect(wrapper).toBeInTheDocument();
    });

    it('has z-50 for high z-index', () => {
      const { container } = renderWithProviders(<ConfirmDialog {...defaultProps} />);
      const wrapper = container.querySelector('.z-50');
      expect(wrapper).toBeInTheDocument();
    });

    it('has centered modal', () => {
      const { container } = renderWithProviders(<ConfirmDialog {...defaultProps} />);
      const center = container.querySelector('.items-center.justify-center');
      expect(center).toBeInTheDocument();
    });
  });

  describe('Backdrop', () => {
    it('renders backdrop', () => {
      const { container } = renderWithProviders(<ConfirmDialog {...defaultProps} />);
      const backdrop = container.querySelector('.bg-black\\/60');
      expect(backdrop).toBeInTheDocument();
    });

    it('has backdrop blur', () => {
      const { container } = renderWithProviders(<ConfirmDialog {...defaultProps} />);
      const backdrop = container.querySelector('.backdrop-blur-sm');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Modal Styling', () => {
    it('has glass card styling', () => {
      const { container } = renderWithProviders(<ConfirmDialog {...defaultProps} />);
      const modal = container.querySelector('.glass-card');
      expect(modal).toBeInTheDocument();
    });

    it('has rounded corners', () => {
      const { container } = renderWithProviders(<ConfirmDialog {...defaultProps} />);
      const modal = container.querySelector('.rounded-2xl');
      expect(modal).toBeInTheDocument();
    });

    it('has shadow', () => {
      const { container } = renderWithProviders(<ConfirmDialog {...defaultProps} />);
      const modal = container.querySelector('.shadow-2xl');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Icon Styling', () => {
    it('has rounded icon container', () => {
      const { container } = renderWithProviders(<ConfirmDialog {...defaultProps} />);
      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toBeInTheDocument();
    });

    it('has correct icon size', () => {
      const { container } = renderWithProviders(<ConfirmDialog {...defaultProps} />);
      const icon = container.querySelector('.h-8.w-8');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Message as ReactNode', () => {
    it('renders message as string', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} message="String message" />);
      expect(screen.getByText('String message')).toBeInTheDocument();
    });

    it('renders message as ReactNode', () => {
      renderWithProviders(
        <ConfirmDialog
          {...defaultProps}
          message={
            <div>
              <p>Line 1</p>
              <p>Line 2</p>
            </div>
          }
        />
      );
      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
    });
  });

  describe('Button Styling', () => {
    it('confirm button has proper styling', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} />);
      const confirmBtn = screen.getByText('Confirm');
      expect(confirmBtn).toHaveClass('px-4', 'py-2.5', 'rounded-lg', 'text-sm', 'font-medium');
    });

    it('cancel button has proper styling', () => {
      renderWithProviders(<ConfirmDialog {...defaultProps} />);
      const cancelBtn = screen.getByText('Cancel');
      expect(cancelBtn).toHaveClass('px-4', 'py-2.5', 'rounded-lg', 'text-sm', 'font-medium');
    });
  });
});

describe('AlertDialog Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Information',
    message: 'This is important information',
  };

  describe('Conditional Rendering', () => {
    it('does not render when isOpen is false', () => {
      renderWithProviders(<AlertDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Information')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', () => {
      renderWithProviders(<AlertDialog {...defaultProps} />);
      expect(screen.getByText('Information')).toBeInTheDocument();
    });
  });

  describe('Basic Rendering', () => {
    it('renders title', () => {
      renderWithProviders(<AlertDialog {...defaultProps} />);
      expect(screen.getByText('Information')).toBeInTheDocument();
    });

    it('renders message', () => {
      renderWithProviders(<AlertDialog {...defaultProps} />);
      expect(screen.getByText('This is important information')).toBeInTheDocument();
    });

    it('renders OK button with default text', () => {
      renderWithProviders(<AlertDialog {...defaultProps} />);
      expect(screen.getByText('OK')).toBeInTheDocument();
    });

    it('renders custom button text', () => {
      renderWithProviders(<AlertDialog {...defaultProps} buttonText="Got it" />);
      expect(screen.getByText('Got it')).toBeInTheDocument();
    });

    it('has only one button', () => {
      renderWithProviders(<AlertDialog {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      // Filter out the close button if present
      const actionButtons = buttons.filter(btn => btn.textContent === 'OK');
      expect(actionButtons.length).toBe(1);
    });
  });

  describe('Variants', () => {
    it('applies warning variant styles', () => {
      renderWithProviders(<AlertDialog {...defaultProps} variant="warning" />);
      const button = screen.getByText('OK');
      expect(button).toHaveClass('bg-warning-600');
    });

    it('applies danger variant styles', () => {
      renderWithProviders(<AlertDialog {...defaultProps} variant="danger" />);
      const button = screen.getByText('OK');
      expect(button).toHaveClass('bg-error-600');
    });

    it('applies info variant styles by default', () => {
      renderWithProviders(<AlertDialog {...defaultProps} variant="info" />);
      const button = screen.getByText('OK');
      expect(button).toHaveClass('bg-info-600');
    });

    it('applies success variant styles', () => {
      renderWithProviders(<AlertDialog {...defaultProps} variant="success" />);
      const button = screen.getByText('OK');
      expect(button).toHaveClass('bg-success-600');
    });
  });

  describe('Button Interaction', () => {
    it('calls onClose when OK button is clicked', () => {
      const handleClose = vi.fn();
      renderWithProviders(<AlertDialog {...defaultProps} onClose={handleClose} />);

      fireEvent.click(screen.getByText('OK'));

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const handleClose = vi.fn();
      const { container } = renderWithProviders(
        <AlertDialog {...defaultProps} onClose={handleClose} />
      );

      const backdrop = container.querySelector('.bg-black\\/60');
      fireEvent.click(backdrop!);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message as ReactNode', () => {
    it('renders message as ReactNode', () => {
      renderWithProviders(
        <AlertDialog
          {...defaultProps}
          message={
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          }
        />
      );
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('has same fixed positioning as ConfirmDialog', () => {
      const { container } = renderWithProviders(<AlertDialog {...defaultProps} />);
      const wrapper = container.querySelector('.fixed.inset-0');
      expect(wrapper).toBeInTheDocument();
    });

    it('has centered modal', () => {
      const { container } = renderWithProviders(<AlertDialog {...defaultProps} />);
      const center = container.querySelector('.items-center.justify-center');
      expect(center).toBeInTheDocument();
    });
  });

  describe('Modal Styling', () => {
    it('has glass card styling', () => {
      const { container } = renderWithProviders(<AlertDialog {...defaultProps} />);
      const modal = container.querySelector('.glass-card');
      expect(modal).toBeInTheDocument();
    });

    it('has rounded corners', () => {
      const { container } = renderWithProviders(<AlertDialog {...defaultProps} />);
      const modal = container.querySelector('.rounded-2xl');
      expect(modal).toBeInTheDocument();
    });
  });
});
