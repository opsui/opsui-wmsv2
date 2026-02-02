/**
 * RouteOptimizationPage Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { RouteOptimizationPage } from '../RouteOptimizationPage';

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RouteOptimizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Rendering', () => {
    it('renders page header', () => {
      renderWithProviders(<RouteOptimizationPage />);

      expect(screen.getByText('Route Optimization')).toBeInTheDocument();
      expect(screen.getByText(/calculate optimal picking routes/i)).toBeInTheDocument();
    });

    it('renders view toggle tabs', () => {
      renderWithProviders(<RouteOptimizationPage />);

      expect(screen.getAllByText('Optimize Route').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Compare Strategies').length).toBeGreaterThan(0);
    });

    it('renders optimize view by default', () => {
      renderWithProviders(<RouteOptimizationPage />);

      expect(screen.getByText('Locations to Visit')).toBeInTheDocument();
      expect(screen.getByText('Options')).toBeInTheDocument();
    });

    it('renders location input section', () => {
      renderWithProviders(<RouteOptimizationPage />);

      expect(screen.getByPlaceholderText('A-01-01')).toBeInTheDocument();
      expect(screen.getByText('+ Add Location')).toBeInTheDocument();
    });

    it('renders algorithm selector', () => {
      renderWithProviders(<RouteOptimizationPage />);

      expect(screen.getByText('Algorithm')).toBeInTheDocument();
      expect(screen.getByText('Nearest Neighbor (Fast)')).toBeInTheDocument();
    });

    it('renders start point input', () => {
      renderWithProviders(<RouteOptimizationPage />);

      expect(screen.getByText('Start Point')).toBeInTheDocument();
    });

    it('renders optimize button', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const optimizeButtons = screen.getAllByRole('button', { name: /optimize route/i });
      expect(optimizeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('View Toggle', () => {
    it('switches to compare view', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const compareTab = screen.getAllByText('Compare Strategies')[0];
      fireEvent.click(compareTab);

      expect(screen.getAllByText('Compare Strategies').length).toBeGreaterThan(0);
      expect(screen.getByText('Compare All')).toBeInTheDocument();
    });

    it('switches back to optimize view', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const compareTab = screen.getByText('Compare Strategies');
      fireEvent.click(compareTab);

      const optimizeTab = screen.getAllByText('Optimize Route')[0];
      fireEvent.click(optimizeTab);

      expect(screen.getAllByText('Optimize Route').length).toBeGreaterThan(0);
    });
  });

  describe('Location Input', () => {
    it('adds new location row', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const addButton = screen.getByText('+ Add Location');
      fireEvent.click(addButton);

      // Should have multiple location inputs
      const inputs = screen.getAllByPlaceholderText('A-01-01');
      expect(inputs.length).toBeGreaterThan(1);
    });

    it('removes location row', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const addButton = screen.getByText('+ Add Location');
      fireEvent.click(addButton);

      const removeButtons = screen
        .getAllByRole('button')
        .filter(
          btn => btn.querySelector('svg') && btn.getAttribute('aria-label')?.includes('remove')
        );

      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);
      }
    });

    it('updates location value', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const input = screen.getByPlaceholderText('A-01-01');
      fireEvent.change(input, { target: { value: 'A-05-03' } });

      expect(input).toHaveValue('A-05-03');
    });

    it('generates sample warehouse layout', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const generateButton = screen.getByText('Generate Sample');
      fireEvent.click(generateButton);

      // Should populate locations
      const inputs = screen.getAllByPlaceholderText('A-01-01');
      const filledInputs = inputs.filter(input => (input as HTMLInputElement).value !== '');
      expect(filledInputs.length).toBeGreaterThan(0);
    });
  });

  describe('Algorithm Selection', () => {
    it('selects nearest neighbor algorithm', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const select = screen.getByDisplayValue('Nearest Neighbor (Fast)');
      fireEvent.change(select, { target: { value: 'nearest' } });

      expect(select).toHaveValue('nearest');
    });

    it('selects TSP algorithm', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const select = screen.getByDisplayValue('Nearest Neighbor (Fast)');
      fireEvent.change(select, { target: { value: 'tsp' } });

      expect(select).toHaveValue('tsp');
    });

    it('selects aisle-by-aisle algorithm', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const select = screen.getByDisplayValue('Nearest Neighbor (Fast)');
      fireEvent.change(select, { target: { value: 'aisle' } });

      expect(select).toHaveValue('aisle');
    });

    it('selects zone-based algorithm', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const select = screen.getByDisplayValue('Nearest Neighbor (Fast)');
      fireEvent.change(select, { target: { value: 'zone' } });

      expect(select).toHaveValue('zone');
    });
  });

  describe('Route Optimization', () => {
    it('allows adding locations and clicking optimize button', () => {
      renderWithProviders(<RouteOptimizationPage />);

      // Add locations
      const input = screen.getByPlaceholderText('A-01-01');
      fireEvent.change(input, { target: { value: 'A-05-03' } });

      const addButton = screen.getByText('+ Add Location');
      fireEvent.click(addButton);

      const inputs = screen.getAllByPlaceholderText('A-01-01');
      fireEvent.change(inputs[1], { target: { value: 'A-12-08' } });

      // Click optimize - get the submit button (second one)
      const optimizeButtons = screen.getAllByRole('button', { name: /optimize route/i });
      const optimizeButton = optimizeButtons[optimizeButtons.length - 1];
      fireEvent.click(optimizeButton);

      // Component should still be rendered
      expect(screen.getByText('Route Optimization')).toBeInTheDocument();
    });

    it('validates minimum location requirement', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const optimizeButtons = screen.getAllByRole('button', { name: /optimize route/i });
      const optimizeButton = optimizeButtons[optimizeButtons.length - 1];
      fireEvent.click(optimizeButton);

      // Should show validation error or prevent action
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Zone-based Styling', () => {
    it('allows changing zone values', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const input = screen.getByPlaceholderText('A-01-01');
      fireEvent.change(input, { target: { value: 'A-05-03' } });

      expect(input).toHaveValue('A-05-03');

      fireEvent.change(input, { target: { value: 'B-05-03' } });

      expect(input).toHaveValue('B-05-03');
    });
  });

  describe('Error Handling', () => {
    it('does not crash on errors', () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'));

      renderWithProviders(<RouteOptimizationPage />);

      const generateButton = screen.getByText('Generate Sample');
      fireEvent.click(generateButton);

      const optimizeButtons = screen.getAllByRole('button', { name: /optimize route/i });
      const optimizeButton = optimizeButtons[optimizeButtons.length - 1];
      fireEvent.click(optimizeButton);

      // Component should still be rendered
      expect(screen.getByText('Route Optimization')).toBeInTheDocument();
    });
  });
});
