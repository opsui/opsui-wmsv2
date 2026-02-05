/**
 * @file ProgressBar.test.tsx
 * @purpose Tests for ProgressBar component
 * @complexity low
 * @tested yes
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar Component', () => {
  describe('Basic Rendering', () => {
    it('renders progress bar element', () => {
      renderWithProviders(<ProgressBar value={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('renders with role progressbar', () => {
      renderWithProviders(<ProgressBar value={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
    });
  });

  describe('Value and Percentage', () => {
    it('displays correct percentage', () => {
      const { container } = renderWithProviders(<ProgressBar value={50} max={100} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('clamps percentage at 100', () => {
      const { container } = renderWithProviders(<ProgressBar value={150} max={100} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('clamps percentage at 0', () => {
      const { container } = renderWithProviders(<ProgressBar value={-10} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('calculates percentage with custom max', () => {
      const { container } = renderWithProviders(<ProgressBar value={5} max={10} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });
  });

  describe('ARIA Attributes', () => {
    it('has aria-valuenow', () => {
      renderWithProviders(<ProgressBar value={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('has aria-valuemin of 0', () => {
      renderWithProviders(<ProgressBar value={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    });

    it('has aria-valuemax matching max prop', () => {
      renderWithProviders(<ProgressBar value={50} max={200} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemax', '200');
    });

    it('has default aria-valuemax of 100', () => {
      renderWithProviders(<ProgressBar value={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = renderWithProviders(<ProgressBar value={50} size="sm" />);
      const track = container.querySelector('.bg-gray-200');
      expect(track).toHaveClass('h-2');
    });

    it('renders medium size by default', () => {
      const { container } = renderWithProviders(<ProgressBar value={50} />);
      const track = container.querySelector('.bg-gray-200');
      expect(track).toHaveClass('h-4');
    });

    it('renders large size', () => {
      const { container } = renderWithProviders(<ProgressBar value={50} size="lg" />);
      const track = container.querySelector('.bg-gray-200');
      expect(track).toHaveClass('h-6');
    });
  });

  describe('Colors', () => {
    it('applies primary color by default', () => {
      const { container } = renderWithProviders(<ProgressBar value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('bg-primary-500');
    });

    it('applies success color', () => {
      const { container } = renderWithProviders(<ProgressBar value={50} color="success" />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('bg-success-500');
    });

    it('applies warning color', () => {
      const { container } = renderWithProviders(<ProgressBar value={50} color="warning" />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('bg-warning-500');
    });

    it('applies error color', () => {
      const { container } = renderWithProviders(<ProgressBar value={50} color="error" />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('bg-error-500');
    });
  });

  describe('Label', () => {
    it('shows percentage label when showLabel is true', () => {
      renderWithProviders(<ProgressBar value={50} showLabel />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('does not show label by default', () => {
      renderWithProviders(<ProgressBar value={50} />);
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('displays rounded percentage', () => {
      renderWithProviders(<ProgressBar value={50.7} showLabel />);
      expect(screen.getByText('51%')).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className', () => {
      const { container } = renderWithProviders(
        <ProgressBar value={50} className="custom-progress" />
      );
      const wrapper = container.querySelector('.custom-progress');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Transitions', () => {
    it('has transition classes', () => {
      const { container } = renderWithProviders(<ProgressBar value={50} />);
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('transition-all', 'duration-300');
    });
  });

  describe('Full Width', () => {
    it('has full width container', () => {
      const { container } = renderWithProviders(<ProgressBar value={50} />);
      const wrapper = container.querySelector('.w-full');
      expect(wrapper).toBeInTheDocument();
    });
  });
});
