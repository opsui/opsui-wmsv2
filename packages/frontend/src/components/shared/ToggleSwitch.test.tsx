/**
 * @file ToggleSwitch.test.tsx
 * @purpose Tests for ToggleSwitch component and variants
 * @complexity medium
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ToggleSwitch, ToggleGroup, ToggleWithIcon } from './ToggleSwitch';

describe('ToggleSwitch Component', () => {
  describe('Basic Rendering', () => {
    it('renders button with role switch', () => {
      renderWithProviders(<ToggleSwitch checked={false} onChange={vi.fn()} />);
      const switchBtn = screen.getByRole('switch');
      expect(switchBtn).toBeInTheDocument();
    });

    it('renders dot element inside switch', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} />
      );
      const dot = container.querySelector('.rounded-full.bg-white');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('Checked State', () => {
    it('has aria-checked when unchecked', () => {
      renderWithProviders(<ToggleSwitch checked={false} onChange={vi.fn()} />);
      const switchBtn = screen.getByRole('switch');
      expect(switchBtn).toHaveAttribute('aria-checked', 'false');
    });

    it('has aria-checked when checked', () => {
      renderWithProviders(<ToggleSwitch checked={true} onChange={vi.fn()} />);
      const switchBtn = screen.getByRole('switch');
      expect(switchBtn).toHaveAttribute('aria-checked', 'true');
    });

    it('has blue background when checked', () => {
      const { container } = renderWithProviders(<ToggleSwitch checked={true} onChange={vi.fn()} />);
      const switchBtn = container.querySelector('[role="switch"]');
      expect(switchBtn).toHaveClass('bg-blue-600', 'dark:bg-blue-500');
    });

    it('has gray background when unchecked', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} />
      );
      const switchBtn = container.querySelector('[role="switch"]');
      expect(switchBtn).toHaveClass('bg-gray-200', 'dark:bg-gray-700');
    });

    it('translates dot to right when checked', () => {
      const { container } = renderWithProviders(<ToggleSwitch checked={true} onChange={vi.fn()} />);
      const dot = container.querySelector('.rounded-full.bg-white');
      expect(dot).toHaveClass('translate-x-5');
    });

    it('keeps dot at left when unchecked', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} />
      );
      const dot = container.querySelector('.rounded-full.bg-white');
      expect(dot).toHaveClass('translate-x-0');
    });
  });

  describe('Toggle Interaction', () => {
    it('calls onChange with true when clicking unchecked switch', () => {
      const handleChange = vi.fn();
      renderWithProviders(<ToggleSwitch checked={false} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('switch'));

      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('calls onChange with false when clicking checked switch', () => {
      const handleChange = vi.fn();
      renderWithProviders(<ToggleSwitch checked={true} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('switch'));

      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('does not call onChange when disabled', () => {
      const handleChange = vi.fn();
      renderWithProviders(<ToggleSwitch checked={false} onChange={handleChange} disabled />);

      fireEvent.click(screen.getByRole('switch'));

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('does not call onChange when loading', () => {
      const handleChange = vi.fn();
      renderWithProviders(<ToggleSwitch checked={false} onChange={handleChange} loading />);

      fireEvent.click(screen.getByRole('switch'));

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} size="sm" />
      );
      const switchBtn = container.querySelector('[role="switch"]');
      expect(switchBtn).toHaveClass('w-8', 'h-4');
    });

    it('renders medium size by default', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} size="md" />
      );
      const switchBtn = container.querySelector('[role="switch"]');
      expect(switchBtn).toHaveClass('w-11', 'h-6');
    });

    it('renders large size', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} size="lg" />
      );
      const switchBtn = container.querySelector('[role="switch"]');
      expect(switchBtn).toHaveClass('w-14', 'h-8');
    });

    it('has correct dot size for small', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} size="sm" />
      );
      const dot = container.querySelector('.rounded-full.bg-white');
      expect(dot).toHaveClass('w-3', 'h-3');
    });

    it('has correct dot size for medium', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} size="md" />
      );
      const dot = container.querySelector('.rounded-full.bg-white');
      expect(dot).toHaveClass('w-5', 'h-5');
    });

    it('has correct dot size for large', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} size="lg" />
      );
      const dot = container.querySelector('.rounded-full.bg-white');
      expect(dot).toHaveClass('w-6', 'h-6');
    });
  });

  describe('Disabled State', () => {
    it('has aria-disabled when disabled', () => {
      renderWithProviders(<ToggleSwitch checked={false} onChange={vi.fn()} disabled />);
      const switchBtn = screen.getByRole('switch');
      expect(switchBtn).toHaveAttribute('aria-disabled', 'true');
    });

    it('applies disabled styles', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} disabled />
      );
      const switchBtn = container.querySelector('[role="switch"]');
      expect(switchBtn).toHaveClass('cursor-not-allowed', 'opacity-50');
    });

    it('has disabled attribute', () => {
      renderWithProviders(<ToggleSwitch checked={false} onChange={vi.fn()} disabled />);
      const switchBtn = screen.getByRole('switch');
      expect(switchBtn).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('shows spinner when loading', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} loading />
      );
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('applies pulse animation to dot when loading', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} loading />
      );
      const dot = container.querySelector('.rounded-full.bg-white');
      expect(dot).toHaveClass('animate-pulse');
    });

    it('disables interaction when loading', () => {
      renderWithProviders(<ToggleSwitch checked={false} onChange={vi.fn()} loading />);
      const switchBtn = screen.getByRole('switch');
      expect(switchBtn).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Label and Description', () => {
    it('renders label when provided', () => {
      renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} label="Enable feature" />
      );
      expect(screen.getByText('Enable feature')).toBeInTheDocument();
    });

    it('associates label with switch via htmlFor', () => {
      renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} label="Toggle" id="toggle-1" />
      );
      const label = screen.getByText('Toggle');
      expect(label).toHaveAttribute('for', 'toggle-1');
    });

    it('renders description when provided', () => {
      renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} description="Additional info" />
      );
      expect(screen.getByText('Additional info')).toBeInTheDocument();
    });

    it('applies correct label styling', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} label="Label" />
      );
      const label = container.querySelector('label');
      expect(label).toHaveClass('text-sm', 'font-medium', 'text-gray-700', 'dark:text-gray-300');
    });
  });

  describe('Focus Styles', () => {
    it('has focus ring styles', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} />
      );
      const switchBtn = container.querySelector('[role="switch"]');
      expect(switchBtn).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className with wrapper', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} className="custom-toggle" />
      );
      const wrapper = container.querySelector('.custom-toggle');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('ID Attribute', () => {
    it('applies id to button', () => {
      const { container } = renderWithProviders(
        <ToggleSwitch checked={false} onChange={vi.fn()} id="toggle-1" />
      );
      const switchBtn = container.querySelector('#toggle-1');
      expect(switchBtn).toBeInTheDocument();
    });
  });
});

describe('ToggleGroup Component', () => {
  const mockItems = [
    {
      id: 'toggle1',
      label: 'Toggle 1',
      checked: true,
      onChange: vi.fn(),
    },
    {
      id: 'toggle2',
      label: 'Toggle 2',
      checked: false,
      onChange: vi.fn(),
    },
  ];

  describe('Basic Rendering', () => {
    it('renders all toggle items', () => {
      renderWithProviders(<ToggleGroup items={mockItems} />);
      expect(screen.getByText('Toggle 1')).toBeInTheDocument();
      expect(screen.getByText('Toggle 2')).toBeInTheDocument();
    });

    it('renders switches for each item', () => {
      renderWithProviders(<ToggleGroup items={mockItems} />);
      const switches = screen.getAllByRole('switch');
      expect(switches).toHaveLength(2);
    });
  });

  describe('Layout', () => {
    it('has space between items', () => {
      const { container } = renderWithProviders(<ToggleGroup items={mockItems} />);
      const spaceDiv = container.querySelector('.space-y-4');
      expect(spaceDiv).toBeInTheDocument();
    });

    it('has flex layout with justify between for each item', () => {
      const { container } = renderWithProviders(<ToggleGroup items={mockItems} />);
      const itemRows = container.querySelectorAll('.flex.items-center.justify-between');
      expect(itemRows.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Item Interaction', () => {
    it('calls onChange when toggle is clicked', () => {
      const handleChange = vi.fn();
      const items = [
        {
          id: 'toggle1',
          label: 'Toggle 1',
          checked: false,
          onChange: handleChange,
        },
      ];

      renderWithProviders(<ToggleGroup items={items} />);

      fireEvent.click(screen.getByRole('switch'));

      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Descriptions', () => {
    const itemsWithDescriptions = [
      {
        id: 'toggle1',
        label: 'Toggle 1',
        description: 'Description 1',
        checked: true,
        onChange: vi.fn(),
      },
    ];

    it('renders item descriptions', () => {
      renderWithProviders(<ToggleGroup items={itemsWithDescriptions} />);
      expect(screen.getByText('Description 1')).toBeInTheDocument();
    });
  });

  describe('Size Propagation', () => {
    it('applies size to all switches', () => {
      const { container } = renderWithProviders(<ToggleGroup items={mockItems} size="lg" />);
      const switches = container.querySelectorAll('[role="switch"]');
      switches.forEach(sw => {
        expect(sw).toHaveClass('w-14', 'h-8');
      });
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className', () => {
      const { container } = renderWithProviders(
        <ToggleGroup items={mockItems} className="custom-group" />
      );
      const wrapper = container.querySelector('.custom-group');
      expect(wrapper).toBeInTheDocument();
    });
  });
});

describe('ToggleWithIcon Component', () => {
  const TestIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} data-testid="test-icon" />
  );

  describe('Basic Rendering', () => {
    it('renders icon when provided', () => {
      renderWithProviders(
        <ToggleWithIcon
          checked={false}
          onChange={vi.fn()}
          icon={TestIcon}
          label="Toggle with icon"
        />
      );
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('renders label', () => {
      renderWithProviders(
        <ToggleWithIcon checked={false} onChange={vi.fn()} label="Toggle Label" />
      );
      expect(screen.getByText('Toggle Label')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('has flex layout with gap', () => {
      const { container } = renderWithProviders(
        <ToggleWithIcon checked={false} onChange={vi.fn()} icon={TestIcon} label="Label" />
      );
      const flex = container.querySelector('.flex.items-center');
      expect(flex).toHaveClass('gap-3');
    });

    it('has ml-auto on toggle container', () => {
      const { container } = renderWithProviders(
        <ToggleWithIcon checked={false} onChange={vi.fn()} label="Label" />
      );
      const toggleContainer = container.querySelector('.ml-auto');
      expect(toggleContainer).toBeInTheDocument();
    });
  });

  describe('Icon Styling', () => {
    it('applies checked icon styling', () => {
      const { container } = renderWithProviders(
        <ToggleWithIcon checked={true} onChange={vi.fn()} icon={TestIcon} label="Label" />
      );
      const iconContainer = container.querySelector('.p-2');
      expect(iconContainer).toHaveClass('bg-blue-100', 'dark:bg-blue-900/30', 'text-blue-600');
    });

    it('applies unchecked icon styling', () => {
      const { container } = renderWithProviders(
        <ToggleWithIcon checked={false} onChange={vi.fn()} icon={TestIcon} label="Label" />
      );
      const iconContainer = container.querySelector('.p-2');
      expect(iconContainer).toHaveClass('bg-gray-100', 'dark:bg-gray-800', 'text-gray-500');
    });
  });

  describe('Toggle Interaction', () => {
    it('calls onChange when clicked', () => {
      const handleChange = vi.fn();
      renderWithProviders(<ToggleWithIcon checked={false} onChange={handleChange} label="Label" />);

      fireEvent.click(screen.getByRole('switch'));

      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Disabled and Loading States', () => {
    it('passes disabled to ToggleSwitch', () => {
      renderWithProviders(
        <ToggleWithIcon checked={false} onChange={vi.fn()} disabled label="Label" />
      );
      const switchBtn = screen.getByRole('switch');
      expect(switchBtn).toBeDisabled();
    });

    it('passes loading to ToggleSwitch', () => {
      renderWithProviders(
        <ToggleWithIcon checked={false} onChange={vi.fn()} loading label="Label" />
      );
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });
});
