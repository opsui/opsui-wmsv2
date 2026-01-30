/**
 * useAdminRoleAutoSwitch hook
 *
 * Automatically switches admin users back to ADMIN role when visiting admin-only pages
 *
 * Important: This hook should NOT interfere with role switching initiated by the user.
 * The ProtectedRoute component handles redirecting users to appropriate pages when they
 * switch roles. This hook only handles direct navigation to admin pages while in worker role.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { UserRole } from '@opsui/shared';

// Paths that require ADMIN role (admin-only pages)
const ADMIN_PATHS = [
  '/dashboard',
  '/exceptions',
  '/business-rules',
  '/integrations',
  '/reports',
  '/cycle-counting',
  '/location-capacity',
  '/quality-control',
  '/users',
] as const;

/**
 * Hook that automatically switches admin users to ADMIN role
 * when they navigate to admin-only pages via direct navigation (not role switch)
 */
export function useAdminRoleAutoSwitch() {
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);
  const activeRole = useAuthStore(state => state.activeRole);

  // Track the previous path and role to detect intentional role changes
  const prevPathRef = useRef<string | null>(null);
  const prevActiveRoleRef = useRef<UserRole | null>(null);

  useEffect(() => {
    // Only apply to admin users
    if (!user || user.role !== UserRole.ADMIN) {
      return;
    }

    const currentPath = location.pathname;
    const effectiveRole = getEffectiveRole();
    const prevPath = prevPathRef.current;
    const prevActiveRole = prevActiveRoleRef.current;

    // Check if current path is an admin path
    const isAdminPath = ADMIN_PATHS.some(path => currentPath.startsWith(path));

    // Detect if this is a role change event (not a navigation event)
    // A role change is indicated by the path staying the same but activeRole changing
    const isRoleChangeEvent = prevPath === currentPath && prevActiveRole !== activeRole && activeRole !== null;

    // If on admin path and not already in admin role, check if we should switch back
    if (isAdminPath && effectiveRole !== UserRole.ADMIN && activeRole !== null) {
      // Do NOT switch if this is a role change event (let ProtectedRoute handle the redirect)
      if (isRoleChangeEvent) {
        console.log('[useAdminRoleAutoSwitch] Role change detected on admin path, skipping auto-switch (letting ProtectedRoute redirect)');
        prevPathRef.current = currentPath;
        prevActiveRoleRef.current = activeRole;
        return;
      }

      // Only switch back to ADMIN if this is a direct navigation to an admin path
      // from a non-admin path (not from another admin path)
      const isDirectNavigationToAdmin = prevPath && !ADMIN_PATHS.some(path => prevPath.startsWith(path));

      if (isDirectNavigationToAdmin || prevPath === '/login' || prevPath === null) {
        console.log('[useAdminRoleAutoSwitch] Direct navigation to admin path, clearing active role');
        // Clear activeRole to revert to base role (ADMIN for admin users)
        useAuthStore.getState().setActiveRole(null);
      }
    }

    // Update previous path and role for next navigation
    prevPathRef.current = currentPath;
    prevActiveRoleRef.current = activeRole;
  }, [location.pathname, user, activeRole]);
}
