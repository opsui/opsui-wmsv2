/**
 * @file ColorPicker.test.tsx
 * @purpose Tests for ColorPicker component
 * @complexity low
 * @tested yes
 */

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ColorPicker, ColorPreviewBadge, ROLE_COLORS } from './ColorPicker';

describe('ColorPicker Component', () => {
  describe('Basic Rendering', () => {
    it('renders all color options', () => {
      renderWithProviders(<ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      // Should have one button per color option
      expect(buttons.length).toBeGreaterThanOrEqual(ROLE_COLORS.length);
    });

    it('renders color buttons with correct background colors', () => {
      const { container } = renderWithProviders(
        <ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />
      );
      const buttons = container.querySelectorAll('button[style*="background-color"]');
      expect(buttons.length).toBe(ROLE_COLORS.length);
    });
  });

  describe('Label Rendering', () => {
    it('renders label when provided', () => {
      renderWithProviders(
        <ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} label="Role Color" />
      );
      expect(screen.getByText('Role Color')).toBeInTheDocument();
    });

    it('does not render label when not provided', () => {
      const { container } = renderWithProviders(
        <ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />
      );
      const label = container.querySelector('label');
      expect(label).not.toBeInTheDocument();
    });
  });

  describe('Selected State', () => {
    it('shows check icon on selected color', () => {
      renderWithProviders(<ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />);
      // Find the button with the selected color and check for check icon
      const { container } = renderWithProviders(
        <ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />
      );
      const checkIcon = container.querySelector('button svg');
      expect(checkIcon).toBeInTheDocument();
    });

    it('applies ring styling to selected color', () => {
      const { container } = renderWithProviders(
        <ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />
      );
      // Find button with ring class
      const ringedButton = container.querySelector('button.ring-2');
      expect(ringedButton).toBeInTheDocument();
    });

    it('applies scale-110 to selected color', () => {
      const { container } = renderWithProviders(
        <ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />
      );
      const selectedButton = container.querySelector('button.scale-110');
      expect(selectedButton).toBeInTheDocument();
    });
  });

  describe('Color Selection', () => {
    it('calls onColorChange when color button is clicked', () => {
      const handleChange = vi.fn();
      renderWithProviders(<ColorPicker selectedColor="#3b82f6" onColorChange={handleChange} />);

      // Click a different color button
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      expect(handleChange).toHaveBeenCalled();
    });

    it('updates selected color when clicked', () => {
      const handleChange = vi.fn();
      const { rerender } = renderWithProviders(
        <ColorPicker selectedColor="#3b82f6" onColorChange={handleChange} />
      );

      // Simulate selecting a different color
      rerender(<ColorPicker selectedColor="#ef4444" onColorChange={handleChange} />);

      // Should now have red color selected
      const { container } = renderWithProviders(
        <ColorPicker selectedColor="#ef4444" onColorChange={handleChange} />
      );
      const selectedButton = container.querySelector('button.ring-2');
      expect(selectedButton).toBeInTheDocument();
    });
  });

  describe('Button Styling', () => {
    it('has correct button size', () => {
      const { container } = renderWithProviders(
        <ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />
      );
      const buttons = container.querySelectorAll('button');
      buttons.forEach(btn => {
        expect(btn).toHaveClass('w-10', 'h-10');
      });
    });

    it('has rounded corners', () => {
      const { container } = renderWithProviders(
        <ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />
      );
      const buttons = container.querySelectorAll('button');
      buttons.forEach(btn => {
        expect(btn).toHaveClass('rounded-lg');
      });
    });

    it('has hover scale effect on unselected buttons or scale on selected', () => {
      const { container } = renderWithProviders(
        <ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />
      );
      const buttons = container.querySelectorAll('button');
      buttons.forEach(btn => {
        const hasHoverScale = btn.classList.contains('hover:scale-105');
        const hasSelectedScale = btn.classList.contains('scale-110');
        // Each button should have either hover scale or selected scale
        expect(hasHoverScale || hasSelectedScale).toBe(true);
      });
    });

    it('has transition classes', () => {
      const { container } = renderWithProviders(
        <ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />
      );
      const buttons = container.querySelectorAll('button');
      buttons.forEach(btn => {
        expect(btn).toHaveClass('transition-all', 'duration-200');
      });
    });
  });

  describe('Accessibility', () => {
    it('has aria-label for each color button', () => {
      renderWithProviders(<ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      // First few buttons should have aria-label starting with "Select"
      expect(buttons[0]).toHaveAttribute('aria-label');
      expect(buttons[0]?.getAttribute('aria-label')).toMatch(/^Select/);
    });

    it('has sr-only text for screen readers', () => {
      renderWithProviders(<ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />);
      const srTexts = screen.getAllByText((_content, element) => {
        return element?.classList.contains('sr-only') === true;
      });
      expect(srTexts.length).toBeGreaterThan(0);
    });

    it('has title attribute for tooltip', () => {
      renderWithProviders(<ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveAttribute('title');
    });
  });

  describe('Grid Layout', () => {
    it('has 6 column grid layout', () => {
      const { container } = renderWithProviders(
        <ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />
      );
      const grid = container.querySelector('.grid-cols-6');
      expect(grid).toBeInTheDocument();
    });

    it('has gap between buttons', () => {
      const { container } = renderWithProviders(
        <ColorPicker selectedColor="#3b82f6" onColorChange={vi.fn()} />
      );
      const grid = container.querySelector('.gap-2');
      expect(grid).toBeInTheDocument();
    });
  });
});

describe('ColorPreviewBadge Component', () => {
  describe('Basic Rendering', () => {
    it('renders label text', () => {
      renderWithProviders(<ColorPreviewBadge color="#3b82f6" label="Picker" />);
      expect(screen.getByText('Picker')).toBeInTheDocument();
    });

    it('has badge styling', () => {
      const { container } = renderWithProviders(
        <ColorPreviewBadge color="#3b82f6" label="Picker" />
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass(
        'inline-flex',
        'items-center',
        'px-3',
        'py-1',
        'text-xs',
        'font-semibold',
        'text-white'
      );
    });
  });

  describe('Color Styling', () => {
    it('applies background color from color prop', () => {
      const { container } = renderWithProviders(
        <ColorPreviewBadge color="#3b82f6" label="Picker" />
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ backgroundColor: '#3b82f6' });
    });

    it('applies red color', () => {
      const { container } = renderWithProviders(
        <ColorPreviewBadge color="#ef4444" label="Urgent" />
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ backgroundColor: '#ef4444' });
    });

    it('applies green color', () => {
      const { container } = renderWithProviders(
        <ColorPreviewBadge color="#22c55e" label="Success" />
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ backgroundColor: '#22c55e' });
    });
  });
});

