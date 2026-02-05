/**
 * @file Skeleton.test.tsx
 * @purpose Tests for Skeleton component and skeleton variants
 * @complexity medium
 * @tested yes
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  MetricCardSkeleton,
  FormSkeleton,
} from './Skeleton';

describe('Skeleton Component', () => {
  describe('Basic Rendering', () => {
    it('renders skeleton div', () => {
      const { container } = renderWithProviders(<Skeleton />);
      const skeleton = container.querySelector('.bg-gray-700\\/50');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Variant Styles', () => {
    it('renders text variant by default', () => {
      const { container } = renderWithProviders(<Skeleton variant="text" />);
      const skeleton = container.querySelector('.rounded');
      expect(skeleton).toHaveClass('rounded', 'h-4', 'w-full');
    });

    it('renders circular variant', () => {
      const { container } = renderWithProviders(<Skeleton variant="circular" />);
      const skeleton = container.querySelector('.rounded-full');
      expect(skeleton).toHaveClass('rounded-full');
    });

    it('renders rectangular variant', () => {
      const { container } = renderWithProviders(<Skeleton variant="rectangular" />);
      const skeleton = container.querySelector('.rounded-none');
      expect(skeleton).toHaveClass('rounded-none');
    });

    it('renders rounded variant', () => {
      const { container } = renderWithProviders(<Skeleton variant="rounded" />);
      const skeleton = container.querySelector('.rounded-lg');
      expect(skeleton).toHaveClass('rounded-lg');
    });
  });

  describe('Custom Dimensions', () => {
    it('applies custom width', () => {
      const { container } = renderWithProviders(<Skeleton width="200px" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.width).toBe('200px');
    });

    it('applies custom height', () => {
      const { container } = renderWithProviders(<Skeleton height="100px" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.height).toBe('100px');
    });

    it('applies both custom width and height', () => {
      const { container } = renderWithProviders(<Skeleton width="150px" height="75px" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.width).toBe('150px');
      expect(skeleton.style.height).toBe('75px');
    });

    it('applies numeric width', () => {
      const { container } = renderWithProviders(<Skeleton width={300} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.width).toBe('300px');
    });

    it('applies numeric height', () => {
      const { container } = renderWithProviders(<Skeleton height={50} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.height).toBe('50px');
    });
  });

  describe('Animation Types', () => {
    it('applies pulse animation by default', () => {
      const { container } = renderWithProviders(<Skeleton animation="pulse" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('applies pulse animation when not specified', () => {
      const { container } = renderWithProviders(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('applies wave animation', () => {
      const { container } = renderWithProviders(<Skeleton animation="wave" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('animate-shimmer');
    });

    it('applies no animation', () => {
      const { container } = renderWithProviders(<Skeleton animation="none" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).not.toHaveClass('animate-pulse', 'animate-shimmer');
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className', () => {
      const { container } = renderWithProviders(<Skeleton className="custom-skeleton" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('custom-skeleton');
    });

    it('preserves default classes with custom className', () => {
      const { container } = renderWithProviders(
        <Skeleton variant="text" className="custom-class" />
      );
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('bg-gray-700/50', 'rounded', 'h-4', 'w-full', 'custom-class');
    });
  });

  describe('Default Styles', () => {
    it('has background color', () => {
      const { container } = renderWithProviders(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('bg-gray-700/50');
    });
  });
});

describe('TextSkeleton Component', () => {
  describe('Basic Rendering', () => {
    it('renders container with multiple skeletons', () => {
      const { container } = renderWithProviders(<TextSkeleton lines={3} />);
      const skeletons = container.querySelectorAll('.rounded');
      expect(skeletons).toHaveLength(3);
    });

    it('renders 3 lines by default', () => {
      const { container } = renderWithProviders(<TextSkeleton />);
      const skeletons = container.querySelectorAll('.rounded');
      expect(skeletons).toHaveLength(3);
    });
  });

  describe('Custom Line Count', () => {
    it('renders 1 line', () => {
      const { container } = renderWithProviders(<TextSkeleton lines={1} />);
      const skeletons = container.querySelectorAll('.rounded');
      expect(skeletons).toHaveLength(1);
    });

    it('renders 5 lines', () => {
      const { container } = renderWithProviders(<TextSkeleton lines={5} />);
      const skeletons = container.querySelectorAll('.rounded');
      expect(skeletons).toHaveLength(5);
    });

    it('renders 10 lines', () => {
      const { container } = renderWithProviders(<TextSkeleton lines={10} />);
      const skeletons = container.querySelectorAll('.rounded');
      expect(skeletons).toHaveLength(10);
    });
  });

  describe('Last Line Width', () => {
    it('makes last line shorter with w-3/4 class', () => {
      const { container } = renderWithProviders(<TextSkeleton lines={3} />);
      const skeletons = container.querySelectorAll('.rounded');
      const lastSkeleton = skeletons[skeletons.length - 1];
      expect(lastSkeleton).toHaveClass('w-3/4');
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className with container', () => {
      const { container } = renderWithProviders(<TextSkeleton className="custom-text-skeleton" />);
      const containerDiv = container.firstChild as HTMLElement;
      expect(containerDiv).toHaveClass('custom-text-skeleton');
    });
  });
});

describe('CardSkeleton Component', () => {
  describe('Basic Rendering', () => {
    it('renders card container', () => {
      const { container } = renderWithProviders(<CardSkeleton />);
      const card = container.querySelector('.bg-gray-800\\/50');
      expect(card).toBeInTheDocument();
    });

    it('renders circular avatar skeleton', () => {
      const { container } = renderWithProviders(<CardSkeleton />);
      const avatar = container.querySelector('.rounded-full');
      expect(avatar).toBeInTheDocument();
    });

    it('renders two text skeletons for content', () => {
      const { container } = renderWithProviders(<CardSkeleton />);
      const textSkeletons = container.querySelectorAll('.rounded.h-4');
      expect(textSkeletons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Layout', () => {
    it('has card styling with padding', () => {
      const { container } = renderWithProviders(<CardSkeleton />);
      const card = container.querySelector('.bg-gray-800\\/50');
      expect(card).toHaveClass('rounded-lg', 'p-4');
    });

    it('has flex layout for avatar and content', () => {
      const { container } = renderWithProviders(<CardSkeleton />);
      const flex = container.querySelector('.flex.items-start');
      expect(flex).toBeInTheDocument();
    });

    it('has gap between avatar and content', () => {
      const { container } = renderWithProviders(<CardSkeleton />);
      const flex = container.querySelector('.flex');
      expect(flex).toHaveClass('gap-4');
    });
  });

  describe('Avatar Dimensions', () => {
    it('has correct avatar size', () => {
      const { container } = renderWithProviders(<CardSkeleton />);
      const avatar = container.querySelector('.rounded-full') as HTMLElement;
      expect(avatar.style.width).toBe('48px');
      expect(avatar.style.height).toBe('48px');
    });
  });

  describe('Content Widths', () => {
    it('first text skeleton is 3/4 width', () => {
      const { container } = renderWithProviders(<CardSkeleton />);
      const firstText = container.querySelector('.w-3\\/4');
      expect(firstText).toBeInTheDocument();
    });

    it('second text skeleton is 1/2 width', () => {
      const { container } = renderWithProviders(<CardSkeleton />);
      const secondText = container.querySelector('.w-1\\/2');
      expect(secondText).toBeInTheDocument();
    });
  });
});

describe('TableSkeleton Component', () => {
  describe('Basic Rendering', () => {
    it('renders table container', () => {
      const { container } = renderWithProviders(<TableSkeleton />);
      const table = container.querySelector('.bg-gray-800\\/50');
      expect(table).toBeInTheDocument();
    });

    it('renders header row with column skeletons', () => {
      const { container } = renderWithProviders(<TableSkeleton columns={4} />);
      const headerRow = container.querySelector('.flex.gap-4.p-4.border-b');
      expect(headerRow?.querySelectorAll('.rounded')).toHaveLength(4);
    });
  });

  describe('Default Dimensions', () => {
    it('renders 5 rows by default', () => {
      const { container } = renderWithProviders(<TableSkeleton />);
      const rows = container.querySelectorAll('.border-b.border-gray-700\\/50');
      // Header row + 5 data rows
      expect(rows.length).toBeGreaterThanOrEqual(5);
    });

    it('renders 4 columns by default', () => {
      const { container } = renderWithProviders(<TableSkeleton />);
      const firstRow = container.querySelector('.flex.gap-4');
      const columns = firstRow?.querySelectorAll('.rounded');
      expect(columns).toHaveLength(4);
    });
  });

  describe('Custom Dimensions', () => {
    it('renders specified number of rows', () => {
      const { container } = renderWithProviders(<TableSkeleton rows={3} columns={3} />);
      const dataRows = container.querySelectorAll(
        '.border-b.border-gray-700\\/50.last\\:border-b-0'
      );
      expect(dataRows.length).toBe(3);
    });

    it('renders specified number of columns', () => {
      const { container } = renderWithProviders(<TableSkeleton rows={2} columns={6} />);
      const headerRow = container.querySelector('.flex.gap-4.p-4.border-b');
      expect(headerRow?.querySelectorAll('.rounded')).toHaveLength(6);
    });
  });

  describe('Styling', () => {
    it('has borders between rows', () => {
      const { container } = renderWithProviders(<TableSkeleton />);
      const borders = container.querySelectorAll('.border-b');
      expect(borders.length).toBeGreaterThan(0);
    });

    it('last row has no bottom border', () => {
      const { container } = renderWithProviders(<TableSkeleton />);
      const lastRow = container.querySelector('.last\\:border-b-0');
      expect(lastRow).toBeInTheDocument();
    });
  });
});

describe('ListSkeleton Component', () => {
  describe('Basic Rendering', () => {
    it('renders list container', () => {
      const { container } = renderWithProviders(<ListSkeleton />);
      const listItems = container.querySelectorAll('.py-3');
      expect(listItems.length).toBeGreaterThan(0);
    });

    it('renders circular icon for each item', () => {
      const { container } = renderWithProviders(<ListSkeleton items={3} />);
      const icons = container.querySelectorAll('.rounded-full');
      expect(icons).toHaveLength(3);
    });
  });

  describe('Default Items', () => {
    it('renders 5 items by default', () => {
      const { container } = renderWithProviders(<ListSkeleton />);
      const items = container.querySelectorAll('.py-3');
      expect(items).toHaveLength(5);
    });
  });

  describe('Custom Item Count', () => {
    it('renders specified number of items', () => {
      const { container } = renderWithProviders(<ListSkeleton items={3} />);
      const items = container.querySelectorAll('.py-3');
      expect(items).toHaveLength(3);
    });

    it('renders 10 items', () => {
      const { container } = renderWithProviders(<ListSkeleton items={10} />);
      const items = container.querySelectorAll('.py-3');
      expect(items).toHaveLength(10);
    });
  });

  describe('Item Layout', () => {
    it('has flex layout with gap', () => {
      const { container } = renderWithProviders(<ListSkeleton />);
      const item = container.querySelector('.flex.items-center');
      expect(item).toHaveClass('gap-4');
    });

    it('has borders between items', () => {
      const { container } = renderWithProviders(<ListSkeleton />);
      const borders = container.querySelectorAll('.border-b');
      expect(borders.length).toBeGreaterThan(0);
    });
  });

  describe('Icon Dimensions', () => {
    it('has correct icon size', () => {
      const { container } = renderWithProviders(<ListSkeleton />);
      const icon = container.querySelector('.rounded-full') as HTMLElement;
      expect(icon.style.width).toBe('40px');
      expect(icon.style.height).toBe('40px');
    });
  });
});

describe('MetricCardSkeleton Component', () => {
  describe('Basic Rendering', () => {
    it('renders metric card container', () => {
      const { container } = renderWithProviders(<MetricCardSkeleton />);
      const card = container.querySelector('.bg-gray-800\\/50');
      expect(card).toBeInTheDocument();
    });

    it('renders circular icon skeleton', () => {
      const { container } = renderWithProviders(<MetricCardSkeleton />);
      const icon = container.querySelector('.rounded-full');
      expect(icon).toBeInTheDocument();
    });

    it('renders rectangular badge skeleton', () => {
      const { container } = renderWithProviders(<MetricCardSkeleton />);
      const badge = container.querySelector('.rounded-none');
      expect(badge).toBeInTheDocument();
    });

    it('renders metric value skeleton', () => {
      const { container } = renderWithProviders(<MetricCardSkeleton />);
      const valueSkeletons = container.querySelectorAll('.rounded.h-4');
      expect(valueSkeletons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Layout', () => {
    it('has header with icon and badge', () => {
      const { container } = renderWithProviders(<MetricCardSkeleton />);
      const header = container.querySelector('.flex.items-center.justify-between');
      expect(header).toBeInTheDocument();
    });

    it('has spacing between elements', () => {
      const { container } = renderWithProviders(<MetricCardSkeleton />);
      const header = container.querySelector('.flex.items-center.justify-between');
      expect(header).toHaveClass('mb-4');
    });
  });

  describe('Dimensions', () => {
    it('icon has correct size', () => {
      const { container } = renderWithProviders(<MetricCardSkeleton />);
      const icon = container.querySelector('.rounded-full') as HTMLElement;
      expect(icon.style.width).toBe('40px');
      expect(icon.style.height).toBe('40px');
    });

    it('badge has correct dimensions', () => {
      const { container } = renderWithProviders(<MetricCardSkeleton />);
      const badge = container.querySelector('.rounded-none') as HTMLElement;
      expect(badge.style.width).toBe('80px');
      expect(badge.style.height).toBe('24px');
    });

    it('metric value has h-8 height', () => {
      const { container } = renderWithProviders(<MetricCardSkeleton />);
      const valueSkeletons = container.querySelectorAll('.rounded.h-8');
      expect(valueSkeletons.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('FormSkeleton Component', () => {
  describe('Basic Rendering', () => {
    it('renders form container', () => {
      const { container } = renderWithProviders(<FormSkeleton />);
      const form = container.querySelector('.bg-gray-800\\/50');
      expect(form).toBeInTheDocument();
    });

    it('renders field skeletons', () => {
      const { container } = renderWithProviders(<FormSkeleton />);
      const fieldSkeletons = container.querySelectorAll('.rounded-lg');
      expect(fieldSkeletons.length).toBeGreaterThanOrEqual(4);
    });

    it('renders button skeletons', () => {
      const { container } = renderWithProviders(<FormSkeleton />);
      const buttonSkeletons = container.querySelectorAll('.rounded-lg');
      expect(buttonSkeletons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Default Field Count', () => {
    it('renders 4 fields by default', () => {
      const { container } = renderWithProviders(<FormSkeleton />);
      const fields = container.querySelectorAll('.space-y-2');
      expect(fields).toHaveLength(4);
    });
  });

  describe('Custom Field Count', () => {
    it('renders specified number of fields', () => {
      const { container } = renderWithProviders(<FormSkeleton fields={6} />);
      const fields = container.querySelectorAll('.space-y-2');
      expect(fields).toHaveLength(6);
    });

    it('renders 2 fields', () => {
      const { container } = renderWithProviders(<FormSkeleton fields={2} />);
      const fields = container.querySelectorAll('.space-y-2');
      expect(fields).toHaveLength(2);
    });
  });

  describe('Field Layout', () => {
    it('has label skeleton with w-1/4', () => {
      const { container } = renderWithProviders(<FormSkeleton />);
      // Use classList.contains instead since slash needs escaping
      const allDivs = container.querySelectorAll('div');
      let foundLabel = false;
      for (const div of allDivs) {
        if (div.classList.contains('w-1/4')) {
          foundLabel = true;
          break;
        }
      }
      expect(foundLabel).toBe(true);
    });

    it('has input skeleton with correct height via style attribute', () => {
      const { container } = renderWithProviders(<FormSkeleton />);
      const inputSkeletons = container.querySelectorAll('.rounded-lg');
      // Find the skeleton with height 42
      let found = false;
      for (const sk of inputSkeletons) {
        const el = sk as HTMLElement;
        if (el.style.height === '42px') {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
  });

  describe('Button Layout', () => {
    it('has button container with flex gap', () => {
      const { container } = renderWithProviders(<FormSkeleton />);
      const buttonContainer = container.querySelector('.flex.gap-3');
      expect(buttonContainer).toBeInTheDocument();
    });

    it('has two button skeletons', () => {
      const { container } = renderWithProviders(<FormSkeleton />);
      const buttonContainer = container.querySelector('.flex.gap-3');
      const buttons = buttonContainer?.querySelectorAll('.rounded-lg');
      expect(buttons).toHaveLength(2);
    });

    it('buttons have correct dimensions', () => {
      const { container } = renderWithProviders(<FormSkeleton />);
      const buttonContainer = container.querySelector('.flex.gap-3');
      const buttons = buttonContainer?.querySelectorAll('.rounded-lg');

      // Check that buttons have width and height set via style
      let found120 = false;
      let found100 = false;

      for (const btn of buttons || []) {
        const el = btn as HTMLElement;
        if (el.style.width === '120px' && el.style.height === '40px') {
          found120 = true;
        }
        if (el.style.width === '100px' && el.style.height === '40px') {
          found100 = true;
        }
      }

      expect(found120).toBe(true);
      expect(found100).toBe(true);
    });
  });

  describe('Form Styling', () => {
    it('has padding and rounded corners', () => {
      const { container } = renderWithProviders(<FormSkeleton />);
      const form = container.querySelector('.bg-gray-800\\/50');
      expect(form).toHaveClass('rounded-lg', 'p-6');
    });

    it('has space between fields', () => {
      const { container } = renderWithProviders(<FormSkeleton />);
      const form = container.querySelector('.space-y-4');
      expect(form).toBeInTheDocument();
    });
  });
});
