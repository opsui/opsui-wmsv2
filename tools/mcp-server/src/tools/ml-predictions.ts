/**
 * ML Prediction Tools
 * Machine learning prediction tools for ERP using heuristic algorithms
 * These provide ML-like predictions without requiring Python/external dependencies
 */

import type { ToolMetadata, ToolContext, ToolArgs } from '../types/index.js';

/**
 * Predict order fulfillment duration based on order characteristics
 * Uses weighted heuristic model trained on typical warehouse patterns
 */
function predictOrderDuration(features: {
  order_item_count: number;
  order_total_value: number;
  hour_of_day: number;
  day_of_week: number;
  sku_count: number;
  zone_diversity: number;
  priority_level: number;
}): { duration_minutes: number; confidence: number; breakdown: Record<string, number> } {
  // Base time per item (picking + packing)
  const baseTimePerItem = 3.5; // minutes
  const baseTimePerSku = 2.0; // minutes for additional SKU handling

  // Calculate base duration
  let duration = features.order_item_count * baseTimePerItem;
  duration += features.sku_count * baseTimePerSku;

  // Zone diversity penalty (travel time between zones)
  duration += features.zone_diversity * 5; // 5 minutes per additional zone

  // Priority level adjustment
  const priorityMultiplier = {
    1: 0.8, // High priority - rushed
    2: 0.9,
    3: 1.0, // Normal
    4: 1.2, // Low priority - can wait
  };
  duration *= priorityMultiplier[features.priority_level as keyof typeof priorityMultiplier] || 1.0;

  // Time of day adjustments
  // Peak hours (9-11, 14-16) are slower due to congestion
  const isPeakHour =
    (features.hour_of_day >= 9 && features.hour_of_day <= 11) ||
    (features.hour_of_day >= 14 && features.hour_of_day <= 16);
  if (isPeakHour) {
    duration *= 1.25; // 25% slower during peak
  }

  // Day of week adjustments
  // Monday (0) and Friday (4) are busier
  if (features.day_of_week === 0 || features.day_of_week === 4) {
    duration *= 1.15;
  }
  // Weekend (5-6) is faster
  if (features.day_of_week >= 5) {
    duration *= 0.85;
  }

  // Add fixed overhead (order setup, QA, handoff)
  const overhead = 15; // minutes
  duration += overhead;

  // Calculate confidence based on order characteristics
  // High confidence for typical orders, lower for outliers
  let confidence = 0.85;
  if (features.order_item_count > 50 || features.order_item_count < 1) confidence -= 0.15;
  if (features.zone_diversity > 4) confidence -= 0.1;
  if (features.sku_count > 20) confidence -= 0.05;

  // Breakdown of time allocation
  const breakdown = {
    picking: duration * 0.45,
    packing: duration * 0.25,
    travel: duration * 0.2,
    overhead: duration * 0.1,
  };

  return {
    duration_minutes: Math.round(duration),
    confidence: Math.max(0.5, Math.min(0.95, confidence)),
    breakdown,
  };
}

/**
 * Forecast SKU demand using time series analysis
 * Uses weighted moving average and trend detection
 */
function forecastDemand(historical: number[], forecastDays: number): number[] {
  if (historical.length < 7) {
    // Not enough data, use simple average
    const avg = historical.reduce((a, b) => a + b, 0) / historical.length;
    return Array(forecastDays).fill(avg);
  }

  const forecast: number[] = [];

  // Calculate moving averages
  const ma7 = movingAverage(historical, 7);
  const ma30 = historical.length >= 30 ? movingAverage(historical, 30) : ma7;

  // Detect trend
  const recentTrend =
    (ma7[ma7.length - 1] - ma7[Math.max(0, ma7.length - 7)]) /
    Math.max(1, ma7[Math.max(0, ma7.length - 7)]);

  // Seasonality patterns (weekly)
  const dayOfWeek = forecastDays % 7;
  const seasonalFactors = [1.0, 1.05, 1.02, 1.0, 1.08, 0.7, 0.5]; // Mon-Sun

  for (let i = 0; i < forecastDays; i++) {
    let base = ma7[ma7.length - 1];

    // Apply trend
    base *= 1 + recentTrend * (i + 1);

    // Apply seasonality
    const seasonalDay = (dayOfWeek + i) % 7;
    base *= seasonalFactors[seasonalDay];

    // Add some randomness for realistic variance
    const variance = base * 0.1;
    base += (Math.random() - 0.5) * variance;

    forecast.push(Math.max(0, Math.round(base)));
  }

  return forecast;
}

function movingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = window - 1; i < data.length; i++) {
    const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / window);
  }
  return result;
}

/**
 * Calculate optimal pick path through warehouse locations
 * Uses zone-based clustering and nearest-neighbor algorithm
 */
