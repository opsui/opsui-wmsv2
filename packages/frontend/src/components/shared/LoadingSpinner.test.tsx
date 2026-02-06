/**
 * @file LoadingSpinner.test.tsx
 * @purpose Tests for LoadingSpinner component and PageLoading
 * @complexity low
 * @tested yes
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { LoadingSpinner, PageLoading } from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
  describe('Basic Rendering', () => {
    it('renders spinner element', () => {
      renderWithProviders(<LoadingSpinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('renders SVG element', () => {
      const { container } = renderWithProviders(<LoadingSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('has accessibility role="status"', () => {
      renderWithProviders(<LoadingSpinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('has screen reader only text', () => {
      renderWithProviders(<LoadingSpinner />);
      const srText = screen.getByText('Loading...');
      expect(srText).toBeInTheDocument();
    });

    it('hides SVG from screen readers', () => {
      const { container } = renderWithProviders(<LoadingSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Size Variants', () => {
    it('renders small size spinner', () => {
      const { container } = renderWithProviders(<LoadingSpinner size="sm" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');
    });

    it('renders medium size spinner by default', () => {
      const { container } = renderWithProviders(<LoadingSpinner size="md" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-8', 'w-8');
    });

    it('renders medium size spinner when not specified', () => {
      const { container } = renderWithProviders(<LoadingSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-8', 'w-8');
    });

    it('renders large size spinner', () => {
      const { container } = renderWithProviders(<LoadingSpinner size="lg" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-12', 'w-12');
    });
  });

  describe('Spinner Animation', () => {
    it('has animate-spin class for spinning animation', () => {
      const { container } = renderWithProviders(<LoadingSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });

    it('has primary color styling', () => {
      const { container } = renderWithProviders(<LoadingSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-primary-600');
    });
  });

  describe('SVG Structure', () => {
    it('has circle element with stroke', () => {
      const { container } = renderWithProviders(<LoadingSpinner />);
      const circle = container.querySelector('circle');
      expect(circle).toBeInTheDocument();
      expect(circle).toHaveAttribute('stroke', 'currentColor');
      expect(circle).toHaveClass('opacity-25');
    });

    it('has path element for spinner effect', () => {
      const { container } = renderWithProviders(<LoadingSpinner />);
      const path = container.querySelector('path');
      expect(path).toBeInTheDocument();
      expect(path).toHaveClass('opacity-75');
    });

    it('has correct viewBox', () => {
      const { container } = renderWithProviders(<LoadingSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('has fill="none" attribute', () => {
      const { container } = renderWithProviders(<LoadingSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('fill', 'none');
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className', () => {
      const { container } = renderWithProviders(<LoadingSpinner className="custom-spinner" />);
      const spinner = container.querySelector('.flex');
      expect(spinner).toHaveClass('custom-spinner');
    });

    it('preserves default classes with custom className', () => {
      const { container } = renderWithProviders(<LoadingSpinner className="custom-class" />);
      const spinner = container.querySelector('.flex');
      expect(spinner).toHaveClass('flex', 'items-center', 'justify-center', 'custom-class');
    });
  });

  describe('Container Styles', () => {
    it('has flex container with centering', () => {
      const { container } = renderWithProviders(<LoadingSpinner />);
      const spinner = container.querySelector('.flex');
      expect(spinner).toHaveClass('flex', 'items-center', 'justify-center');
    });
  });
});

describe('PageLoading Component', () => {
  describe('Basic Rendering', () => {
    it('renders page loading container', () => {
      const { container } = renderWithProviders(<PageLoading />);
      const containerDiv = container.querySelector('.min-h-screen');
      expect(containerDiv).toBeInTheDocument();
    });

    it('renders LoadingSpinner', () => {
      const { container } = renderWithProviders(<PageLoading />);
      const spinner = container.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });

    it('renders loading message', () => {
      const { container } = renderWithProviders(<PageLoading />);
      const message = container.querySelector('p');
      expect(message).toBeInTheDocument();
      expect(message?.textContent).toBe('Loading...');
    });
  });

  describe('Custom Message', () => {
    it('renders custom message', () => {
      const { container } = renderWithProviders(<PageLoading message="Please wait..." />);
      const message = container.querySelector('p');
      expect(message?.textContent).toBe('Please wait...');
    });

    it('renders empty message when provided', () => {
      const { container } = renderWithProviders(<PageLoading message="" />);
      const message = container.querySelector('p');
      expect(message?.textContent).toBe('');
    });
  });

  describe('Layout', () => {
    it('uses full screen height', () => {
      const { container } = renderWithProviders(<PageLoading />);
      const wrapper = container.querySelector('.min-h-screen');
      expect(wrapper).toBeInTheDocument();
    });

    it('centers content vertically and horizontally', () => {
      const { container } = renderWithProviders(<PageLoading />);
      const wrapper = container.querySelector('.flex-col');
      expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });
  });

  describe('Large Spinner', () => {
    it('renders large size spinner', () => {
      const { container } = renderWithProviders(<PageLoading />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-12', 'w-12');
    });
  });

  describe('Message Styling', () => {
    it('applies gray color to message', () => {
      const { container } = renderWithProviders(<PageLoading />);
      const message = container.querySelector('p');
      expect(message).toHaveClass('text-gray-600');
    });

    it('adds margin top to message', () => {
      const { container } = renderWithProviders(<PageLoading />);
      const message = container.querySelector('p');
      expect(message).toHaveClass('mt-4');
    });
  });
});
