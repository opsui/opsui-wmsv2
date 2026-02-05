/**
 * @file JwtDecoder.test.tsx
 * @purpose Tests for JWT decoder components
 * @complexity high
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { JwtDecoder, JwtViewer, JwtPermissionMatrix, type JwtPayload } from './JwtDecoder';

// Mock valid JWT token (header.payload.signature)
// Payload: {"userId":"123","email":"test@example.com","baseRole":"PICKER","effectiveRole":"PICKER","iat":1234567890,"exp":9999999999}
const mockToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJiYXNlUm9sZSI6IlBJQ0tFUiIsImVmZmVjdGl2ZVJvbGUiOiJQVUNLRVIiLCJpYXQiOjEyMzQ1Njc4OTAsImV4cCI6OTk5OTk5OTk5OX0.signature';

const mockPayload: JwtPayload = {
  userId: '123',
  email: 'test@example.com',
  baseRole: 'PICKER',
  effectiveRole: 'PICKER',
  activeRole: 'PICKER',
  iat: 1234567890,
  exp: 9999999999,
};

describe('JwtDecoder Component', () => {
  describe('Empty State', () => {
    it('shows empty state when no token provided', () => {
      renderWithProviders(<JwtDecoder />);
      expect(screen.getByText('No JWT token to display')).toBeInTheDocument();
    });

    it('shows empty state when null token provided', () => {
      renderWithProviders(<JwtDecoder token={null} />);
      expect(screen.getByText('No JWT token to display')).toBeInTheDocument();
    });

    it('shows empty state when empty string token provided', () => {
      renderWithProviders(<JwtDecoder token="" />);
      expect(screen.getByText('No JWT token to display')).toBeInTheDocument();
    });

    it('shows key icon in empty state', () => {
      const { container } = renderWithProviders(<JwtDecoder />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Token Decoding', () => {
    it('decodes valid JWT token', () => {
      renderWithProviders(<JwtDecoder token={mockToken} />);
      expect(screen.getByText('userId:')).toBeInTheDocument();
      expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('displays payload fields', () => {
      renderWithProviders(<JwtDecoder token={mockToken} />);
      expect(screen.getByText('userId:')).toBeInTheDocument();
      expect(screen.getByText('email:')).toBeInTheDocument();
      expect(screen.getByText('baseRole:')).toBeInTheDocument();
      expect(screen.getByText('effectiveRole:')).toBeInTheDocument();
    });

    it('handles invalid token gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      renderWithProviders(<JwtDecoder token="invalid.token" />);
      expect(screen.getByText('No JWT token to display')).toBeInTheDocument();
      consoleErrorSpy.mockRestore();
    });

    it('handles token with wrong number of parts', () => {
      renderWithProviders(<JwtDecoder token="only.two" />);
      expect(screen.getByText('No JWT token to display')).toBeInTheDocument();
    });
  });

  describe('Payload Display', () => {
    it('uses payload prop when provided', () => {
      renderWithProviders(<JwtDecoder payload={mockPayload} />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      // Both baseRole and effectiveRole are PICKER, so there are multiple matches
      expect(screen.getAllByText('PICKER').length).toBeGreaterThan(0);
    });

    it('prioritizes payload over token', () => {
      renderWithProviders(<JwtDecoder token={mockToken} payload={mockPayload} />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('displays null value for activeRole when not present', () => {
      const payloadWithoutActiveRole = { ...mockPayload, activeRole: null };
      renderWithProviders(<JwtDecoder payload={payloadWithoutActiveRole} />);
      expect(screen.getByText('null')).toBeInTheDocument();
    });

    it('filters out unknown fields', () => {
      const payloadWithExtra = {
        ...mockPayload,
        unknownField: 'should not appear' as unknown as JwtPayload,
      };
      renderWithProviders(<JwtDecoder payload={payloadWithExtra as JwtPayload} />);
      expect(screen.queryByText('should not appear')).not.toBeInTheDocument();
    });

    it('displays "null" for undefined activeRole', () => {
      const payloadWithoutActiveRole = { ...mockPayload, activeRole: null };
      renderWithProviders(<JwtDecoder payload={payloadWithoutActiveRole} showTimestamps={false} />);
      expect(screen.getByText('null')).toBeInTheDocument();
    });
  });

  describe('Timestamps', () => {
    it('shows formatted timestamps when showTimestamps is true', () => {
      renderWithProviders(<JwtDecoder payload={mockPayload} showTimestamps />);
      expect(screen.getByText(/iat:/)).toBeInTheDocument();
      expect(screen.getByText(/exp:/)).toBeInTheDocument();
    });

    it('hides timestamps when showTimestamps is false', () => {
      renderWithProviders(<JwtDecoder payload={mockPayload} showTimestamps={false} />);
      const iatRow = screen.getByText('iat:').closest('div');
      expect(iatRow?.textContent).toContain('1234567890');
    });

    it('displays token expiry section when exp exists', () => {
      renderWithProviders(<JwtDecoder payload={mockPayload} />);
      expect(screen.getByText(/Token expires in/)).toBeInTheDocument();
    });

    it('hides token expiry section when exp is missing', () => {
      const payloadWithoutExp = { ...mockPayload, exp: undefined };
      renderWithProviders(<JwtDecoder payload={payloadWithoutExp} />);
      expect(screen.queryByText(/Token expires in/)).not.toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = renderWithProviders(
        <JwtDecoder payload={mockPayload} className="custom-class" />
      );
      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Card Title', () => {
    it('shows JWT Token Payload title', () => {
      renderWithProviders(<JwtDecoder payload={mockPayload} />);
      expect(screen.getByText('JWT Token Payload')).toBeInTheDocument();
    });
  });
});

describe('JwtViewer Component', () => {
  describe('Empty State', () => {
    it('shows "Not logged in" when no payload', () => {
      renderWithProviders(<JwtViewer />);
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    it('shows "Not logged in" when null payload', () => {
      renderWithProviders(<JwtViewer payload={null} />);
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });
  });

  describe('Payload Display', () => {
    it('displays user ID', () => {
      renderWithProviders(<JwtViewer payload={mockPayload} />);
      expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('displays email', () => {
      renderWithProviders(<JwtViewer payload={mockPayload} />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('displays effective role', () => {
      renderWithProviders(<JwtViewer payload={mockPayload} />);
      expect(screen.getByText('PICKER')).toBeInTheDocument();
    });

    it('has proper styling classes', () => {
      const { container } = renderWithProviders(<JwtViewer payload={mockPayload} />);
      const wrapper = container.querySelector('.inline-flex');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('items-center', 'gap-3');
    });
  });
});

describe('JwtPermissionMatrix Component', () => {
  describe('Empty State', () => {
    it('shows empty state when no payload', () => {
      renderWithProviders(<JwtPermissionMatrix />);
      expect(screen.getByText('No user session data available')).toBeInTheDocument();
    });

    it('shows empty state when null payload', () => {
      renderWithProviders(<JwtPermissionMatrix payload={null} />);
      expect(screen.getByText('No user session data available')).toBeInTheDocument();
    });
  });

  describe('Role Display', () => {
    it('displays current role label', () => {
      renderWithProviders(<JwtPermissionMatrix payload={mockPayload} />);
      expect(screen.getByText('Current Role')).toBeInTheDocument();
    });

    it('displays effective role name', () => {
      renderWithProviders(<JwtPermissionMatrix payload={mockPayload} />);
      expect(screen.getByText('PICKER')).toBeInTheDocument();
    });

    it('displays permissions label', () => {
      renderWithProviders(<JwtPermissionMatrix payload={mockPayload} />);
      expect(screen.getByText('Permissions')).toBeInTheDocument();
    });
  });

  describe('PICKER Role Permissions', () => {
    it('shows picker permissions', () => {
      renderWithProviders(<JwtPermissionMatrix payload={mockPayload} />);
      expect(screen.getByText('Claim orders')).toBeInTheDocument();
      expect(screen.getByText('Pick items')).toBeInTheDocument();
      expect(screen.getByText('Update pick tasks')).toBeInTheDocument();
      expect(screen.getByText('View own audit logs')).toBeInTheDocument();
    });
  });

  describe('ADMIN Role Permissions', () => {
    it('shows admin access message', () => {
      const adminPayload: JwtPayload = {
        ...mockPayload,
        effectiveRole: 'ADMIN',
      };
      renderWithProviders(<JwtPermissionMatrix payload={adminPayload} />);
      expect(
        screen.getByText('Full administrative access to all system resources')
      ).toBeInTheDocument();
    });

    it('shows special admin styling', () => {
      const adminPayload: JwtPayload = {
        ...mockPayload,
        effectiveRole: 'ADMIN',
      };
      const { container } = renderWithProviders(<JwtPermissionMatrix payload={adminPayload} />);
      const adminBox = container.querySelector('.bg-red-50');
      expect(adminBox).toBeInTheDocument();
    });
  });

  describe('Other Role Permissions', () => {
    it('shows PACKER permissions', () => {
      const packerPayload: JwtPayload = {
        ...mockPayload,
        effectiveRole: 'PACKER',
      };
      renderWithProviders(<JwtPermissionMatrix payload={packerPayload} />);
      expect(screen.getByText('Pack orders')).toBeInTheDocument();
      expect(screen.getByText('Ship orders')).toBeInTheDocument();
    });

    it('shows SUPERVISOR permissions', () => {
      const supervisorPayload: JwtPayload = {
        ...mockPayload,
        effectiveRole: 'SUPERVISOR',
      };
      renderWithProviders(<JwtPermissionMatrix payload={supervisorPayload} />);
      expect(screen.getByText('View all orders')).toBeInTheDocument();
      expect(screen.getByText('Cancel orders')).toBeInTheDocument();
    });

    it('shows STOCK_CONTROLLER permissions', () => {
      const stockControllerPayload: JwtPayload = {
        ...mockPayload,
        effectiveRole: 'STOCK_CONTROLLER',
      };
      renderWithProviders(<JwtPermissionMatrix payload={stockControllerPayload} />);
      expect(screen.getByText('Manage SKUs')).toBeInTheDocument();
      expect(screen.getByText('Adjust inventory')).toBeInTheDocument();
    });
  });

  describe('Unknown Role', () => {
    it('shows empty permissions for unknown role', () => {
      const unknownPayload: JwtPayload = {
        ...mockPayload,
        effectiveRole: 'UNKNOWN_ROLE',
      };
      const { container } = renderWithProviders(<JwtPermissionMatrix payload={unknownPayload} />);
      const list = container.querySelector('ul');
      expect(list?.children.length).toBe(0);
    });
  });
});

describe('Helper Functions', () => {
  describe('formatTimestamp', () => {
    it('formats valid timestamp', () => {
      renderWithProviders(<JwtDecoder payload={mockPayload} showTimestamps />);
      // Should show formatted date
      const iatRow = screen.getByText('iat:').closest('div');
      expect(iatRow?.textContent).toContain('2009');
    });
  });

  describe('getTimeRemaining', () => {
    it('shows Expired for past timestamp', () => {
      const expiredPayload: JwtPayload = {
        ...mockPayload,
        exp: Math.floor(Date.now() / 1000) - 1000,
      };
      renderWithProviders(<JwtDecoder payload={expiredPayload} />);
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    it('shows time remaining for future timestamp', () => {
      renderWithProviders(<JwtDecoder payload={mockPayload} />);
      expect(screen.getByText(/Token expires in/)).toBeInTheDocument();
    });
  });
});
