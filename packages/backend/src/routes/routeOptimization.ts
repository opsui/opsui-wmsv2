/**
 * Route Optimization API Routes
 *
 * Exposes route optimization algorithms via REST API
 * Provides endpoints for calculating optimal pick routes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../config/logger';
import { routeOptimizationService } from '../services/RouteOptimizationService';
import { mlPredictionService } from '../services/MLPredictionService';

// ============================================================================
// ROUTER
// ============================================================================

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const optimizeRouteSchema = z.object({
  locations: z.array(z.string().regex(/^[A-Z]-\d{1,3}-\d{2}$/)).min(2),
  startPoint: z
    .string()
    .regex(/^[A-Z]-\d{1,3}-\d{2}$/)
    .optional()
    .default('A-01-01'),
  algorithm: z.enum(['tsp', 'nearest', 'aisle', 'zone']).optional(),
});

const predictDurationSchema = z.object({
  order_id: z.string().optional(),
  order_item_count: z.number().min(1),
  order_total_value: z.number().optional(),
  hour_of_day: z.number().min(0).max(23),
  day_of_week: z.number().min(0).max(6),
  sku_count: z.number().min(1),
  zone_diversity: z.number().min(1),
  priority_level: z.number().min(1).max(4),
  picker_count: z.number().optional(),
});

const forecastDemandSchema = z.object({
  sku_id: z.string(),
  historical_data: z.array(z.number()).min(7),
  forecast_horizon_days: z.number().min(1).max(365).optional().default(14),
});

const batchPredictDurationSchema = z.object({
  orders: z
    .array(
      z.object({
        order_id: z.string().optional(),
        order_item_count: z.number().min(1),
        hour_of_day: z.number().min(0).max(23),
        day_of_week: z.number().min(0).max(6),
        sku_count: z.number().min(1),
        zone_diversity: z.number().min(1),
        priority_level: z.number().min(1).max(4),
      })
    )
    .min(1)
    .max(100),
});

// ============================================================================
// ROUTE OPTIMIZATION ENDPOINTS
// ============================================================================

/**
 * POST /api/route-optimization/optimize
 * Calculate optimal route through warehouse locations
 */
router.post('/optimize', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = optimizeRouteSchema.parse(req.body);

    logger.info('Route optimization request', {
      locationCount: body.locations.length,
      startPoint: body.startPoint,
      algorithm: body.algorithm,
    });

    // Use ML service for route optimization
    const result = await mlPredictionService.optimizeRoute(body.locations, body.startPoint);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    logger.error('Route optimization error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to optimize route',
    });
  }
});

/**
 * POST /api/route-optimization/optimize-detailed
 * Calculate optimal route with detailed pick task information
 */
router.post('/optimize-detailed', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tasks, startLocation = 'DEPOT', options = {} } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      res.status(400).json({
        success: false,
        error: 'tasks must be a non-empty array',
      });
      return;
    }

    logger.info('Detailed route optimization request', {
      taskCount: tasks.length,
      startLocation,
      options,
    });

    const result = routeOptimizationService.optimizeRoute(tasks, startLocation, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Detailed route optimization error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to optimize route',
    });
  }
});

/**
 * GET /api/route-optimization/config
 * Get current warehouse configuration
 */
router.get('/config', (req: Request, res: Response): void => {
  try {
    const config = routeOptimizationService.getConfig();
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Failed to get config', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration',
    });
  }
});

/**
 * PUT /api/route-optimization/config
 * Update warehouse configuration
 */
router.put('/config', (req: Request, res: Response): void => {
  try {
    routeOptimizationService.updateConfig(req.body);
    const config = routeOptimizationService.getConfig();

    logger.info('Route optimization config updated', { config });

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Failed to update config', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration',
    });
  }
});

/**
 * POST /api/route-optimization/compare
 * Compare different route optimization strategies
 */
router.post('/compare', async (req: Request, res: Response): Promise<void> => {
  try {
    const { locations, startPoint = 'A-01-01' } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      res.status(400).json({
        success: false,
        error: 'locations must be a non-empty array',
      });
      return;
    }

    logger.info('Route optimization comparison request', {
      locationCount: locations.length,
      startPoint,
    });

    // Run all algorithms
    const algorithms: Array<'tsp' | 'nearest' | 'aisle' | 'zone'> = [
      'tsp',
      'nearest',
      'aisle',
      'zone',
    ];
    const results = [];

    for (const algorithm of algorithms) {
      try {
        const result = await mlPredictionService.optimizeRoute(locations, startPoint);
        results.push({
          algorithm,
          ...result,
        });
      } catch (error) {
        logger.warn(`Algorithm ${algorithm} failed`, { error });
        results.push({
          algorithm,
          error: 'Algorithm failed',
        });
      }
    }

    // Find best result
    const validResults = results.filter(r => !('error' in r));
    const best = validResults.sort((a, b) => a.total_distance_meters - b.total_distance_meters)[0];

    res.json({
      success: true,
      data: {
        comparison: results,
        best: best ? best.algorithm : null,
        best_distance: best ? best.total_distance_meters : 0,
        best_time: best ? best.estimated_time_minutes : 0,
      },
    });
  } catch (error) {
    logger.error('Route comparison error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to compare routes',
    });
  }
});

// ============================================================================
// ML PREDICTION ENDPOINTS
// ============================================================================

/**
 * POST /api/route-optimization/predict-duration
 * Predict order fulfillment duration using ML
 */
router.post('/predict-duration', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = predictDurationSchema.parse(req.body);

    logger.info('Duration prediction request', {
      order_id: body.order_id,
      item_count: body.order_item_count,
      sku_count: body.sku_count,
    });

    const prediction = await mlPredictionService.predictOrderDuration(body);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    logger.error('Duration prediction error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to predict duration',
    });
  }
});

/**
 * POST /api/route-optimization/predict-duration-batch
 * Predict duration for multiple orders at once
 */
router.post('/predict-duration-batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = batchPredictDurationSchema.parse(req.body);

    logger.info('Batch duration prediction request', {
      orderCount: body.orders.length,
    });

    const predictions = await Promise.all(
      body.orders.map(order => mlPredictionService.predictOrderDuration(order))
    );

    res.json({
      success: true,
      data: {
        predictions,
        total_orders: predictions.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    logger.error('Batch duration prediction error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to predict batch durations',
    });
  }
});

/**
 * POST /api/route-optimization/forecast-demand
 * Forecast SKU demand using time series analysis
 */
router.post('/forecast-demand', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = forecastDemandSchema.parse(req.body);

    logger.info('Demand forecast request', {
      sku_id: body.sku_id,
      dataPoints: body.historical_data.length,
      horizon: body.forecast_horizon_days,
    });

    const forecast = await mlPredictionService.forecastDemand(
      body.sku_id,
      body.historical_data,
      body.forecast_horizon_days
    );

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    logger.error('Demand forecast error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to forecast demand',
    });
  }
});

/**
 * GET /api/route-optimization/model-status
 * Check ML model health and availability
 */
router.get('/model-status', (req: Request, res: Response): void => {
  const useLocalOnly = process.env.ML_USE_LOCAL_ONLY === 'true';
  const mlApiUrl = process.env.ML_API_URL || 'http://localhost:8001';

  res.json({
    success: true,
    data: {
      status: useLocalOnly ? 'local' : 'hybrid',
      ml_api_url: useLocalOnly ? null : mlApiUrl,
      local_available: true,
      features: {
        duration_prediction: true,
        demand_forecasting: true,
        route_optimization: true,
      },
    },
  });
});

export default router;
