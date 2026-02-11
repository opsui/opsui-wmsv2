/**
 * Badge component - Premium dark theme
 */

import { type HTMLAttributes, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { OrderStatus, OrderPriority, TaskStatus } from '@opsui/shared';
import { UserRole } from '@opsui/shared';

// Custom event for role color changes
export const ROLE_COLOR_CHANGED_EVENT = 'role-color-changed';

// ============================================================================
// TYPES
// ============================================================================

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  customColor?: string; // For custom role colors (hex or Tailwind classes)
}

// ============================================================================
// ROLE COLOR STORAGE
// ============================================================================

const ROLE_COLOR_STORAGE_KEY = 'admin-role-colors';

export interface RoleColorSetting {
  role: UserRole;
  color: string; // CSS color value (hex, rgb, etc.)
  variant?: BadgeVariant; // Optional variant fallback
}

// Default role colors - these can be overridden in settings
const DEFAULT_ROLE_COLORS: Record<UserRole, RoleColorSetting> = {
  [UserRole.PICKER]: { role: UserRole.PICKER, color: '#3b82f6', variant: 'info' }, // Blue
  [UserRole.PACKER]: { role: UserRole.PACKER, color: '#8b5cf6', variant: 'info' }, // Purple
  [UserRole.STOCK_CONTROLLER]: {
    role: UserRole.STOCK_CONTROLLER,
    color: '#06b6d4',
    variant: 'info',
  }, // Cyan
  [UserRole.SUPERVISOR]: { role: UserRole.SUPERVISOR, color: '#f59e0b', variant: 'warning' }, // Amber
  [UserRole.ADMIN]: { role: UserRole.ADMIN, color: '#ef4444', variant: 'error' }, // Red
  [UserRole.INWARDS]: { role: 'INWARDS' as UserRole, color: '#10b981', variant: 'success' }, // Emerald
  [UserRole.SALES]: { role: 'SALES' as UserRole, color: '#ec4899', variant: 'primary' }, // Pink
  [UserRole.PRODUCTION]: { role: 'PRODUCTION' as UserRole, color: '#f97316', variant: 'warning' }, // Orange
  [UserRole.MAINTENANCE]: { role: 'MAINTENANCE' as UserRole, color: '#6366f1', variant: 'primary' }, // Indigo
  [UserRole.RMA]: { role: 'RMA' as UserRole, color: '#84cc16', variant: 'success' }, // Lime
  [UserRole.DISPATCH]: { role: 'DISPATCH' as UserRole, color: '#f43f5e', variant: 'error' }, // Rose
  [UserRole.ACCOUNTING]: { role: 'ACCOUNTING' as UserRole, color: '#14b8a6', variant: 'info' }, // Teal
  [UserRole.HR_MANAGER]: { role: 'HR_MANAGER' as UserRole, color: '#0ea5e9', variant: 'primary' }, // Sky
  [UserRole.HR_ADMIN]: { role: 'HR_ADMIN' as UserRole, color: '#64748b', variant: 'info' }, // Slate
};

// Load role colors from localStorage
export function loadRoleColors(): Record<UserRole, RoleColorSetting> {
  try {
    const stored = localStorage.getItem(ROLE_COLOR_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, RoleColorSetting>;
      // Merge with defaults, allowing stored values to override
      const result = { ...DEFAULT_ROLE_COLORS };
      for (const [, value] of Object.entries(parsed)) {
        if (value && value.role) {
          result[value.role as UserRole] = value;
        }
      }
      return result;
    }
  } catch (error) {
    console.error('Failed to load role color settings:', error);
  }
  return { ...DEFAULT_ROLE_COLORS };
}

// Save role colors to localStorage
export function saveRoleColors(settings: Record<UserRole, RoleColorSetting>): void {
  try {
    localStorage.setItem(ROLE_COLOR_STORAGE_KEY, JSON.stringify(settings));

    // Dispatch custom event to notify components of the change
    window.dispatchEvent(
      new CustomEvent(ROLE_COLOR_CHANGED_EVENT, {
        detail: { isGlobal: true, settings },
      })
    );
  } catch (error) {
    console.error('Failed to save role color settings:', error);
  }
}

// Get color for a specific role (global)
export function getRoleColor(role: UserRole): RoleColorSetting {
  const colors = loadRoleColors();
  return (
    colors[role] || DEFAULT_ROLE_COLORS[role] || { role, color: '#6b7280', variant: 'default' }
  );
}

