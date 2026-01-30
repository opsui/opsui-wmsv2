/**
 * Button Component Tests
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { Button } from './Button';

describe('Button Component', () => {
  describe('Basic Rendering', () => {
    it('renders children correctly', () => {
      renderWithProviders(<Button>Click Me</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Click Me');
    });

    it('renders as button element by default', () => {
      renderWithProviders(<Button>Test</Button>);
      expect(screen.getByRole('button').tagName).toBe('BUTTON');
    });
  });

  describe('Variants', () => {
    it('applies primary variant styles by default', () => {
      const { container } = renderWithProviders(<Button>Primary</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('btn-primary');
    });

    it('applies secondary variant styles', () => {
      const { container } = renderWithProviders(<Button variant="secondary">Secondary</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('dark:btn-secondary');
    });

    it('applies success variant styles', () => {
      const { container } = renderWithProviders(<Button variant="success">Success</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('from-success-500', 'to-success-600');
    });

    it('applies danger variant styles', () => {
      const { container } = renderWithProviders(<Button variant="danger">Danger</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('from-error-500', 'to-error-600');
    });

    it('applies warning variant styles', () => {
      const { container } = renderWithProviders(<Button variant="warning">Warning</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('from-warning-500', 'to-warning-600');
    });

    it('applies ghost variant styles', () => {
      const { container } = renderWithProviders(<Button variant="ghost">Ghost</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('bg-transparent');
    });
  });

  describe('Sizes', () => {
    it('applies small size styles', () => {
      const { container } = renderWithProviders(<Button size="sm">Small</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('h-9', 'px-4', 'text-sm');
    });

    it('applies medium size styles by default', () => {
      const { container } = renderWithProviders(<Button size="md">Medium</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('h-11', 'px-6', 'text-base');
    });

    it('applies large size styles', () => {
      const { container } = renderWithProviders(<Button size="lg">Large</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('h-13', 'px-8', 'text-lg');
    });
  });

  describe('Full Width', () => {
    it('applies fullWidth styles when true', () => {
      const { container } = renderWithProviders(<Button fullWidth>Full Width</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('w-full');
    });

    it('does not apply fullWidth styles when false', () => {
      const { container } = renderWithProviders(<Button fullWidth={false}>Normal</Button>);
      const button = container.querySelector('button');
      expect(button).not.toHaveClass('w-full');
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      renderWithProviders(<Button isLoading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Loading...');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('disables button when isLoading is true', () => {
      renderWithProviders(<Button isLoading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('shows normal content when isLoading is false', () => {
      renderWithProviders(<Button isLoading={false}>Normal</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Normal');
      expect(button.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables button when disabled prop is true', () => {
      renderWithProviders(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('User Interaction', () => {
    it('calls onClick handler when clicked', () => {
      const handleClick = vi.fn();
      renderWithProviders(<Button onClick={handleClick}>Click Me</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn();
      renderWithProviders(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when isLoading', () => {
      const handleClick = vi.fn();
      renderWithProviders(
        <Button onClick={handleClick} isLoading>
          Loading
        </Button>
      );
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('HTML Attributes', () => {
    it('passes through data attributes', () => {
      renderWithProviders(<Button data-testid="test-button">Test</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-testid', 'test-button');
    });

    it('passes through aria attributes', () => {
      renderWithProviders(<Button aria-label="Close button">×</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close button');
    });

    it('merges custom className', () => {
      const { container } = renderWithProviders(<Button className="custom-class">Custom</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveClass('custom-class');
    });

    it('applies type attribute', () => {
      const { container } = renderWithProviders(<Button type="submit">Submit</Button>);
      const button = container.querySelector('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to button element', () => {
      let ref: HTMLButtonElement | null = null;
      const TestComponent = () => {
        const buttonRef = React.useRef<HTMLButtonElement>(null);

        React.useEffect(() => {
          ref = buttonRef.current;
        }, []);

        return <Button ref={buttonRef}>With Ref</Button>;
      };

      renderWithProviders(<TestComponent />);
      expect(ref).toBeInstanceOf(HTMLButtonElement);
    });
  });
});