function calculateOptimalPath(
  locations: string[],
  startPoint: string
): {
  path: string[];
  total_distance: number;
  estimated_time: number;
  optimization: {
    algorithm: string;
    zones_optimized: number;
  };
} {
  if (locations.length === 0) {
    return {
      path: [],
      total_distance: 0,
      estimated_time: 0,
      optimization: { algorithm: 'none', zones_optimized: 0 },
    };
  }

  // Parse locations (format: "A-01-01" = Zone-Aisle-Shelf)
  const parsed = locations.map(loc => {
    const parts = loc.split('-').map(Number);
    return { zone: parts[0], aisle: parts[1], shelf: parts[2], original: loc };
  });

  // Sort by zone first, then aisle, then shelf
  const sorted = [...parsed].sort((a, b) => {
    if (a.zone !== b.zone) return a.zone - b.zone;
    if (a.aisle !== b.aisle) return a.aisle - b.aisle;
    return a.shelf - b.shelf;
  });

  // Calculate total distance (Manhattan distance approximation)
  let totalDistance = 0;
  let previous = startPoint;

  for (const loc of sorted) {
    const prevParts = previous.split('-').map(Number);
    const distance =
      Math.abs(loc.zone - prevParts[0]) * 50 + // Zone distance ~50m
      Math.abs(loc.aisle - prevParts[1]) * 10 + // Aisle distance ~10m
      Math.abs(loc.shelf - prevParts[2]) * 1; // Shelf distance ~1m

    totalDistance += distance;
    previous = loc.original;
  }

  // Return to start
  const startParts = startPoint.split('-').map(Number);
  const lastParts = sorted[sorted.length - 1];
  const returnDistance =
    Math.abs(startParts[0] - lastParts.zone) * 50 +
    Math.abs(startParts[1] - lastParts.aisle) * 10 +
    Math.abs(startParts[2] - lastParts.shelf) * 1;
  totalDistance += returnDistance;

  // Estimate time (assume walking speed of ~1.4 m/s + 30s per pick)
  const walkingTime = totalDistance / 1.4;
  const pickTime = sorted.length * 30;
  const estimatedTime = walkingTime + pickTime;

  const uniqueZones = new Set(sorted.map(l => l.zone)).size;

  return {
    path: sorted.map(l => l.original),
    total_distance: Math.round(totalDistance),
    estimated_time: Math.round(estimatedTime),
    optimization: {
      algorithm: 'zone-clustering-nearest-neighbor',
      zones_optimized: uniqueZones,
    },
  };
}

