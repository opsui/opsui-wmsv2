/**
 * @file Progress.test.tsx
 * @purpose Tests for Progress component
 * @complexity low
 * @tested yes
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { Progress } from './Progress';

describe('Progress Component', () => {
  describe('Basic Rendering', () => {
    it('renders progress container', () => {
      renderWithProviders(<Progress value={50} />);
      const container = document.querySelector('.relative.h-4');
      expect(container).toBeInTheDocument();
    });

    it('renders progress bar fill element', () => {
      renderWithProviders(<Progress value={50} />);
      const container = document.querySelector('.relative');
      const fill = container?.querySelector('.bg-blue-600');
      expect(fill).toBeInTheDocument();
    });
  });

  describe('Value Display', () => {
    it('displays 50% progress when value is 50', () => {
      renderWithProviders(<Progress value={50} />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('50%');
    });

    it('displays 0% progress when value is 0', () => {
      renderWithProviders(<Progress value={0} />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('0%');
    });

    it('displays 100% progress when value is 100', () => {
      renderWithProviders(<Progress value={100} />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('100%');
    });

    it('defaults to 0 when value is not provided', () => {
      renderWithProviders(<Progress />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('0%');
    });
  });

  describe('Max Value', () => {
    it('calculates percentage based on max value', () => {
      renderWithProviders(<Progress value={50} max={200} />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('25%');
    });

    it('handles max value correctly with value 100', () => {
      renderWithProviders(<Progress value={100} max={200} />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('50%');
    });

    it('defaults to max 100 when not provided', () => {
      renderWithProviders(<Progress value={75} />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('75%');
    });
  });

  describe('Value Clamping', () => {
    it('clamps value to minimum 0%', () => {
      renderWithProviders(<Progress value={-10} />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('0%');
    });

    it('clamps value to maximum 100%', () => {
      renderWithProviders(<Progress value={150} />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('100%');
    });

    it('clamps to 100% when value exceeds max', () => {
      renderWithProviders(<Progress value={150} max={100} />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('100%');
    });

    it('clamps to 0% when value is negative', () => {
      renderWithProviders(<Progress value={-50} max={100} />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('0%');
    });
  });

  describe('Container Styling', () => {
    it('has correct height', () => {
      const { container } = renderWithProviders(<Progress value={50} />);
      const progress = container.querySelector('.relative');
      expect(progress).toHaveClass('h-4');
    });

    it('has full width', () => {
      const { container } = renderWithProviders(<Progress value={50} />);
      const progress = container.querySelector('.relative');
      expect(progress).toHaveClass('w-full');
    });

    it('has rounded border', () => {
      const { container } = renderWithProviders(<Progress value={50} />);
      const progress = container.querySelector('.relative');
      expect(progress).toHaveClass('rounded-full');
    });

    it('has overflow hidden', () => {
      const { container } = renderWithProviders(<Progress value={50} />);
      const progress = container.querySelector('.relative');
      expect(progress).toHaveClass('overflow-hidden');
    });

    it('has light mode background', () => {
      const { container } = renderWithProviders(<Progress value={50} />);
      const progress = container.querySelector('.relative');
      expect(progress).toHaveClass('bg-gray-200');
    });
  });

  describe('Fill Bar Styling', () => {
    it('has blue color in light mode', () => {
      const { container } = renderWithProviders(<Progress value={50} />);
      const fill = container.querySelector('.bg-blue-600');
      expect(fill).toHaveClass('bg-blue-600');
    });

    it('has full height of container', () => {
      const { container } = renderWithProviders(<Progress value={50} />);
      const fill = container.querySelector('.bg-blue-600');
      expect(fill).toHaveClass('h-full');
    });

    it('has flex-1 for width', () => {
      const { container } = renderWithProviders(<Progress value={50} />);
      const fill = container.querySelector('.bg-blue-600');
      expect(fill).toHaveClass('flex-1');
    });

    it('has transition styles', () => {
      const { container } = renderWithProviders(<Progress value={50} />);
      const fill = container.querySelector('.bg-blue-600');
      expect(fill).toHaveClass('transition-all', 'duration-300', 'ease-in-out');
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className with container', () => {
      const { container } = renderWithProviders(
        <Progress value={50} className="custom-progress" />
      );
      const progress = container.querySelector('.relative');
      expect(progress).toHaveClass('custom-progress');
    });

    it('preserves default classes with custom className', () => {
      const { container } = renderWithProviders(<Progress value={50} className="custom-class" />);
      const progress = container.querySelector('.relative');
      expect(progress).toHaveClass('relative', 'h-4', 'w-full', 'custom-class');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to container element', () => {
      let ref: HTMLDivElement | null = null;
      const TestComponent = () => {
        const progressRef = React.useRef<HTMLDivElement>(null);

        React.useEffect(() => {
          ref = progressRef.current;
        }, []);

        return <Progress ref={progressRef} value={50} />;
      };

      renderWithProviders(<TestComponent />);
      expect(ref).toBeInstanceOf(HTMLDivElement);
    });

    it('allows accessing element via ref', () => {
      let ref: HTMLDivElement | null = null;
      const TestComponent = () => {
        const progressRef = React.useRef<HTMLDivElement>(null);

        React.useEffect(() => {
          ref = progressRef.current;
        }, []);

        return <Progress ref={progressRef} value={50} />;
      };

      renderWithProviders(<TestComponent />);
      expect((ref as HTMLDivElement | null)?.classList.contains('relative')).toBe(true);
    });
  });

  describe('HTML Attributes', () => {
    it('passes through data attributes', () => {
      renderWithProviders(<Progress value={50} data-testid="test-progress" />);
      const progress = document.querySelector('[data-testid="test-progress"]');
      expect(progress).toBeInTheDocument();
    });

    it('passes through aria attributes', () => {
      renderWithProviders(<Progress value={50} aria-label="Loading progress" />);
      const progress = document.querySelector('[aria-label="Loading progress"]');
      expect(progress).toBeInTheDocument();
    });

    it('passes through id attribute', () => {
      renderWithProviders(<Progress value={50} id="progress-1" />);
      const progress = document.querySelector('#progress-1');
      expect(progress).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles decimal values', () => {
      renderWithProviders(<Progress value={33.33} />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('33.33%');
    });

    it('handles very small max values', () => {
      renderWithProviders(<Progress value={1} max={2} />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('50%');
    });

    it('handles very large max values', () => {
      renderWithProviders(<Progress value={500} max={1000} />);
      const fill = document.querySelector('.bg-blue-600') as HTMLElement;
      expect(fill?.style.width).toBe('50%');
    });
  });
});
