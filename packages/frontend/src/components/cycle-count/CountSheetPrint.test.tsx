/**
 * CountSheetPrint Component Tests
 * @complexity medium
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { CountSheetPrint } from './CountSheetPrint';
import { CycleCountPlan, CycleCountEntry } from '@opsui/shared';

const mockPlan: CycleCountPlan = {
  planId: 'plan-1',
  planName: 'Monthly Aisle Count',
  countType: 'FULL',
  scheduledDate: new Date('2024-01-15'),
  status: 'SCHEDULED',
  countBy: 'user-123',
  location: 'A-01',
  notes: 'Check all items in A-01 aisle',
};

const mockEntries: CycleCountEntry[] = [
  {
    entryId: 'entry-1',
    planId: 'plan-1',
    sku: 'SKU001',
    binLocation: 'A-01-01',
    systemQuantity: 100,
    countedQuantity: null,
    variance: null,
    status: 'PENDING',
  },
  {
    entryId: 'entry-2',
    planId: 'plan-1',
    sku: 'SKU002',
    binLocation: 'A-01-02',
    systemQuantity: 50,
    countedQuantity: null,
    variance: null,
    status: 'PENDING',
  },
];

describe('CountSheetPrint Component', () => {
  const mockOnPrint = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders count sheet print component', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('Cycle Count Sheet')).toBeInTheDocument();
    });

    it('renders company name', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('Warehouse Management System')).toBeInTheDocument();
    });

    it('renders plan name in meta section', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('Monthly Aisle Count')).toBeInTheDocument();
    });

    it('renders print controls', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('Print Count Sheet')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('Plan Information', () => {
    it('displays plan name', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('Monthly Aisle Count')).toBeInTheDocument();
    });

    it('displays count type', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('FULL')).toBeInTheDocument();
    });

    it('displays scheduled date', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText(/January.*15.*2024/)).toBeInTheDocument();
    });

    it('displays counter', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('user-123')).toBeInTheDocument();
    });

    it('displays location when present', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('A-01')).toBeInTheDocument();
    });
  });

  describe('Entries Table', () => {
    it('renders table headers', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('#')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('SKU')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('System Qty')).toBeInTheDocument();
      expect(screen.getByText('Counted Qty')).toBeInTheDocument();
      expect(screen.getByText('Variance')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('renders all entries', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('SKU001')).toBeInTheDocument();
      expect(screen.getByText('SKU002')).toBeInTheDocument();
    });

    it('displays bin locations', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('A-01-01')).toBeInTheDocument();
      expect(screen.getByText('A-01-02')).toBeInTheDocument();
    });

    it('displays system quantities', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('renders row numbers', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      // Check that the table has the correct number of rows
      const { container } = renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
    });

    it('renders checkboxes for completion', () => {
      const { container } = renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(2);
    });
  });

  describe('Instructions', () => {
    it('renders instructions section', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('Instructions:')).toBeInTheDocument();
    });

    it('renders all instruction items', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText(/Count each item at the specified bin location/)).toBeInTheDocument();
      expect(screen.getByText(/Record the actual counted quantity/)).toBeInTheDocument();
      expect(screen.getByText(/Check the box when complete/)).toBeInTheDocument();
      expect(screen.getByText(/Note any discrepancies or issues/)).toBeInTheDocument();
      expect(screen.getByText(/Sign and date when all items are counted/)).toBeInTheDocument();
    });
  });

  describe('Summary Section', () => {
    it('displays total items count', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText(/Total Items:/)).toBeInTheDocument();
      // Use getAllByText since "2" appears multiple times
      const twos = screen.getAllByText('2');
      expect(twos.length).toBeGreaterThan(0);
    });

    it('displays total system quantity', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText(/Total System Qty:/)).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument(); // 100 + 50
    });

    it('displays plan notes when present', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('Check all items in A-01 aisle')).toBeInTheDocument();
    });
  });

  describe('Signature Section', () => {
    it('renders counter signature line', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('Counter Signature:')).toBeInTheDocument();
    });

    it('renders supervisor signature line', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('Supervisor Signature:')).toBeInTheDocument();
    });

    it('renders date lines', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      const dateLabels = screen.getAllByText('Date:');
      expect(dateLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Footer', () => {
    it('displays generation date', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText(/Generated by WMS on/)).toBeInTheDocument();
    });

    it('displays plan ID', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('Plan ID: plan-1')).toBeInTheDocument();
    });

    it('displays return instructions', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('Return completed form to inventory supervisor')).toBeInTheDocument();
    });
  });

  describe('User Actions', () => {
    it('calls onPrint when print button is clicked', () => {
      const windowSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );

      fireEvent.click(screen.getByText('Print Count Sheet'));

      expect(windowSpy).toHaveBeenCalled();
      expect(mockOnPrint).toHaveBeenCalled();

      windowSpy.mockRestore();
    });

    it('calls onPrint when close button is clicked', () => {
      renderWithProviders(
        <CountSheetPrint plan={mockPlan} entries={mockEntries} onPrint={mockOnPrint} />
      );

      fireEvent.click(screen.getByText('Close'));

      expect(mockOnPrint).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('handles empty entries array', () => {
      renderWithProviders(<CountSheetPrint plan={mockPlan} entries={[]} onPrint={mockOnPrint} />);
      expect(screen.getByText('Total Items:')).toBeInTheDocument();
      // Use getAllByText since "0" appears in the summary
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });
  });

  describe('Conditional Fields', () => {
    it('does not display location when not present in plan', () => {
      const planWithoutLocation = { ...mockPlan, location: undefined };

      renderWithProviders(
        <CountSheetPrint plan={planWithoutLocation} entries={mockEntries} onPrint={mockOnPrint} />
      );
      // The meta row for location should not be present
      const locationLabels = screen.queryAllByText('Location:');
      expect(locationLabels.length).toBe(0);
    });

    it('does not display SKU focus when not present in plan', () => {
      const planWithoutSku = { ...mockPlan, sku: undefined };

      renderWithProviders(
        <CountSheetPrint plan={planWithoutSku} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.queryByText('SKU Focus:')).not.toBeInTheDocument();
    });

    it('does not display plan notes when not present', () => {
      const planWithoutNotes = { ...mockPlan, notes: undefined };

      renderWithProviders(
        <CountSheetPrint plan={planWithoutNotes} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.queryByText('Check all items in A-01 aisle')).not.toBeInTheDocument();
    });
  });

  describe('SKU Focus Display', () => {
    it('displays SKU focus when present', () => {
      const planWithSku = { ...mockPlan, sku: 'SKU001' };

      renderWithProviders(
        <CountSheetPrint plan={planWithSku} entries={mockEntries} onPrint={mockOnPrint} />
      );
      expect(screen.getByText('SKU Focus:')).toBeInTheDocument();
      // Use getAllByText since SKU001 appears both in the table and SKU focus
      const skuElements = screen.getAllByText('SKU001');
      expect(skuElements.length).toBeGreaterThan(0);
    });
  });
});
