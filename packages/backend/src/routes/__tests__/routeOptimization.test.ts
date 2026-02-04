/**
 * Integration tests for route optimization routes
 * @covers src/routes/routeOptimization.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { routeOptimizationService } from '../../services/RouteOptimizationService';
import { mlPredictionService } from '../../services/MLPredictionService';

// Mock all dependencies
jest.mock('../../services/RouteOptimizationService', () => ({
  routeOptimizationService: {
    optimizeRoute: jest.fn().mockReturnValue({
      optimizedOrder: ['A-01-01', 'A-01-02', 'B-01-01'],
      totalDistance: 150,
      estimatedTime: 25,
      savings: {
        distanceReduction: 50,
        timeReduction: 10,
      },
    }),
    getConfig: jest.fn().mockReturnValue({
      zones: ['A', 'B', 'C'],
      defaultStartPoint: 'DEPOT',
      aislePattern: 'SNAKE',
    }),
    updateConfig: jest.fn(),
  },
}));

jest.mock('../../services/MLPredictionService', () => ({
  mlPredictionService: {
    optimizeRoute: jest.fn().mockResolvedValue({
      optimized_order: ['A-01-01', 'A-01-02', 'B-01-01'],
      total_distance_meters: 150,
      estimated_time_minutes: 25,
    }),
    predictOrderDuration: jest.fn().mockResolvedValue({
      predicted_duration_minutes: 45,
      confidence_interval: [40, 50],
      confidence: 0.85,
    }),
    forecastDemand: jest.fn().mockResolvedValue({
      sku_id: 'SKU-001',
      forecast: [10, 12, 15, 14, 16, 18, 20],
      forecast_dates: [
        '2024-02-01',
        '2024-02-02',
        '2024-02-03',
        '2024-02-04',
        '2024-02-05',
        '2024-02-06',
        '2024-02-07',
      ],
      model_type: 'ARIMA',
    }),
  },
}));

jest.mock('../../config/logger');

describe('Route Optimization Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // POST /api/v1/route-optimization/optimize
  // ==========================================================================

  describe('POST /api/v1/route-optimization/optimize', () => {
    it('should optimize route with valid data', async () => {
      const optimizeData = {
        locations: ['A-01-01', 'A-01-02', 'B-01-01'],
        startPoint: 'A-01-01',
        algorithm: 'tsp',
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/optimize')
        .send(optimizeData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(mlPredictionService.optimizeRoute).toHaveBeenCalledWith(
        ['A-01-01', 'A-01-02', 'B-01-01'],
        'A-01-01'
      );
    });

    it('should use default start point when not provided', async () => {
      const optimizeData = {
        locations: ['A-01-01', 'A-01-02'],
      };

      await request(app).post('/api/v1/route-optimization/optimize').send(optimizeData).expect(200);

      expect(mlPredictionService.optimizeRoute).toHaveBeenCalledWith(
        ['A-01-01', 'A-01-02'],
        'A-01-01'
      );
    });

    it('should return 400 for invalid location format', async () => {
      const invalidData = {
        locations: ['invalid-location'],
        startPoint: 'A-01-01',
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/optimize')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should return 400 for less than 2 locations', async () => {
      const invalidData = {
        locations: ['A-01-01'],
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/optimize')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  // ==========================================================================
  // POST /api/v1/route-optimization/optimize-detailed
  // ==========================================================================

  describe('POST /api/v1/route-optimization/optimize-detailed', () => {
    it('should optimize route with detailed tasks', async () => {
      const detailedData = {
        tasks: [
          { orderId: 'order-1', location: 'A-01-01', sku: 'SKU-001', quantity: 10 },
          { orderId: 'order-1', location: 'B-01-01', sku: 'SKU-002', quantity: 5 },
        ],
        startLocation: 'DEPOT',
        options: { prioritizeAisles: true },
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/optimize-detailed')
        .send(detailedData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(routeOptimizationService.optimizeRoute).toHaveBeenCalledWith(
        detailedData.tasks,
        'DEPOT',
        { prioritizeAisles: true }
      );
    });

    it('should return 400 for missing tasks array', async () => {
      const invalidData = {
        tasks: 'not-an-array',
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/optimize-detailed')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'tasks must be a non-empty array');
    });

    it('should return 400 for empty tasks array', async () => {
      const invalidData = {
        tasks: [],
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/optimize-detailed')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  // ==========================================================================
  // GET /api/v1/route-optimization/config
  // ==========================================================================

  describe('GET /api/v1/route-optimization/config', () => {
    it('should get current warehouse configuration', async () => {
      const response = await request(app).get('/api/v1/route-optimization/config').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('zones');
      expect(response.body.data).toHaveProperty('defaultStartPoint');
    });
  });

  // ==========================================================================
  // PUT /api/v1/route-optimization/config
  // ==========================================================================

  describe('PUT /api/v1/route-optimization/config', () => {
    it('should update warehouse configuration', async () => {
      const configData = {
        zones: ['A', 'B', 'C', 'D'],
        defaultStartPoint: 'A-01-01',
      };

      const response = await request(app)
        .put('/api/v1/route-optimization/config')
        .send(configData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(routeOptimizationService.updateConfig).toHaveBeenCalledWith(configData);
    });
  });

  // ==========================================================================
  // POST /api/v1/route-optimization/compare
  // ==========================================================================

  describe('POST /api/v1/route-optimization/compare', () => {
    it('should compare different route algorithms', async () => {
      const compareData = {
        locations: ['A-01-01', 'A-01-02', 'B-01-01'],
        startPoint: 'A-01-01',
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/compare')
        .send(compareData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('comparison');
      expect(response.body.data).toHaveProperty('best');
      expect(Array.isArray(response.body.data.comparison)).toBe(true);
    });

    it('should return 400 for missing locations', async () => {
      const invalidData = {
        startPoint: 'A-01-01',
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/compare')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  // ==========================================================================
  // POST /api/v1/route-optimization/predict-duration
  // ==========================================================================

  describe('POST /api/v1/route-optimization/predict-duration', () => {
    it('should predict order fulfillment duration', async () => {
      const predictData = {
        order_id: 'order-001',
        order_item_count: 15,
        order_total_value: 500,
        hour_of_day: 10,
        day_of_week: 2,
        sku_count: 5,
        zone_diversity: 2,
        priority_level: 2,
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/predict-duration')
        .send(predictData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('predicted_duration_minutes');
    });

    it('should return 400 for validation error', async () => {
      const invalidData = {
        order_item_count: -1,
        hour_of_day: 25,
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/predict-duration')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  // ==========================================================================
  // POST /api/v1/route-optimization/predict-duration-batch
  // ==========================================================================

  describe('POST /api/v1/route-optimization/predict-duration-batch', () => {
    it('should predict duration for multiple orders', async () => {
      const batchData = {
        orders: [
          {
            order_id: 'order-001',
            order_item_count: 10,
            hour_of_day: 9,
            day_of_week: 1,
            sku_count: 3,
            zone_diversity: 1,
            priority_level: 2,
          },
          {
            order_id: 'order-002',
            order_item_count: 20,
            hour_of_day: 10,
            day_of_week: 1,
            sku_count: 8,
            zone_diversity: 3,
            priority_level: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/predict-duration-batch')
        .send(batchData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('predictions');
      expect(response.body.data).toHaveProperty('total_orders', 2);
    });

    it('should return 400 for invalid batch data', async () => {
      const invalidData = {
        orders: [
          {
            order_item_count: -1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/predict-duration-batch')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  // ==========================================================================
  // POST /api/v1/route-optimization/forecast-demand
  // ==========================================================================

  describe('POST /api/v1/route-optimization/forecast-demand', () => {
    it('should forecast SKU demand', async () => {
      const forecastData = {
        sku_id: 'SKU-001',
        historical_data: [10, 12, 15, 14, 16, 18, 20, 22, 25, 23],
        forecast_horizon_days: 14,
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/forecast-demand')
        .send(forecastData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(mlPredictionService.forecastDemand).toHaveBeenCalledWith(
        'SKU-001',
        forecastData.historical_data,
        14
      );
    });

    it('should use default forecast horizon', async () => {
      const forecastData = {
        sku_id: 'SKU-001',
        historical_data: [10, 12, 15, 14, 16, 18, 20],
      };

      await request(app)
        .post('/api/v1/route-optimization/forecast-demand')
        .send(forecastData)
        .expect(200);

      expect(mlPredictionService.forecastDemand).toHaveBeenCalledWith(
        'SKU-001',
        forecastData.historical_data,
        14
      );
    });

    it('should return 400 for insufficient historical data', async () => {
      const invalidData = {
        sku_id: 'SKU-001',
        historical_data: [10, 12],
      };

      const response = await request(app)
        .post('/api/v1/route-optimization/forecast-demand')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  // ==========================================================================
  // GET /api/v1/route-optimization/model-status
  // ==========================================================================

  describe('GET /api/v1/route-optimization/model-status', () => {
    it('should get ML model status', async () => {
      const response = await request(app)
        .get('/api/v1/route-optimization/model-status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('features');
    });
  });
});
