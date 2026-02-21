/**
 * Login page
 *
 * User authentication form for ERP business operations
 *
 * ============================================================================
 * AESTHETIC DIRECTION: SECURE GATEWAY
 * ============================================================================
 * A bold, secure entrance with industrial tech aesthetic:
 * - Dark theme with security-focused purple accents
 * - Animated grid background suggesting data infrastructure
 * - Staggered entrance animations for visual impact
 * - Decorative corner brackets suggesting secure containment
 * - Gradient title with distinctive branding
 * - Subtle security pulse animation on the login card
 * ============================================================================
 */

import { Button } from '@/components/shared';
import { commonValidations, useFormValidation } from '@/hooks/useFormValidation';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/stores';
import { showError, showSuccess } from '@/stores/uiStore';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// TYPES
// ============================================================================

interface LoginFormData {
  email: string;
  password: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  // Form validation
  const {
    values: formData,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
  } = useFormValidation<LoginFormData>({
    initialValues: {
      email: '',
      password: '',
    },
    validationRules: {
      email: {
        ...commonValidations.email,
        maxLength: 255,
      },
      password: {
        required: true,
        minLength: 8,
      },
    },
    onSubmit: async values => {
      // Trigger the login mutation
      loginMutation.mutate({ email: values.email, password: values.password });
    },
    validateOnChange: true,
  });

  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onMutate: () => {
      setIsLoading(true);
    },
    onSuccess: data => {
      // Check if user data exists
      if (!data || !data.user) {
        showError('Login response missing user data');
        return;
      }

      login(data);
      showSuccess('Welcome back!');
      // Navigate based on user role
      if (data.user.role === 'PICKER') {
        navigate('/orders');
      } else {
        navigate('/dashboard');
      }
    },
    onError: (error: Error) => {
      showError(error.message);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return (
    <div className="login-container login-grid-bg min-h-screen flex items-center justify-center px-4 sm:px-6 py-12">
      {/* Decorative blur elements for atmospheric depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header with staggered animation */}
        <div className="text-center" style={{ animation: 'login-stagger-in 0.4s ease-out' }}>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="login-title-ops">Ops</span>
            <span className="login-title-ui">UI</span>
          </h1>
          <p className="mt-3 dark:text-gray-400 text-gray-600 text-sm font-medium tracking-wide uppercase">
            Enterprise Resource Planning
          </p>
        </div>

        {/* Login Form with security aesthetic */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
          style={{ animation: 'login-stagger-in 0.5s ease-out 0.1s backwards' }}
        >
          <div className="login-card login-corners rounded-2xl p-8 sm:p-10 space-y-6">
            {/* Security badge */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                <svg
                  className="w-4 h-4 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span className="text-xs font-medium text-purple-400 tracking-wide uppercase">
                  Business Portal
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold dark:text-gray-300 text-gray-700 mb-2"
              >
                Business Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
                className={`login-input block w-full px-4 py-3.5 rounded-xl dark:text-white text-gray-900 placeholder:text-gray-500 transition-all duration-300 ${
                  errors.email ? 'border-red-500 focus:border-red-500' : ''
                }`}
                placeholder="your.email@company.com"
              />
              {errors.email && <p className="mt-2 text-sm text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold dark:text-gray-300 text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
                className={`login-input block w-full px-4 py-3.5 rounded-xl dark:text-white text-gray-900 placeholder:text-gray-500 transition-all duration-300 ${
                  errors.password ? 'border-red-500 focus:border-red-500' : ''
                }`}
                placeholder="Enter your password"
              />
              {errors.password && <p className="mt-2 text-sm text-red-400">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading || isSubmitting}
              disabled={loginMutation.isPending || isSubmitting}
              className="login-btn touch-target h-12 text-base font-semibold rounded-xl"
            >
              Sign In to Portal
            </Button>
          </div>
        </form>

        {/* Footer help text */}
        <div
          className="text-center space-y-2"
          style={{ animation: 'login-stagger-in 0.6s ease-out 0.2s backwards' }}
        >
          <p className="text-xs text-gray-500">
            Use your business credentials to access the platform
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-500">
            Contact your system administrator for access requests
          </p>
        </div>
      </div>
    </div>
  );
}
