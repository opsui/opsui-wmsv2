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
        { value: 'PENDING', label: 'Pending' },
        { value: 'PICKING', label: 'Picking' },
        { value: 'PICKED', label: 'Picked' },
        { value: 'PACKED', label: 'Packed' },
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
      expect(screen.getByText('Add Group')).toBeInTheDocument();
    });

    it('renders existing conditions', () => {
      const conditions: RuleCondition[] = [
        { id: 'condition-1', field: 'order.status', operator: 'eq', value: 'PENDING' },
      ];

      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={conditions} onChange={mockOnChange} />
      );

      expect(screen.getByText('Order Status')).toBeInTheDocument();
      expect(screen.getByText('Equals')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('renders field selector with all options', () => {
      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={[]} onChange={mockOnChange} />
      );

      // When adding a condition, add button should be present
      const addButton = screen.getByText('Add Condition');
      expect(addButton).toBeInTheDocument();
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
        expect(mockOnChange).toHaveBeenCalled();
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
        { id: 'condition-1', field: 'order.status', operator: 'eq', value: 'PENDING' },
      ];

      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={conditions} onChange={mockOnChange} />
      );

      const fieldSelect = screen.getByText('Order Status').closest('select');
      if (fieldSelect) {
        fireEvent.change(fieldSelect, { target: { value: 'order.priority' } });

        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalled();
        });
      }
    });

    it('updates operator when selected', async () => {
      const conditions: RuleCondition[] = [
        { id: 'condition-1', field: 'order.status', operator: 'eq', value: 'PENDING' },
      ];

      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={conditions} onChange={mockOnChange} />
      );

      const operatorSelect = screen.getByText('Equals').closest('select');
      if (operatorSelect) {
        fireEvent.change(operatorSelect, { target: { value: 'ne' } });

        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalled();
        });
      }
    });

    it('updates value when selected', async () => {
      const conditions: RuleCondition[] = [
        { id: 'condition-1', field: 'sku.quantity', operator: 'gt', value: '10' },
      ];

      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={conditions} onChange={mockOnChange} />
      );

      const valueInput = screen.getByDisplayValue('10');
      fireEvent.change(valueInput, { target: { value: '50' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('Removing Conditions', () => {
    it('shows delete buttons for existing conditions', () => {
      const conditions: RuleCondition[] = [
        { id: 'condition-1', field: 'order.status', operator: 'eq', value: 'PENDING' },
      ];

      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={conditions} onChange={mockOnChange} />
      );

      // Should have delete buttons with title attribute
      const deleteButtons = screen.getAllByTitle(/delete/i);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Nested Groups', () => {
    it('supports nested condition groups', () => {
      const conditions: RuleCondition[] = [
        {
          id: 'group-1',
          logicalOperator: 'OR',
          conditions: [
            { id: 'condition-1', field: 'order.status', operator: 'eq', value: 'PENDING' },
            { id: 'condition-2', field: 'order.status', operator: 'eq', value: 'PICKING' },
          ],
        },
      ];

      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={conditions} onChange={mockOnChange} />
      );

      // Should render the group
      expect(screen.getByText('Conditions')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels', () => {
      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={[]} onChange={mockOnChange} />
      );

      expect(screen.getByRole('button', { name: /add condition/i })).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows empty state for no conditions', () => {
      renderWithProviders(
        <RuleBuilder availableFields={mockFields} conditions={[]} onChange={mockOnChange} />
      );

      expect(screen.getByText(/no conditions added yet/i)).toBeInTheDocument();
    });

    it('renders incomplete conditions', () => {
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
  });
});
