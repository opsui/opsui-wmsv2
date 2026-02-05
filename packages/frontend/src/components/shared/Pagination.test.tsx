/**
 * @file Pagination.test.tsx
 * @purpose Tests for Pagination component
 * @complexity medium
 * @tested yes
 */

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { Pagination } from './Pagination';

describe('Pagination Component', () => {
  const defaultProps = {
    currentPage: 1,
    totalItems: 100,
    pageSize: 10,
    onPageChange: vi.fn(),
  };

  describe('Basic Rendering', () => {
    it('does not render when there is only one page', () => {
      const { container } = renderWithProviders(
        <Pagination {...defaultProps} totalItems={5} pageSize={10} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders pagination controls when there are multiple pages', () => {
      renderWithProviders(<Pagination {...defaultProps} />);
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });

    it('displays correct page info text', () => {
      renderWithProviders(<Pagination {...defaultProps} />);
      expect(screen.getByText('Showing 1-10 of 100')).toBeInTheDocument();
    });

    it('displays correct page info for last page', () => {
      renderWithProviders(<Pagination {...defaultProps} currentPage={10} />);
      expect(screen.getByText('Showing 91-100 of 100')).toBeInTheDocument();
    });

    it('displays correct page info for middle page', () => {
      renderWithProviders(<Pagination {...defaultProps} currentPage={5} />);
      expect(screen.getByText('Showing 41-50 of 100')).toBeInTheDocument();
    });
  });

  describe('Page Navigation Buttons', () => {
    it('disables Previous button on first page', () => {
      renderWithProviders(<Pagination {...defaultProps} currentPage={1} />);
      const prevButton = screen.getByLabelText('Previous page');
      expect(prevButton).toBeDisabled();
    });

    it('enables Previous button when not on first page', () => {
      renderWithProviders(<Pagination {...defaultProps} currentPage={2} />);
      const prevButton = screen.getByLabelText('Previous page');
      expect(prevButton).not.toBeDisabled();
    });

    it('disables Next button on last page', () => {
      renderWithProviders(<Pagination {...defaultProps} currentPage={10} />);
      const nextButton = screen.getByLabelText('Next page');
      expect(nextButton).toBeDisabled();
    });

    it('enables Next button when not on last page', () => {
      renderWithProviders(<Pagination {...defaultProps} currentPage={1} />);
      const nextButton = screen.getByLabelText('Next page');
      expect(nextButton).not.toBeDisabled();
    });

    it('calls onPageChange when Previous button is clicked', () => {
      const handleChange = vi.fn();
      renderWithProviders(
        <Pagination {...defaultProps} currentPage={2} onPageChange={handleChange} />
      );

      fireEvent.click(screen.getByLabelText('Previous page'));
      expect(handleChange).toHaveBeenCalledWith(1);
    });

    it('calls onPageChange when Next button is clicked', () => {
      const handleChange = vi.fn();
      renderWithProviders(
        <Pagination {...defaultProps} currentPage={1} onPageChange={handleChange} />
      );

      fireEvent.click(screen.getByLabelText('Next page'));
      expect(handleChange).toHaveBeenCalledWith(2);
    });
  });

  describe('Page Numbers Display', () => {
    it('shows all page numbers when total pages <= maxVisiblePages', () => {
      renderWithProviders(<Pagination {...defaultProps} totalItems={50} pageSize={10} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows ellipsis when many pages', () => {
      renderWithProviders(<Pagination {...defaultProps} totalItems={100} pageSize={10} />);
      const ellipsisElements = screen.getAllByText('...');
      expect(ellipsisElements.length).toBeGreaterThan(0);
    });

    it('highlights current page', () => {
      renderWithProviders(<Pagination {...defaultProps} currentPage={3} />);
      const currentPageButton = screen.getByLabelText('Page 3');
      expect(currentPageButton).toHaveClass('from-primary-500', 'to-primary-600');
    });

    it('calls onPageChange when page number is clicked', () => {
      const handleChange = vi.fn();
      renderWithProviders(
        <Pagination {...defaultProps} currentPage={1} onPageChange={handleChange} />
      );

      fireEvent.click(screen.getByLabelText('Page 2'));
      expect(handleChange).toHaveBeenCalledWith(2);
    });
  });

  describe('Page Size Selector', () => {
    it('does not render page size selector when onPageSizeChange is not provided', () => {
      renderWithProviders(<Pagination {...defaultProps} />);
      expect(screen.queryByLabelText('Per page:')).not.toBeInTheDocument();
    });

    it('renders page size selector when onPageSizeChange is provided', () => {
      renderWithProviders(<Pagination {...defaultProps} onPageSizeChange={vi.fn()} />);
      expect(screen.getByLabelText('Per page:')).toBeInTheDocument();
    });

    it('renders default page size options', () => {
      renderWithProviders(<Pagination {...defaultProps} onPageSizeChange={vi.fn()} />);
      const select = screen.getByRole('combobox', { hidden: true });
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(4);
      expect(options[0]).toHaveValue('10');
      expect(options[1]).toHaveValue('20');
      expect(options[2]).toHaveValue('50');
      expect(options[3]).toHaveValue('100');
    });

    it('renders custom page size options', () => {
      renderWithProviders(
        <Pagination {...defaultProps} onPageSizeChange={vi.fn()} pageSizeOptions={[5, 15, 25]} />
      );
      const select = screen.getByRole('combobox', { hidden: true });
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveValue('5');
      expect(options[1]).toHaveValue('15');
      expect(options[2]).toHaveValue('25');
    });

    it('calls onPageSizeChange when page size is changed', () => {
      const handleSizeChange = vi.fn();
      renderWithProviders(<Pagination {...defaultProps} onPageSizeChange={handleSizeChange} />);

      const select = screen.getByRole('combobox', { hidden: true });
      fireEvent.change(select, { target: { value: '20' } });

      expect(handleSizeChange).toHaveBeenCalledWith(20);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero items gracefully', () => {
      const { container } = renderWithProviders(<Pagination {...defaultProps} totalItems={0} />);
      expect(container.firstChild).toBeNull();
    });

    it('handles single item', () => {
      const { container } = renderWithProviders(
        <Pagination {...defaultProps} totalItems={1} pageSize={10} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('handles items exactly equal to page size', () => {
      renderWithProviders(<Pagination {...defaultProps} totalItems={10} pageSize={10} />);
      const { container } = renderWithProviders(
        <Pagination {...defaultProps} totalItems={10} pageSize={10} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('handles very large number of pages', () => {
      renderWithProviders(<Pagination {...defaultProps} totalItems={10000} pageSize={10} />);
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('handles being on last page with ellipsis', () => {
      renderWithProviders(
        <Pagination {...defaultProps} currentPage={10} totalItems={100} pageSize={10} />
      );
      expect(screen.getByLabelText('Page 10')).toBeInTheDocument();
    });
  });

  describe('Mobile View', () => {
    it('shows mobile page indicator', () => {
      renderWithProviders(<Pagination {...defaultProps} />);
      // Mobile view shows "current / total"
      const mobileIndicator = screen.getByText('1 / 10');
      expect(mobileIndicator).toBeInTheDocument();
    });

    it('updates mobile page indicator when page changes', () => {
      const { rerender } = renderWithProviders(<Pagination {...defaultProps} />);
      expect(screen.getByText('1 / 10')).toBeInTheDocument();

      rerender(<Pagination {...defaultProps} currentPage={5} />);
      expect(screen.getByText('5 / 10')).toBeInTheDocument();
    });
  });

  describe('Styling and Attributes', () => {
    it('merges custom className', () => {
      const { container } = renderWithProviders(
        <Pagination {...defaultProps} className="custom-pagination" />
      );
      expect(container.firstChild).toHaveClass('custom-pagination');
    });

    it('has proper aria-labels on navigation buttons', () => {
      renderWithProviders(<Pagination {...defaultProps} />);
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });

    it('has aria-current on active page', () => {
      renderWithProviders(<Pagination {...defaultProps} currentPage={3} />);
      const activePage = screen.getByLabelText('Page 3');
      expect(activePage).toHaveAttribute('aria-current', 'page');
    });

    it('does not have aria-current on inactive pages', () => {
      renderWithProviders(<Pagination {...defaultProps} currentPage={1} />);
      const inactivePage = screen.getByLabelText('Page 2');
      expect(inactivePage).not.toHaveAttribute('aria-current');
    });
  });

  describe('Visible Pages Calculation', () => {
    it('shows correct pages when current page is in middle', () => {
      renderWithProviders(
        <Pagination
          {...defaultProps}
          currentPage={5}
          totalItems={100}
          pageSize={10}
          maxVisiblePages={7}
        />
      );
      expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 5')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 10')).toBeInTheDocument();
    });

    it('shows correct pages when current page is near start', () => {
      renderWithProviders(
        <Pagination
          {...defaultProps}
          currentPage={2}
          totalItems={100}
          pageSize={10}
          maxVisiblePages={7}
        />
      );
      expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
    });

    it('shows correct pages when current page is near end', () => {
      renderWithProviders(
        <Pagination
          {...defaultProps}
          currentPage={9}
          totalItems={100}
          pageSize={10}
          maxVisiblePages={7}
        />
      );
      expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 9')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 10')).toBeInTheDocument();
    });

    it('respects custom maxVisiblePages', () => {
      renderWithProviders(
        <Pagination {...defaultProps} totalItems={100} pageSize={10} maxVisiblePages={5} />
      );
      // With 5 max visible, we should see fewer page buttons
      const pageButtons = screen.getAllByLabelText(/Page \d+/);
      expect(pageButtons.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Interaction Behavior', () => {
    it('prevents page change below minimum', () => {
      const handleChange = vi.fn();
      renderWithProviders(
        <Pagination {...defaultProps} currentPage={1} onPageChange={handleChange} />
      );

      const prevButton = screen.getByLabelText('Previous page');
      fireEvent.click(prevButton);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('prevents page change above maximum', () => {
      const handleChange = vi.fn();
      renderWithProviders(
        <Pagination {...defaultProps} currentPage={10} onPageChange={handleChange} />
      );

      const nextButton = screen.getByLabelText('Next page');
      fireEvent.click(nextButton);

      expect(handleChange).not.toHaveBeenCalled();
    });
  });
});
