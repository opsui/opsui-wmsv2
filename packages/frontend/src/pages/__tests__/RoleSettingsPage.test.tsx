/**
 * Tests for RoleSettingsPage component
 *
 * Tests for the Role Settings page functionality including:
 * - Role visibility management
 * - Role badge color customization
 * - Base vs custom role handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import RoleSettingsPage from '../RoleSettingsPage';

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
    Header: () => <div data-testid="header">Header</div>,
    Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <h3>{children}</h3>,
    Button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
    Badge: ({ children, customColor }: any) => (
      <span style={{ color: customColor }}>{children}</span>
    ),
    ConfirmDialog: ({ isOpen, onClose }: any) =>
      isOpen ? <div data-testid="confirm-dialog">Confirm Dialog</div> : null,
    CycleCountNavigation: ({ activePage }: any) => (
      <div data-testid="cycle-count-nav">Cycle Count Nav - {activePage}</div>
    ),
    useToast: () => ({
      showToast: vi.fn(),
    }),
  };
});

// Mock stores
vi.mock('@/stores', async () => ({
  playSound: vi.fn(),
}));

// Mock badge utilities
vi.mock('@/components/shared/Badge', () => ({
  getUserRoleColor: vi.fn(() => ({ color: '#3b82f6' })),
  saveUserRoleColor: vi.fn(),
}));

// Mock API hooks
vi.mock('@/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    useCurrentUser: vi.fn(() => ({
      data: {
        userId: 'test-user',
        role: 'ADMIN',
        additionalRoles: ['PICKER', 'PACKER'],
      },
    })),
  };
});

describe('RoleSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console logs during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() =>
        JSON.stringify({
          admin: true,
          picking: true,
          packing: true,
          'stock-control': true,
          inwards: true,
          sales: true,
          production: true,
          maintenance: true,
          rma: true,
          accounting: true,
        })
      ),
      setItem: vi.fn(),
      clear: vi.fn(),
    };
    global.localStorage = localStorageMock as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<RoleSettingsPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays page title', () => {
      renderWithProviders(<RoleSettingsPage />);
      expect(screen.getByText('Role Switcher Settings')).toBeInTheDocument();
      expect(
        screen.getByText('Customize which roles appear in your role view dropdown')
      ).toBeInTheDocument();
    });

    it('displays back button', () => {
      renderWithProviders(<RoleSettingsPage />);
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    });
  });

  describe('Role Visibility', () => {
    it('displays role count information', () => {
      renderWithProviders(<RoleSettingsPage />);
      expect(screen.getByText(/Showing.*roles in switcher/)).toBeInTheDocument();
    });

    it('displays role cards', () => {
      renderWithProviders(<RoleSettingsPage />);
      expect(screen.getByText('Admin View')).toBeInTheDocument();
      expect(screen.getByText('Picking View')).toBeInTheDocument();
      expect(screen.getByText('Packing View')).toBeInTheDocument();
    });
  });

  describe('Role Badge Colors', () => {
    it('displays role badge colors section', () => {
      renderWithProviders(<RoleSettingsPage />);
      expect(screen.getByText('My Role Badge Colors')).toBeInTheDocument();
    });

    it('displays color picker options', () => {
      renderWithProviders(<RoleSettingsPage />);
      // The page should have multiple color buttons (15 colors total)
      const colorButtons = screen.getAllByRole('button');
      expect(colorButtons.length).toBeGreaterThan(10);
    });
  });

  describe('Action Buttons', () => {
    it('displays reset to defaults button', () => {
      renderWithProviders(<RoleSettingsPage />);
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    it('displays cancel button', () => {
      renderWithProviders(<RoleSettingsPage />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('displays save changes button', () => {
      renderWithProviders(<RoleSettingsPage />);
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  describe('Info Box', () => {
    it('displays how it works section', () => {
      renderWithProviders(<RoleSettingsPage />);
      expect(screen.getByText('How it works')).toBeInTheDocument();
    });

    it('displays base roles explanation', () => {
      renderWithProviders(<RoleSettingsPage />);
      expect(
        screen.getByText(/Base roles.*PICKER, PACKER, STOCK_CONTROLLER, ADMIN/)
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<RoleSettingsPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Role Switcher Settings');
    });
  });
});
