/**
 * Severity Configuration Modal Component
 *
 * Admin modal for configuring variance severity thresholds.
 * Allows editing severity levels, variance ranges, approval requirements,
 * auto-adjust settings, and color codes for visual indication.
 */

import { useState, useEffect } from 'react';
import {
  VarianceSeverityConfig,
  CreateVarianceSeverityConfigDTO,
  UpdateVarianceSeverityConfigDTO,
} from '@opsui/shared';
import { ConfirmDialog } from '@/components/shared';

interface SeverityConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  configs: VarianceSeverityConfig[];
  onCreateConfig: (config: CreateVarianceSeverityConfigDTO) => void;
  onUpdateConfig: (configId: string, updates: UpdateVarianceSeverityConfigDTO) => void;
  onDeleteConfig: (configId: string) => void;
  onResetDefaults: () => void;
}

interface EditingConfig {
  configId?: string;
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minVariancePercent: number;
  maxVariancePercent: number;
  requiresApproval: boolean;
  requiresManagerApproval: boolean;
  autoAdjust: boolean;
  colorCode: string;
}

const DEFAULT_EDITING_STATE: EditingConfig = {
  severityLevel: 'LOW',
  minVariancePercent: 0,
  maxVariancePercent: 2,
  requiresApproval: false,
  requiresManagerApproval: false,
  autoAdjust: true,
  colorCode: '#10B981',
};

