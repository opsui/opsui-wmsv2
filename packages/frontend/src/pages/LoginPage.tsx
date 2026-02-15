/**
 * Login page
 *
 * User authentication form
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import { authApi } from '@/services/api';
import { Button } from '@/components/shared';
import { showSuccess, showError } from '@/stores/uiStore';
import { useFormValidation, commonValidations } from '@/hooks/useFormValidation';

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
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-responsive-xl font-bold dark:text-white text-gray-900 tracking-tight">
            OpsUI
          </h1>
          <p className="mt-2 dark:text-gray-400 text-gray-600 text-responsive-sm">
            Warehouse Management System
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="glass-card rounded-xl p-6 sm:p-8 space-y-6 card-hover">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold dark:text-gray-300 text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
                className={`mobile-input block w-full px-4 py-3 border rounded-xl dark:bg-white/[0.05] bg-gray-50 dark:text-white text-gray-900 placeholder:text-gray-500 dark:focus:bg-white/[0.08] focus:bg-gray-100 focus:shadow-glow transition-all duration-300 ${
                  errors.email
                    ? 'border-red-500 focus:border-red-500'
                    : 'dark:border-white/[0.08] border-gray-300 focus:border-primary-500/50'
                }`}
                placeholder="Enter your email"
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
                className={`mobile-input block w-full px-4 py-3 border rounded-xl dark:bg-white/[0.05] bg-gray-50 dark:text-white text-gray-900 placeholder:text-gray-500 dark:focus:bg-white/[0.08] focus:bg-gray-100 focus:shadow-glow transition-all duration-300 ${
                  errors.password
                    ? 'border-red-500 focus:border-red-500'
                    : 'dark:border-white/[0.08] border-gray-300 focus:border-primary-500/50'
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
              className="shadow-glow touch-target"
            >
              Sign In
            </Button>
          </div>
        </form>

        {/* Mobile-specific help text */}
        <div className="text-center sm:hidden">
          <p className="text-xs text-gray-500">Use your warehouse credentials to sign in</p>
        </div>
      </div>
    </div>
  );
}