// Per-user role color storage keys
const getUserRoleColorKey = (userId: string) => `user-role-color-${userId}`;

// Get color for a specific role for a specific user
export function getUserRoleColor(userId: string, role: UserRole): RoleColorSetting {
  try {
    const key = getUserRoleColorKey(userId);
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, string>;
      if (parsed[role]) {
        return { role, color: parsed[role] };
      }
    }
  } catch (error) {
    console.error('Failed to load user role color:', error);
  }
  // Fall back to global color, then default
  return getRoleColor(role);
}

// Save role color for a specific user
export function saveUserRoleColor(userId: string, role: UserRole, color: string): void {
  try {
    const key = getUserRoleColorKey(userId);
    const existing = localStorage.getItem(key);
    const colors: Record<string, string> = existing ? JSON.parse(existing) : {};
    colors[role] = color;
    localStorage.setItem(key, JSON.stringify(colors));

    // Dispatch custom event to notify components of the change
    window.dispatchEvent(
      new CustomEvent(ROLE_COLOR_CHANGED_EVENT, {
        detail: { userId, role, color },
      })
    );
  } catch (error) {
    console.error('Failed to save user role color:', error);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

const statusVariantMap: Record<OrderStatus, BadgeProps['variant']> = {
  PENDING: 'info',
  PICKING: 'warning',
  PICKED: 'success',
  PACKING: 'info',
  PACKED: 'info',
  SHIPPED: 'success',
  CANCELLED: 'error',
  BACKORDER: 'error',
};

const priorityVariantMap: Record<OrderPriority, BadgeProps['variant']> = {
  LOW: 'info',
  NORMAL: 'primary',
  HIGH: 'warning',
  URGENT: 'error',
};

const taskStatusVariantMap: Record<TaskStatus, BadgeProps['variant']> = {
  PENDING: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  SKIPPED: 'error',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function Badge({
  variant = 'default',
  size = 'md',
  customColor,
  className,
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'badge';

  const variantStyles: Record<string, string> = {
    default: 'badge-info',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    info: 'badge-info',
    primary: 'badge-primary',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  // If customColor is provided, use inline styles for dynamic color
  const customStyle = customColor
    ? {
        backgroundColor: customColor,
        color: 'white',
        border: 'none',
      }
    : undefined;

  // When using custom color, skip variant class and use inline style
  const finalClassName = customColor
    ? cn(baseStyles, sizeStyles[size], className)
    : cn(baseStyles, variantStyles[variant], sizeStyles[size], className);

  return (
    <span className={finalClassName} style={customStyle} {...props}>
      {children}
    </span>
  );
}

// ============================================================================
// SPECIALIZED BADGES
// ============================================================================

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={statusVariantMap[status]} size="sm">
      {status}
    </Badge>
  );
}

export function OrderPriorityBadge({ priority }: { priority: OrderPriority }) {
  return (
    <Badge variant={priorityVariantMap[priority]} size="sm">
      {priority}
    </Badge>
  );
}

export function UserRoleBadge({ role, userId }: { role: UserRole; userId?: string }) {
  // Use state to enable reactive updates when colors change
  const [roleColor, setRoleColor] = useState<RoleColorSetting>(() =>
    userId ? getUserRoleColor(userId, role) : getRoleColor(role)
  );

  // Listen for color change events and update state
  useEffect(() => {
    const handleColorChange = () => {
      setRoleColor(userId ? getUserRoleColor(userId, role) : getRoleColor(role));
    };

    window.addEventListener(ROLE_COLOR_CHANGED_EVENT, handleColorChange);
    return () => window.removeEventListener(ROLE_COLOR_CHANGED_EVENT, handleColorChange);
  }, [userId, role]);

  return (
    <Badge variant={roleColor.variant || 'default'} size="sm" customColor={roleColor.color}>
      {role}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant={taskStatusVariantMap[status]} size="sm">
      {status}
    </Badge>
  );
}

// Progress badge
export function ProgressBadge({ progress }: { progress: number }) {
  let variant: BadgeProps['variant'] = 'info';
  if (progress === 100) variant = 'success';
  else if (progress > 50) variant = 'primary';

  return (
    <Badge variant={variant} size="sm">
      {progress}%
    </Badge>
  );
}
