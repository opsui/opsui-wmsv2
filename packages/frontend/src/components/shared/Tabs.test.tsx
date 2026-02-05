/**
 * @file Tabs.test.tsx
 * @purpose Tests for Tabs component and variants
 * @complexity medium
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { Tabs, TabPanel, VerticalTabs } from './Tabs';

// Mock icon component for tests
const MockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} data-testid="mock-icon" />
);

describe('Tabs Component', () => {
  const mockTabs = [
    { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
    { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
    { id: 'tab3', label: 'Tab 3', content: <div>Content 3</div> },
  ];

  describe('Basic Rendering', () => {
    it('renders all tab buttons', () => {
      renderWithProviders(<Tabs tabs={mockTabs} />);
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
    });

    it('renders active tab content by default', () => {
      renderWithProviders(<Tabs tabs={mockTabs} />);
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('sets first tab as active by default', () => {
      renderWithProviders(<Tabs tabs={mockTabs} />);
      const tab1 = screen.getByText('Tab 1').closest('button');
      expect(tab1).toHaveClass('bg-white', 'dark:bg-gray-800', 'text-blue-600');
    });

    it('renders tab headers in a flex container', () => {
      const { container } = renderWithProviders(<Tabs tabs={mockTabs} />);
      const header = container.querySelector('.flex.border-b');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Tab Selection', () => {
    it('switches to second tab when clicked', () => {
      renderWithProviders(<Tabs tabs={mockTabs} />);

      fireEvent.click(screen.getByText('Tab 2'));

      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('switches to third tab when clicked', () => {
      renderWithProviders(<Tabs tabs={mockTabs} />);

      fireEvent.click(screen.getByText('Tab 3'));

      expect(screen.getByText('Content 3')).toBeInTheDocument();
    });

    it('updates active tab styling when switching', () => {
      renderWithProviders(<Tabs tabs={mockTabs} />);

      const tab1 = screen.getByText('Tab 1').closest('button');
      const tab2 = screen.getByText('Tab 2').closest('button');

      expect(tab1).toHaveClass('text-blue-600', 'dark:text-blue-400');

      fireEvent.click(screen.getByText('Tab 2'));

      expect(tab2).toHaveClass('bg-white', 'dark:bg-gray-800', 'text-blue-600');
    });

    it('can switch back to previous tab', () => {
      renderWithProviders(<Tabs tabs={mockTabs} />);

      fireEvent.click(screen.getByText('Tab 2'));
      fireEvent.click(screen.getByText('Tab 1'));

      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  describe('Default Tab', () => {
    it('sets specified tab as default', () => {
      renderWithProviders(<Tabs tabs={mockTabs} defaultTab="tab2" />);
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('highlights default tab as active', () => {
      renderWithProviders(<Tabs tabs={mockTabs} defaultTab="tab2" />);
      const tab2 = screen.getByText('Tab 2').closest('button');
      expect(tab2).toHaveClass('bg-white', 'dark:bg-gray-800');
    });
  });

  describe('Variants', () => {
    it('applies default variant styling', () => {
      const { container } = renderWithProviders(<Tabs tabs={mockTabs} variant="default" />);
      const header = container.querySelector('.flex');
      expect(header).toHaveClass('border-b', 'border-gray-200', 'dark:border-gray-700');
    });

    it('applies pills variant styling', () => {
      const { container } = renderWithProviders(<Tabs tabs={mockTabs} variant="pills" />);
      const header = container.querySelector('.flex');
      expect(header).toHaveClass('gap-2', 'bg-gray-100', 'dark:bg-gray-800', 'rounded-lg');
    });

    it('applies underline variant styling', () => {
      const { container } = renderWithProviders(<Tabs tabs={mockTabs} variant="underline" />);
      const header = container.querySelector('.flex');
      expect(header).toHaveClass('border-b', 'border-gray-200', 'dark:border-gray-700');
    });

    it('applies active pills styling', () => {
      renderWithProviders(<Tabs tabs={mockTabs} variant="pills" />);
      const tab1 = screen.getByText('Tab 1').closest('button');
      expect(tab1).toHaveClass('bg-blue-500', 'text-white');
    });

    it('applies active underline styling', () => {
      renderWithProviders(<Tabs tabs={mockTabs} variant="underline" />);
      const tab1 = screen.getByText('Tab 1').closest('button');
      expect(tab1).toHaveClass('border-b-2', 'border-blue-500');
    });
  });

  describe('Sizes', () => {
    it('applies small size styling', () => {
      const { container } = renderWithProviders(<Tabs tabs={mockTabs} size="sm" />);
      const tab1 = screen.getByText('Tab 1').closest('button');
      expect(tab1).toHaveClass('text-sm', 'px-3', 'py-1.5');
    });

    it('applies medium size styling by default', () => {
      const { container } = renderWithProviders(<Tabs tabs={mockTabs} size="md" />);
      const tab1 = screen.getByText('Tab 1').closest('button');
      expect(tab1).toHaveClass('text-sm', 'px-4', 'py-2');
    });

    it('applies large size styling', () => {
      const { container } = renderWithProviders(<Tabs tabs={mockTabs} size="lg" />);
      const tab1 = screen.getByText('Tab 1').closest('button');
      expect(tab1).toHaveClass('text-base', 'px-5', 'py-2.5');
    });
  });

  describe('Full Width', () => {
    it('applies full width styling when enabled', () => {
      renderWithProviders(<Tabs tabs={mockTabs} fullWidth />);
      const tab1 = screen.getByText('Tab 1').closest('button');
      expect(tab1).toHaveClass('flex-1', 'justify-center');
    });

    it('does not apply full width by default', () => {
      renderWithProviders(<Tabs tabs={mockTabs} />);
      const tab1 = screen.getByText('Tab 1').closest('button');
      expect(tab1).not.toHaveClass('flex-1');
    });
  });

  describe('Icons', () => {
    const tabsWithIcons = [
      {
        id: 'tab1',
        label: 'Tab 1',
        content: <div>Content 1</div>,
        icon: MockIcon,
      },
      {
        id: 'tab2',
        label: 'Tab 2',
        content: <div>Content 2</div>,
        icon: MockIcon,
      },
    ];

    it('renders icons when provided', () => {
      renderWithProviders(<Tabs tabs={tabsWithIcons} />);
      const icons = screen.getAllByTestId('mock-icon');
      expect(icons).toHaveLength(2);
    });

    it('applies correct icon size', () => {
      renderWithProviders(<Tabs tabs={tabsWithIcons} />);
      const icons = screen.getAllByTestId('mock-icon');
      // Check that first icon has correct size
      expect(icons[0]).toHaveClass('h-4', 'w-4');
    });
  });

  describe('Badges', () => {
    const tabsWithBadges = [
      {
        id: 'tab1',
        label: 'Tab 1',
        content: <div>Content 1</div>,
        badge: '5',
      },
      {
        id: 'tab2',
        label: 'Tab 2',
        content: <div>Content 2</div>,
        badge: 10,
      },
    ];

    it('renders badges when provided', () => {
      renderWithProviders(<Tabs tabs={tabsWithBadges} />);
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('applies badge styling', () => {
      renderWithProviders(<Tabs tabs={tabsWithBadges} />);
      const badge = screen.getByText('5').closest('span');
      expect(badge).toHaveClass('rounded-full', 'text-xs');
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className with container', () => {
      const { container } = renderWithProviders(<Tabs tabs={mockTabs} className="custom-tabs" />);
      const wrapper = container.querySelector('.custom-tabs');
      expect(wrapper).toBeInTheDocument();
    });

    it('merges contentClassName with content container', () => {
      const { container } = renderWithProviders(
        <Tabs tabs={mockTabs} contentClassName="custom-content" />
      );
      const content = container.querySelector('.custom-content');
      expect(content).toBeInTheDocument();
    });
  });
});

describe('TabPanel Component', () => {
  describe('Conditional Rendering', () => {
    it('renders content when active', () => {
      renderWithProviders(
        <TabPanel isActive>
          <div>Panel Content</div>
        </TabPanel>
      );
      expect(screen.getByText('Panel Content')).toBeInTheDocument();
    });

    it('does not render when inactive', () => {
      renderWithProviders(
        <TabPanel isActive={false}>
          <div>Panel Content</div>
        </TabPanel>
      );
      expect(screen.queryByText('Panel Content')).not.toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className', () => {
      const { container } = renderWithProviders(
        <TabPanel isActive className="custom-panel">
          <div>Content</div>
        </TabPanel>
      );
      const panel = container.querySelector('.custom-panel');
      expect(panel).toBeInTheDocument();
    });
  });
});

describe('VerticalTabs Component', () => {
  const mockTabs = [
    { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
    { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
  ];

  describe('Basic Rendering', () => {
    it('renders tabs in vertical layout', () => {
      const { container } = renderWithProviders(<VerticalTabs tabs={mockTabs} />);
      const layout = container.querySelector('.flex.gap-4');
      expect(layout).toBeInTheDocument();
    });

    it('renders tab buttons in vertical column', () => {
      const { container } = renderWithProviders(<VerticalTabs tabs={mockTabs} />);
      const column = container.querySelector('.flex.flex-col');
      expect(column).toBeInTheDocument();
    });

    it('renders active tab content', () => {
      renderWithProviders(<VerticalTabs tabs={mockTabs} />);
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  describe('Tab Selection', () => {
    it('switches content when tab is clicked', () => {
      renderWithProviders(<VerticalTabs tabs={mockTabs} />);

      fireEvent.click(screen.getByText('Tab 2'));

      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('updates active tab styling', () => {
      renderWithProviders(<VerticalTabs tabs={mockTabs} />);

      const tab2 = screen.getByText('Tab 2').closest('button');
      expect(tab2).not.toHaveClass('bg-blue-500', 'text-white');

      fireEvent.click(screen.getByText('Tab 2'));

      expect(tab2).toHaveClass('bg-blue-500', 'text-white');
    });
  });

  describe('Default Tab', () => {
    it('sets specified tab as default', () => {
      renderWithProviders(<VerticalTabs tabs={mockTabs} defaultTab="tab2" />);
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('has fixed width for tab column', () => {
      const { container } = renderWithProviders(<VerticalTabs tabs={mockTabs} />);
      const column = container.querySelector('.flex.flex-col');
      expect(column).toHaveClass('w-48');
    });

    it('has flex-1 for content area', () => {
      const { container } = renderWithProviders(<VerticalTabs tabs={mockTabs} />);
      const content = container.querySelector('.flex-1');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className', () => {
      const { container } = renderWithProviders(
        <VerticalTabs tabs={mockTabs} className="custom-vertical-tabs" />
      );
      const wrapper = container.querySelector('.custom-vertical-tabs');
      expect(wrapper).toBeInTheDocument();
    });
  });
});
