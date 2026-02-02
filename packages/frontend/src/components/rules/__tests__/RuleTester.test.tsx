/**
 * RuleTester Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { RuleTester } from '../RuleTester';

describe('RuleTester Component', () => {
  const mockConditions = [
    {
      id: 'cond-1',
      field: 'order.status',
      operator: 'eq',
      value: 'PENDING',
    },
    {
      id: 'cond-2',
      field: 'order.priority',
      operator: 'eq',
      value: 'URGENT',
    },
  ];

  const mockActions = [
    {
      id: 'action-1',
      type: 'set_priority',
      parameters: { priority: 'URGENT' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders rule tester interface', () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      expect(screen.getAllByText('Test Rule')).toHaveLength(2); // heading and button
      expect(screen.getByText(/test data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /test rule/i })).toBeInTheDocument();
    });

    it('renders sample template buttons', () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      expect(screen.getByText('High Priority Order')).toBeInTheDocument();
      expect(screen.getByText('Low Inventory Alert')).toBeInTheDocument();
      expect(screen.getByText('Picker Assignment')).toBeInTheDocument();
    });

    it('renders JSON editor for test data', () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      const jsonEditor = screen.getByRole('textbox');
      expect(jsonEditor).toBeInTheDocument();
    });
  });

  describe('Rule Evaluation', () => {
    it('evaluates rule against test data', async () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      // First load test data
      fireEvent.click(screen.getByText('High Priority Order'));

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });

    it('shows unmatched conditions when rule fails', async () => {
      const differentConditions = [
        {
          id: 'cond-diff-1',
          field: 'order.status',
          operator: 'eq',
          value: 'picked',
        },
      ];

      renderWithProviders(<RuleTester conditions={differentConditions} actions={mockActions} />);

      // First load test data
      fireEvent.click(screen.getByText('High Priority Order'));

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/rule not matched/i)).toBeInTheDocument();
      });
    });
  });

  describe('Test Data Input', () => {
    it('allows editing test data', () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      const jsonEditor = screen.getByRole('textbox');
      const newData = JSON.stringify({
        order: { status: 'picked', priority: 'URGENT' },
      });

      fireEvent.change(jsonEditor, { target: { value: newData } });

      expect(jsonEditor).toHaveValue(newData);
    });

    it('shows invalid JSON indicator for bad JSON', () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      const jsonEditor = screen.getByRole('textbox');
      fireEvent.change(jsonEditor, { target: { value: '{ invalid json }' } });

      // Should show invalid json message
      expect(screen.getByText('Invalid JSON')).toBeInTheDocument();
    });

    it('loads sample data templates', () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      const templateButton = screen.getByText('High Priority Order');
      fireEvent.click(templateButton);

      const jsonEditor = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(jsonEditor.value).toContain('"orderId"');
      expect(jsonEditor.value).toContain('"ORD-001"');
    });
  });

  describe('Results Display', () => {
    it('shows success result with green styling', async () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      fireEvent.click(screen.getByText('High Priority Order'));

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        const result = screen.getByText(/rule matched/i);
        expect(result).toBeInTheDocument();
        expect(result).toHaveClass('text-green-400');
      });
    });

    it('shows failure result with red styling', async () => {
      const failConditions = [
        { id: 'cond-fail-1', field: 'order.status', operator: 'eq', value: 'picked' },
      ];

      renderWithProviders(<RuleTester conditions={failConditions} actions={mockActions} />);

      fireEvent.click(screen.getByText('High Priority Order'));

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        const result = screen.getByText(/rule not matched/i);
        expect(result).toBeInTheDocument();
        expect(result).toHaveClass('text-red-400');
      });
    });

    it('displays condition results', async () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      fireEvent.click(screen.getByText('High Priority Order'));

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/condition results/i)).toBeInTheDocument();
      });
    });

    it('displays actions to execute when matched', async () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      fireEvent.click(screen.getByText('High Priority Order'));

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/actions to execute/i)).toBeInTheDocument();
      });
    });
  });

  describe('Nested Conditions', () => {
    it('evaluates nested AND/OR groups', async () => {
      const nestedConditions = [
        {
          id: 'cond-nested-1',
          logicalOperator: 'OR' as const,
          conditions: [
            { id: 'cond-nested-2', field: 'order.status', operator: 'eq', value: 'PENDING' },
            { id: 'cond-nested-3', field: 'order.status', operator: 'eq', value: 'picking' },
          ],
        },
      ];

      renderWithProviders(<RuleTester conditions={nestedConditions} actions={mockActions} />);

      fireEvent.click(screen.getByText('High Priority Order'));

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });

    it('shows condition nesting in results', async () => {
      const nestedConditions = [
        {
          id: 'cond-nested-result-1',
          logicalOperator: 'OR' as const,
          conditions: [
            {
              id: 'cond-nested-result-2',
              field: 'order.status',
              operator: 'eq',
              value: 'PENDING',
            },
            {
              id: 'cond-nested-result-3',
              field: 'order.status',
              operator: 'eq',
              value: 'picking',
            },
          ],
        },
      ];

      renderWithProviders(<RuleTester conditions={nestedConditions} actions={mockActions} />);

      fireEvent.click(screen.getByText('High Priority Order'));

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/\[or group\]/i)).toBeInTheDocument();
      });
    });
  });

  describe('Operators', () => {
    it('evaluates eq operator correctly', async () => {
      const conditions = [
        { id: 'cond-op-1', field: 'order.status', operator: 'eq', value: 'PENDING' },
      ];

      renderWithProviders(<RuleTester conditions={conditions} actions={mockActions} />);

      fireEvent.click(screen.getByText('High Priority Order'));

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });

    it('evaluates ne operator correctly', async () => {
      const conditions = [
        { id: 'cond-op-2', field: 'order.status', operator: 'ne', value: 'picked' },
      ];

      renderWithProviders(<RuleTester conditions={conditions} actions={mockActions} />);

      fireEvent.click(screen.getByText('High Priority Order'));

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });

    it('evaluates gt operator correctly', async () => {
      const conditions = [{ id: 'cond-op-3', field: 'sku.quantity', operator: 'gt', value: 50 }];

      renderWithProviders(<RuleTester conditions={conditions} actions={mockActions} />);

      fireEvent.click(screen.getByText('High Priority Order'));

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });

    it('evaluates contains operator correctly', async () => {
      const conditions = [
        { id: 'cond-op-4', field: 'order.notes', operator: 'contains', value: 'urgent' },
      ];

      renderWithProviders(<RuleTester conditions={conditions} actions={mockActions} />);

      const jsonEditor = screen.getByRole('textbox');
      fireEvent.change(jsonEditor, {
        target: {
          value: JSON.stringify({
            order: { status: 'pending', priority: 'HIGH', notes: 'This is urgent order' },
            sku: { quantity: 100 },
          }),
        },
      });

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });

    it('evaluates is_empty operator correctly', async () => {
      const conditions = [
        { id: 'cond-op-5', field: 'order.notes', operator: 'is_empty', value: '' },
      ];

      renderWithProviders(<RuleTester conditions={conditions} actions={mockActions} />);

      fireEvent.click(screen.getByText('High Priority Order'));

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty conditions', () => {
      renderWithProviders(<RuleTester conditions={[]} actions={mockActions} />);

      // Button should be disabled when no conditions
      const testButton = screen.getByRole('button', { name: /test rule/i });
      expect(testButton).toBeDisabled();
    });

    it('handles null values in test data', async () => {
      const conditions = [
        { id: 'cond-null-1', field: 'order.notes', operator: 'is_empty', value: '' },
      ];

      renderWithProviders(<RuleTester conditions={conditions} actions={mockActions} />);

      const jsonEditor = screen.getByRole('textbox');
      fireEvent.change(jsonEditor, {
        target: {
          value: JSON.stringify({
            order: { status: 'pending', priority: 'HIGH', notes: null },
            sku: { quantity: 100 },
          }),
        },
      });

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });

    it('handles missing fields in test data', async () => {
      const conditions = [
        { id: 'cond-missing-1', field: 'order.notes', operator: 'contains', value: 'test' },
      ];

      renderWithProviders(<RuleTester conditions={conditions} actions={mockActions} />);

      const jsonEditor = screen.getByRole('textbox');
      fireEvent.change(jsonEditor, {
        target: {
          value: JSON.stringify({
            order: { status: 'pending', priority: 'HIGH' },
            sku: { quantity: 100 },
          }),
        },
      });

      const testButton = screen.getByRole('button', { name: /test rule/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/rule not matched/i)).toBeInTheDocument();
      });
    });
  });

  describe('UI State', () => {
    it('disables test button when no test data', () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      const testButton = screen.getByRole('button', { name: /test rule/i });
      expect(testButton).toBeDisabled();
    });

    it('enables test button when valid test data is loaded', () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      // Load sample data
      fireEvent.click(screen.getByText('High Priority Order'));

      const testButton = screen.getByRole('button', { name: /test rule/i });
      expect(testButton).not.toBeDisabled();
    });
  });
});