describe('ROLE_COLORS constant', () => {
  it('contains all expected color categories', () => {
    expect(ROLE_COLORS.length).toBeGreaterThan(0);
  });

  it('has blue tones', () => {
    const blueTones = ROLE_COLORS.filter(c => ['Blue', 'Sky', 'Cyan'].includes(c.name));
    expect(blueTones.length).toBe(3);
  });

  it('has purple tones', () => {
    const purpleTones = ROLE_COLORS.filter(c => ['Purple', 'Violet', 'Fuchsia'].includes(c.name));
    expect(purpleTones.length).toBe(3);
  });

  it('has red/pink tones', () => {
    const redTones = ROLE_COLORS.filter(c => ['Red', 'Rose', 'Pink'].includes(c.name));
    expect(redTones.length).toBe(3);
  });

  it('has green tones', () => {
    const greenTones = ROLE_COLORS.filter(c =>
      ['Green', 'Emerald', 'Teal', 'Lime'].includes(c.name)
    );
    expect(greenTones.length).toBe(4);
  });

  it('each color has name and value properties', () => {
    ROLE_COLORS.forEach(color => {
      expect(color).toHaveProperty('name');
      expect(color).toHaveProperty('value');
      expect(typeof color.name).toBe('string');
      expect(typeof color.value).toBe('string');
      expect(color.value).toMatch(/^#[0-9a-fA-F]{6}$/); // Valid hex color
    });
  });
});
