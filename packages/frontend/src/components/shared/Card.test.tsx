/**
 * @file Card.test.tsx
 * @purpose Tests for Card component and subcomponents
 * @complexity medium
 * @tested yes
 */

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';

describe('Card Component', () => {
  describe('Basic Card', () => {
    it('renders children correctly', () => {
      renderWithProviders(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('renders as div element', () => {
      const { container } = renderWithProviders(<Card>Content</Card>);
      const card = container.querySelector('div');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Card Variants', () => {
    it('applies default variant styles', () => {
      const { container } = renderWithProviders(<Card variant="default">Default</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-xl', 'shadow-sm');
    });

    it('applies bordered variant styles', () => {
      const { container } = renderWithProviders(<Card variant="bordered">Bordered</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-gray-300', 'shadow-sm');
    });

    it('applies elevated variant styles', () => {
      const { container } = renderWithProviders(<Card variant="elevated">Elevated</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('shadow-md', 'dark:shadow-premium');
    });

    it('applies glass variant styles', () => {
      const { container } = renderWithProviders(<Card variant="glass">Glass</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('dark:glass-card', 'backdrop-blur-md');
    });
  });

  describe('Card Padding', () => {
    it('applies no padding when padding="none"', () => {
      const { container } = renderWithProviders(<Card padding="none">No Padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain('p-');
    });

    it('applies small padding when padding="sm"', () => {
      const { container } = renderWithProviders(<Card padding="sm">Small Padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-4');
    });

    it('applies medium padding by default', () => {
      const { container } = renderWithProviders(<Card padding="md">Medium Padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-6');
    });

    it('applies large padding when padding="lg"', () => {
      const { container } = renderWithProviders(<Card padding="lg">Large Padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-8');
    });
  });

  describe('Card Hover Effect', () => {
    it('applies hover styles when hover=true', () => {
      const { container } = renderWithProviders(<Card hover>Hover Card</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('card-hover', 'cursor-pointer');
    });

    it('does not apply hover styles by default', () => {
      const { container } = renderWithProviders(<Card>Normal Card</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('card-hover');
      expect(card).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Card HTML Attributes', () => {
    it('passes through data attributes', () => {
      const { container } = renderWithProviders(<Card data-testid="test-card">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('data-testid', 'test-card');
    });

    it('merges custom className', () => {
      const { container } = renderWithProviders(<Card className="custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-class');
    });

    it('passes through click handler', () => {
      const handleClick = vi.fn();
      const { container } = renderWithProviders(<Card onClick={handleClick}>Clickable</Card>);
      const card = container.firstChild as HTMLElement;
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Card Header', () => {
    it('renders header children', () => {
      renderWithProviders(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('applies default header styles', () => {
      const { container } = renderWithProviders(<CardHeader>Header</CardHeader>);
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass('pb-4', 'flex-col', 'space-y-1.5');
    });

    it('merges custom className', () => {
      const { container } = renderWithProviders(
        <CardHeader className="custom-header">Header</CardHeader>
      );
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('Card Title', () => {
    it('renders title as h3 element', () => {
      const { container } = renderWithProviders(<CardTitle>Card Title</CardTitle>);
      const title = container.querySelector('h3');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Card Title');
    });

    it('applies title styles', () => {
      const { container } = renderWithProviders(<CardTitle>Title</CardTitle>);
      const title = container.querySelector('h3');
      expect(title).toHaveClass('text-lg', 'font-semibold', 'tracking-tight');
    });

    it('merges custom className', () => {
      const { container } = renderWithProviders(
        <CardTitle className="custom-title">Title</CardTitle>
      );
      const title = container.querySelector('h3');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('Card Description', () => {
    it('renders description as paragraph', () => {
      const { container } = renderWithProviders(
        <CardDescription>Card Description</CardDescription>
      );
      const description = container.querySelector('p');
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent('Card Description');
    });

    it('applies description styles', () => {
      const { container } = renderWithProviders(<CardDescription>Description</CardDescription>);
      const description = container.querySelector('p');
      expect(description).toHaveClass('text-sm', 'leading-relaxed');
    });

    it('merges custom className', () => {
      const { container } = renderWithProviders(
        <CardDescription className="custom-desc">Description</CardDescription>
      );
      const description = container.querySelector('p');
      expect(description).toHaveClass('custom-desc');
    });
  });

  describe('Card Content', () => {
    it('renders content children', () => {
      renderWithProviders(<CardContent>Content Area</CardContent>);
      expect(screen.getByText('Content Area')).toBeInTheDocument();
    });

    it('applies padding-top removal', () => {
      const { container } = renderWithProviders(<CardContent>Content</CardContent>);
      const content = container.firstChild as HTMLElement;
      expect(content).toHaveClass('pt-0');
    });

    it('merges custom className', () => {
      const { container } = renderWithProviders(
        <CardContent className="custom-content">Content</CardContent>
      );
      const content = container.firstChild as HTMLElement;
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('Card Footer', () => {
    it('renders footer children', () => {
      renderWithProviders(<CardFooter>Footer Content</CardFooter>);
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });

    it('applies footer styles', () => {
      const { container } = renderWithProviders(<CardFooter>Footer</CardFooter>);
      const footer = container.firstChild as HTMLElement;
      expect(footer).toHaveClass('flex', 'items-center', 'pt-4');
    });

    it('merges custom className', () => {
      const { container } = renderWithProviders(
        <CardFooter className="custom-footer">Footer</CardFooter>
      );
      const footer = container.firstChild as HTMLElement;
      expect(footer).toHaveClass('custom-footer');
    });
  });

  describe('Complete Card Composition', () => {
    it('renders complete card with all subcomponents', () => {
      const { container } = renderWithProviders(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>Test Content</CardContent>
          <CardFooter>Test Footer</CardFooter>
        </Card>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByText('Test Footer')).toBeInTheDocument();

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-xl');
    });
  });
});
