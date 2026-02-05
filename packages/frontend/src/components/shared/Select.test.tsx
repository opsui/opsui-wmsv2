/**
 * @file Select.test.tsx
 * @purpose Tests for Select component
 * @complexity low
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { Select, SelectOption } from './Select';

describe('Select Component', () => {
  const mockOptions: SelectOption[] = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  describe('Basic Rendering', () => {
    it('renders select element', () => {
      renderWithProviders(<Select options={mockOptions} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('renders all options', () => {
      renderWithProviders(<Select options={mockOptions} />);
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });

    it('renders option labels correctly', () => {
      renderWithProviders(<Select options={mockOptions} />);
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });
  });

  describe('Option Values', () => {
    it('assigns correct values to options', () => {
      const { container } = renderWithProviders(<Select options={mockOptions} />);
      const options = container.querySelectorAll('option');
      expect(options[0]).toHaveValue('option1');
      expect(options[1]).toHaveValue('option2');
      expect(options[2]).toHaveValue('option3');
    });
  });

  describe('Selected Value', () => {
    it('renders with default selected value', () => {
      renderWithProviders(<Select options={mockOptions} defaultValue="option2" />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option2');
    });

    it('renders with controlled value', () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('option1');
        return (
          <Select options={mockOptions} value={value} onChange={e => setValue(e.target.value)} />
        );
      };
      renderWithProviders(<TestComponent />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option1');
    });

    it('updates selected value on change', () => {
      const handleChange = vi.fn();
      renderWithProviders(<Select options={mockOptions} onChange={handleChange} />);
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'option2' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty Options', () => {
    it('renders select with no options', () => {
      renderWithProviders(<Select options={[]} />);
      const select = screen.getByRole('combobox');
      const options = screen.queryAllByRole('option');
      expect(select).toBeInTheDocument();
      expect(options).toHaveLength(0);
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styles when disabled', () => {
      const { container } = renderWithProviders(<Select options={mockOptions} disabled />);
      const select = container.querySelector('select');
      expect(select).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('has disabled attribute', () => {
      renderWithProviders(<Select options={mockOptions} disabled />);
      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });
  });

  describe('Required State', () => {
    it('has required attribute when required', () => {
      renderWithProviders(<Select options={mockOptions} required />);
      const select = screen.getByRole('combobox');
      expect(select).toBeRequired();
    });
  });

  describe('Multiple Options Handling', () => {
    it('handles options with duplicate values', () => {
      const duplicateOptions: SelectOption[] = [
        { value: 'same', label: 'First' },
        { value: 'same', label: 'Second' },
      ];
      const { container } = renderWithProviders(<Select options={duplicateOptions} />);
      const options = container.querySelectorAll('option');
      expect(options).toHaveLength(2);
    });

    it('handles special characters in labels', () => {
      const specialOptions: SelectOption[] = [
        { value: '1', label: 'Option with & symbol' },
        { value: '2', label: 'Option with <tag>' },
        { value: '3', label: 'Option with "quotes"' },
      ];
      renderWithProviders(<Select options={specialOptions} />);
      expect(screen.getByText('Option with & symbol')).toBeInTheDocument();
    });
  });

  describe('HTML Attributes', () => {
    it('passes through name attribute', () => {
      const { container } = renderWithProviders(<Select options={mockOptions} name="my-select" />);
      const select = container.querySelector('select');
      expect(select).toHaveAttribute('name', 'my-select');
    });

    it('passes through id attribute', () => {
      const { container } = renderWithProviders(<Select options={mockOptions} id="select-id" />);
      const select = container.querySelector('select');
      expect(select).toHaveAttribute('id', 'select-id');
    });

    it('passes through data attributes', () => {
      renderWithProviders(<Select options={mockOptions} data-testid="test-select" />);
      expect(screen.getByTestId('test-select')).toBeInTheDocument();
    });

    it('passes through aria attributes', () => {
      renderWithProviders(<Select options={mockOptions} aria-label="Select an option" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-label', 'Select an option');
    });

    it('merges custom className', () => {
      const { container } = renderWithProviders(
        <Select options={mockOptions} className="custom-select" />
      );
      const select = container.querySelector('select');
      expect(select).toHaveClass('custom-select');
    });

    it('applies default select styles', () => {
      const { container } = renderWithProviders(<Select options={mockOptions} />);
      const select = container.querySelector('select');
      expect(select).toHaveClass(
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

  describe('Select Ref Forwarding', () => {
    it('forwards ref to select element', () => {
      let ref: HTMLSelectElement | null = null;
      const TestComponent = () => {
        const selectRef = React.useRef<HTMLSelectElement>(null);

        React.useEffect(() => {
          ref = selectRef.current;
        }, []);

        return <Select ref={selectRef} options={mockOptions} />;
      };

      renderWithProviders(<TestComponent />);
      expect(ref).toBeInstanceOf(HTMLSelectElement);
    });

    it('allows accessing select methods via ref', () => {
      let ref: HTMLSelectElement | null = null;
      const TestComponent = () => {
        const selectRef = React.useRef<HTMLSelectElement>(null);

        React.useEffect(() => {
          ref = selectRef.current;
          if (ref) {
            ref.focus();
          }
        }, []);

        return <Select ref={selectRef} options={mockOptions} />;
      };

      renderWithProviders(<TestComponent />);
      expect(document.activeElement).toBe(ref);
    });
  });

  describe('Focus Styles', () => {
    it('has focus-visible ring styles', () => {
      const { container } = renderWithProviders(<Select options={mockOptions} />);
      const select = container.querySelector('select');
      expect(select).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-blue-500');
    });
  });

  describe('Select Events', () => {
    it('calls onFocus when select is focused', () => {
      const handleFocus = vi.fn();
      renderWithProviders(<Select options={mockOptions} onFocus={handleFocus} />);
      const select = screen.getByRole('combobox');

      fireEvent.focus(select);
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when select loses focus', () => {
      const handleBlur = vi.fn();
      renderWithProviders(<Select options={mockOptions} onBlur={handleBlur} />);
      const select = screen.getByRole('combobox');

      fireEvent.blur(select);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('calls onChange with correct event', () => {
      const handleChange = vi.fn();
      renderWithProviders(<Select options={mockOptions} onChange={handleChange} />);
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'option3' } });
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: 'option3' }),
        })
      );
    });
  });

  describe('Option with Empty String Value', () => {
    it('handles option with empty string value', () => {
      const optionsWithEmpty: SelectOption[] = [
        { value: '', label: 'Select an option...' },
        ...mockOptions,
      ];
      renderWithProviders(<Select options={optionsWithEmpty} />);
      expect(screen.getByText('Select an option...')).toBeInTheDocument();
    });
  });

  describe('Long Options List', () => {
    it('handles large number of options', () => {
      const manyOptions: SelectOption[] = Array.from({ length: 100 }, (_, i) => ({
        value: `option-${i}`,
        label: `Option ${i + 1}`,
      }));
      renderWithProviders(<Select options={manyOptions} />);
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(100);
    });
  });
});
