/**
 * ActionBuilder Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ActionBuilder } from '../ActionBuilder';
import type { RuleAction } from '@opsui/shared';

describe('ActionBuilder Component', () => {
  const mockActionTypes = [
    {
      key: 'send_notification',
      label: 'Send Notification',
      description: 'Send a notification to users',
      parameters: [
        { key: 'message', label: 'Message', type: 'text' as const, required: true },
        { key: 'users', label: 'Users', type: 'multi-select' as const, options: ['picker', 'packer', 'supervisor'] },
      ],
    },
    {
      key: 'update_field',
      label: 'Update Field',
      description: 'Update a field value',
      parameters: [
        { key: 'field', label: 'Field', type: 'select' as const, options: ['status', 'priority'] },
        { key: 'value', label: 'Value', type: 'text' as const, required: true },
      ],
    },
    {
      key: 'set_priority',
      label: 'Set Priority',
      description: 'Set order priority',
      parameters: [
        { key: 'priority', label: 'Priority', type: 'select' as const, options: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], required: true },
      ],
    },
  ];

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders empty action builder', () => {
      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByText('Add Action')).toBeInTheDocument();
    });

    it('renders existing actions', () => {
      const actions: RuleAction[] = [
        {
          type: 'send_notification',
          parameters: { message: 'Test notification' },
        },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Send Notification')).toBeInTheDocument();
    });

    it('renders action type selector', () => {
      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={[]}
          onChange={mockOnChange}
        />
      );

      const addButton = screen.getByText('Add Action');
      fireEvent.click(addButton);

      // Action types should be available
      mockActionTypes.forEach(type => {
        expect(screen.getByText(type.label)).toBeInTheDocument();
      });
    });

    it('renders action description', () => {
      const actions: RuleAction[] = [
        {
          type: 'send_notification',
          parameters: { message: 'Test' },
        },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Send a notification to users')).toBeInTheDocument();
    });
  });

  describe('Adding Actions', () => {
    it('calls onChange when adding action', async () => {
      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={[]}
          onChange={mockOnChange}
        />
      );

      const addButton = screen.getByText('Add Action');
      fireEvent.click(addButton);

      // Select action type
      const sendNotification = screen.getByText('Send Notification');
      fireEvent.click(sendNotification);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('adds action with default parameters', async () => {
      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={[]}
          onChange={mockOnChange}
        />
      );

      const addButton = screen.getByText('Add Action');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              type: expect.any(String),
              parameters: expect.any(Object),
            }),
          ])
        );
      });
    });
  });

  describe('Editing Actions', () => {
    it('updates action type when changed', async () => {
      const actions: RuleAction[] = [
        {
          type: 'send_notification',
          parameters: { message: 'Test' },
        },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
        />
      );

      // Find and click the action type selector
      const typeSelector = screen.getByText('Send Notification');
      fireEvent.click(typeSelector);

      // Select different action type
      const updateField = screen.getByText('Update Field');
      fireEvent.click(updateField);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'update_field',
            }),
          ])
        );
      });
    });

    it('updates text parameter', async () => {
      const actions: RuleAction[] = [
        {
          type: 'send_notification',
          parameters: { message: 'Original message' },
        },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
        />
      );

      const messageInput = screen.getByDisplayValue('Original message');
      fireEvent.change(messageInput, { target: { value: 'Updated message' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              parameters: expect.objectContaining({
                message: 'Updated message',
              }),
            }),
          ])
        );
      });
    });

    it('updates select parameter', async () => {
      const actions: RuleAction[] = [
        {
          type: 'set_priority',
          parameters: { priority: 'NORMAL' },
        },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
        />
      );

      const prioritySelect = screen.getByDisplayValue('NORMAL');
      fireEvent.change(prioritySelect, { target: { value: 'HIGH' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              parameters: expect.objectContaining({
                priority: 'HIGH',
              }),
            }),
          ])
        );
      });
    });

    it('shows required field indicators', () => {
      const actions: RuleAction[] = [
        {
          type: 'send_notification',
          parameters: {},
        },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
          showValidation
        />
      );

      // Message field is required
      expect(screen.getByText(/message/i)).toBeInTheDocument();
    });
  });

  describe('Removing Actions', () => {
    it('calls onChange when removing action', async () => {
      const actions: RuleAction[] = [
        { type: 'send_notification', parameters: { message: 'Test 1' } },
        { type: 'update_field', parameters: { field: 'status', value: 'active' } },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
        />
      );

      const removeButtons = screen.getAllByLabelText(/remove action/i);
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('removes correct action', async () => {
      const actions: RuleAction[] = [
        { id: '1', type: 'send_notification', parameters: { message: 'Test 1' } },
        { id: '2', type: 'update_field', parameters: { field: 'status', value: 'active' } },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
        />
      );

      const removeButtons = screen.getAllByLabelText(/remove action/i);
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        const updatedActions = mockOnChange.mock.calls[0][0];
        expect(updatedActions).not.toContain(
          expect.objectContaining({ id: '1' })
        );
      });
    });
  });

  describe('Parameter Types', () => {
    it('renders text input parameters', () => {
      const actions: RuleAction[] = [
        { type: 'send_notification', parameters: { message: 'Test' } },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByDisplayValue('Test')).toHaveAttribute('type', 'text');
    });

    it('renders select parameters', () => {
      const actions: RuleAction[] = [
        { type: 'set_priority', parameters: { priority: 'NORMAL' } },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByDisplayValue('NORMAL')).toBeInTheDocument();
    });

    it('renders multi-select parameters', () => {
      const actions: RuleAction[] = [
        { type: 'send_notification', parameters: { message: 'Test', users: ['picker'] } },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
        />
      );

      // Multi-select should have checkboxes or similar
      expect(screen.getByText('picker')).toBeInTheDocument();
    });
  });

  describe('Action Preview', () => {
    it('shows action preview when enabled', () => {
      const actions: RuleAction[] = [
        {
          type: 'send_notification',
          parameters: { message: 'Test notification', users: ['picker', 'packer'] },
        },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
          showPreview
        />
      );

      expect(screen.getByText(/send notification/i)).toBeInTheDocument();
      expect(screen.getByText(/Test notification/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels', () => {
      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button', { name: /add action/i })).toBeInTheDocument();
    });

    it('announces action changes', async () => {
      const actions: RuleAction[] = [
        { type: 'send_notification', parameters: { message: 'Test' } },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
        />
      );

      const removeButton = screen.getByLabelText(/remove action/i);
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('Validation', () => {
    it('shows errors for missing required parameters', () => {
      const actions: RuleAction[] = [
        {
          type: 'send_notification',
          parameters: {},
        },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
          showValidation
        />
      );

      expect(screen.getByText(/message is required/i)).toBeInTheDocument();
    });

    it('does not show errors when parameters are valid', () => {
      const actions: RuleAction[] = [
        {
          type: 'send_notification',
          parameters: { message: 'Valid message' },
        },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
          showValidation
        />
      );

      expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Reordering Actions', () => {
    it('supports drag and drop reordering', () => {
      const actions: RuleAction[] = [
        { id: '1', type: 'send_notification', parameters: { message: 'Test 1' } },
        { id: '2', type: 'update_field', parameters: { field: 'status', value: 'active' } },
      ];

      renderWithProviders(
        <ActionBuilder
          actionTypes={mockActionTypes}
          actions={actions}
          onChange={mockOnChange}
        />
      );

      // Drag handles should be present
      const dragHandles = screen.getAllByLabelText(/drag to reorder/i);
      expect(dragHandles.length).toBe(2);
    });
  });
});
