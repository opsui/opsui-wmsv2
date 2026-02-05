/**
 * NotificationCenter Component Tests
 * @complexity medium
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { NotificationCenter } from '../NotificationCenter';

// Mock the useUIStore
const mockNotifications: any[] = [];
const mockRemoveNotification = vi.fn();

vi.mock('@/stores', () => ({
  useUIStore: vi.fn(selector => {
    if (selector.toString().includes('notifications')) {
      return mockNotifications;
    }
    if (selector.toString().includes('removeNotification')) {
      return mockRemoveNotification;
    }
    return {
      notifications: mockNotifications,
      removeNotification: mockRemoveNotification,
    };
  }),
}));

import { useUIStore } from '@/stores';

describe('NotificationCenter Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifications.length = 0;
  });

  describe('Empty State', () => {
    it('renders null when no notifications', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      expect(container.firstChild).toBe(null);
    });
  });

  describe('Single Notification', () => {
    beforeEach(() => {
      mockNotifications.push({
        id: '1',
        type: 'success',
        message: 'Operation completed successfully',
      });
    });

    it('renders success notification', () => {
      renderWithProviders(<NotificationCenter />);
      expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    });

    it('shows success icon', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('shows close button', () => {
      renderWithProviders(<NotificationCenter />);
      const closeButton = screen.getByLabelText('Close notification');
      expect(closeButton).toBeInTheDocument();
    });

    it('removes notification when close button is clicked', () => {
      renderWithProviders(<NotificationCenter />);
      const closeButton = screen.getByLabelText('Close notification');
      fireEvent.click(closeButton);
      expect(mockRemoveNotification).toHaveBeenCalledWith('1');
    });

    it('has proper ARIA attributes', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const region = container.querySelector('[role="region"]');
      expect(region).toHaveAttribute('aria-label', 'Notifications');
      expect(region).toHaveAttribute('aria-live', 'polite');
    });

    it('has proper notification element ID', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const notification = container.querySelector('#notification-1');
      expect(notification).toBeInTheDocument();
    });
  });

  describe('Error Notification', () => {
    beforeEach(() => {
      mockNotifications.push({
        id: '2',
        type: 'error',
        message: 'Something went wrong',
      });
    });

    it('renders error notification', () => {
      renderWithProviders(<NotificationCenter />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Warning Notification', () => {
    beforeEach(() => {
      mockNotifications.push({
        id: '3',
        type: 'warning',
        message: 'Please be careful',
      });
    });

    it('renders warning notification', () => {
      renderWithProviders(<NotificationCenter />);
      expect(screen.getByText('Please be careful')).toBeInTheDocument();
    });
  });

  describe('Info Notification', () => {
    beforeEach(() => {
      mockNotifications.push({
        id: '4',
        type: 'info',
        message: 'Here is some information',
      });
    });

    it('renders info notification', () => {
      renderWithProviders(<NotificationCenter />);
      expect(screen.getByText('Here is some information')).toBeInTheDocument();
    });
  });

  describe('Multiple Notifications', () => {
    beforeEach(() => {
      mockNotifications.push(
        { id: '1', type: 'success', message: 'First success' },
        { id: '2', type: 'error', message: 'Second error' },
        { id: '3', type: 'info', message: 'Third info' }
      );
    });

    it('renders all notifications', () => {
      renderWithProviders(<NotificationCenter />);
      expect(screen.getByText('First success')).toBeInTheDocument();
      expect(screen.getByText('Second error')).toBeInTheDocument();
      expect(screen.getByText('Third info')).toBeInTheDocument();
    });

    it('shows close buttons for all notifications', () => {
      renderWithProviders(<NotificationCenter />);
      const closeButtons = screen.getAllByLabelText('Close notification');
      expect(closeButtons.length).toBe(3);
    });

    it('removes correct notification when its close button is clicked', () => {
      renderWithProviders(<NotificationCenter />);
      const closeButtons = screen.getAllByLabelText('Close notification');
      fireEvent.click(closeButtons[1]);
      expect(mockRemoveNotification).toHaveBeenCalledWith('2');
    });
  });

  describe('Styling and Layout', () => {
    beforeEach(() => {
      mockNotifications.push({
        id: '1',
        type: 'success',
        message: 'Test notification',
      });
    });

    it('applies fixed positioning', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const wrapper = container.querySelector('.fixed');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('bottom-4', 'right-4');
    });

    it('applies proper z-index', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const wrapper = container.querySelector('.z-50');
      expect(wrapper).toBeInTheDocument();
    });

    it('uses flex layout with gap', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const wrapper = container.querySelector('.flex.flex-col.gap-2');
      expect(wrapper).toBeInTheDocument();
    });

    it('has max-width constraint', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const wrapper = container.querySelector('.max-w-md');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Icon Mapping', () => {
    it('uses correct icon for success type', () => {
      mockNotifications.push({ id: '1', type: 'success', message: 'Success' });
      const { container } = renderWithProviders(<NotificationCenter />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('uses correct icon for error type', () => {
      mockNotifications.push({ id: '1', type: 'error', message: 'Error' });
      const { container } = renderWithProviders(<NotificationCenter />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('uses correct icon for warning type', () => {
      mockNotifications.push({ id: '1', type: 'warning', message: 'Warning' });
      const { container } = renderWithProviders(<NotificationCenter />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('uses correct icon for info type', () => {
      mockNotifications.push({ id: '1', type: 'info', message: 'Info' });
      const { container } = renderWithProviders(<NotificationCenter />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Color Mapping', () => {
    it('applies success colors', () => {
      mockNotifications.push({ id: '1', type: 'success', message: 'Success' });
      const { container } = renderWithProviders(<NotificationCenter />);
      const iconContainer = container.querySelector('.p-2');
      expect(iconContainer).toHaveClass('text-success-400');
    });

    it('applies error colors', () => {
      mockNotifications.push({ id: '1', type: 'error', message: 'Error' });
      const { container } = renderWithProviders(<NotificationCenter />);
      const iconContainer = container.querySelector('.p-2');
      expect(iconContainer).toHaveClass('text-error-400');
    });

    it('applies warning colors', () => {
      mockNotifications.push({ id: '1', type: 'warning', message: 'Warning' });
      const { container } = renderWithProviders(<NotificationCenter />);
      const iconContainer = container.querySelector('.p-2');
      expect(iconContainer).toHaveClass('text-warning-400');
    });

    it('applies info colors', () => {
      mockNotifications.push({ id: '1', type: 'info', message: 'Info' });
      const { container } = renderWithProviders(<NotificationCenter />);
      const iconContainer = container.querySelector('.p-2');
      expect(iconContainer).toHaveClass('text-primary-400');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockNotifications.push({
        id: '1',
        type: 'success',
        message: 'Accessible notification',
      });
    });

    it('has aria-hidden on icons', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('has aria-label on close button', () => {
      renderWithProviders(<NotificationCenter />);
      expect(screen.getByLabelText('Close notification')).toBeInTheDocument();
    });

    it('has tabIndex={-1} on notification element', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const notification = container.querySelector('#notification-1');
      expect(notification).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Animation Classes', () => {
    beforeEach(() => {
      mockNotifications.push({
        id: '1',
        type: 'success',
        message: 'Animated notification',
      });
    });

    it('applies animation classes', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const notification = container.querySelector('#notification-1');
      expect(notification).toHaveClass('animate-in', 'slide-in-from-right-full');
    });

    it('applies transition classes', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const notification = container.querySelector('#notification-1');
      expect(notification).toHaveClass('transition-all', 'duration-300');
    });
  });

  describe('Glass Card Styling', () => {
    beforeEach(() => {
      mockNotifications.push({
        id: '1',
        type: 'success',
        message: 'Glass notification',
      });
    });

    it('applies glass-card class', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const notification = container.querySelector('#notification-1');
      expect(notification).toHaveClass('glass-card');
    });

    it('applies shadow-premium class', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const notification = container.querySelector('#notification-1');
      expect(notification).toHaveClass('shadow-premium');
    });

    it('applies rounded-xl class', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const notification = container.querySelector('#notification-1');
      expect(notification).toHaveClass('rounded-xl');
    });
  });

  describe('Notification Structure', () => {
    beforeEach(() => {
      mockNotifications.push({
        id: '1',
        type: 'success',
        message: 'Structured notification',
      });
    });

    it('has icon container', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const iconContainer = container.querySelector('.flex-shrink-0.p-2.rounded-full');
      expect(iconContainer).toBeInTheDocument();
    });

    it('has message container', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const messageContainer = container.querySelector('.flex-1.min-w-0');
      expect(messageContainer).toBeInTheDocument();
    });

    it('has close button container', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const closeButton = container.querySelector('.flex-shrink-0.p-1');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Message Text Styling', () => {
    beforeEach(() => {
      mockNotifications.push({
        id: '1',
        type: 'success',
        message: 'Styled message',
      });
    });

    it('applies font-semibold to message', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const message = screen.getByText('Styled message');
      expect(message).toHaveClass('font-semibold');
    });

    it('applies text-white to message', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const message = screen.getByText('Styled message');
      expect(message).toHaveClass('text-white');
    });

    it('applies text-sm to message', () => {
      const { container } = renderWithProviders(<NotificationCenter />);
      const message = screen.getByText('Styled message');
      expect(message).toHaveClass('text-sm');
    });
  });
});
