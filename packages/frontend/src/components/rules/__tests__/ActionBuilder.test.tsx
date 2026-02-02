/**
 * ActionBuilder Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ActionBuilder, type RuleAction } from '../ActionBuilder';

describe('ActionBuilder Component', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders empty action builder', () => {
      renderWithProviders(<ActionBuilder actions={[]} onChange={mockOnChange} />);

      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByText('Add Action')).toBeInTheDocument();
    });

    it('renders existing actions', () => {
      const actions: RuleAction[] = [
        {
          id: 'action-1',
          type: 'send_notification',
          parameters: { message: 'Test' },
        },
      ];

      renderWithProviders(<ActionBuilder actions={actions} onChange={mockOnChange} />);

      // Should show action type
      expect(screen.getAllByText('Send Notification').length).toBeGreaterThan(0);
    });

    it('renders action description', () => {
      const actions: RuleAction[] = [
        {
          id: 'action-1',
          type: 'send_notification',
          parameters: { templateId: 'test' },
        },
      ];

      renderWithProviders(<ActionBuilder actions={actions} onChange={mockOnChange} />);

      expect(screen.getByText('Send a notification to users')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels', () => {
      renderWithProviders(<ActionBuilder actions={[]} onChange={mockOnChange} />);

      expect(screen.getByRole('button', { name: /add action/i })).toBeInTheDocument();
    });
  });
});
