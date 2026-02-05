/**
 * @file Input.test.tsx
 * @purpose Tests for Input component
 * @complexity low
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { Input } from './Input';

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('renders input element', () => {
      renderWithProviders(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('renders with default type="text"', () => {
      const { container } = renderWithProviders(<Input />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('renders with custom type', () => {
      const { container } = renderWithProviders(<Input type="email" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders with number type', () => {
      const { container } = renderWithProviders(<Input type="number" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('renders with password type', () => {
      const { container } = renderWithProviders(<Input type="password" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('renders with search type', () => {
      const { container } = renderWithProviders(<Input type="search" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'search');
    });
  });

  describe('Input Value and Changes', () => {
    it('renders with initial value', () => {
      renderWithProviders(<Input defaultValue="Initial Value" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('Initial Value');
    });

    it('renders with controlled value', () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('controlled');
        return <Input value={value} onChange={e => setValue(e.target.value)} />;
      };
      renderWithProviders(<TestComponent />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('controlled');
    });

    it('calls onChange handler when value changes', () => {
      const handleChange = vi.fn();
      renderWithProviders(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'New Value' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('updates value on user input', () => {
      renderWithProviders(<Input />);
      const input = screen.getByRole('textbox') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'test input' } });
      expect(input.value).toBe('test input');
    });
  });

  describe('Input Placeholder', () => {
    it('renders with placeholder text', () => {
      renderWithProviders(<Input placeholder="Enter text..." />);
      const input = screen.getByPlaceholderText('Enter text...');
      expect(input).toBeInTheDocument();
    });

    it('shows placeholder when value is empty', () => {
      renderWithProviders(<Input placeholder="Placeholder" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Placeholder');
    });
  });

  describe('Input Disabled State', () => {
    it('applies disabled styles when disabled', () => {
      const { container } = renderWithProviders(<Input disabled />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('has disabled attribute', () => {
      renderWithProviders(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('Input Required State', () => {
    it('has required attribute when required', () => {
      renderWithProviders(<Input required />);
      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });
  });

  describe('Input Read-only State', () => {
    it('has readOnly attribute when readOnly', () => {
      renderWithProviders(<Input readOnly />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readOnly');
    });
  });

  describe('Input Validation Attributes', () => {
    it('renders with min attribute for number type', () => {
      const { container } = renderWithProviders(<Input type="number" min={0} />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('min', '0');
    });

    it('renders with max attribute for number type', () => {
      const { container } = renderWithProviders(<Input type="number" max={100} />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('max', '100');
    });

    it('renders with step attribute for number type', () => {
      const { container } = renderWithProviders(<Input type="number" step={0.01} />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('step', '0.01');
    });

    it('renders with minLength attribute', () => {
      const { container } = renderWithProviders(<Input minLength={5} />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('minlength', '5');
    });

    it('renders with maxLength attribute', () => {
      const { container } = renderWithProviders(<Input maxLength={50} />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('maxlength', '50');
    });

    it('renders with pattern attribute', () => {
      const { container } = renderWithProviders(<Input pattern="[0-9]*" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('pattern', '[0-9]*');
    });
  });

  describe('Input HTML Attributes', () => {
    it('passes through name attribute', () => {
      const { container } = renderWithProviders(<Input name="username" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('name', 'username');
    });

    it('passes through id attribute', () => {
      const { container } = renderWithProviders(<Input id="input-id" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('id', 'input-id');
    });

    it('passes through autoComplete attribute', () => {
      const { container } = renderWithProviders(<Input autoComplete="off" />);
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('autoComplete', 'off');
    });

    it('passes through data attributes', () => {
      renderWithProviders(<Input data-testid="test-input" />);
      expect(screen.getByTestId('test-input')).toBeInTheDocument();
    });

    it('passes through aria attributes', () => {
      renderWithProviders(<Input aria-label="Search input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Search input');
    });

    it('merges custom className', () => {
      const { container } = renderWithProviders(<Input className="custom-input" />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('custom-input');
    });

    it('applies default input styles', () => {
      const { container } = renderWithProviders(<Input />);
      const input = container.querySelector('input');
      expect(input).toHaveClass(
        'h-11',
        'w-full',
        'rounded-xl',
        'border',
        'px-4',
        'py-2',
        'text-base'
      );
    });
  });

  describe('Input Ref Forwarding', () => {
    it('forwards ref to input element', () => {
      let ref: HTMLInputElement | null = null;
      const TestComponent = () => {
        const inputRef = React.useRef<HTMLInputElement>(null);

        React.useEffect(() => {
          ref = inputRef.current;
        }, []);

        return <Input ref={inputRef} />;
      };

      renderWithProviders(<TestComponent />);
      expect(ref).toBeInstanceOf(HTMLInputElement);
    });

    it('allows accessing input methods via ref', () => {
      let ref: HTMLInputElement | null = null;
      const TestComponent = () => {
        const inputRef = React.useRef<HTMLInputElement>(null);

        React.useEffect(() => {
          ref = inputRef.current;
          if (ref) {
            ref.focus();
          }
        }, []);

        return <Input ref={inputRef} />;
      };

      renderWithProviders(<TestComponent />);
      expect(document.activeElement).toBe(ref);
    });
  });

  describe('Input Focus Styles', () => {
    it('has focus-visible ring styles', () => {
      const { container } = renderWithProviders(<Input />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-blue-500');
    });
  });

  describe('Input Events', () => {
    it('calls onFocus when input is focused', () => {
      const handleFocus = vi.fn();
      renderWithProviders(<Input onFocus={handleFocus} />);
      const input = screen.getByRole('textbox');

      fireEvent.focus(input);
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when input loses focus', () => {
      const handleBlur = vi.fn();
      renderWithProviders(<Input onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');

      fireEvent.blur(input);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('calls onKeyDown when key is pressed', () => {
      const handleKeyDown = vi.fn();
      renderWithProviders(<Input onKeyDown={handleKeyDown} />);
      const input = screen.getByRole('textbox');

      fireEvent.keyDown(input, { key: 'Enter' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
    });

    it('calls onKeyUp when key is released', () => {
      const handleKeyUp = vi.fn();
      renderWithProviders(<Input onKeyUp={handleKeyUp} />);
      const input = screen.getByRole('textbox');

      fireEvent.keyUp(input, { key: 'a' });
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('Input AutoFocus', () => {
    it('focuses input when autoFocus is true', () => {
      renderWithProviders(<Input autoFocus />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });
  });
});
