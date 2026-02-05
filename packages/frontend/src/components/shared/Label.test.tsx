/**
 * @file Label.test.tsx
 * @purpose Tests for Label component
 * @complexity low
 * @tested yes
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { Label } from './Label';

describe('Label Component', () => {
  describe('Basic Rendering', () => {
    it('renders label element', () => {
      renderWithProviders(<Label>Email</Label>);
      const label = screen.getByText('Email');
      expect(label).toBeInTheDocument();
      expect(label.tagName).toBe('LABEL');
    });

    it('renders children text', () => {
      renderWithProviders(<Label>Password</Label>);
      expect(screen.getByText('Password')).toBeInTheDocument();
    });
  });

  describe('Default Styling', () => {
    it('has text-sm font-medium classes', () => {
      const { container } = renderWithProviders(<Label>Label</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveClass('text-sm', 'font-medium');
    });

    it('has leading-none class', () => {
      const { container } = renderWithProviders(<Label>Label</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveClass('leading-none');
    });

    it('has dark mode colors', () => {
      const { container } = renderWithProviders(<Label>Label</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveClass('text-gray-700', 'dark:text-gray-300');
    });
  });

  describe('Disabled States', () => {
    it('has peer-disabled styles for not allowed cursor', () => {
      const { container } = renderWithProviders(<Label>Label</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
    });

    it('has peer-disabled opacity styles', () => {
      const { container } = renderWithProviders(<Label>Label</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveClass('peer-disabled:opacity-70');
    });
  });

  describe('HTML Attributes', () => {
    it('passes through htmlFor attribute', () => {
      const { container } = renderWithProviders(<Label htmlFor="email">Email</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveAttribute('for', 'email');
    });

    it('passes through id attribute', () => {
      const { container } = renderWithProviders(<Label id="label-id">Label</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveAttribute('id', 'label-id');
    });

    it('passes through data attributes', () => {
      renderWithProviders(<Label data-testid="test-label">Label</Label>);
      const label = screen.getByTestId('test-label');
      expect(label).toBeInTheDocument();
    });

    it('passes through aria attributes', () => {
      const { container } = renderWithProviders(<Label aria-label="Email address">Email</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveAttribute('aria-label', 'Email address');
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className', () => {
      const { container } = renderWithProviders(<Label className="custom-label">Label</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveClass('custom-label');
    });

    it('preserves default classes with custom className', () => {
      const { container } = renderWithProviders(<Label className="custom-class">Label</Label>);
      const label = container.querySelector('label');
      expect(label).toHaveClass('text-sm', 'font-medium', 'custom-class');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to label element', () => {
      let ref: HTMLLabelElement | null = null;
      const TestComponent = () => {
        const labelRef = React.useRef<HTMLLabelElement>(null);

        React.useEffect(() => {
          ref = labelRef.current;
        }, []);

        return <Label ref={labelRef}>Label</Label>;
      };

      renderWithProviders(<TestComponent />);
      expect(ref).toBeInstanceOf(HTMLLabelElement);
    });

    it('allows accessing element via ref', () => {
      let ref: HTMLLabelElement | null = null;
      const TestComponent = () => {
        const labelRef = React.useRef<HTMLLabelElement>(null);

        React.useEffect(() => {
          ref = labelRef.current;
        }, []);

        return <Label ref={labelRef}>Label</Label>;
      };

      renderWithProviders(<TestComponent />);
      expect((ref as HTMLLabelElement | null)?.tagName).toBe('LABEL');
    });
  });

  describe('Form Integration', () => {
    it('works with input elements via htmlFor', () => {
      renderWithProviders(
        <>
          <Label htmlFor="email">Email</Label>
          <input id="email" type="email" />
        </>
      );

      const label = screen.getByText('Email');
      const input = screen.getByRole('textbox');

      expect(label).toHaveAttribute('for', 'email');
      expect(input).toHaveAttribute('id', 'email');
    });
  });

  describe('Rich Content', () => {
    it('renders with complex children', () => {
      renderWithProviders(
        <Label>
          Email <span className="text-red-500">*</span>
        </Label>
      );
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders with React elements as children', () => {
      const Icon = () => <span data-testid="icon">📧</span>;
      renderWithProviders(
        <Label>
          <Icon /> Email
        </Label>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });
});
