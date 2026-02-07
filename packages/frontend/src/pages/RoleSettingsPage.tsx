/**
 * Role Settings page
 *
 * Admin settings for configuring the role switcher dropdown
 * - Show/hide specific roles in the role view list
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Header,
  Button,
  Badge,
  useToast,
} from '@/components/shared';
import {
  CogIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ScaleIcon,
  InboxIcon,
  CurrencyDollarIcon,
  CogIcon as WrenchIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  SwatchIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { UserRole } from '@opsui/shared';
import { useCurrentUser } from '@/services/api';
import { getUserRoleColor, saveUserRoleColor } from '@/components/shared/Badge';
import { playSound } from '@/stores';

// ============================================================================
// TYPES
// ============================================================================

interface RoleConfig {
  key: string;
  label: string;
  role: UserRole;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
}

const STORAGE_KEY = 'admin-role-visibility';

// ============================================================================
// DEFAULT ROLE CONFIGURATIONS
// ============================================================================

const DEFAULT_ROLES: RoleConfig[] = [
  {
    key: 'admin',
    label: 'Admin View',
    role: UserRole.ADMIN,
    icon: CogIcon,
    visible: true,
  },
  {
    key: 'picking',
    label: 'Picking View',
    role: UserRole.PICKER,
    icon: ClipboardDocumentListIcon,
    visible: true,
  },
  {
    key: 'packing',
    label: 'Packing View',
    role: UserRole.PACKER,
    icon: CubeIcon,
    visible: true,
  },
  {
    key: 'stock-control',
    label: 'Stock Control View',
    role: UserRole.STOCK_CONTROLLER,
    icon: ScaleIcon,
    visible: true,
  },
  {
    key: 'inwards',
    label: 'Inwards View',
    role: 'INWARDS' as UserRole,
    icon: InboxIcon,
    visible: true,
  },
  {
    key: 'sales',
    label: 'Sales View',
    role: 'SALES' as UserRole,
    icon: CurrencyDollarIcon,
    visible: true,
  },
  {
    key: 'production',
    label: 'Production View',
    role: 'PRODUCTION' as UserRole,
    icon: CogIcon,
    visible: true,
  },
  {
    key: 'maintenance',
    label: 'Maintenance View',
    role: 'MAINTENANCE' as UserRole,
    icon: WrenchScrewdriverIcon,
    visible: true,
  },
  {
    key: 'rma',
    label: 'RMA View',
    role: 'RMA' as UserRole,
    icon: ArrowPathIcon,
    visible: true,
  },
  {
    key: 'accounting',
    label: 'Accounting View',
    role: 'ACCOUNTING' as UserRole,
    icon: CurrencyDollarIcon,
    visible: true,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Base roles that cannot be hidden - keys for quick lookup
const BASE_ROLE_KEYS = new Set(['admin', 'picking', 'packing', 'stock-control']);

// Constant state for base roles - never changes, immune to all events
const BASE_ROLE_STATE: RoleConfig[] = [
  {
    key: 'admin',
    label: 'Admin View',
    role: UserRole.ADMIN,
    icon: CogIcon,
    visible: true,
  },
  {
    key: 'picking',
    label: 'Picking View',
    role: UserRole.PICKER,
    icon: ClipboardDocumentListIcon,
    visible: true,
  },
  {
    key: 'packing',
    label: 'Packing View',
    role: UserRole.PACKER,
    icon: CubeIcon,
    visible: true,
  },
  {
    key: 'stock-control',
    label: 'Stock Control View',
    role: UserRole.STOCK_CONTROLLER,
    icon: ScaleIcon,
    visible: true,
  },
];

function isBaseRoleKey(key: string): boolean {
  return BASE_ROLE_KEYS.has(key);
}

function loadRoleVisibility(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Record<string, boolean>;
    }
  } catch (error) {
    console.error('Failed to load role visibility settings:', error);
  }
  // Return default: all roles visible
  return DEFAULT_ROLES.reduce(
    (acc, role) => ({ ...acc, [role.key]: true }),
    {} as Record<string, boolean>
  );
}

function saveRoleVisibility(settings: Record<string, boolean>) {
  try {
    // Merge with existing settings to preserve visibility for roles not in current update
    const existing = loadRoleVisibility();
    const merged = { ...existing, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    // Dispatch event for other tabs
    window.dispatchEvent(new CustomEvent('role-visibility-changed', { detail: settings }));
  } catch (error) {
    console.error('Failed to save role visibility settings:', error);
  }
}

function getInitialRoles(): RoleConfig[] {
  // Start with constant base roles - these can NEVER be modified
  const baseRoles = BASE_ROLE_STATE.map(role => ({ ...role }));

  // Load custom roles from localStorage
  const visibility = loadRoleVisibility();
  const customRoles = DEFAULT_ROLES.filter(role => !isBaseRoleKey(role.key)).map(role => ({
    ...role,
    visible: visibility[role.key] !== false,
  }));

  const result = [...baseRoles, ...customRoles];
  console.log('='.repeat(80));
  console.log('[getInitialRoles] DEFAULT_ROLES count:', DEFAULT_ROLES.length);
  console.log(
    '[getInitialRoles] DEFAULT_ROLES keys:',
    DEFAULT_ROLES.map(r => r.key)
  );
  console.log('[getInitialRoles] BASE_ROLE_KEYS:', Array.from(BASE_ROLE_KEYS));
  console.log(
    '[getInitialRoles] filtered customRoles keys:',
    customRoles.map(r => r.key)
  );
  console.log('[getInitialRoles] Returning roles:');
  console.table(
    result.map(r => ({
      key: r.key,
      label: r.label,
      role: r.role,
      visible: r.visible,
      isBase: isBaseRoleKey(r.key),
    }))
  );
  console.log('[getInitialRoles] Total count:', result.length);
  console.log('='.repeat(80));
  return result;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface RoleSettingCardProps {
  config: RoleConfig;
  onToggleVisibility: (key: string) => void;
}

function RoleSettingCard({ config, onToggleVisibility }: RoleSettingCardProps) {
  const Icon = config.icon;
  // Use key check instead of role check - more reliable
  const isBase = isBaseRoleKey(config.key);

  // Debug logging
  console.log('[RoleSettingCard]', {
    key: config.key,
    role: config.role,
    visible: config.visible,
    isBase,
    BASE_ROLE_KEYS: Array.from(BASE_ROLE_KEYS),
    inSet: BASE_ROLE_KEYS.has(config.key),
  });

  return (
    <Card
      variant="glass"
      className={`transition-all duration-300 ${
        config.visible ? 'border-primary-500/30' : 'border-gray-700/50 opacity-60'
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Role Icon */}
            <div
              className={`p-3 rounded-xl transition-all duration-300 ${
                config.visible
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'bg-gray-700/50 text-gray-500'
              }`}
            >
              <Icon className="h-6 w-6" />
            </div>

            {/* Role Info */}
            <div>
              <h3
                className={`text-lg font-semibold transition-colors ${
                  config.visible ? 'text-white' : 'text-gray-400'
                }`}
              >
                {config.label}
              </h3>
              <p
                className={`text-sm transition-colors ${
                  config.visible ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Role: {config.role}
              </p>
            </div>
          </div>

          {/* Visibility Toggle */}
          {isBase ? (
            // Base roles - disabled button with slashed eye icon
            <div
              className="p-3 rounded-xl bg-red-500/20 text-red-400 opacity-70 cursor-not-allowed pointer-events-none"
              title="Base role cannot be hidden"
            >
              <EyeSlashIcon className="h-5 w-5" />
            </div>
          ) : (
            // Custom roles - interactive toggle
            <button
              onClick={() => onToggleVisibility(config.key)}
              className={`p-3 rounded-xl transition-all duration-300 ${
                config.visible
                  ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                  : 'bg-gray-700/50 text-gray-500 hover:bg-gray-700'
              }`}
              title={config.visible ? 'Hide from role switcher' : 'Show in role switcher'}
            >
              {config.visible ? (
                <EyeIcon className="h-5 w-5" />
              ) : (
                <EyeSlashIcon className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Status Indicator */}
        <div
          className={`mt-4 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${
            isBase
              ? 'bg-red-500/20 text-red-300'
              : config.visible
                ? 'bg-success-500/20 text-success-300'
                : 'bg-gray-700/50 text-gray-500'
          }`}
        >
          {isBase ? (
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Base role - always visible
            </span>
          ) : config.visible ? (
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" />
              Visible in role switcher
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              Hidden from role switcher
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function RoleSettingsPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<RoleConfig[]>(() => getInitialRoles());
  const [hasChanges, setHasChanges] = useState(false);
  const { data: currentUser } = useCurrentUser();

  // Per-user role colors state - for all roles the user has
  const [roleColors, setRoleColors] = useState<Record<string, string>>({});
  const [hasColorChange, setHasColorChange] = useState(false);

  const visibleCount = roles.filter(r => r.visible).length;

  // Debug: Log roles state on every render
  console.log('[RoleSettingsPage] Current roles state:', {
    total: roles.length,
    visible: visibleCount,
    keys: roles.map(r => r.key),
  });

  // Get all user roles (base role + additional roles)
  const getAllUserRoles = (): string[] => {
    if (!currentUser) return [];
    const roles = [currentUser.role];
    if (currentUser.additionalRoles && currentUser.additionalRoles.length > 0) {
      roles.push(...currentUser.additionalRoles);
    }
    return [...new Set(roles)]; // Deduplicate
  };

  // Load user's role colors on mount
  useEffect(() => {
    if (currentUser) {
      const allRoles = getAllUserRoles();
      const colors: Record<string, string> = {};
      allRoles.forEach(role => {
        colors[role] = getUserRoleColor(currentUser.userId, role as UserRole).color;
      });
      setRoleColors(colors);
    }
  }, [currentUser]);

  // CRITICAL: Clean localStorage on mount to ensure base roles are always visible
  // AND ensure all DEFAULT_ROLES are present (migration for new roles like accounting)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        const cleaned: Record<string, boolean> = { ...parsed };

        let needsSave = false;

        // Ensure base roles are always visible
        for (const baseKey of BASE_ROLE_KEYS) {
          if (cleaned[baseKey] !== true) {
            console.log(
              '[RoleSettingsPage] Force-enabling base role:',
              baseKey,
              'was:',
              cleaned[baseKey]
            );
            cleaned[baseKey] = true;
            needsSave = true;
          }
        }

        // MIGRATION: Ensure all DEFAULT_ROLES are present in localStorage
        // This handles newly added roles like accounting that weren't in old settings
        for (const defaultRole of DEFAULT_ROLES) {
          if (!(defaultRole.key in cleaned)) {
            console.log(
              '[RoleSettingsPage] Migrating new role to localStorage:',
              defaultRole.key,
              'with visibility:',
              defaultRole.visible
            );
            cleaned[defaultRole.key] = defaultRole.visible;
            needsSave = true;
          }
        }

        if (needsSave) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
          console.log('[RoleSettingsPage] Saved cleaned visibility settings:', cleaned);
          // Reload roles with cleaned data
          setRoles(getInitialRoles());
        }
      } else {
        // No localStorage exists - initialize with all DEFAULT_ROLES visible
        const initialSettings: Record<string, boolean> = {};
        for (const role of DEFAULT_ROLES) {
          initialSettings[role.key] = role.visible;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialSettings));
        console.log('[RoleSettingsPage] Initialized localStorage with all roles:', initialSettings);
        setRoles(getInitialRoles());
      }
    } catch (error) {
      console.error('[RoleSettingsPage] Failed to clean localStorage:', error);
    }
  }, []); // Run once on mount

  // FORCE: Ensure accounting role is always present (fix for caching issues)
  useEffect(() => {
    setRoles(prev => {
      const hasAccounting = prev.some(r => r.key === 'accounting');
      if (!hasAccounting) {
        console.log('[RoleSettingsPage] Accounting missing, adding it now!');
        const accountingRole = {
          key: 'accounting',
          label: 'Accounting View',
          role: 'ACCOUNTING' as UserRole,
          icon: CurrencyDollarIcon,
          visible: true,
        };
        return [...prev, accountingRole];
      }
      return prev;
    });
  }, []);

  // Listen for role visibility changes from other components
  // CRITICAL: Base roles are NEVER affected by events - only custom roles change
  useEffect(() => {
    const handleRoleVisibilityChanged = (e: Event) => {
      const detail = (e as CustomEvent<Record<string, boolean>>).detail;

      setRoles(prev => {
        // ONLY update custom roles - base roles are filtered out and added back from constant
        const customRoles = prev
          .filter(role => !isBaseRoleKey(role.key))
          .map(role => {
            const visibility = detail[role.key];
            // If the key exists in detail and is explicitly false, hide it
            // Otherwise show it (default to visible)
            return {
              ...role,
              visible: visibility !== false,
            };
          });

        // Always prepend base roles from constant (never changes, never affected by events)
        // Force visible: true for ALL base roles, regardless of event data
        return [...BASE_ROLE_STATE.map(role => ({ ...role, visible: true })), ...customRoles];
      });
    };

    window.addEventListener('role-visibility-changed', handleRoleVisibilityChanged);
    return () => window.removeEventListener('role-visibility-changed', handleRoleVisibilityChanged);
  }, []);

  const handleToggleVisibility = (key: string) => {
    // Prevent toggling base roles entirely
    if (isBaseRoleKey(key)) {
      return;
    }

    setRoles(prev => {
      const newRoles = prev.map(role => {
        if (role.key === key) {
          return { ...role, visible: !role.visible };
        }
        return role;
      });
      setHasChanges(true);
      return newRoles;
    });
  };

  const handleSave = () => {
    const visibilitySettings = roles.reduce(
      (acc, role) => {
        // Base roles are always saved as visible
        if (isBaseRoleKey(role.key)) {
          return { ...acc, [role.key]: true };
        }
        return { ...acc, [role.key]: role.visible };
      },
      {} as Record<string, boolean>
    );

    saveRoleVisibility(visibilitySettings);
    setHasChanges(false);
    showToast('Role visibility settings saved', 'success');

    // Navigate back to dashboard
    navigate('/dashboard');
  };

  const handleReset = () => {
    // Reset to all visible
    const defaultVisibility = DEFAULT_ROLES.reduce(
      (acc, role) => ({
        ...acc,
        [role.key]: true,
      }),
      {} as Record<string, boolean>
    );

    saveRoleVisibility(defaultVisibility);
    setRoles(getInitialRoles());
    setHasChanges(false);
  };

  const handleColorChange = (role: string, color: string) => {
    setRoleColors(prev => ({ ...prev, [role]: color }));
    setHasColorChange(true);
  };

  const handleSaveColor = () => {
    if (currentUser) {
      // Save all role colors
      Object.entries(roleColors).forEach(([role, color]) => {
        saveUserRoleColor(currentUser.userId, role as UserRole, color);
      });
      setHasColorChange(false);
      playSound('success');
    }
  };

  const handleResetColor = () => {
    if (currentUser) {
      // Reset all colors to defaults
      const allRoles = getAllUserRoles();
      const colors: Record<string, string> = {};
      allRoles.forEach(role => {
        colors[role] = getUserRoleColor(currentUser.userId, role as UserRole).color;
      });
      setRoleColors(colors);
      setHasColorChange(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-500/20 rounded-xl">
              <CogIcon className="h-8 w-8 text-primary-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Role Switcher Settings
              </h1>
              <p className="mt-2 text-gray-400">
                Customize which roles appear in your role view dropdown
              </p>
            </div>
          </div>
        </div>

        {/* Overview Card */}
        <Card variant="glass" className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">
                  Showing {visibleCount} of {roles.length} roles in switcher
                </p>
                <p className="text-xs text-gray-500">
                  Base roles (
                  <span className="text-red-400">PICKER, PACKER, STOCK_CONTROLLER, ADMIN</span>)
                  cannot be hidden. Custom roles can be toggled.
                </p>
              </div>
              {hasChanges && (
                <div className="flex items-center gap-2 px-4 py-2 bg-warning-500/20 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-warning-400 animate-pulse" />
                  <span className="text-sm text-warning-300 font-medium">Unsaved changes</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Role Badge Colors */}
        <Card variant="glass" className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SwatchIcon className="h-6 w-6 text-primary-400" />
                <CardTitle>My Role Badge Colors</CardTitle>
              </div>
              {hasColorChange && (
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleResetColor}>
                    Reset
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveColor}>
                    Save Colors
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-gray-400 mb-6">
              Customize the badge color for each of your roles. These colors are personal to you and
              only affect how your role badges appear on your device.
            </p>

            {/* Color pickers for each user role */}
            <div className="space-y-6">
              {getAllUserRoles().map(role => (
                <div key={role} className="border border-white/[0.08] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge size="md" customColor={roleColors[role] || '#3b82f6'}>
                        {role}
                      </Badge>
                      <span className="text-sm text-gray-400">
                        {role === currentUser?.role ? '(Primary Role)' : '(Additional Role)'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                    {[
                      '#ef4444',
                      '#f97316',
                      '#f59e0b',
                      '#eab308',
                      '#84cc16',
                      '#10b981',
                      '#06b6d4',
                      '#3b82f6',
                      '#6366f1',
                      '#8b5cf6',
                      '#d946ef',
                      '#ec4899',
                      '#f43f5e',
                      '#64748b',
                      '#71717a',
                    ].map(color => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(role, color)}
                        className={`w-full aspect-square rounded-md transition-all duration-200 ${
                          roleColors[role] === color
                            ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white scale-105 shadow-lg'
                            : 'hover:scale-105 opacity-60 hover:opacity-100 hover:shadow-md'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                        aria-label={`Select ${color} for ${role}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Settings Grid */}
        <div className="space-y-4 mb-8">
          {roles.map(role => (
            <RoleSettingCard
              key={role.key}
              config={role}
              onToggleVisibility={handleToggleVisibility}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between p-6 bg-gray-900/50 rounded-xl border border-white/5">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleReset}
            disabled={!hasChanges}
            className="flex items-center gap-2"
          >
            Reset to Defaults
          </Button>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/dashboard')}
              disabled={hasChanges}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center gap-2"
            >
              <CogIcon className="h-5 w-5" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <Card variant="glass" className="mt-8 border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <WrenchIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">How it works</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>
                    •{' '}
                    <strong className="text-red-300">
                      Base roles (PICKER, PACKER, STOCK_CONTROLLER, ADMIN)
                    </strong>{' '}
                    are always visible and cannot be hidden
                  </li>
                  <li>
                    • <strong className="text-gray-300">Custom roles</strong> can be shown or hidden
                    based on your preferences
                  </li>
                  <li>
                    • <strong className="text-gray-300">Visible roles</strong> appear in the role
                    switcher dropdown in the header
                  </li>
                  <li>
                    • <strong className="text-gray-300">Hidden roles</strong> won't clutter your
                    dropdown but remain accessible via direct URL
                  </li>
                  <li>• Settings are saved locally in your browser and persist across sessions</li>
                  <li>• Changes only affect your view - other admins have their own settings</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default RoleSettingsPage;