export function SeverityConfigModal({
  isOpen,
  onClose,
  configs,
  onCreateConfig,
  onUpdateConfig,
  onDeleteConfig,
  onResetDefaults,
}: SeverityConfigModalProps) {
  const [editingConfig, setEditingConfig] = useState<EditingConfig | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newConfig, setNewConfig] = useState<EditingConfig>({ ...DEFAULT_EDITING_STATE });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; configId: string }>({ isOpen: false, configId: '' });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditingConfig(null);
      setShowAddForm(false);
      setShowResetConfirm(false);
      setNewConfig({ ...DEFAULT_EDITING_STATE });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEdit = (config: VarianceSeverityConfig) => {
    setEditingConfig({
      configId: config.configId,
      severityLevel: config.severityLevel,
      minVariancePercent: config.minVariancePercent,
      maxVariancePercent: config.maxVariancePercent,
      requiresApproval: config.requiresApproval,
      requiresManagerApproval: config.requiresManagerApproval,
      autoAdjust: config.autoAdjust,
      colorCode: config.colorCode,
    });
    setShowAddForm(false);
  };

  const handleSave = () => {
    if (editingConfig?.configId) {
      // Update existing config
      const { configId, ...updates } = editingConfig;
      onUpdateConfig(configId, updates);
    } else if (showAddForm) {
      // Create new config
      onCreateConfig(newConfig as CreateVarianceSeverityConfigDTO);
    }
    setEditingConfig(null);
    setShowAddForm(false);
    setNewConfig({ ...DEFAULT_EDITING_STATE });
  };

  const handleCancel = () => {
    setEditingConfig(null);
    setShowAddForm(false);
    setNewConfig({ ...DEFAULT_EDITING_STATE });
  };

  const handleDelete = (configId: string) => {
    setDeleteConfirm({ isOpen: true, configId });
  };

  const confirmDelete = () => {
    onDeleteConfig(deleteConfirm.configId);
    setDeleteConfirm({ isOpen: false, configId: '' });
  };

  const handleResetDefaults = () => {
    onResetDefaults();
    setShowResetConfirm(false);
  };

  const activeConfigs = configs.filter(c => c.isActive);
  const inactiveConfigs = configs.filter(c => !c.isActive);

  return (
    <div className="modal-overlay severity-config-modal" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Variance Severity Configuration</h2>
          <button onClick={onClose} className="btn-close">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Description */}
          <div className="config-description">
            <p>
              Configure variance severity thresholds. Severity levels are determined by variance percentage
              and control approval requirements and auto-adjust behavior.
            </p>
          </div>

          {/* Active Configurations Table */}
          <div className="config-section">
            <div className="section-header">
              <h3>Active Configurations</h3>
              {!editingConfig && !showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn btn-primary btn-sm"
                >
                  Add Severity Level
                </button>
              )}
            </div>

            <div className="config-table-wrapper">
              <table className="config-table">
                <thead>
                  <tr>
                    <th>Severity Level</th>
                    <th>Variance Range (%)</th>
                    <th>Approval</th>
                    <th>Auto-Adjust</th>
                    <th>Color</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeConfigs.map((config) => (
                    <tr key={config.configId}>
                      {editingConfig?.configId === config.configId ? (
                        // Edit mode
                        <ConfigEditRow
                          config={editingConfig}
                          onChange={setEditingConfig}
                          onCancel={handleCancel}
                          onSave={handleSave}
                        />
                      ) : (
                        // View mode
                        <>
                          <td>
                            <span
                              className="severity-badge"
                              style={{ backgroundColor: config.colorCode }}
                            >
                              {config.severityLevel}
                            </span>
                          </td>
                          <td>
                            {config.minVariancePercent}% - {config.maxVariancePercent}%
                          </td>
                          <td>
                            {config.requiresApproval && (
                              <span className="badge">Approval</span>
                            )}
                            {config.requiresManagerApproval && (
                              <span className="badge badge-warning">Manager</span>
                            )}
                            {!config.requiresApproval && (
                              <span className="text-muted">None</span>
                            )}
                          </td>
                          <td>
                            {config.autoAdjust ? (
                              <span className="text-success">Yes</span>
                            ) : (
                              <span className="text-muted">No</span>
                            )}
                          </td>
                          <td>
                            <div className="color-preview">
                              <span className="color-swatch" style={{ backgroundColor: config.colorCode }} />
                              <code>{config.colorCode}</code>
                            </div>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                onClick={() => handleEdit(config)}
                                className="btn-icon btn-edit"
                                title="Edit"
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(config.configId)}
                                className="btn-icon btn-delete"
                                title="Delete"
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}

                  {/* Add new config row */}
                  {showAddForm && (
                    <ConfigEditRow
                      config={newConfig}
                      onChange={setNewConfig}
                      onCancel={handleCancel}
                      onSave={handleSave}
                    />
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inactive Configurations */}
          {inactiveConfigs.length > 0 && (
            <div className="config-section">
              <details className="inactive-configs">
                <summary>Inactive Configurations ({inactiveConfigs.length})</summary>
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>Severity Level</th>
                      <th>Variance Range (%)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveConfigs.map((config) => (
                      <tr key={config.configId}>
                        <td>{config.severityLevel}</td>
                        <td>
                          {config.minVariancePercent}% - {config.maxVariancePercent}%
                        </td>
                        <td>
                          <button
                            onClick={() => onUpdateConfig(config.configId, { isActive: true })}
                            className="btn btn-sm btn-secondary"
                          >
                            Activate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </div>
          )}

          {/* Reset to Defaults */}
          <div className="config-section">
            <div className="reset-section">
              <h4>Reset to Defaults</h4>
              <p>Restore default severity configurations. This will delete all custom configs.</p>
              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="btn btn-secondary"
                >
                  Reset to Defaults
                </button>
              ) : (
                <div className="reset-confirm">
                  <button
                    onClick={handleResetDefaults}
                    className="btn btn-danger"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, configId: '' })}
        onConfirm={confirmDelete}
        title="Delete Severity Configuration"
        message="Are you sure you want to delete this severity configuration?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

// ConfigEditRow - Inline edit row for configurations
interface ConfigEditRowProps {
  config: EditingConfig;
  onChange: (config: EditingConfig) => void;
  onCancel: () => void;
  onSave: () => void;
}

function ConfigEditRow({ config, onChange, onCancel, onSave }: ConfigEditRowProps) {
  const severityLevels: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  return (
    <>
      <td colSpan={6}>
        <div className="edit-row">
          <div className="edit-fields">
            <select
              value={config.severityLevel}
              onChange={(e) => onChange({ ...config, severityLevel: e.target.value as any })}
              className="select"
            >
              {severityLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>

            <div className="range-inputs">
              <input
                type="number"
                value={config.minVariancePercent}
                onChange={(e) => onChange({ ...config, minVariancePercent: parseFloat(e.target.value) || 0 })}
                placeholder="Min %"
                min="0"
                step="0.01"
                className="input input-sm"
              />
              <span>to</span>
              <input
                type="number"
                value={config.maxVariancePercent}
                onChange={(e) => onChange({ ...config, maxVariancePercent: parseFloat(e.target.value) || 0 })}
                placeholder="Max %"
                min="0"
                step="0.01"
                className="input input-sm"
              />
              <span>%</span>
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.requiresApproval}
                onChange={(e) => onChange({ ...config, requiresApproval: e.target.checked })}
              />
              Approval
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.requiresManagerApproval}
                onChange={(e) => onChange({ ...config, requiresManagerApproval: e.target.checked })}
              />
              Manager
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.autoAdjust}
                onChange={(e) => onChange({ ...config, autoAdjust: e.target.checked })}
              />
              Auto-Adjust
            </label>

            <div className="color-input">
              <input
                type="color"
                value={config.colorCode}
                onChange={(e) => onChange({ ...config, colorCode: e.target.value })}
                className="color-picker"
              />
              <input
                type="text"
                value={config.colorCode}
                onChange={(e) => onChange({ ...config, colorCode: e.target.value })}
                placeholder="#000000"
                className="input input-sm"
              />
            </div>
          </div>

          <div className="edit-actions">
            <button onClick={onSave} className="btn btn-primary btn-sm">
              Save
            </button>
            <button onClick={onCancel} className="btn btn-secondary btn-sm">
              Cancel
            </button>
          </div>
        </div>
      </td>
    </>
  );
}
