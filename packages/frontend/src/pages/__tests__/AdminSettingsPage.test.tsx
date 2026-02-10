/**
 * Tests for AdminSettingsPage component
 *
 * Tests for the Admin Settings page functionality including:
 * - Role switcher settings
 * - Role visibility management
 * - Role badge color customization
 * - Appearance settings
 * - Notifications & sounds settings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import AdminSettingsPage from '../AdminSettingsPage';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
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
  };
});

// Mock stores
vi.mock('@/stores', async () => ({
  useUIStore: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
    soundEnabled: true,
    setSoundEnabled: vi.fn(),
  }),
  playSound: vi.fn(),
}));

vi.mock('@/stores', async importOriginal => {
  const actual = await importOriginal<typeof import('@/stores')>();
  return {
    ...actual,
    useAuthStore: () => ({
      user: {
        userId: 'test-user',
        role: 'ADMIN',
        name: 'Test User',
      },
    }),
  };
});

// Mock API hooks
vi.mock('@/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    useMyRoles: vi.fn(() => ({
      data: [],
      isLoading: false,
    })),
  };
});

// Mock badge utilities
vi.mock('@/components/shared/Badge', () => ({
  getUserRoleColor: vi.fn(() => ({ color: '#3b82f6' })),
  saveUserRoleColor: vi.fn(),
}));

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      clear: vi.fn(),
    };
    global.localStorage = localStorageMock as any;
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<AdminSettingsPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays page title', () => {
      renderWithProviders(<AdminSettingsPage />);
      expect(screen.getByText('Admin Settings')).toBeInTheDocument();
    });

    it('displays back button', () => {
      renderWithProviders(<AdminSettingsPage />);
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    });
  });

  describe('Section Navigation', () => {
    it('renders all navigation sections', () => {
      renderWithProviders(<AdminSettingsPage />);
      expect(screen.getByText('Role Switcher')).toBeInTheDocument();
      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Notifications & Sounds')).toBeInTheDocument();
      expect(screen.getByText('Account')).toBeInTheDocument();
    });
  });

  describe('Role Switcher Section', () => {
    it('displays role count information', () => {
      renderWithProviders(<AdminSettingsPage />);
      expect(screen.getByText(/Showing.*roles in switcher/)).toBeInTheDocument();
    });

    it('displays role badge color section', () => {
      renderWithProviders(<AdminSettingsPage />);
      expect(screen.getByText('My Role Badge Color')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<AdminSettingsPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Admin Settings');
    });
  });
});
