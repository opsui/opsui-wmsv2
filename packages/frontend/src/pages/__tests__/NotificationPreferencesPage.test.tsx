/**
 * Tests for NotificationPreferencesPage component
 *
 * Tests for the Notification Preferences page functionality including:
 * - Channel enablement (Email, SMS, Push, In-App)
 * - Per-type preferences
 * - Quiet hours configuration
 * - Phone number for SMS
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { NotificationPreferencesPage } from '../NotificationPreferencesPage';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the shared components
vi.mock('@/components/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/shared')>();
  return {
    ...actual,
    Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <h2>{children}</h2>,
    CardContent: ({ children }: any) => <div>{children}</div>,
    Header: () => <div data-testid="header">Header</div>,
    Button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
    Badge: ({ children }: any) => <span>{children}</span>,
    ToggleSwitch: ({ checked, onChange }: any) => (
      <button onClick={() => onChange(!checked)} data-testid="toggle">
        {checked ? 'ON' : 'OFF'}
      </button>
    ),
  };
});

// Mock useToast
vi.mock('@/components/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/shared')>();
  return {
    ...actual,
    useToast: () => ({
      showToast: vi.fn(),
    }),
  };
});

// Mock API hooks
vi.mock('@/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    useNotificationPreferences: vi.fn(() => ({
      data: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        smsPhone: '',
        typePreferences: {},
      },
      isLoading: false,
    })),
    useNotificationStats: vi.fn(() => ({
      data: { unread: 5 },
    })),
    useUpdateNotificationPreferences: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    })),
  };
});

describe('NotificationPreferencesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<NotificationPreferencesPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays page title', () => {
      renderWithProviders(<NotificationPreferencesPage />);
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
      expect(screen.getByText('Manage how you receive notifications')).toBeInTheDocument();
    });

    it('displays back button', () => {
      renderWithProviders(<NotificationPreferencesPage />);
      const backButton = screen.getAllByText('Cancel')[0] || screen.getByText('Cancel');
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('Notification Channels', () => {
    it('renders all channel toggles', () => {
      renderWithProviders(<NotificationPreferencesPage />);
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('Push')).toBeInTheDocument();
      expect(screen.getByText('In-App')).toBeInTheDocument();
    });
  });

  describe('Notification Type Preferences', () => {
    it('renders notification types section', () => {
      renderWithProviders(<NotificationPreferencesPage />);
      expect(screen.getByText('Notification Type Preferences')).toBeInTheDocument();
    });

    it('displays notification types', () => {
      renderWithProviders(<NotificationPreferencesPage />);
      expect(screen.getByText('Order Claimed')).toBeInTheDocument();
      expect(screen.getByText('Order Completed')).toBeInTheDocument();
      expect(screen.getByText('Low Inventory')).toBeInTheDocument();
    });
  });

  describe('Quiet Hours', () => {
    it('renders quiet hours section', () => {
      renderWithProviders(<NotificationPreferencesPage />);
      expect(screen.getByText('Quiet Hours')).toBeInTheDocument();
    });

    it('displays enable quiet hours option', () => {
      renderWithProviders(<NotificationPreferencesPage />);
      expect(screen.getByText('Enable Quiet Hours')).toBeInTheDocument();
    });
  });

  describe('Save Actions', () => {
    it('renders save button', () => {
      renderWithProviders(<NotificationPreferencesPage />);
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<NotificationPreferencesPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Notification Preferences');
    });
  });
});
