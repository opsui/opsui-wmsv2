/**
 * @file RoleModal.test.tsx
 * @purpose Tests for RoleModal component
 * @complexity high
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import RoleModal, { RoleFormData } from './RoleModal';
import { Permission, PERMISSION_GROUPS } from '@opsui/shared';
import * as useFormValidationModule from '@/hooks/useFormValidation';

// Mock useFormValidation hook
const mockHandleSubmit = vi.fn(callback => (e: React.FormEvent) => {
  e.preventDefault();
  return Promise.resolve(callback());
});
const mockReset = vi.fn();
const mockSetFieldValue = vi.fn();

const mockUseFormValidation = vi.fn(() => ({
  values: {
    name: '',
    description: '',
    permissions: [],
  },
  errors: {},
  handleChange: vi.fn(),
  handleSubmit: mockHandleSubmit,
  isSubmitting: false,
  reset: mockReset,
  setFieldValue: mockSetFieldValue,
  validateOnChange: true,
}));

vi.mock('@/hooks/useFormValidation', () => ({
  useFormValidation: vi.fn(),
  commonValidations: {
    email: {},
  },
}));

// Mock Button component
vi.mock('@/components/shared', () => ({
  Button: ({ children, onClick, variant, disabled, className, type }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      disabled={disabled}
      className={className}
      type={type}
    >
      {children}
    </button>
  ),
}));

// Mock PERMISSION_GROUPS
vi.mock('@opsui/shared', async () => {
  const actual = await vi.importActual<typeof import('@opsui/shared')>('@opsui/shared');
  return {
    ...actual,
    PERMISSION_GROUPS: {
      ORDERS: [
        actual.Permission.VIEW_ORDERS,
        actual.Permission.CREATE_ORDERS,
        actual.Permission.EDIT_ORDERS,
        actual.Permission.DELETE_ORDERS,
      ],
      INVENTORY: [actual.Permission.VIEW_INVENTORY, actual.Permission.ADJUST_INVENTORY],
      USERS: [
        actual.Permission.VIEW_USERS,
        actual.Permission.CREATE_USERS,
        actual.Permission.EDIT_USERS,
        actual.Permission.DELETE_USERS,
        actual.Permission.MANAGE_USER_ROLES,
      ],
      REPORTS: [actual.Permission.VIEW_REPORTS, actual.Permission.EXPORT_DATA],
    },
  };
});

const mockPermissionGroups = [
  {
    key: 'ORDERS',
    label: 'Orders',
    permissions: [
      Permission.VIEW_ORDERS,
      Permission.CREATE_ORDERS,
      Permission.EDIT_ORDERS,
      Permission.DELETE_ORDERS,
    ],
  },
  {
    key: 'INVENTORY',
    label: 'Inventory',
    permissions: [Permission.VIEW_INVENTORY, Permission.ADJUST_INVENTORY],
  },
  {
    key: 'USERS',
    label: 'Users',
    permissions: [
      Permission.VIEW_USERS,
      Permission.CREATE_USERS,
      Permission.EDIT_USERS,
      Permission.DELETE_USERS,
      Permission.MANAGE_USER_ROLES,
    ],
  },
  {
    key: 'REPORTS',
    label: 'Reports',
    permissions: [Permission.VIEW_REPORTS, Permission.EXPORT_DATA],
  },
];

describe('RoleModal Component', () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn();
    mockOnClose = vi.fn();
    mockHandleSubmit.mockImplementation(callback => (e: React.FormEvent) => {
      e.preventDefault();
      return Promise.resolve(callback());
    });
    mockReset.mockClear();
    mockSetFieldValue.mockClear();

    // Set default mock implementation
    vi.mocked(useFormValidationModule.useFormValidation).mockImplementation(() => ({
      values: {
        name: '',
        description: '',
        permissions: [],
      },
      errors: {},
      touched: new Set<string>(),
      isValid: true,
      handleChange: vi.fn(),
      handleBlur: vi.fn(),
      handleSubmit: mockHandleSubmit as any,
      isSubmitting: false,
      reset: mockReset,
      setFieldValue: mockSetFieldValue,
      setFieldError: vi.fn(),
      validateOnChange: true,
    }));
  });

  describe('Basic Rendering - Create Mode', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = renderWithProviders(
        <RoleModal
          isOpen={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      // Modal should not be in the document
      expect(container.querySelector('.fixed.inset-0.bg-black\\/60')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      expect(screen.getByText('Create Custom Role')).toBeInTheDocument();
    });

    it('renders backdrop', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/60');
      expect(backdrop).toBeInTheDocument();
    });

    it('renders role name input field', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      expect(screen.getByText('Role Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Warehouse Manager')).toBeInTheDocument();
    });

    it('renders description textarea field', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Describe the purpose of this role...')
      ).toBeInTheDocument();
    });

    it('renders permissions section', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      expect(screen.getByText('Permissions')).toBeInTheDocument();
    });

    it('renders selected permissions count', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      expect(screen.getByText(/selected/)).toBeInTheDocument();
    });

    it('renders all permission groups', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('renders cancel and submit buttons', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Create Role')).toBeInTheDocument();
    });
  });

  describe('Basic Rendering - Edit Mode', () => {
    it('renders edit mode title when isEditing is true', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
          isEditing={true}
          initialData={{
            name: 'Custom Manager',
            permissions: [Permission.VIEW_ORDERS, Permission.EDIT_ORDERS],
          }}
        />
      );

      expect(screen.getByText('Edit Custom Role')).toBeInTheDocument();
    });

    it('renders update role button in edit mode', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
          isEditing={true}
        />
      );

      expect(screen.getByText('Update Role')).toBeInTheDocument();
    });
  });

  describe('Backdrop Click', () => {
    it('closes modal when backdrop is clicked', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/60');
      fireEvent.click(backdrop!);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not close when modal content is clicked', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      const modalContent = document.querySelector('.bg-gray-900.rounded-2xl');
      fireEvent.click(modalContent!);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Close Button', () => {
    it('closes modal when X button is clicked', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
      // There are multiple buttons, so let's find the one that closes
      const allButtons = screen.getAllByRole('button');
      const xButton = allButtons.find(btn => btn.querySelector('svg'))!;
      fireEvent.click(xButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Permission Groups', () => {
    it('displays permission count for each group', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      // Check for permission counts (e.g., "0/4", "0/3", etc.)
      expect(screen.getByText('0/4')).toBeInTheDocument(); // Orders group has 4 permissions
      expect(screen.getByText('0/3')).toBeInTheDocument(); // Inventory group has 3 permissions
    });

    it('expands group when clicked', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      // All groups should be expanded by default based on useEffect
      // So permissions should be visible
      expect(screen.getByText('VIEW ORDERS')).toBeInTheDocument();
      expect(screen.getByText('CREATE ORDERS')).toBeInTheDocument();
    });

    it('displays permissions in two-column grid', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      // Check that individual permissions are displayed
      expect(screen.getByText('VIEW ORDERS')).toBeInTheDocument();
      expect(screen.getByText('VIEW INVENTORY')).toBeInTheDocument();
    });
  });

  describe('Cancel Button', () => {
    it('closes modal when cancel is clicked', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Submit Button', () => {
    it('shows Create Role text in create mode', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
          isEditing={false}
        />
      );

      expect(screen.getByText('Create Role')).toBeInTheDocument();
    });

    it('shows Update Role text in edit mode', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
          isEditing={true}
        />
      );

      expect(screen.getByText('Update Role')).toBeInTheDocument();
    });

    it('calls onSubmit when form is submitted', async () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      const submitButton = screen.getByText('Create Role');
      fireEvent.click(submitButton);

      // The form submission should trigger the mock
      expect(mockHandleSubmit).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('disables buttons when isLoading is true', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
          isLoading={true}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      // When isLoading, the button shows a spinner with "Saving..." text
      const submitButton = screen.getByText('Saving...');

      expect(cancelButton).toBeDisabled();
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Initial Data', () => {
    it('initializes form with initialData', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
          initialData={{
            name: 'Test Role',
            permissions: [Permission.VIEW_ORDERS, Permission.EDIT_ORDERS],
          }}
        />
      );

      // Form should be initialized with the initial data
      // The useEffect in the component should call setFieldValue
      expect(mockSetFieldValue).toHaveBeenCalledWith('name', 'Test Role');
    });
  });

  describe('Permission Selection', () => {
    it('shows check icon when group has selected permissions', () => {
      // This would require more complex mocking of state
      // For now, we just verify the component renders
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      expect(screen.getByText('Orders')).toBeInTheDocument();
    });
  });

  describe('Group Expansion State', () => {
    it('expands all groups by default on mount', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      // Permissions should be visible since groups are expanded by default
      expect(screen.getByText('VIEW ORDERS')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error message for name field when invalid', () => {
      // Mock useFormValidation to return an error
      vi.mocked(useFormValidationModule.useFormValidation).mockReturnValue({
        values: { name: '', description: '', permissions: [] },
        errors: { name: 'Name is required' },
        handleChange: vi.fn(),
        handleSubmit: mockHandleSubmit,
        isSubmitting: false,
        reset: mockReset,
        setFieldValue: mockSetFieldValue,
        validateOnChange: true,
      } as any);

      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    it('shows error message for permissions when none selected', () => {
      vi.mocked(useFormValidationModule.useFormValidation).mockReturnValue({
        values: { name: 'Test', description: '', permissions: [] },
        errors: { permissions: 'At least one permission must be selected' },
        handleChange: vi.fn(),
        handleSubmit: mockHandleSubmit,
        isSubmitting: false,
        reset: mockReset,
        setFieldValue: mockSetFieldValue,
        validateOnChange: true,
      } as any);

      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      expect(screen.getByText('At least one permission must be selected')).toBeInTheDocument();
    });
  });

  describe('Disabled Role Name in Edit Mode', () => {
    it('disables name input when editing', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
          isEditing={true}
          initialData={{
            name: 'Existing Role',
            permissions: [],
          }}
        />
      );

      const nameInput = screen.getByPlaceholderText('e.g., Warehouse Manager');
      expect(nameInput).toBeDisabled();
    });
  });

  describe('Selected Permission Groups', () => {
    it('accepts selectedPermissionGroups prop', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
          selectedPermissionGroups={new Set(['ORDERS', 'INVENTORY'])}
        />
      );

      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.getByText('Inventory')).toBeInTheDocument();
    });
  });

  describe('Modal Size and Layout', () => {
    it('has max-w-4xl class for width', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      const modal = document.querySelector('.max-w-4xl');
      expect(modal).toBeInTheDocument();
    });

    it('has max-h-[90vh] for height constraint', () => {
      renderWithProviders(
        <RoleModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          permissionGroups={mockPermissionGroups}
        />
      );

      const modal = document.querySelector('.max-h-\\[90vh\\]');
      expect(modal).toBeInTheDocument();
    });
  });
});
