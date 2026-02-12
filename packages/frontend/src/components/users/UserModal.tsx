/**
 * UserModal component
 *
 * Modal for creating and editing users
 */

import { useState, useEffect, useMemo } from 'react';
import { UserRole } from '@opsui/shared';
import { CardContent, Button } from '@/components/shared';
import {
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useFormValidation, commonValidations } from '@/hooks/useFormValidation';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
  initialData?: {
    name?: string;
    email?: string;
    role?: UserRole;
    active?: boolean;
  };
  isEditing?: boolean;
  isLoading?: boolean;
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  active?: boolean;
}

const ALL_ROLES = Object.values(UserRole);

function UserModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
  isLoading = false,
}: UserModalProps) {
  const [showPassword, setShowPassword] = useState(false);

  // Memoize initial values to prevent unnecessary re-renders
  // This is crucial - without useMemo, a new object is created on every render
  // which would cause the form to reset constantly
  const initialValues = useMemo(
    () => ({
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      role: initialData?.role || UserRole.PICKER,
      active: initialData?.active ?? true,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      initialData?.name,
      initialData?.email,
      initialData?.role,
      initialData?.active,
    ]
  );

  // Form validation
  const {
    values: formData,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    reset,
    setFieldValue,
  } = useFormValidation<UserFormData>({
    initialValues,
    validationRules: {
      name: {
        required: true,
        minLength: 2,
        maxLength: 100,
      },
      email: {
        ...commonValidations.email,
        maxLength: 255,
      },
      password: {
        custom: value => {
          // Password is required for new users
          if (!isEditing && !value) {
            return 'Password is required';
          }
          // Password must be at least 8 characters if provided
          if (value && value.length < 8) {
            return 'Password must be at least 8 characters';
          }
          return null;
        },
      },
      role: {
        required: true,
      },
    },
    onSubmit: async values => {
      // For editing, don't send password if it's empty
      const submitData: UserFormData = {
        name: values.name.trim(),
        email: values.email.trim(),
        role: values.role,
        active: values.active,
      };

      if (!isEditing || values.password) {
        submitData.password = values.password;
      }

      onSubmit(submitData);
    },
    validateOnChange: true,
  });

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      reset();
      setFieldValue('name', initialValues.name);
      setFieldValue('email', initialValues.email);
      setFieldValue('password', '');
      setFieldValue('role', initialValues.role);
      setFieldValue('active', initialValues.active);
    }
  }, [isOpen, initialValues, reset, setFieldValue]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/20 rounded-lg">
                <UserIcon className="h-5 w-5 text-primary-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                {isEditing ? 'Edit User' : 'Create New User'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className={`w-full pl-10 pr-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                      errors.name ? 'border-red-500' : 'border-gray-700'
                    }`}
                  />
                </div>
                {errors.name && <p className="mt-2 text-sm text-red-400">{errors.name}</p>}
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john.doe@company.com"
                    className={`w-full pl-10 pr-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                      errors.email ? 'border-red-500' : 'border-gray-700'
                    }`}
                  />
                </div>
                {errors.email && <p className="mt-2 text-sm text-red-400">{errors.email}</p>}
              </div>

              {/* Password Field (only for new users or when changing password) */}
              {(!isEditing || true) && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {isEditing ? 'New Password (leave empty to keep current)' : 'Password'}
                  </label>
                  <div className="relative">
                    <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-12 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                        errors.password ? 'border-red-500' : 'border-gray-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? (
                        <span className="text-sm">Hide</span>
                      ) : (
                        <span className="text-sm">Show</span>
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-400">{errors.password}</p>
                  )}
                </div>
              )}

              {/* Role Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Base Role</label>
                <div className="relative">
                  <ShieldCheckIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors appearance-none cursor-pointer ${
                      errors.role ? 'border-red-500' : 'border-gray-700'
                    }`}
                  >
                    {ALL_ROLES.map(role => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.role && <p className="mt-2 text-sm text-red-400">{errors.role}</p>}
                <p className="mt-2 text-xs text-gray-500">
                  This is the user's primary role. Additional roles can be granted later.
                </p>
              </div>

              {/* Active Status (only for editing) */}
              {isEditing && (
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-white">Active Status</p>
                    <p className="text-xs text-gray-400">Inactive users cannot login</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFieldValue('active', !formData.active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.active ? 'bg-primary-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}
            </CardContent>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isLoading || isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || isSubmitting}
                className="min-w-[100px]"
              >
                {isLoading || isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </div>
                ) : isEditing ? (
                  'Update User'
                ) : (
                  'Create User'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default UserModal;