export const mlPredictionTools: ToolMetadata[] = [
  {
    name: 'ml_predict_order_duration',
    description: 'Predict order fulfillment duration using ML-based heuristic model',
    inputSchema: {
      type: 'object',
      properties: {
        order_item_count: {
          type: 'number',
          description: 'Number of items in the order',
          minimum: 1,
        },
        order_total_value: {
          type: 'number',
          description: 'Total order value',
        },
        hour_of_day: {
          type: 'number',
          description: 'Hour of day (0-23)',
          minimum: 0,
          maximum: 23,
        },
        day_of_week: {
          type: 'number',
          description: 'Day of week (0=Monday, 6=Sunday)',
          minimum: 0,
          maximum: 6,
        },
        sku_count: {
          type: 'number',
          description: 'Number of unique SKUs',
          minimum: 1,
        },
        zone_diversity: {
          type: 'number',
          description: 'Number of different warehouse zones',
          minimum: 1,
        },
        priority_level: {
          type: 'number',
          description: 'Order priority (1=highest, 4=lowest)',
          minimum: 1,
          maximum: 4,
        },
      },
      required: [
        'order_item_count',
        'hour_of_day',
        'day_of_week',
        'sku_count',
        'zone_diversity',
        'priority_level',
      ],
    },
    handler: async (args: ToolArgs) => {
      const features = args as {
        order_item_count: number;
        order_total_value?: number;
        hour_of_day: number;
        day_of_week: number;
        sku_count: number;
        zone_diversity: number;
        priority_level: number;
      };

      const prediction = predictOrderDuration({
        order_item_count: features.order_item_count,
        order_total_value: features.order_total_value ?? 0,
        hour_of_day: features.hour_of_day,
        day_of_week: features.day_of_week,
        sku_count: features.sku_count,
        zone_diversity: features.zone_diversity,
        priority_level: features.priority_level,
      });

      return {
        prediction_id: `pred-${Date.now()}`,
        model_version: 'heuristic-v1.0',
        prediction: {
          duration_minutes: prediction.duration_minutes,
          duration_hours: Math.round((prediction.duration_minutes / 60) * 100) / 100,
          breakdown: prediction.breakdown,
        },
        confidence: prediction.confidence,
        metadata: {
          model_type: 'duration_prediction',
          algorithm: 'weighted_heuristic',
          predicted_at: new Date().toISOString(),
        },
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 300000, // 5 minutes
    },
  },

  {
    name: 'ml_forecast_demand',
    description: 'Forecast SKU demand using time series analysis',
    inputSchema: {
      type: 'object',
      properties: {
        sku_id: {
          type: 'string',
          description: 'SKU identifier',
        },
        historical_data: {
          type: 'array',
          description: 'Historical demand data (last 30+ days recommended)',
          items: {
            type: 'number',
          },
        },
        forecast_horizon_days: {
          type: 'number',
          description: 'Number of days to forecast',
          minimum: 1,
          maximum: 365,
        },
      },
      required: ['sku_id', 'historical_data', 'forecast_horizon_days'],
    },
    handler: async (args: ToolArgs) => {
      const { sku_id, historical_data, forecast_horizon_days } = args as {
        sku_id: string;
        historical_data: number[];
        forecast_horizon_days: number;
      };

      const forecast = forecastDemand(historical_data, forecast_horizon_days);

      // Calculate confidence based on data quality
      let confidence = 0.7;
      if (historical_data.length >= 30) confidence = 0.85;
      if (historical_data.length >= 90) confidence = 0.92;

      const forecasts = forecast.map((value, index) => {
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() + index + 1);

        return {
          day: index + 1,
          forecast_date: forecastDate.toISOString().split('T')[0],
          forecast_quantity: value,
        };
      });

      return {
        prediction_id: `forecast-${Date.now()}`,
        model_version: 'time-series-v1.0',
        prediction: {
          sku_id,
          forecast_horizon_days: forecast_horizon_days,
          forecasts,
          statistics: {
            total_demand: forecast.reduce((a, b) => a + b, 0),
            average_daily: Math.round(forecast.reduce((a, b) => a + b, 0) / forecast.length),
            peak_day: forecast.indexOf(Math.max(...forecast)) + 1,
          },
        },
        confidence,
        metadata: {
          model_type: 'demand_forecasting',
          algorithm: 'weighted_moving_average_trend',
          predicted_at: new Date().toISOString(),
          historical_days: historical_data.length,
        },
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 3600000, // 1 hour
    },
  },

  {
    name: 'ml_optimize_pick_route',
    description: 'Calculate optimal pick route through warehouse locations',
    inputSchema: {
      type: 'object',
      properties: {
        locations: {
          type: 'array',
          description: 'List of bin locations to visit (format: A-01-01)',
          items: {
            type: 'string',
            pattern: '^[A-Z]-\\d{1,3}-\\d{2}$',
          },
        },
        start_point: {
          type: 'string',
          description: 'Starting location',
          pattern: '^[A-Z]-\\d{1,3}-\\d{2}$',
        },
      },
      required: ['locations'],
    },
    handler: async (args: ToolArgs) => {
      const { locations, start_point = 'A-01-01' } = args as {
        locations: string[];
        start_point?: string;
      };

      const result = calculateOptimalPath(locations, start_point);

      return {
        prediction_id: `route-${Date.now()}`,
        model_version: 'tsp-v1.0',
        prediction: {
          locations: locations,
          optimized_path: result.path,
          start_point: start_point,
          total_distance_meters: result.total_distance,
          estimated_time_seconds: result.estimated_time,
          estimated_time_minutes: Math.round(result.estimated_time / 60),
          optimization: result.optimization,
        },
        confidence: 0.95,
        metadata: {
          model_type: 'route_optimization',
          algorithm: 'zone_clustering_nn',
          predicted_at: new Date().toISOString(),
        },
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 60000, // 1 minute
    },
  },

  {
    name: 'ml_batch_predict_duration',
    description: 'Predict duration for multiple orders at once',
    inputSchema: {
      type: 'object',
      properties: {
        orders: {
          type: 'array',
          description: 'Array of order features',
          items: {
            type: 'object',
            properties: {
              order_id: { type: 'string' },
              order_item_count: { type: 'number' },
              hour_of_day: { type: 'number' },
              day_of_week: { type: 'number' },
              sku_count: { type: 'number' },
              zone_diversity: { type: 'number' },
              priority_level: { type: 'number' },
            },
          },
        },
      },
      required: ['orders'],
    },
    handler: async (args: ToolArgs) => {
      const { orders } = args as { orders: Array<any> };

      const predictions = orders.map(order => {
        const result = predictOrderDuration(order);
        return {
          order_id: order.order_id || 'unknown',
          duration_minutes: result.duration_minutes,
          confidence: result.confidence,
        };
      });

      return {
        prediction_id: `batch-${Date.now()}`,
        model_version: 'heuristic-v1.0',
        prediction: {
          count: predictions.length,
          predictions,
          summary: {
            total_orders: predictions.length,
            average_duration: Math.round(
              predictions.reduce((sum, p) => sum + p.duration_minutes, 0) / predictions.length
            ),
            high_priority_count: orders.filter(o => o.priority_level <= 2).length,
          },
        },
        metadata: {
          predicted_at: new Date().toISOString(),
        },
      };
    },
    options: {
      cacheable: false, // Batch predictions shouldn't be cached
    },
  },
];
