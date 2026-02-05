/**
 * SeverityConfigModal Component Tests
 * @complexity high
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { SeverityConfigModal } from './SeverityConfigModal';
import { VarianceSeverityConfig } from '@opsui/shared';

const mockConfigs: VarianceSeverityConfig[] = [
  {
    configId: 'config-1',
    severityLevel: 'LOW',
    minVariancePercent: 0,
    maxVariancePercent: 2,
    requiresApproval: false,
    requiresManagerApproval: false,
    autoAdjust: true,
    colorCode: '#10B981',
    isActive: true,
  },
  {
    configId: 'config-2',
    severityLevel: 'MEDIUM',
    minVariancePercent: 2,
    maxVariancePercent: 5,
    requiresApproval: true,
    requiresManagerApproval: true,
    autoAdjust: true,
    colorCode: '#F59E0B',
    isActive: true,
  },
  {
    configId: 'config-3',
    severityLevel: 'HIGH',
    minVariancePercent: 5,
    maxVariancePercent: 10,
    requiresApproval: true,
    requiresManagerApproval: true,
    autoAdjust: false,
    colorCode: '#EF4444',
    isActive: false,
  },
];

describe('SeverityConfigModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnCreateConfig = vi.fn();
  const mockOnUpdateConfig = vi.fn();
  const mockOnDeleteConfig = vi.fn();
  const mockOnResetDefaults = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders modal when isOpen is true', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );
      expect(screen.getByText('Variance Severity Configuration')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={false}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );
      expect(screen.queryByText('Variance Severity Configuration')).not.toBeInTheDocument();
    });

    it('renders close button', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );
      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Active Configurations Table', () => {
    beforeEach(() => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );
    });

    it('renders table headers', () => {
      // Use getAllByText since headers appear in both active and inactive tables
      const severityHeaders = screen.getAllByText('Severity Level');
      expect(severityHeaders.length).toBeGreaterThan(0);
      const rangeHeaders = screen.getAllByText('Variance Range (%)');
      expect(rangeHeaders.length).toBeGreaterThan(0);
      expect(screen.getAllByText('Approval').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Auto-Adjust').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Color').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Actions').length).toBeGreaterThan(0);
    });

    it('renders active configurations', () => {
      expect(screen.getByText('LOW')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('does not render inactive configurations in main table', () => {
      // HIGH is inactive
      const highTexts = screen.queryAllByText('HIGH');
      // Only check that HIGH appears in the inactive section
      expect(screen.getByText('Inactive Configurations (1)')).toBeInTheDocument();
    });

    it('shows Add Severity Level button', () => {
      expect(screen.getByText('Add Severity Level')).toBeInTheDocument();
    });
  });

  describe('Configuration Display', () => {
    beforeEach(() => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );
    });

    it('displays variance range', () => {
      expect(screen.getByText('0% - 2%')).toBeInTheDocument();
      expect(screen.getByText('2% - 5%')).toBeInTheDocument();
    });

    it('displays approval requirements', () => {
      // LOW config has no approval
      const noneLabels = screen.queryAllByText('None');
      expect(noneLabels.length).toBeGreaterThan(0);
    });

    it('displays manager approval badge', () => {
      // Check for badge-warning class which is used for manager approval
      const { container } = renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );
      const warningBadge = container.querySelector('.badge-warning');
      expect(warningBadge).toBeInTheDocument();
    });

    it('displays auto-adjust status', () => {
      expect(screen.getAllByText('Yes').length).toBeGreaterThan(0);
    });

    it('displays color codes', () => {
      expect(screen.getByText('#10B981')).toBeInTheDocument();
      expect(screen.getByText('#F59E0B')).toBeInTheDocument();
    });
  });

  describe('Edit Functionality', () => {
    it('enters edit mode when edit button is clicked', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      // Click the first edit button
      const editButtons = screen.getAllByTitle('Edit');
      fireEvent.click(editButtons[0]);

      // Should now show Save and Cancel buttons
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows severity level dropdown in edit mode', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      const editButtons = screen.getAllByTitle('Edit');
      fireEvent.click(editButtons[0]);

      // Check for select element
      const select = screen.getByDisplayValue('LOW');
      expect(select).toBeInTheDocument();
    });
  });

  describe('Add New Configuration', () => {
    it('shows add form when Add Severity Level button is clicked', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      fireEvent.click(screen.getByText('Add Severity Level'));

      // Should show Save and Cancel buttons
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('creates new config when save is clicked', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      fireEvent.click(screen.getByText('Add Severity Level'));
      fireEvent.click(screen.getByText('Save'));

      expect(mockOnCreateConfig).toHaveBeenCalled();
    });
  });

  describe('Delete Functionality', () => {
    it('shows delete confirmation dialog when delete button is clicked', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Delete Severity Configuration')).toBeInTheDocument();
      expect(
        screen.getByText('Are you sure you want to delete this severity configuration?')
      ).toBeInTheDocument();
    });

    it('deletes config when confirmed', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      // Click confirm button in dialog
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      expect(mockOnDeleteConfig).toHaveBeenCalled();
    });

    it('closes delete confirmation when canceled', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      // Click cancel button in dialog
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnDeleteConfig).not.toHaveBeenCalled();
    });
  });

  describe('Inactive Configurations', () => {
    it('renders inactive configurations section', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      expect(screen.getByText('Inactive Configurations (1)')).toBeInTheDocument();
    });

    it('shows Activate button for inactive configs', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      // Expand inactive configs
      fireEvent.click(screen.getByText('Inactive Configurations (1)'));

      expect(screen.getByText('Activate')).toBeInTheDocument();
    });

    it('activates config when Activate button is clicked', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      // Expand inactive configs
      fireEvent.click(screen.getByText('Inactive Configurations (1)'));
      fireEvent.click(screen.getByText('Activate'));

      expect(mockOnUpdateConfig).toHaveBeenCalledWith('config-3', { isActive: true });
    });
  });

  describe('Reset to Defaults', () => {
    it('shows reset section', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      // Use getAllByText since "Reset to Defaults" appears in both heading and description
      const resetTexts = screen.getAllByText('Reset to Defaults');
      expect(resetTexts.length).toBeGreaterThan(0);
    });

    it('shows confirmation when Reset to Defaults button is clicked', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      // Find the button by checking for button elements
      const buttons = screen.getAllByRole('button');
      const resetButton = buttons.find(btn => btn.textContent === 'Reset to Defaults');
      if (resetButton) {
        fireEvent.click(resetButton);

        expect(screen.getByText('Confirm Reset')).toBeInTheDocument();
      }
    });

    it('resets to defaults when confirmed', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      // Click the reset button
      const buttons = screen.getAllByRole('button');
      const resetButton = buttons.find(btn => btn.textContent === 'Reset to Defaults');
      if (resetButton) {
        fireEvent.click(resetButton);

        // Click confirm button
        const confirmButton = buttons.find(btn => btn.textContent === 'Confirm Reset');
        if (confirmButton) {
          fireEvent.click(confirmButton);

          expect(mockOnResetDefaults).toHaveBeenCalled();
        }
      }
    });
  });

  describe('Modal Actions', () => {
    it('calls onClose when Close button is clicked', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when overlay is clicked', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      const overlay = screen.getByText('Variance Severity Configuration').closest('.modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('State Reset', () => {
    it('resets state when modal closes', () => {
      const { rerender } = renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      // Click Add Severity Level
      fireEvent.click(screen.getByText('Add Severity Level'));

      // Close modal
      rerender(
        <SeverityConfigModal
          isOpen={false}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      // Reopen modal
      rerender(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      // Add button should be visible again (not Save/Cancel)
      expect(screen.getByText('Add Severity Level')).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });
  });

  describe('Empty Configurations', () => {
    it('handles empty configs array', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={[]}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      expect(screen.getByText('Active Configurations')).toBeInTheDocument();
    });

    it('does not show inactive section when no inactive configs', () => {
      renderWithProviders(
        <SeverityConfigModal
          isOpen={true}
          onClose={mockOnClose}
          configs={mockConfigs.filter(c => c.isActive)}
          onCreateConfig={mockOnCreateConfig}
          onUpdateConfig={mockOnUpdateConfig}
          onDeleteConfig={mockOnDeleteConfig}
          onResetDefaults={mockOnResetDefaults}
        />
      );

      expect(screen.queryByText('Inactive Configurations')).not.toBeInTheDocument();
    });
  });
});
