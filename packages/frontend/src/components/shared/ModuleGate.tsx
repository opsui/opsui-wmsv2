/**
 * Module Gate Component
 *
 * Conditionally renders children based on module availability
 * Used to hide UI elements for disabled modules
 */

import React from 'react';
import { ModuleId } from '@opsui/shared';
import { useModuleEnabled, useModuleStore } from '../../stores/moduleStore';

// ============================================================================
// TYPES
// ============================================================================

interface ModuleGateProps {
  /** The module ID to check */
  moduleId: ModuleId;

  /** Content to render if module is enabled */
  children: React.ReactNode;

  /** Optional fallback content if module is disabled */
  fallback?: React.ReactNode;

  /** If true, shows a placeholder instead of nothing */
  showPlaceholder?: boolean;

  /** Custom placeholder message */
  placeholderMessage?: string;

  /** Callback when user clicks upgrade */
  onUpgrade?: () => void;
}

interface MultiModuleGateProps {
  /** Module IDs to check (any must be enabled) */
  moduleIds: ModuleId[];

  /** Content to render if any module is enabled */
  children: React.ReactNode;

  /** Optional fallback if all modules are disabled */
  fallback?: React.ReactNode;

  /** Require all modules to be enabled */
  requireAll?: boolean;
}

// ============================================================================
// MODULE GATE COMPONENT
// ============================================================================

export function ModuleGate({
  moduleId,
  children,
  fallback = null,
  showPlaceholder = false,
  placeholderMessage,
  onUpgrade,
}: ModuleGateProps): React.ReactElement | null {
  const isEnabled = useModuleEnabled(moduleId);
  const fetchModules = useModuleStore(state => state.fetchModules);
  const isLoading = useModuleStore(state => state.isLoading);

  // Fetch modules if not already loaded
  React.useEffect(() => {
    const lastFetched = useModuleStore.getState().lastFetched;
    if (!lastFetched || Date.now() - lastFetched > 5 * 60 * 1000) {
      fetchModules();
    }
  }, [fetchModules]);

  if (isEnabled) {
    return <>{children}</>;
  }

  if (showPlaceholder) {
    return (
      <div className="module-gate-placeholder">
        <div className="module-gate-placeholder-content">
          <h3>Module Not Available</h3>
          <p>
            {placeholderMessage ??
              `This feature requires the ${moduleId.replace(/-/g, ' ')} module.`}
          </p>
          {onUpgrade && (
            <button onClick={onUpgrade} disabled={isLoading} className="btn btn-primary">
              {isLoading ? 'Loading...' : 'Enable Module'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{fallback}</>;
}

// ============================================================================
// MULTI MODULE GATE COMPONENT
// ============================================================================

export function MultiModuleGate({
  moduleIds,
  children,
  fallback = null,
  requireAll = false,
}: MultiModuleGateProps): React.ReactElement | null {
  const enabledModules = useModuleStore(state => state.enabledModules);

  const hasAccess = requireAll
    ? moduleIds.every(id => enabledModules.includes(id))
    : moduleIds.some(id => enabledModules.includes(id));

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

// ============================================================================
// MODULE STATUS BADGE COMPONENT
// ============================================================================

interface ModuleStatusBadgeProps {
  moduleId: ModuleId;
  showLabel?: boolean;
}

export function ModuleStatusBadge({
  moduleId,
  showLabel = true,
}: ModuleStatusBadgeProps): React.ReactElement | null {
  const isEnabled = useModuleEnabled(moduleId);

  return (
    <span className={`module-status-badge ${isEnabled ? 'enabled' : 'disabled'}`}>
      <span className={`status-dot ${isEnabled ? 'enabled' : 'disabled'}`} />
      {showLabel && <span className="status-label">{isEnabled ? 'Enabled' : 'Disabled'}</span>}
    </span>
  );
}

// ============================================================================
// MODULE UPGRADE PROMPT COMPONENT
// ============================================================================

interface ModuleUpgradePromptProps {
  moduleId: ModuleId;
  onClose?: () => void;
  onUpgrade?: () => void;
}

export function ModuleUpgradePrompt({
  moduleId,
  onClose,
  onUpgrade,
}: ModuleUpgradePromptProps): React.ReactElement {
  // This would typically fetch module details from the store
  const moduleName = moduleId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="module-upgrade-prompt">
      <div className="upgrade-prompt-header">
        <h3>Upgrade Required</h3>
        {onClose && (
          <button onClick={onClose} className="close-button" aria-label="Close">
            &times;
          </button>
        )}
      </div>
      <div className="upgrade-prompt-body">
        <p>
          The <strong>{moduleName}</strong> module is required to access this feature.
        </p>
        <p>Contact your administrator to enable this module.</p>
      </div>
      <div className="upgrade-prompt-footer">
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        {onUpgrade && (
          <button onClick={onUpgrade} className="btn btn-primary">
            Enable Module
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default ModuleGate;
