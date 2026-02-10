/**
 * Tests for NotFoundPage component
 *
 * Tests for the 404 Not Found page functionality including:
 * - Error message display
 * - Navigation actions (Go to Dashboard, Go Back)
 * - Support contact link
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { NotFoundPage } from '../NotFoundPage';

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
    Button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
  };
});

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<NotFoundPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays 404 code', () => {
      renderWithProviders(<NotFoundPage />);
      expect(screen.getByText('404')).toBeInTheDocument();
    });

    it('displays page not found message', () => {
      renderWithProviders(<NotFoundPage />);
      expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    });

    it('displays error description', () => {
      renderWithProviders(<NotFoundPage />);
      expect(screen.getByText(/Sorry, we couldn't find/)).toBeInTheDocument();
    });
  });

  describe('Suggested Actions', () => {
    it('displays what can you do section', () => {
      renderWithProviders(<NotFoundPage />);
      expect(screen.getByText('What can you do?')).toBeInTheDocument();
    });

    it('displays suggestion to check URL', () => {
      renderWithProviders(<NotFoundPage />);
      expect(screen.getByText(/Check the URL for spelling mistakes/)).toBeInTheDocument();
    });

    it('displays suggestion to go back', () => {
      renderWithProviders(<NotFoundPage />);
      expect(screen.getByText(/Try going back to the previous page/)).toBeInTheDocument();
    });

    it('displays suggestion to use navigation', () => {
      renderWithProviders(<NotFoundPage />);
      expect(screen.getByText(/Use the navigation menu/)).toBeInTheDocument();
    });

    it('displays suggestion to contact support', () => {
      renderWithProviders(<NotFoundPage />);
      expect(screen.getByText(/Contact support if you believe/)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders go to dashboard button', () => {
      renderWithProviders(<NotFoundPage />);
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    });

    it('renders go back button', () => {
      renderWithProviders(<NotFoundPage />);
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });

    it('navigates to dashboard when Go to Dashboard is clicked', () => {
      renderWithProviders(<NotFoundPage />);
      screen.getByText('Go to Dashboard').click();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('navigates back when Go Back is clicked', () => {
      renderWithProviders(<NotFoundPage />);
      screen.getByText('Go Back').click();
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('Support Link', () => {
    it('displays contact support link', () => {
      renderWithProviders(<NotFoundPage />);
      expect(screen.getByText('Contact Support')).toBeInTheDocument();
    });

    it('has correct email link', () => {
      renderWithProviders(<NotFoundPage />);
      const link = screen.getByText('Contact Support').closest('a');
      expect(link).toHaveAttribute('href', 'mailto:support@warehouse-management.com');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<NotFoundPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Page Not Found');
    });
  });
});
