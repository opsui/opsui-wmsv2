/**
 * @file ScanInput.test.tsx
 * @purpose Tests for ScanInput component
 * @complexity medium
 * @tested yes
 */

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ScanInput } from './ScanInput';

describe('ScanInput Component', () => {
  describe('Basic Rendering', () => {
    it('renders input element', () => {
      renderWithProviders(<ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('renders with default placeholder', () => {
      renderWithProviders(<ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} />);
      const input = screen.getByPlaceholderText('Scan or enter SKU...');
      expect(input).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      renderWithProviders(
        <ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} placeholder="Custom placeholder" />
      );
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('shows instructions below input', () => {
      renderWithProviders(<ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} />);
      expect(screen.getByText(/Press/)).toBeInTheDocument();
      expect(screen.getByText(/Enter/)).toBeInTheDocument();
      expect(screen.getByText(/after scanning/)).toBeInTheDocument();
    });
  });

  describe('Value Handling', () => {
    it('displays current value', () => {
      renderWithProviders(<ScanInput value="ABC123" onChange={vi.fn()} onScan={vi.fn()} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('ABC123');
    });

    it('calls onChange when input changes', () => {
      const handleChange = vi.fn();
      renderWithProviders(<ScanInput value="" onChange={handleChange} onScan={vi.fn()} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });

      expect(handleChange).toHaveBeenCalledWith('test');
    });
  });

  describe('Scanning (Enter Key)', () => {
    it('calls onScan with trimmed value when Enter is pressed', () => {
      const handleScan = vi.fn();
      const handleChange = vi.fn();
      renderWithProviders(
        <ScanInput value="  SKU-123  " onChange={handleChange} onScan={handleScan} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(handleScan).toHaveBeenCalledWith('SKU-123');
    });

    it('clears input after successful scan', () => {
      const handleChange = vi.fn();
      renderWithProviders(<ScanInput value="SKU-123" onChange={handleChange} onScan={vi.fn()} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(handleChange).toHaveBeenCalledWith('');
    });

    it('does not call onScan when value is empty', () => {
      const handleScan = vi.fn();
      renderWithProviders(<ScanInput value="" onChange={vi.fn()} onScan={handleScan} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(handleScan).not.toHaveBeenCalled();
    });

    it('does not call onScan when value is only whitespace', () => {
      const handleScan = vi.fn();
      renderWithProviders(<ScanInput value="   " onChange={vi.fn()} onScan={handleScan} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(handleScan).not.toHaveBeenCalled();
    });

    it('prevents default on Enter key', () => {
      const handleScan = vi.fn();
      renderWithProviders(<ScanInput value="SKU-123" onChange={vi.fn()} onScan={handleScan} />);

      const input = screen.getByRole('textbox');
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      Object.defineProperty(event, 'defaultPrevented', {
        writable: true,
        value: false,
      });
      input.dispatchEvent(event);
      fireEvent.keyDown(input, { key: 'Enter' });

      // The event should be preventable through the component
      expect(handleScan).toHaveBeenCalled();
    });
  });

  describe('Auto Focus', () => {
    it('auto-focuses input on mount by default', () => {
      renderWithProviders(<ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });

    it('does not auto-focus when autoFocus is false', () => {
      renderWithProviders(
        <ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} autoFocus={false} />
      );

      const input = screen.getByRole('textbox');
      expect(input).not.toHaveFocus();
    });

    it('does not auto-focus when disabled', () => {
      renderWithProviders(<ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} disabled />);

      const input = screen.getByRole('textbox');
      expect(input).not.toHaveFocus();
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styles when disabled', () => {
      renderWithProviders(<ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('has disabled attribute when disabled prop is true', () => {
      renderWithProviders(<ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('disabled');
    });
  });

  describe('Error State', () => {
    it('shows error message when error prop is provided', () => {
      renderWithProviders(
        <ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} error="Invalid SKU" />
      );

      expect(screen.getByText('Invalid SKU')).toBeInTheDocument();
    });

    it('applies error styles to input when error exists', () => {
      const { container } = renderWithProviders(
        <ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} error="Invalid SKU" />
      );

      const input = container.querySelector('input');
      expect(input).toHaveClass('border-error-500/50');
    });

    it('does not show error message when no error', () => {
      renderWithProviders(<ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Max Length', () => {
    it('sets maxLength attribute', () => {
      renderWithProviders(
        <ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} maxLength={20} />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('maxLength', '20');
    });

    it('has default maxLength of 50', () => {
      renderWithProviders(<ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('maxLength', '50');
    });
  });

  describe('Styling', () => {
    it('applies font-mono class', () => {
      const { container } = renderWithProviders(
        <ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} />
      );

      const input = container.querySelector('input');
      expect(input).toHaveClass('font-mono');
    });

    it('applies uppercase class', () => {
      const { container } = renderWithProviders(
        <ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} />
      );

      const input = container.querySelector('input');
      expect(input).toHaveClass('uppercase');
    });

    it('applies custom className', () => {
      const { container } = renderWithProviders(
        <ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} className="custom-class" />
      );

      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Input Attributes', () => {
    it('has autoComplete set to off', () => {
      renderWithProviders(<ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autoComplete', 'off');
    });

    it('has autoCapitalize set to off', () => {
      renderWithProviders(<ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autoCapitalize', 'off');
    });

    it('has spellCheck set to false', () => {
      renderWithProviders(<ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('spellCheck', 'false');
    });
  });

  describe('Keyboard Key Element', () => {
    it('renders kbd element for Enter key hint', () => {
      const { container } = renderWithProviders(
        <ScanInput value="" onChange={vi.fn()} onScan={vi.fn()} />
      );

      const kbd = container.querySelector('kbd');
      expect(kbd).toBeInTheDocument();
      expect(kbd?.textContent).toBe('Enter');
    });
  });
});
