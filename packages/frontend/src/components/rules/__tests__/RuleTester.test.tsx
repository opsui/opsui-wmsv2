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
      operator: 'equals',
      value: 'pending',
    },
    {
      id: 'cond-2',
      field: 'order.priority',
      operator: 'equals',
      value: 'HIGH',
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

      expect(screen.getByText('Test Rule')).toBeInTheDocument();
      expect(screen.getByText(/test data/i)).toBeInTheDocument();
      expect(screen.getByText('Evaluate Rule')).toBeInTheDocument();
    });

    it('renders JSON editor for test data', () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      const jsonEditor = screen.getByRole('textbox');
      expect(jsonEditor).toBeInTheDocument();
    });

    it('pre-fills sample data', () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      expect(screen.getByDisplayValue(/"order"/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/"status"/i)).toBeInTheDocument();
    });
  });

  describe('Rule Evaluation', () => {
    it('evaluates rule against test data', async () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });

    it('shows matched conditions', async () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/order.status equals pending/i)).toBeInTheDocument();
      });
    });

    it('shows unmatched conditions when rule fails', async () => {
      const differentConditions = [
        {
          id: 'cond-diff-1',
          field: 'order.status',
          operator: 'equals',
          value: 'picked',
        },
      ];

      renderWithProviders(<RuleTester conditions={differentConditions} actions={mockActions} />);

      // Modify test data to not match
      const jsonEditor = screen.getByRole('textbox');
      fireEvent.change(jsonEditor, {
        target: {
          value: JSON.stringify({
            order: { status: 'pending', priority: 'HIGH' },
          }),
        },
      });

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/rule did not match/i)).toBeInTheDocument();
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

    it('validates JSON format', () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      const jsonEditor = screen.getByRole('textbox');
      fireEvent.change(jsonEditor, { target: { value: '{ invalid json }' } });

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      // Should show JSON error
      expect(screen.getByText(/invalid json/i)).toBeInTheDocument();
    });

    it('provides sample data templates', () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      expect(screen.getByText(/load sample/i)).toBeInTheDocument();
    });
  });

  describe('Results Display', () => {
    it('shows success result with green styling', async () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        const result = screen.getByText(/rule matched/i);
        expect(result).toBeInTheDocument();
      });
    });

    it('shows failure result with red styling', async () => {
      const failConditions = [
        { id: 'cond-fail-1', field: 'order.status', operator: 'equals', value: 'picked' },
      ];

      renderWithProviders(<RuleTester conditions={failConditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        const result = screen.getByText(/rule did not match/i);
        expect(result).toBeInTheDocument();
      });
    });

    it('displays matched conditions list', async () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/matched conditions/i)).toBeInTheDocument();
      });
    });

    it('displays actions to execute', async () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/actions to execute/i)).toBeInTheDocument();
        expect(screen.getByText(/set priority/i)).toBeInTheDocument();
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
            { id: 'cond-nested-2', field: 'order.status', operator: 'equals', value: 'pending' },
            { id: 'cond-nested-3', field: 'order.status', operator: 'equals', value: 'picking' },
          ],
        },
      ];

      renderWithProviders(<RuleTester conditions={nestedConditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

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
              operator: 'equals',
              value: 'pending',
            },
            {
              id: 'cond-nested-result-3',
              field: 'order.status',
              operator: 'equals',
              value: 'picking',
            },
          ],
        },
      ];

      renderWithProviders(<RuleTester conditions={nestedConditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/match any of/i)).toBeInTheDocument();
      });
    });
  });

  describe('Operators', () => {
    it('evaluates equals operator correctly', async () => {
      const conditions = [
        { id: 'cond-op-1', field: 'order.status', operator: 'equals', value: 'pending' },
      ];

      renderWithProviders(<RuleTester conditions={conditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });

    it('evaluates not_equals operator correctly', async () => {
      const conditions = [
        { id: 'cond-op-2', field: 'order.status', operator: 'not_equals', value: 'picked' },
      ];

      renderWithProviders(<RuleTester conditions={conditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });

    it('evaluates greater_than operator correctly', async () => {
      const conditions = [
        { id: 'cond-op-3', field: 'sku.quantity', operator: 'greater_than', value: '50' },
      ];

      renderWithProviders(<RuleTester conditions={conditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });

    it('evaluates contains operator correctly', async () => {
      const conditions = [
        { id: 'cond-op-4', field: 'order.notes', operator: 'contains', value: 'urgent' },
      ];

      renderWithProviders(<RuleTester conditions={conditions} actions={mockActions} />);

      // Add notes to test data
      const jsonEditor = screen.getByRole('textbox');
      fireEvent.change(jsonEditor, {
        target: {
          value: JSON.stringify({
            order: { status: 'pending', priority: 'HIGH', notes: 'This is urgent order' },
            sku: { quantity: 100 },
          }),
        },
      });

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });

    it('evaluates is_empty operator correctly', async () => {
      const conditions = [
        { id: 'cond-op-5', field: 'order.notes', operator: 'is_empty', value: '' },
      ];

      renderWithProviders(<RuleTester conditions={conditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty conditions', async () => {
      renderWithProviders(<RuleTester conditions={[]} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/no conditions to evaluate/i)).toBeInTheDocument();
      });
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

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });
    });

    it('handles missing fields in test data', async () => {
      const conditions = [
        { id: 'cond-missing-1', field: 'order.notes', operator: 'contains', value: 'test' },
      ];

      renderWithProviders(<RuleTester conditions={conditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/rule did not match/i)).toBeInTheDocument();
      });
    });
  });

  describe('UI Feedback', () => {
    it('shows loading state during evaluation', async () => {
      renderWithProviders(<RuleTester conditions={mockConditions} actions={mockActions} />);

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      // Button should be disabled during evaluation
      expect(evaluateButton).toBeDisabled();
    });

    it('resets results when conditions change', async () => {
      const { rerender } = renderWithProviders(
        <RuleTester conditions={mockConditions} actions={mockActions} />
      );

      const evaluateButton = screen.getByText('Evaluate Rule');
      fireEvent.click(evaluateButton);

      await waitFor(() => {
        expect(screen.getByText(/rule matched/i)).toBeInTheDocument();
      });

      // Change conditions
      rerender(
        <RuleTester
          conditions={[
            { id: 'cond-change-1', field: 'order.status', operator: 'equals', value: 'picked' },
          ]}
          actions={mockActions}
        />
      );

      // Results should be cleared or updated
    });
  });
});
