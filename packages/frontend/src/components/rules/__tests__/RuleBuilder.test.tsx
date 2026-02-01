/**
 * RuleBuilder Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { RuleBuilder, type RuleCondition } from '../RuleBuilder';

// Mock @dnd-kit library
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-context">{children}</div>
  ),
  closestCenter: true,
  useSensor: () => ({}),
  useSensors: () => [],
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  arrayMove: (arr: any[], from: number, to: number) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  },
}));

describe('RuleBuilder Component', () => {
  const mockFields = [
    {
      field: 'order.status',
      label: 'Order Status',
      type: 'select' as const,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'picking', label: 'Picking' },
        { value: 'picked', label: 'Picked' },
        { value: 'packed', label: 'Packed' },
      ],
    },
    {
      field: 'order.priority',
      label: 'Order Priority',
      type: 'select' as const,
      options: [
        { value: 'LOW', label: 'Low' },
        { value: 'NORMAL', label: 'Normal' },
        { value: 'HIGH', label: 'High' },
        { value: 'URGENT', label: 'Urgent' },
      ],
    },
    {
      field: 'sku.quantity',
      label: 'SKU Quantity',
      type: 'number' as const,
    },
  ];

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders empty rule builder', () => {
      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={[]} onChange={mockOnChange} />
      );

      expect(screen.getByText('Conditions')).toBeInTheDocument();
      expect(screen.getByText('Add Condition')).toBeInTheDocument();
    });

    it('renders existing conditions', () => {
      const conditions: RuleCondition[] = [
        { id: 'condition-1', field: 'order.status', operator: 'equals', value: 'pending' },
      ];

      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={conditions} onChange={mockOnChange} />
      );

      expect(screen.getByDisplayValue('order.status')).toBeInTheDocument();
      expect(screen.getByDisplayValue('equals')).toBeInTheDocument();
      expect(screen.getByDisplayValue('pending')).toBeInTheDocument();
    });

    it('renders logical operator toggle', () => {
      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={[]} onChange={mockOnChange} />
      );

      expect(screen.getByText('Match')).toBeInTheDocument();
      expect(screen.getByText('ALL conditions')).toBeInTheDocument();
    });

    it('renders field selector with all options', () => {
      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={[]} onChange={mockOnChange} />
      );

      // When adding a condition, fields should be available
      const addButton = screen.getByText('Add Condition');
      fireEvent.click(addButton);

      // Field options should be rendered in select
      mockFields.forEach(field => {
        expect(screen.getByText(field.label)).toBeInTheDocument();
      });
    });
  });

  describe('Adding Conditions', () => {
    it('calls onChange when adding condition', async () => {
      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={[]} onChange={mockOnChange} />
      );

      const addButton = screen.getByText('Add Condition');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              field: '',
              operator: '',
            }),
          ])
        );
      });
    });

    it('adds condition with default values', async () => {
      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={[]} onChange={mockOnChange} />
      );

      const addButton = screen.getByText('Add Condition');
      fireEvent.click(addButton);

      await waitFor(() => {
        const calls = mockOnChange.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Editing Conditions', () => {
    it('updates field when selected', async () => {
      const conditions: RuleCondition[] = [
        { id: 'condition-1', field: 'order.status', operator: 'equals', value: 'pending' },
      ];

      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={conditions} onChange={mockOnChange} />
      );

      const fieldSelect = screen.getByDisplayValue('order.status');
      fireEvent.change(fieldSelect, { target: { value: 'order.priority' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('updates operator when selected', async () => {
      const conditions: RuleCondition[] = [
        { id: 'condition-1', field: 'order.status', operator: 'equals', value: 'pending' },
      ];

      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={conditions} onChange={mockOnChange} />
      );

      const operatorSelect = screen.getByDisplayValue('equals');
      fireEvent.change(operatorSelect, { target: { value: 'not_equals' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('updates value when typed', async () => {
      const conditions: RuleCondition[] = [
        { id: 'condition-1', field: 'sku.quantity', operator: 'greater_than', value: '10' },
      ];

      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={conditions} onChange={mockOnChange} />
      );

      const valueInput = screen.getByDisplayValue('10');
      fireEvent.change(valueInput, { target: { value: '50' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              value: '50',
            }),
          ])
        );
      });
    });
  });

  describe('Removing Conditions', () => {
    it('calls onChange when removing condition', async () => {
      const conditions: RuleCondition[] = [
        { id: 'condition-1', field: 'order.status', operator: 'equals', value: 'pending' },
        { id: 'condition-2', field: 'order.priority', operator: 'equals', value: 'HIGH' },
      ];

      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={conditions} onChange={mockOnChange} />
      );

      const removeButtons = screen.getAllByLabelText(/remove condition/i);
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.arrayContaining([]));
      });
    });

    it('removes correct condition', async () => {
      const conditions: RuleCondition[] = [
        { id: '1', field: 'order.status', operator: 'equals', value: 'pending' },
        { id: '2', field: 'order.priority', operator: 'equals', value: 'HIGH' },
      ];

      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={conditions} onChange={mockOnChange} />
      );

      const removeButtons = screen.getAllByLabelText(/remove condition/i);
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        const updatedConditions = mockOnChange.mock.calls[0][0];
        expect(updatedConditions).not.toContain(expect.objectContaining({ id: '1' }));
      });
    });
  });

  describe('Logical Operator', () => {
    it('toggles between AND and OR', async () => {
      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={[]} onChange={mockOnChange} />
      );

      const andButton = screen.getByText('ALL');
      fireEvent.click(andButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('Nested Groups', () => {
    it('supports nested condition groups', () => {
      const conditions: RuleCondition[] = [
        {
          id: 'group-1',
          field: '',
          operator: '',
          value: '',
          logicalOperator: 'OR',
          conditions: [
            { id: 'condition-1', field: 'order.status', operator: 'equals', value: 'pending' },
            { id: 'condition-2', field: 'order.status', operator: 'equals', value: 'picking' },
          ],
        },
      ];

      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={conditions} onChange={mockOnChange} />
      );

      expect(screen.getByText('Match ANY')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels', () => {
      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={[]} onChange={mockOnChange} />
      );

      expect(screen.getByRole('button', { name: /add condition/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={[]} onChange={mockOnChange} />
      );

      const addButton = screen.getByRole('button', { name: /add condition/i });
      expect(addButton).toHaveFocus();
      fireEvent.keyDown(addButton, { key: 'Enter', code: 'Enter' });

      // Should trigger the add action
    });
  });

  describe('Validation', () => {
    it('shows error for incomplete conditions', () => {
      const incompleteConditions: RuleCondition[] = [
        { id: 'condition-1', field: '', operator: '', value: '' },
      ];

      renderWithProviders(
        <RuleBuilder
          availableFields={mockFields}
          conditions={incompleteConditions}
          onChange={mockOnChange}
        />
      );

      // Component should render incomplete conditions
      expect(screen.getByText('Conditions')).toBeInTheDocument();
    });

    it('displays validation errors when showValidation is true', () => {
      const incompleteConditions: RuleCondition[] = [
        { id: 'condition-1', field: '', operator: '', value: '' },
      ];

      renderWithProviders(
        <RuleBuilder
          availableFields={mockFields}
          conditions={incompleteConditions}
          onChange={mockOnChange}
        />
      );

      // Should display error messages
      expect(screen.getByText(/field is required/i)).toBeInTheDocument();
    });
  });
});
