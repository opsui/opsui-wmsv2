/**
 * @file Modal.test.tsx
 * @purpose Tests for Modal component and form components
 * @complexity medium
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { Modal, FormInput, FormTextarea, FormSelect } from './Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal Content</div>,
  };

  describe('Basic Rendering', () => {
    it('does not render when isOpen is false', () => {
      renderWithProviders(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      renderWithProviders(<Modal {...defaultProps} />);
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('renders backdrop', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} />);
      const backdrop = container.querySelector('.bg-black\\/60');
      expect(backdrop).toBeInTheDocument();
    });

    it('renders close button', () => {
      renderWithProviders(<Modal {...defaultProps} />);
      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Modal Sizes', () => {
    it('applies small size styles', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} size="sm" />);
      const modal = container.querySelector('.glass-card');
      expect(modal).toHaveClass('max-w-md');
    });

    it('applies medium size styles by default', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} size="md" />);
      const modal = container.querySelector('.glass-card');
      expect(modal).toHaveClass('max-w-lg');
    });

    it('applies large size styles', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} size="lg" />);
      const modal = container.querySelector('.glass-card');
      expect(modal).toHaveClass('max-w-2xl');
    });

    it('applies extra large size styles', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} size="xl" />);
      const modal = container.querySelector('.glass-card');
      expect(modal).toHaveClass('max-w-4xl');
    });
  });

  describe('Modal Footer', () => {
    it('renders footer when provided', () => {
      const footer = <button>Save</button>;
      renderWithProviders(<Modal {...defaultProps} footer={footer} />);
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('does not render footer section when not provided', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} />);
      const footerSection = container.querySelector('.border-t');
      expect(footerSection).not.toBeInTheDocument();
    });
  });

  describe('Modal Close Behavior', () => {
    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      renderWithProviders(<Modal {...defaultProps} onClose={handleClose} />);

      fireEvent.click(screen.getByLabelText('Close'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const handleClose = vi.fn();
      const { container } = renderWithProviders(<Modal {...defaultProps} onClose={handleClose} />);

      const backdrop = container.querySelector('.bg-black\\/60');
      fireEvent.click(backdrop!);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', () => {
      const handleClose = vi.fn();
      const { container } = renderWithProviders(<Modal {...defaultProps} onClose={handleClose} />);

      const modal = container.querySelector('.glass-card');
      fireEvent.click(modal!);
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', () => {
      const handleClose = vi.fn();
      renderWithProviders(<Modal {...defaultProps} onClose={handleClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when other keys are pressed', () => {
      const handleClose = vi.fn();
      renderWithProviders(<Modal {...defaultProps} onClose={handleClose} />);

      fireEvent.keyDown(document, { key: 'Enter' });
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Lock', () => {
    afterEach(() => {
      document.body.style.overflow = 'unset';
    });

    it('locks body scroll when modal is open', () => {
      renderWithProviders(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('unlocks body scroll when modal is closed', () => {
      const { rerender } = renderWithProviders(<Modal {...defaultProps} />);
      rerender(<Modal {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Modal Styling', () => {
    it('merges custom className', () => {
      const { container } = renderWithProviders(
        <Modal {...defaultProps} className="custom-modal" />
      );
      const modal = container.querySelector('.glass-card');
      expect(modal).toHaveClass('custom-modal');
    });

    it('applies glass-card styling', () => {
      const { container } = renderWithProviders(<Modal {...defaultProps} />);
      const modal = container.querySelector('.glass-card');
      expect(modal).toHaveClass('glass-card', 'rounded-2xl', 'shadow-2xl');
    });
  });

  describe('Modal with Complex Content', () => {
    it('renders form elements in modal content', () => {
      renderWithProviders(
        <Modal {...defaultProps}>
          <form>
            <input type="text" placeholder="Name" />
            <button type="submit">Submit</button>
          </form>
        </Modal>
      );

      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });
  });
});

describe('FormInput Component', () => {
  const defaultProps = {
    label: 'Test Label',
    name: 'test-input',
    value: 'test value',
    onChange: vi.fn(),
  };

  describe('Basic Rendering', () => {
    it('renders label and input', () => {
      renderWithProviders(<FormInput {...defaultProps} />);
      expect(screen.getByText('Test Label')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('associates label with input via htmlFor', () => {
      renderWithProviders(<FormInput {...defaultProps} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'test-input');
    });

    it('renders input with correct value', () => {
      renderWithProviders(<FormInput {...defaultProps} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('test value');
    });
  });

  describe('Input Types', () => {
    it('renders text input by default', () => {
      const { container } = renderWithProviders(<FormInput {...defaultProps} />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('renders email input', () => {
      const { container } = renderWithProviders(<FormInput {...defaultProps} type="email" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders number input', () => {
      const { container } = renderWithProviders(<FormInput {...defaultProps} type="number" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('renders password input', () => {
      const { container } = renderWithProviders(<FormInput {...defaultProps} type="password" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('renders tel input', () => {
      const { container } = renderWithProviders(<FormInput {...defaultProps} type="tel" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'tel');
    });

    it('renders date input', () => {
      const { container } = renderWithProviders(<FormInput {...defaultProps} type="date" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'date');
    });
  });

  describe('Required Indicator', () => {
    it('shows asterisk when required', () => {
      renderWithProviders(<FormInput {...defaultProps} required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('does not show asterisk when not required', () => {
      renderWithProviders(<FormInput {...defaultProps} required={false} />);
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error message when error is provided', () => {
      renderWithProviders(<FormInput {...defaultProps} error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('applies error styles when error exists', () => {
      const { container } = renderWithProviders(<FormInput {...defaultProps} error="Error" />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('border-error-500/50');
    });
  });

  describe('Input Events', () => {
    it('calls onChange when input value changes', () => {
      const handleChange = vi.fn();
      renderWithProviders(<FormInput {...defaultProps} onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });

      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when input loses focus', () => {
      const handleBlur = vi.fn();
      renderWithProviders(<FormInput {...defaultProps} onBlur={handleBlur} />);

      const input = screen.getByRole('textbox');
      fireEvent.blur(input);

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styles when disabled', () => {
      const { container } = renderWithProviders(<FormInput {...defaultProps} disabled />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('has disabled attribute when disabled', () => {
      renderWithProviders(<FormInput {...defaultProps} disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('Placeholder', () => {
    it('renders placeholder text', () => {
      renderWithProviders(<FormInput {...defaultProps} placeholder="Enter value..." />);
      const input = screen.getByPlaceholderText('Enter value...');
      expect(input).toBeInTheDocument();
    });
  });
});

describe('FormTextarea Component', () => {
  const defaultProps = {
    label: 'Test Textarea',
    name: 'test-textarea',
    value: 'test value',
    onChange: vi.fn(),
  };

  describe('Basic Rendering', () => {
    it('renders label and textarea', () => {
      renderWithProviders(<FormTextarea {...defaultProps} />);
      expect(screen.getByText('Test Textarea')).toBeInTheDocument();
    });

    it('associates label with textarea via htmlFor', () => {
      renderWithProviders(<FormTextarea {...defaultProps} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('id', 'test-textarea');
    });

    it('renders textarea with correct value', () => {
      renderWithProviders(<FormTextarea {...defaultProps} />);
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('test value');
    });
  });

  describe('Textarea Rows', () => {
    it('renders with default 4 rows', () => {
      const { container } = renderWithProviders(<FormTextarea {...defaultProps} />);
      const textarea = container.querySelector('textarea');
      expect(textarea).toHaveAttribute('rows', '4');
    });

    it('renders with custom rows', () => {
      const { container } = renderWithProviders(<FormTextarea {...defaultProps} rows={8} />);
      const textarea = container.querySelector('textarea');
      expect(textarea).toHaveAttribute('rows', '8');
    });
  });

  describe('Textarea Events', () => {
    it('calls onChange when textarea value changes', () => {
      const handleChange = vi.fn();
      renderWithProviders(<FormTextarea {...defaultProps} onChange={handleChange} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'new value' } });

      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when textarea loses focus', () => {
      const handleBlur = vi.fn();
      renderWithProviders(<FormTextarea {...defaultProps} onBlur={handleBlur} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.blur(textarea);

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });
});

describe('FormSelect Component', () => {
  const defaultProps = {
    label: 'Test Select',
    name: 'test-select',
    value: 'option1',
    onChange: vi.fn(),
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ],
  };

  describe('Basic Rendering', () => {
    it('renders label and select', () => {
      renderWithProviders(<FormSelect {...defaultProps} />);
      expect(screen.getByText('Test Select')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('associates label with select via htmlFor', () => {
      renderWithProviders(<FormSelect {...defaultProps} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('id', 'test-select');
    });

    it('renders all options', () => {
      const { container } = renderWithProviders(<FormSelect {...defaultProps} />);
      const options = container.querySelectorAll('option');
      expect(options).toHaveLength(3);
    });

    it('renders option labels', () => {
      renderWithProviders(<FormSelect {...defaultProps} />);
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });
  });

  describe('Selected Value', () => {
    it('has correct selected value', () => {
      renderWithProviders(<FormSelect {...defaultProps} value="option2" />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option2');
    });
  });

  describe('Select Events', () => {
    it('calls onChange when selection changes', () => {
      const handleChange = vi.fn();
      renderWithProviders(<FormSelect {...defaultProps} onChange={handleChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'option2' } });

      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when select loses focus', () => {
      const handleBlur = vi.fn();
      renderWithProviders(<FormSelect {...defaultProps} onBlur={handleBlur} />);

      const select = screen.getByRole('combobox');
      fireEvent.blur(select);

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });
});
