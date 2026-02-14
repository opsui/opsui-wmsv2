/**
 * Admin Settings page
 *
 * Comprehensive admin settings including:
 * - Role Switcher Settings
 * - Display & Appearance
 * - Notifications & Sounds
 * - Account Settings
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  Badge,
} from '@/components/shared';
import { useMyRoles } from '@/services/api';
import { useAuthStore } from '@/stores';
import { UserRole } from '@opsui/shared';
import { getUserRoleColor, saveUserRoleColor } from '@/components/shared/Badge';
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
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  BellIcon,
  SpeakerXMarkIcon,
  SpeakerWaveIcon,
  UserIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { useUIStore, playSound } from '@/stores';

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
  { key: 'packing', label: 'Packing View', role: UserRole.PACKER, icon: CubeIcon, visible: true },
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
  { key: 'rma', label: 'RMA View', role: 'RMA' as UserRole, icon: ArrowPathIcon, visible: true },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function loadRoleVisibility(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
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
  } catch (error) {
    console.error('Failed to save role visibility settings:', error);
  }
}

// ============================================================================
// SUBCOMPONENTS - Role Switcher Settings
// ============================================================================

interface RoleSettingCardProps {
  config: RoleConfig;
  onToggleVisibility: (key: string) => void;
  isBaseRole: boolean;
  canHide: boolean;
}

function RoleSettingCard({
  config,
  onToggleVisibility,
  isBaseRole,
  canHide,
}: RoleSettingCardProps) {
  const Icon = config.icon;

  // Base roles cannot be hidden at all
  const isDisabled = isBaseRole;

  return (
    <Card
      variant="glass"
      className={`transition-all duration-300 ${
        isBaseRole
          ? 'border-error-500/30 bg-error-500/5'
          : config.visible
            ? 'border-primary-500/30'
            : 'border-gray-700/50 opacity-60'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Role Icon */}
            <div
              className={`p-2 rounded-lg transition-all duration-300 ${
                isBaseRole
                  ? 'bg-error-500/20 text-error-400'
                  : config.visible
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'bg-gray-700/50 text-gray-500'
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>

            {/* Role Info */}
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className={`text-sm font-semibold transition-colors ${
                    isBaseRole ? 'text-error-400' : config.visible ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {config.label}
                </h3>
                {isBaseRole && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-error-500/20 text-error-400 rounded">
                    Base
                  </span>
                )}
              </div>
              <p
                className={`text-xs transition-colors ${
                  isBaseRole
                    ? 'text-error-400/70'
                    : config.visible
                      ? 'text-gray-400'
                      : 'text-gray-500'
                }`}
              >
                {config.role}
              </p>
            </div>
          </div>

          {/* Visibility Toggle - Crossed Eye Icon for Base Role */}
          <button
            onClick={() => onToggleVisibility(config.key)}
            disabled={isDisabled || (config.visible && !canHide)}
            className={`p-2 rounded-lg transition-all duration-300 relative ${
              isDisabled
                ? 'bg-error-500/20 text-error-400 cursor-not-allowed'
                : config.visible && !canHide
                  ? 'bg-error-500/20 text-error-400 cursor-not-allowed'
                  : config.visible
                    ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                    : 'bg-gray-700/50 text-gray-500 hover:bg-gray-700'
            }`}
            title={
              isDisabled
                ? 'Cannot hide base role'
                : config.visible && !canHide
                  ? 'Cannot hide the last visible role'
                  : config.visible
                    ? 'Hide from role switcher'
                    : 'Show in role switcher'
            }
          >
            {isDisabled ? (
              // Crossed eye icon for base roles (eye with X overlay)
              <div className="relative h-4 w-4">
                <EyeIcon className="h-4 w-4" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-0.5 bg-current rotate-45 absolute" />
                  <div className="w-3 h-0.5 bg-current -rotate-45 absolute" />
                </div>
              </div>
            ) : config.visible && !canHide ? (
              <EyeSlashIcon className="h-4 w-4" />
            ) : config.visible ? (
              <EyeIcon className="h-4 w-4" />
            ) : (
              <EyeSlashIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SETTINGS SECTIONS
// ============================================================================

interface Section {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: Section[] = [
  { key: 'role-switcher', label: 'Role Switcher', icon: ClipboardDocumentListIcon },
  { key: 'appearance', label: 'Appearance', icon: SunIcon },
  { key: 'notifications', label: 'Notifications & Sounds', icon: BellIcon },
  { key: 'account', label: 'Account', icon: UserIcon },
];

// ============================================================================
// MAIN PAGE
// ============================================================================

function AdminSettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentSection = (searchParams.get('section') as Section['key']) || 'role-switcher';

  const theme = useUIStore(state => state.theme);
  const setTheme = useUIStore(state => state.setTheme);
  const soundEnabled = useUIStore(state => state.soundEnabled);
  const setSoundEnabled = useUIStore(state => state.setSoundEnabled);

  // Fetch user's granted roles and base role
  const { data: additionalRoles = [] } = useMyRoles();
  const user = useAuthStore(state => state.user);

  // Filter DEFAULT_ROLES to only include granted roles
  // Use useMemo to prevent infinite re-renders when additionalRoles reference changes
  const grantedRoles = useMemo(() => {
    if (!user) return [];
    // additionalRoles is an array of role strings directly
    const grantedRoleList = [user.role, ...(additionalRoles || [])].filter(Boolean);
    return DEFAULT_ROLES.filter(role => grantedRoleList.includes(role.role));
  }, [user, additionalRoles]);

  const [roles, setRoles] = useState<RoleConfig[]>(() => {
    const visibility = loadRoleVisibility();
    return grantedRoles.map(role => ({
      ...role,
      visible: visibility[role.key] !== false,
    }));
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Per-user role colors state - track colors for ALL roles
  const [roleColors, setRoleColors] = useState<Record<string, string>>({});
  const [originalRoleColors, setOriginalRoleColors] = useState<Record<string, string>>({});

  // Update roles when granted roles change, using JSON comparison for stability
  useEffect(() => {
    const visibility = loadRoleVisibility();
    const newRoles = grantedRoles.map(role => ({
      ...role,
      visible: visibility[role.key] !== false,
    }));

    // Only update if the roles array actually changed (prevent infinite loop)
    const currentKeys = roles
      .map(r => r.key)
      .sort()
      .join(',');
    const newKeys = newRoles
      .map(r => r.key)
      .sort()
      .join(',');
    if (currentKeys !== newKeys) {
      setRoles(newRoles);
    }
  }, [grantedRoles]);

  // Load all role colors on mount
  useEffect(() => {
    if (user && roles.length > 0) {
      const colors: Record<string, string> = {};
      roles.forEach(role => {
        const colorSetting = getUserRoleColor(user.userId, role.role);
        colors[role.role] = colorSetting.color;
      });
      setRoleColors(colors);
      setOriginalRoleColors(colors);
    }
  }, [user, roles]);

  const visibleCount = roles.filter(r => r.visible).length;

  // Set section in URL
  const setSection = (section: Section['key']) => {
    setSearchParams({ section });
    setHasChanges(false);
  };

  // Handle role visibility toggle
  const handleToggleVisibility = (key: string) => {
    setRoles(prev => {
      const roleToToggle = prev.find(r => r.key === key);
      if (!roleToToggle) return prev;

      // Count total visible roles excluding the one being toggled
      const visibleCount = prev.filter(r => r.key !== key && r.visible).length;

      // Prevent hiding if this is the last visible role
      if (roleToToggle.visible && visibleCount === 0) {
        return prev; // Don't allow hiding the last visible role
      }

      return prev.map(role => (role.key === key ? { ...role, visible: !role.visible } : role));
    });
    setHasChanges(true);
  };

  // Save role settings
  const handleSaveRoleSettings = () => {
    const visibilitySettings = roles.reduce(
      (acc, role) => ({
        ...acc,
        [role.key]: role.visible,
      }),
      {} as Record<string, boolean>
    );

    saveRoleVisibility(visibilitySettings);
    setHasChanges(false);

    // Dispatch custom event to notify other components (like Header) of the change
    window.dispatchEvent(
      new CustomEvent('role-visibility-changed', { detail: visibilitySettings })
    );
  };

  // Reset role settings
  const handleResetRoleSettings = () => {
    const defaultVisibility = grantedRoles.reduce(
      (acc: Record<string, boolean>, role: RoleConfig) => ({
        ...acc,
        [role.key]: true,
      }),
      {} as Record<string, boolean>
    );

    saveRoleVisibility(defaultVisibility);
    setRoles(
      grantedRoles.map(role => ({
        ...role,
        visible: true,
      }))
    );
    setHasChanges(false);
  };

  // Color handlers
  const handleColorChange = (role: UserRole, color: string) => {
    setRoleColors(prev => ({
      ...prev,
      [role]: color,
    }));
  };

  const handleSaveColor = (role: UserRole) => {
    if (user) {
      const color = roleColors[role];
      saveUserRoleColor(user.userId, role, color);
      setOriginalRoleColors(prev => ({
        ...prev,
        [role]: color,
      }));
      playSound('success');

      // Dispatch custom event to notify other components (like Header) of the color change
      window.dispatchEvent(
        new CustomEvent('role-color-changed', {
          detail: { userId: user.userId, role, color },
        })
      );
    }
  };

  const handleResetColor = (role: UserRole) => {
    if (user) {
      // Reset to the original color
      setRoleColors(prev => ({
        ...prev,
        [role]: originalRoleColors[role] || '#3b82f6',
      }));
    }
  };

  const hasColorChange = (role: UserRole) => {
    return roleColors[role] !== originalRoleColors[role];
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4"></div>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-500/20 rounded-xl">
              <CogIcon className="h-8 w-8 text-primary-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Admin Settings</h1>
              <p className="mt-2 text-gray-400">Customize your admin experience</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card variant="glass" className="sticky top-8">
              <CardContent className="p-3">
                <nav className="space-y-1">
                  {SECTIONS.map(section => {
                    const Icon = section.icon;
                    const isActive = currentSection === section.key;
                    return (
                      <button
                        key={section.key}
                        onClick={() => setSection(section.key)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'text-white bg-primary-500/20 border border-primary-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-center w-4 flex-shrink-0">
                          <Icon className={`h-4 w-4 ${isActive ? 'text-primary-400' : ''}`} />
                        </div>
                        <span className="text-left flex-1">{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Role Switcher Settings */}
            {currentSection === 'role-switcher' && (
              <>
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Role Switcher Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-400 mb-4">
                      Showing {visibleCount} of {roles.length} roles in switcher
                    </p>
                    <p className="text-xs text-gray-500">
                      Hidden roles can still be accessed but won't appear in the dropdown menu
                    </p>
                  </CardContent>
                </Card>

                {/* Role Badge Colors - All Roles */}
                {user && roles.length > 0 && (
                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle>Role Badge Colors</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-400 mb-6">
                        Customize the badge color for each role you have access to. These colors are
                        personal to you and only affect how role badges appear on your device.
                      </p>
                      <div className="space-y-6">
                        {roles.map(role => {
                          const currentColor = roleColors[role.role] || '#3b82f6';
                          const hasChange = hasColorChange(role.role);
                          const isBaseRole = role.role === user?.role;

                          return (
                            <div
                              key={role.key}
                              className={`p-4 rounded-xl border transition-all duration-200 ${
                                isBaseRole
                                  ? 'bg-primary-500/10 border-primary-500/30'
                                  : 'bg-gray-800/50 border-gray-700/50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Badge size="sm" customColor={currentColor}>
                                    {role.role}
                                  </Badge>
                                  <span className="text-sm font-medium text-white">
                                    {role.label}
                                  </span>
                                  {isBaseRole && (
                                    <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-500/20 text-primary-400 rounded">
                                      Base
                                    </span>
                                  )}
                                </div>
                                {hasChange && (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleResetColor(role.role)}
                                    >
                                      Reset
                                    </Button>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => handleSaveColor(role.role)}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-8 md:grid-cols-15 gap-2">
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
                                    onClick={() => handleColorChange(role.role, color)}
                                    className={`w-full aspect-square rounded-md transition-all duration-200 ${
                                      currentColor === color
                                        ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white scale-105 shadow-lg'
                                        : 'hover:scale-105 opacity-60 hover:opacity-100 hover:shadow-md'
                                    }`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                    aria-label={`Select ${color} for ${role.role}`}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles.map(role => {
                    const isBaseRole = role.role === user?.role;
                    // Check if this role can be hidden (at least one other role is visible)
                    const canHide = roles.filter(r => r.key !== role.key && r.visible).length > 0;

                    return (
                      <RoleSettingCard
                        key={role.key}
                        config={role}
                        onToggleVisibility={handleToggleVisibility}
                        isBaseRole={isBaseRole}
                        canHide={canHide}
                      />
                    );
                  })}
                </div>

                {hasChanges && (
                  <div className="flex items-center justify-between p-6 bg-gray-900/50 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 px-4 py-2 bg-warning-500/20 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-warning-400 animate-pulse" />
                      <span className="text-sm text-warning-300 font-medium">Unsaved changes</span>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="secondary" size="sm" onClick={handleResetRoleSettings}>
                        Reset
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveRoleSettings}
                        className="flex items-center gap-2"
                      >
                        <CogIcon className="h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Appearance Settings */}
            {currentSection === 'appearance' && (
              <>
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Theme Selection */}
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-3">Theme</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => setTheme('light')}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                            theme === 'light'
                              ? 'bg-amber-500/20 border-amber-500/30'
                              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <SunIcon
                            className={`h-6 w-6 ${
                              theme === 'light' ? 'text-amber-400' : 'text-gray-500'
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              theme === 'light' ? 'text-white' : 'text-gray-400'
                            }`}
                          >
                            Light
                          </span>
                        </button>
                        <button
                          onClick={() => setTheme('dark')}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                            theme === 'dark'
                              ? 'bg-purple-500/20 border-purple-500/30'
                              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <MoonIcon
                            className={`h-6 w-6 ${
                              theme === 'dark' ? 'text-purple-400' : 'text-gray-500'
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-white' : 'text-gray-400'
                            }`}
                          >
                            Dark
                          </span>
                        </button>
                        <button
                          onClick={() => setTheme('auto')}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                            theme === 'auto'
                              ? 'bg-blue-500/20 border-blue-500/30'
                              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <ComputerDesktopIcon
                            className={`h-6 w-6 ${
                              theme === 'auto' ? 'text-blue-400' : 'text-gray-500'
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              theme === 'auto' ? 'text-white' : 'text-gray-400'
                            }`}
                          >
                            Auto
                          </span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        Auto mode switches between light and dark based on your system preferences
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Notifications & Sounds */}
            {currentSection === 'notifications' && (
              <>
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Notifications & Sounds</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Sound Toggle */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {soundEnabled ? (
                            <SpeakerWaveIcon className="h-6 w-6 text-green-400" />
                          ) : (
                            <SpeakerXMarkIcon className="h-6 w-6 text-gray-500" />
                          )}
                          <div>
                            <h3 className="text-sm font-semibold text-white">Sound Effects</h3>
                            <p className="text-xs text-gray-400">
                              Play sounds for notifications and actions
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSoundEnabled(!soundEnabled)}
                          className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                            soundEnabled ? 'bg-primary-500' : 'bg-gray-700'
                          }`}
                        >
                          <span
                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                              soundEnabled ? 'translate-x-7' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Test Sound Button */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <BellIcon className="h-6 w-6 text-blue-400" />
                          <div>
                            <h3 className="text-sm font-semibold text-white">Test Sounds</h3>
                            <p className="text-xs text-gray-400">Preview notification sounds</p>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => playSound('success')}
                          disabled={!soundEnabled}
                        >
                          Play Test Sound
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Account Settings */}
            {currentSection === 'account' && (
              <>
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Account</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Change Password */}
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <KeyIcon className="h-6 w-6 text-yellow-400" />
                        <div>
                          <h3 className="text-sm font-semibold text-white">Change Password</h3>
                          <p className="text-xs text-gray-400">Update your account password</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm">
                        Change Password
                      </Button>
                    </div>

                    {/* Session Info */}
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <UserIcon className="h-6 w-6 text-purple-400" />
                        <div>
                          <h3 className="text-sm font-semibold text-white">Session Information</h3>
                          <p className="text-xs text-gray-400">View your active sessions</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <p>Current session started: {new Date().toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminSettingsPage;
