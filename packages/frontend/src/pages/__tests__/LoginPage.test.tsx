/**
 * Tests for LoginPage component
 *
 * Core tests for the Login page functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { LoginPage } from '../LoginPage';

// Mock all the external dependencies
vi.mock('@/stores', () => ({
  useAuthStore: vi.fn(selector => {
    const state = {
      login: vi.fn(),
      logout: vi.fn(),
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      activeRole: null,
    };
    return selector ? selector(state) : state;
  }),
  // Mock the uiStore exports
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/stores/uiStore', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/hooks/useFormValidation', () => ({
  useFormValidation: vi.fn(() => ({
    values: { email: '', password: '' },
    errors: {},
    handleChange: vi.fn(),
    handleSubmit: vi.fn(e => {
      e?.preventDefault?.();
    }),
    isSubmitting: false,
    resetForm: vi.fn(),
  })),
  commonValidations: {
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      required: true,
      minLength: 8,
    },
  },
}));

vi.mock('@/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    authApi: {
      login: vi.fn(),
    },
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<LoginPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays the OpsUI title', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByText('OpsUI')).toBeInTheDocument();
      expect(screen.getByText('Warehouse Management System')).toBeInTheDocument();
    });

    it('renders email input field', () => {
      renderWithProviders(<LoginPage />);
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('name', 'email');
      expect(emailInput).toHaveAttribute('required');
    });

    it('renders password input field', () => {
      renderWithProviders(<LoginPage />);
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('name', 'password');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('renders sign in button', () => {
      renderWithProviders(<LoginPage />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('displays mobile help text', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByText('Use your warehouse credentials to sign in')).toBeInTheDocument();
    });
  });

  describe('Form Structure', () => {
    it('has proper form structure with inputs', () => {
      renderWithProviders(<LoginPage />);
      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      expect(form).toContainElement(emailInput);
      expect(form).toContainElement(passwordInput);
      expect(form).toContainElement(submitButton);
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form inputs', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('has proper autocomplete attributes', () => {
      renderWithProviders(<LoginPage />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    });

    it('has placeholder text for inputs', () => {
      renderWithProviders(<LoginPage />);
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

      expect(emailInput.placeholder).toBe('Enter your email');
      expect(passwordInput.placeholder).toBe('Enter your password');
    });
  });
});
