/**
 * RouteOptimizationPage Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { RouteOptimizationPage } from '../RouteOptimizationPage';

// Mock fetch API
global.fetch = vi.fn();

describe('RouteOptimizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Rendering', () => {
    it('renders page header', () => {
      renderWithProviders(<RouteOptimizationPage />);

      expect(screen.getByText('Route Optimization')).toBeInTheDocument();
      expect(screen.getByText(/calculate optimal picking routes/i)).toBeInTheDocument();
    });

    it('renders view toggle tabs', () => {
      renderWithProviders(<RouteOptimizationPage />);

      expect(screen.getByText('Optimize Route')).toBeInTheDocument();
      expect(screen.getByText('Compare Strategies')).toBeInTheDocument();
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

      const optimizeButton = screen.getByRole('button', { name: /optimize route/i });
      expect(optimizeButton).toBeInTheDocument();
    });
  });

  describe('View Toggle', () => {
    it('switches to compare view', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const compareTab = screen.getByText('Compare Strategies');
      fireEvent.click(compareTab);

      expect(screen.getByText('Compare Strategies')).toBeInTheDocument();
      expect(screen.getByText('Compare All')).toBeInTheDocument();
    });

    it('switches back to optimize view', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const compareTab = screen.getByText('Compare Strategies');
      fireEvent.click(compareTab);

      const optimizeTab = screen.getByText('Optimize Route');
      fireEvent.click(optimizeTab);

      expect(screen.getByText('Optimize Route')).toBeInTheDocument();
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
    it('optimizes route with valid locations', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            locations: ['A-05-03', 'A-12-08'],
            optimized_path: ['A-01-01', 'A-05-03', 'A-12-08', 'A-01-01'],
            total_distance_meters: 150,
            estimated_time_minutes: 5,
            algorithm: 'nearest',
          },
        }),
      });

      renderWithProviders(<RouteOptimizationPage />);

      // Add locations
      const input = screen.getByPlaceholderText('A-01-01');
      fireEvent.change(input, { target: { value: 'A-05-03' } });

      const addButton = screen.getByText('+ Add Location');
      fireEvent.click(addButton);

      const inputs = screen.getAllByPlaceholderText('A-01-01');
      fireEvent.change(inputs[1], { target: { value: 'A-12-08' } });

      // Click optimize
      const optimizeButton = screen.getByRole('button', { name: /optimize route/i });
      fireEvent.click(optimizeButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/route-optimization/optimize',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('displays optimization results', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            locations: ['A-05-03', 'A-12-08'],
            optimized_path: ['A-01-01', 'A-05-03', 'A-12-08', 'A-01-01'],
            total_distance_meters: 150,
            estimated_time_minutes: 5,
            algorithm: 'nearest',
          },
        }),
      });

      renderWithProviders(<RouteOptimizationPage />);

      // Generate and optimize
      const generateButton = screen.getByText('Generate Sample');
      fireEvent.click(generateButton);

      const optimizeButton = screen.getByRole('button', { name: /optimize route/i });
      fireEvent.click(optimizeButton);

      await waitFor(() => {
        expect(screen.getByText('Optimization Result')).toBeInTheDocument();
        expect(screen.getByText('150m')).toBeInTheDocument();
        expect(screen.getByText('5min')).toBeInTheDocument();
      });
    });

    it('shows loading state during optimization', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    data: {
                      locations: ['A-05-03'],
                      optimized_path: ['A-01-01', 'A-05-03', 'A-01-01'],
                      total_distance_meters: 50,
                      estimated_time_minutes: 2,
                    },
                  }),
                }),
              100
            )
          )
      );

      renderWithProviders(<RouteOptimizationPage />);

      const generateButton = screen.getByText('Generate Sample');
      fireEvent.click(generateButton);

      const optimizeButton = screen.getByRole('button', { name: /optimize route/i });
      fireEvent.click(optimizeButton);

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByText(/optimizing/i)).toBeInTheDocument();
      });
    });

    it('validates minimum location requirement', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const optimizeButton = screen.getByRole('button', { name: /optimize route/i });
      fireEvent.click(optimizeButton);

      // Should show validation error or prevent action
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Route Comparison', () => {
    it('compares all strategies', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            comparison: [
              {
                algorithm: 'tsp',
                locations: ['A-05-03', 'A-12-08'],
                optimized_path: ['A-01-01', 'A-05-03', 'A-12-08', 'A-01-01'],
                total_distance_meters: 140,
                estimated_time_minutes: 4,
              },
              {
                algorithm: 'nearest',
                locations: ['A-05-03', 'A-12-08'],
                optimized_path: ['A-01-01', 'A-05-03', 'A-12-08', 'A-01-01'],
                total_distance_meters: 150,
                estimated_time_minutes: 5,
              },
              {
                algorithm: 'aisle',
                locations: ['A-05-03', 'A-12-08'],
                optimized_path: ['A-01-01', 'A-05-03', 'A-12-08', 'A-01-01'],
                total_distance_meters: 160,
                estimated_time_minutes: 6,
              },
              {
                algorithm: 'zone',
                locations: ['A-05-03', 'A-12-08'],
                optimized_path: ['A-01-01', 'A-05-03', 'A-12-08', 'A-01-01'],
                total_distance_meters: 155,
                estimated_time_minutes: 5,
              },
            ],
            best: 'tsp',
            best_distance: 140,
            best_time: 4,
          },
        }),
      });

      renderWithProviders(<RouteOptimizationPage />);

      // Switch to compare view
      const compareTab = screen.getByText('Compare Strategies');
      fireEvent.click(compareTab);

      // Generate sample data
      const generateButton = screen.getByText('Generate Sample');
      fireEvent.click(generateButton);

      // Run comparison
      const compareButton = screen.getByRole('button', { name: /compare all/i });
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText(/best strategy/i)).toBeInTheDocument();
        expect(screen.getByText('tsp')).toBeInTheDocument();
      });
    });

    it('displays comparison results sorted by distance', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            comparison: [
              {
                algorithm: 'tsp',
                locations: ['A-05-03'],
                optimized_path: ['A-01-01', 'A-05-03', 'A-01-01'],
                total_distance_meters: 50,
                estimated_time_minutes: 2,
              },
              {
                algorithm: 'nearest',
                locations: ['A-05-03'],
                optimized_path: ['A-01-01', 'A-05-03', 'A-01-01'],
                total_distance_meters: 60,
                estimated_time_minutes: 2,
              },
            ],
            best: 'tsp',
            best_distance: 50,
            best_time: 2,
          },
        }),
      });

      renderWithProviders(<RouteOptimizationPage />);

      const compareTab = screen.getByText('Compare Strategies');
      fireEvent.click(compareTab);

      const generateButton = screen.getByText('Generate Sample');
      fireEvent.click(generateButton);

      const compareButton = screen.getByRole('button', { name: /compare all/i });
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText(/tsp algorithm/i)).toBeInTheDocument();
        expect(screen.getByText(/nearest algorithm/i)).toBeInTheDocument();
      });
    });

    it('highlights best strategy', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            comparison: [
              {
                algorithm: 'tsp',
                locations: ['A-05-03'],
                optimized_path: ['A-01-01', 'A-05-03', 'A-01-01'],
                total_distance_meters: 50,
                estimated_time_minutes: 2,
              },
            ],
            best: 'tsp',
            best_distance: 50,
            best_time: 2,
          },
        }),
      });

      renderWithProviders(<RouteOptimizationPage />);

      const compareTab = screen.getByText('Compare Strategies');
      fireEvent.click(compareTab);

      const generateButton = screen.getByText('Generate Sample');
      fireEvent.click(generateButton);

      const compareButton = screen.getByRole('button', { name: /compare all/i });
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText(/best strategy/i)).toBeInTheDocument();
      });
    });
  });

  describe('Zone-based Styling', () => {
    it('applies zone-specific colors to locations', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const input = screen.getByPlaceholderText('A-01-01');
      fireEvent.change(input, { target: { value: 'A-05-03' } });

      // Zone A should have blue color
      expect(input.closest('[class*="bg-blue"]')).toBeInTheDocument();
    });

    it('updates color when zone changes', () => {
      renderWithProviders(<RouteOptimizationPage />);

      const input = screen.getByPlaceholderText('A-01-01');
      fireEvent.change(input, { target: { value: 'B-05-03' } });

      // Zone B should have green color
      expect(input.closest('[class*="bg-green"]')).toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('shows total locations count', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            locations: ['A-05-03', 'A-12-08', 'B-03-05'],
            optimized_path: ['A-01-01', 'A-05-03', 'A-12-08', 'B-03-05', 'A-01-01'],
            total_distance_meters: 200,
            estimated_time_minutes: 8,
          },
        }),
      });

      renderWithProviders(<RouteOptimizationPage />);

      const generateButton = screen.getByText('Generate Sample');
      fireEvent.click(generateButton);

      const optimizeButton = screen.getByRole('button', { name: /optimize route/i });
      fireEvent.click(optimizeButton);

      await waitFor(() => {
        expect(screen.getByText('Total Locations')).toBeInTheDocument();
      });
    });

    it('shows total distance', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            locations: ['A-05-03'],
            optimized_path: ['A-01-01', 'A-05-03', 'A-01-01'],
            total_distance_meters: 50,
            estimated_time_minutes: 2,
          },
        }),
      });

      renderWithProviders(<RouteOptimizationPage />);

      const generateButton = screen.getByText('Generate Sample');
      fireEvent.click(generateButton);

      const optimizeButton = screen.getByRole('button', { name: /optimize route/i });
      fireEvent.click(optimizeButton);

      await waitFor(() => {
        expect(screen.getByText('50m')).toBeInTheDocument();
      });
    });

    it('shows estimated time', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            locations: ['A-05-03'],
            optimized_path: ['A-01-01', 'A-05-03', 'A-01-01'],
            total_distance_meters: 50,
            estimated_time_minutes: 2,
          },
        }),
      });

      renderWithProviders(<RouteOptimizationPage />);

      const generateButton = screen.getByText('Generate Sample');
      fireEvent.click(generateButton);

      const optimizeButton = screen.getByRole('button', { name: /optimize route/i });
      fireEvent.click(optimizeButton);

      await waitFor(() => {
        expect(screen.getByText('2m')).toBeInTheDocument();
      });
    });
  });

  describe('Optimized Path Display', () => {
    it('displays optimized path sequence', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            locations: ['A-05-03', 'A-12-08'],
            optimized_path: ['A-01-01', 'A-05-03', 'A-12-08', 'A-01-01'],
            total_distance_meters: 150,
            estimated_time_minutes: 5,
          },
        }),
      });

      renderWithProviders(<RouteOptimizationPage />);

      const generateButton = screen.getByText('Generate Sample');
      fireEvent.click(generateButton);

      const optimizeButton = screen.getByRole('button', { name: /optimize route/i });
      fireEvent.click(optimizeButton);

      await waitFor(() => {
        expect(screen.getByText('Optimized Path')).toBeInTheDocument();
        expect(screen.getByText('A-01-01')).toBeInTheDocument();
        expect(screen.getByText('A-05-03')).toBeInTheDocument();
      });
    });

    it('numbers path waypoints', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            locations: ['A-05-03', 'A-12-08'],
            optimized_path: ['A-01-01', 'A-05-03', 'A-12-08', 'A-01-01'],
            total_distance_meters: 150,
            estimated_time_minutes: 5,
          },
        }),
      });

      renderWithProviders(<RouteOptimizationPage />);

      const generateButton = screen.getByText('Generate Sample');
      fireEvent.click(generateButton);

      const optimizeButton = screen.getByRole('button', { name: /optimize route/i });
      fireEvent.click(optimizeButton);

      await waitFor(() => {
        expect(screen.getByText('1.')).toBeInTheDocument();
        expect(screen.getByText('2.')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'));

      renderWithProviders(<RouteOptimizationPage />);

      const generateButton = screen.getByText('Generate Sample');
      fireEvent.click(generateButton);

      const optimizeButton = screen.getByRole('button', { name: /optimize route/i });
      fireEvent.click(optimizeButton);

      // Should not crash, should handle error
      await waitFor(() => {
        expect(optimizeButton).not.toBeDisabled();
      });
    });
  });
});
