/**
 * Admin Settings page
 *
 * Comprehensive admin settings including:
 * - Role Switcher Settings
 * - Display & Appearance
 * - Notifications & Sounds
 * - Account Settings
 *
 * Design: Refined Control Panel aesthetic
 * - Clean, precise typography with strong hierarchy
 * - Subtle depth through layered cards and soft shadows
 * - Smooth micro-interactions on all interactive elements
 * - Orchestrated entrance animations
 * - Thoughtful spacing and visual rhythm
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
import { organizationApi } from '@/services/organizationApi';
import { useQuery } from '@tanstack/react-query';
import { getUserRoleColor, saveUserRoleColor } from '@/components/shared/Badge';
import type { User } from '@opsui/shared';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
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
// ANIMATION STYLES
// ============================================================================

const settingsAnimationStyles = `
  @keyframes settings-stagger-in {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes settings-fade-up {
    from {
      opacity: 0;
      transform: translateY(15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes title-gradient-flow {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
  
  .settings-stagger-1 { animation: settings-stagger-in 0.5s ease-out 0.1s both; }
  .settings-stagger-2 { animation: settings-stagger-in 0.5s ease-out 0.15s both; }
  .settings-stagger-3 { animation: settings-stagger-in 0.5s ease-out 0.2s both; }
  .settings-stagger-4 { animation: settings-stagger-in 0.5s ease-out 0.25s both; }
  
  .settings-fade-up { animation: settings-fade-up 0.6s ease-out both; }
  
  .settings-title-gradient {
    background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 50%, #ec4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .settings-card-hover {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .settings-card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(168, 85, 247, 0.1);
  }

  .settings-role-color-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }

  @media (max-width: 550px) {
    .settings-role-color-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }
  }
`;

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

  const themeBadge = (
    <div className="inline-flex w-fit max-w-full flex-wrap items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800/50 dark:to-gray-800/30 border border-gray-200 dark:border-gray-700/50">
      <span className="text-sm text-gray-600 dark:text-gray-400">Theme:</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
        {theme}
      </span>
      {theme === 'dark' ? (
        <MoonIcon className="h-4 w-4 text-purple-400" />
      ) : theme === 'light' ? (
        <SunIcon className="h-4 w-4 text-amber-500" />
      ) : (
        <ComputerDesktopIcon className="h-4 w-4 text-blue-400" />
      )}
    </div>
  );

  const settingsHeroIcon = (
    <div
      className="
        relative w-fit shrink-0 self-start p-4 rounded-2xl
        bg-gradient-to-br from-blue-500/20 via-purple-500/15 to-pink-500/10
        border border-blue-400/20
        shadow-lg shadow-blue-500/10
      "
    >
      <CogIcon className="h-9 w-9 text-blue-400" />
      {/* Animated ring */}
      <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/30 animate-pulse" />
    </div>
  );

  const settingsHeroCopy = (
    <div className="min-w-0">
      <h1
        className="
          text-4xl sm:text-5xl font-black tracking-tight
          font-['Archivo',sans-serif]
        "
      >
        <span className="settings-title-gradient">Settings</span>
      </h1>
      <p className="mt-2 text-base text-gray-600 dark:text-gray-400 max-w-md">
        Personalize your workspace and preferences
      </p>
    </div>
  );

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
        [role]: originalRoleColors[role] || '#a855f7',
      }));
    }
  };

  const hasColorChange = (role: UserRole) => {
    return roleColors[role] !== originalRoleColors[role];
  };

  // Inject animation styles on mount
  useEffect(() => {
    const styleId = 'admin-settings-animation-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = settingsAnimationStyles;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header - Refined Control Panel aesthetic */}
        <div className="mb-10 relative">
          {/* Decorative elements */}
          <div className="absolute -left-4 -top-4 w-40 h-40 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -right-4 bottom-0 w-32 h-32 bg-gradient-to-tl from-pink-500/5 to-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-start gap-4 sm:gap-5 settings-fade-up min-w-0 mobile:hidden">
              {settingsHeroIcon}
              <div className="min-w-0 flex-1">
                {settingsHeroCopy}
                <div className="mt-4">{themeBadge}</div>
              </div>
            </div>

            <div
              className="hidden mobile:flex mobile:items-center mobile:justify-between gap-6"
            >
              <div className="flex items-center gap-5 settings-fade-up min-w-0">
                {settingsHeroIcon}
                {settingsHeroCopy}
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-3 settings-fade-up" style={{ animationDelay: '0.2s' }}>
                {themeBadge}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]">
          {/* Sidebar Navigation */}
          <div className="min-w-0">
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
                        className={`w-full min-w-0 flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-left transition-all duration-200 ${
                          isActive
                            ? 'text-gray-900 bg-primary-100 border border-primary-300 dark:text-white dark:bg-primary-500/25 dark:border-primary-500/40 dark:shadow-lg dark:shadow-primary-500/20'
                            : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-white/10 border border-gray-300 dark:border-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-center w-4 flex-shrink-0">
                          <Icon className={`h-4 w-4 ${isActive ? 'text-primary-400' : ''}`} />
                        </div>
                        <span className="min-w-0 flex-1 leading-tight break-words">
                          {section.label}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="min-w-0 space-y-6">
            {/* Role Switcher Settings */}
            {currentSection === 'role-switcher' && (
              <>
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                      Role Switcher Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 font-medium">
                      Showing {visibleCount} of {roles.length} roles in switcher
                    </p>
                    <p className="text-xs text-gray-400">
                      Hidden roles can still be accessed but won't appear in the dropdown menu
                    </p>
                  </CardContent>
                </Card>

                {/* Role Badge Colors - All Roles */}
                {user && roles.length > 0 && (
                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                        Role Badge Colors
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                        Customize the badge color for each role you have access to. These colors are
                        personal to you and only affect how role badges appear on your device.
                      </p>
                      <div className="space-y-6">
                        {roles.map(role => {
                          const currentColor = roleColors[role.role] || '#a855f7';
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
                              <div className="grid settings-role-color-grid gap-2 md:grid-cols-15">
                                {[
                                  '#ef4444',
                                  '#f97316',
                                  '#f59e0b',
                                  '#eab308',
                                  '#84cc16',
                                  '#10b981',
                                  '#06b6d4',
                                  '#a855f7',
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
                                    className={`w-full aspect-square rounded-lg transition-all duration-200 ${
                                      currentColor === color
                                        ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white scale-110 shadow-xl'
                                        : 'hover:scale-110 opacity-75 hover:opacity-100 hover:shadow-lg border border-gray-700'
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
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                      Appearance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Theme Selection */}
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                        Theme
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <button
                          onClick={() => setTheme('light')}
                          className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 ${
                            theme === 'light'
                              ? 'bg-amber-100 dark:bg-amber-500/25 border-amber-400 dark:border-amber-500/50 shadow-lg shadow-amber-500/20'
                              : 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          <SunIcon
                            className={`h-10 w-10 ${
                              theme === 'light'
                                ? 'text-amber-600'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          />
                          <span
                            className={`text-base font-bold ${
                              theme === 'light'
                                ? 'text-gray-900'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            Light
                          </span>
                        </button>
                        <button
                          onClick={() => setTheme('dark')}
                          className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 ${
                            theme === 'dark'
                              ? 'bg-purple-100 dark:bg-purple-500/25 border-purple-400 dark:border-purple-500/50 shadow-lg shadow-purple-500/20'
                              : 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          <MoonIcon
                            className={`h-10 w-10 ${
                              theme === 'dark'
                                ? 'text-purple-600'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          />
                          <span
                            className={`text-base font-bold ${
                              theme === 'dark'
                                ? 'text-gray-900'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            Dark
                          </span>
                        </button>
                        <button
                          onClick={() => setTheme('auto')}
                          className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 ${
                            theme === 'auto'
                              ? 'bg-blue-100 dark:bg-blue-500/25 border-blue-400 dark:border-blue-500/50 shadow-lg shadow-blue-500/20'
                              : 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          <ComputerDesktopIcon
                            className={`h-10 w-10 ${
                              theme === 'auto'
                                ? 'text-blue-600'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          />
                          <span
                            className={`text-base font-bold ${
                              theme === 'auto'
                                ? 'text-gray-900'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            Auto
                          </span>
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
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
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                      Notifications & Sounds
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Sound Toggle */}
                    <div>
                      <div className="flex items-start justify-between gap-4 mobile:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {soundEnabled ? (
                            <SpeakerWaveIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400 mobile:mt-0 mobile:h-6 mobile:w-6" />
                          ) : (
                            <SpeakerXMarkIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500 mobile:mt-0 mobile:h-6 mobile:w-6" />
                          )}
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              Sound Effects
                            </h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              Play sounds for notifications and actions
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSoundEnabled(!soundEnabled)}
                          aria-pressed={soundEnabled}
                          aria-label={soundEnabled ? 'Disable sound effects' : 'Enable sound effects'}
                          className="relative flex h-11 w-14 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 mobile:h-8 mobile:w-16"
                        >
                          <span
                            className={`pointer-events-none relative block h-7 w-12 rounded-full transition-all duration-200 mobile:h-8 mobile:w-14 ${
                              soundEnabled
                                ? 'bg-primary-500 shadow-lg shadow-primary-500/30'
                                : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 mobile:h-7 mobile:w-7 ${
                                soundEnabled ? 'translate-x-5 mobile:translate-x-6' : ''
                              }`}
                            />
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Test Sound Button */}
                    <div>
                      <div className="flex items-start justify-between gap-4 mobile:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <BellIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400 mobile:mt-0 mobile:h-6 mobile:w-6" />
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              Test Sounds
                            </h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              Preview notification sounds
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => playSound('success')}
                          disabled={!soundEnabled}
                          className="flex-shrink-0 self-start mobile:self-auto"
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
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                      Account
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Organization Information */}
                    <OrganizationSection user={user} />

                    {/* Change Password */}
                    <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl">
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

// ============================================================================
// ORGANIZATION SECTION COMPONENT
// ============================================================================

interface OrganizationSectionProps {
  user: User | null;
}

function OrganizationSection({ user }: OrganizationSectionProps) {
  // Fetch user's organizations
  const { data: userOrganizations, isLoading } = useQuery({
    queryKey: ['organizations', 'my'],
    queryFn: () => organizationApi.getMyOrganizations(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const primaryOrg =
    userOrganizations?.organizations?.find((org: any) => org.isPrimary) ||
    userOrganizations?.organizations?.[0];

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl">
        <div className="flex items-center gap-3">
          <BuildingOfficeIcon className="h-6 w-6 text-blue-400 animate-pulse" />
          <div>
            <h3 className="text-sm font-semibold text-white">Organization</h3>
            <p className="text-xs text-gray-400">Loading organization info...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl">
      <div className="flex items-center gap-3 mb-3">
        <BuildingOfficeIcon className="h-6 w-6 text-blue-400" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">Organization</h3>
          <p className="text-xs text-gray-400">Your organization membership</p>
        </div>
      </div>

      {primaryOrg ? (
        <div className="space-y-3">
          {/* Organization Name */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Name</span>
            <span className="text-sm font-medium text-white">{primaryOrg.organizationName}</span>
          </div>

          {/* Organization ID - The key piece for integrations */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Organization ID</span>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-gray-700 px-2 py-1 rounded text-green-400">
                {primaryOrg.organizationId}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(primaryOrg.organizationId);
                  playSound('success');
                }}
                className="p-1 hover:bg-gray-600 rounded transition-colors"
                title="Copy Organization ID"
              >
                <ClipboardDocumentListIcon className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Organization Slug */}
          {primaryOrg.slug && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Slug</span>
              <span className="text-sm text-gray-300">@{primaryOrg.slug}</span>
            </div>
          )}

          {/* Role in Organization */}
          {primaryOrg.role && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Your Role</span>
              <Badge size="sm" variant="primary">
                {primaryOrg.role}
              </Badge>
            </div>
          )}

          {/* Primary Badge */}
          {primaryOrg.isPrimary && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <span className="text-xs text-blue-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                Primary Organization
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-400">
          <p>No organization membership found.</p>
          <p className="text-xs mt-1">Contact your administrator to be added to an organization.</p>
        </div>
      )}

      {/* Multiple Organizations Info */}
      {userOrganizations?.organizations?.length > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            Member of {userOrganizations.organizations.length} organizations
          </p>
        </div>
      )}
    </div>
  );
}

export default AdminSettingsPage;
