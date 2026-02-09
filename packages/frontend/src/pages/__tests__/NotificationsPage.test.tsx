/**
 * Tests for NotificationsPage component
 *
 * Tests for the Notifications page functionality including:
 * - Notification display
 * - Notification filtering
 * - Notification management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import NotificationsPage from '../NotificationsPage';

// Mock the Header component
vi.mock('@/components/shared', async () => {
  const actual = await vi.importActual<typeof import('@/components/shared')>('@/components/shared');
  return {
    ...actual,
    Header: () => <div data-testid="header">Header</div>,
  };
});

// Mock the NotificationHistory component
vi.mock('@/components/notifications', () => ({
  NotificationHistory: ({ limit }: { limit: number }) => (
    <div data-testid="notification-history">Notification History (limit: {limit})</div>
  ),
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<NotificationsPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays the page title', () => {
      renderWithProviders(<NotificationsPage />);
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('View and manage your notifications')).toBeInTheDocument();
    });
  });

  describe('Components', () => {
    it('renders the Header component', () => {
      renderWithProviders(<NotificationsPage />);
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('renders the NotificationHistory component with limit', () => {
      renderWithProviders(<NotificationsPage />);
      expect(screen.getByTestId('notification-history')).toBeInTheDocument();
      expect(screen.getByText(/Notification History \(limit: 100\)/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<NotificationsPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Notifications');
    });
  });
});
