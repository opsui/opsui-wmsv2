/**
 * ML Prediction Service
 * Integrates with ML models for order duration, demand forecasting, and route optimization
 * Uses both local heuristic models and external ML API when available
 */

export interface OrderFeatures {
  order_id?: string;
  order_item_count: number;
  order_total_value?: number;
  hour_of_day: number;
  day_of_week: number;
  sku_count: number;
  zone_diversity: number;
  priority_level: number;
  picker_count?: number;
}

interface DurationPrediction {
  prediction_id: string;
  model_version: string;
  prediction: {
    duration_minutes: number;
    duration_hours: number;
    breakdown?: {
      picking: number;
      packing: number;
      travel: number;
      overhead: number;
    };
  };
  confidence: number;
  metadata: {
    model_type: string;
    predicted_at: string;
  };
}

interface DemandForecast {
  sku_id: string;
  forecast_horizon_days: number;
  forecasts: Array<{
    day: number;
    forecast_date: string;
    forecast_quantity: number;
  }>;
}

interface RouteOptimization {
  locations: string[];
  optimized_path: string[];
  total_distance_meters: number;
  estimated_time_minutes: number;
}

/**
 * ML Prediction Service
 * Provides ML predictions using local fallback when external API unavailable
 */
export class MLPredictionService {
  private mlApiUrl: string;
  private useLocalOnly: boolean;
  private cache: Map<string, { data: any; expiry: number }>;
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor() {
    this.mlApiUrl = process.env.ML_API_URL || 'http://localhost:8001';
    this.useLocalOnly = process.env.ML_USE_LOCAL_ONLY === 'true';
    this.cache = new Map();
  }

  /**
   * Predict order fulfillment duration
   */
  async predictOrderDuration(features: OrderFeatures): Promise<DurationPrediction> {
    const cacheKey = `duration:${JSON.stringify(features)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let prediction: DurationPrediction;

    if (this.useLocalOnly) {
      prediction = await this.predictDurationLocal(features);
    } else {
      try {
        prediction = await this.predictDurationAPI(features);
      } catch (error) {
        console.warn('[ML] API unavailable, using local prediction');
        prediction = await this.predictDurationLocal(features);
      }
    }

    this.setCache(cacheKey, prediction);
    return prediction;
  }

  /**
   * Forecast SKU demand
   */
  async forecastDemand(
    skuId: string,
    historicalData: number[],
    forecastHorizonDays: number = 14
  ): Promise<DemandForecast> {
    const cacheKey = `demand:${skuId}:${forecastHorizonDays}:${historicalData.length}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let forecast: DemandForecast;

    if (this.useLocalOnly) {
      forecast = this.forecastDemandLocal(historicalData, forecastHorizonDays);
    } else {
      try {
        forecast = await this.forecastDemandAPI(skuId, historicalData, forecastHorizonDays);
      } catch (error) {
        console.warn('[ML] API unavailable, using local forecast');
        forecast = this.forecastDemandLocal(historicalData, forecastHorizonDays);
      }
    }

    // Add SKU ID to local forecast result
    if (!forecast.sku_id) {
      (forecast as any).sku_id = skuId;
    }

    this.setCache(cacheKey, forecast);
    return forecast;
  }

  /**
   * Optimize pick route
   */
  async optimizeRoute(
    locations: string[],
    startPoint: string = 'A-01-01'
  ): Promise<RouteOptimization> {
    const cacheKey = `route:${locations.join(',')}:${startPoint}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let optimization: RouteOptimization;

    if (this.useLocalOnly) {
      optimization = this.optimizeRouteLocal(locations, startPoint);
    } else {
      try {
        optimization = await this.optimizeRouteAPI(locations, startPoint);
      } catch (error) {
        console.warn('[ML] API unavailable, using local optimization');
        optimization = this.optimizeRouteLocal(locations, startPoint);
      }
    }

    this.setCache(cacheKey, optimization);
    return optimization;
  }

  /**
   * Local duration prediction using heuristic model
   */
  private async predictDurationLocal(features: OrderFeatures): Promise<DurationPrediction> {
    const baseTimePerItem = 3.5; // minutes
    const baseTimePerSku = 2.0; // minutes

    let duration = features.order_item_count * baseTimePerItem;
    duration += features.sku_count * baseTimePerSku;
    duration += features.zone_diversity * 5;

    // Priority adjustment
    const priorityMultiplier: Record<number, number> = {
      1: 0.8,
      2: 0.9,
      3: 1.0,
      4: 1.2,
    };
    duration *= priorityMultiplier[features.priority_level] || 1.0;

    // Time of day
    const isPeakHour =
      (features.hour_of_day >= 9 && features.hour_of_day <= 11) ||
      (features.hour_of_day >= 14 && features.hour_of_day <= 16);
    if (isPeakHour) duration *= 1.25;

    // Day of week
    if (features.day_of_week === 0 || features.day_of_week === 4) duration *= 1.15;
    if (features.day_of_week >= 5) duration *= 0.85;

    duration += 15; // overhead

    return {
      prediction_id: `local-${Date.now()}`,
      model_version: 'heuristic-v1.0',
      prediction: {
        duration_minutes: Math.round(duration),
        duration_hours: Math.round((duration / 60) * 100) / 100,
        breakdown: {
          picking: Math.round(duration * 0.45),
          packing: Math.round(duration * 0.25),
          travel: Math.round(duration * 0.2),
          overhead: Math.round(duration * 0.1),
        },
      },
      confidence: 0.85,
      metadata: {
        model_type: 'duration_prediction',
        predicted_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Local demand forecast
   */
  private forecastDemandLocal(historicalData: number[], forecastDays: number): DemandForecast {
    const forecast: number[] = [];

    if (historicalData.length < 7) {
      const avg = historicalData.reduce((a, b) => a + b, 0) / historicalData.length;
      for (let i = 0; i < forecastDays; i++) {
        forecast.push(Math.round(avg));
      }
    } else {
      const ma7 = this.movingAverage(historicalData, 7);
      const recentTrend =
        (ma7[ma7.length - 1] - ma7[Math.max(0, ma7.length - 7)]) /
        Math.max(1, ma7[Math.max(0, ma7.length - 7)]);

      const seasonalFactors = [1.0, 1.05, 1.02, 1.0, 1.08, 0.7, 0.5];

      for (let i = 0; i < forecastDays; i++) {
        let base = ma7[ma7.length - 1] * (1 + recentTrend * (i + 1));
        const seasonalDay = i % 7;
        base *= seasonalFactors[seasonalDay];
        forecast.push(Math.max(0, Math.round(base)));
      }
    }

    return {
      sku_id: 'local',
      forecast_horizon_days: forecastDays,
      forecasts: forecast.map((value, index) => {
        const date = new Date();
        date.setDate(date.getDate() + index + 1);
        return {
          day: index + 1,
          forecast_date: date.toISOString().split('T')[0],
          forecast_quantity: value,
        };
      }),
    };
  }

  /**
   * Local route optimization
   */
  private optimizeRouteLocal(locations: string[], startPoint: string): RouteOptimization {
    const parsed = locations.map(loc => {
      const parts = loc.split('-').map(Number);
      return { zone: parts[0], aisle: parts[1], shelf: parts[2], original: loc };
    });

    const sorted = [...parsed].sort((a, b) => {
      if (a.zone !== b.zone) return a.zone - b.zone;
      if (a.aisle !== b.aisle) return a.aisle - b.aisle;
      return a.shelf - b.shelf;
    });

    let totalDistance = 0;
    let previous = startPoint;

    for (const loc of sorted) {
      const prevParts = previous.split('-').map(Number);
      const distance =
        Math.abs(loc.zone - prevParts[0]) * 50 +
        Math.abs(loc.aisle - prevParts[1]) * 10 +
        Math.abs(loc.shelf - prevParts[2]) * 1;
      totalDistance += distance;
      previous = loc.original;
    }

    const walkingTime = totalDistance / 1.4;
    const pickTime = sorted.length * 30;
    const estimatedTime = walkingTime + pickTime;

    return {
      locations: locations,
      optimized_path: sorted.map(l => l.original),
      total_distance_meters: Math.round(totalDistance),
      estimated_time_minutes: Math.round(estimatedTime / 60),
    };
  }

  /**
   * API-based prediction
   */
  private async predictDurationAPI(features: OrderFeatures): Promise<DurationPrediction> {
    const response = await fetch(`${this.mlApiUrl}/predict/duration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
    });

    if (!response.ok) {
      throw new Error(`ML API error: ${response.statusText}`);
    }

    return response.json() as Promise<DurationPrediction>;
  }

  /**
   * API-based demand forecast
   */
  private async forecastDemandAPI(
    skuId: string,
    historicalData: number[],
    forecastHorizonDays: number
  ): Promise<DemandForecast> {
    const response = await fetch(`${this.mlApiUrl}/predict/demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku_id: skuId,
        historical_data: historicalData,
        forecast_horizon_days: forecastHorizonDays,
      }),
    });

    if (!response.ok) {
      throw new Error(`ML API error: ${response.statusText}`);
    }

    const result = (await response.json()) as { prediction: DemandForecast };
    return result.prediction;
  }

  /**
   * API-based route optimization
   */
  private async optimizeRouteAPI(
    locations: string[],
    startPoint: string
  ): Promise<RouteOptimization> {
    const response = await fetch(`${this.mlApiUrl}/predict/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations, start_point: startPoint }),
    });

    if (!response.ok) {
      throw new Error(`ML API error: ${response.statusText}`);
    }

    const result = (await response.json()) as { prediction: RouteOptimization };
    return result.prediction;
  }

  /**
   * Calculate moving average
   */
  private movingAverage(data: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = window - 1; i < data.length; i++) {
      const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / window);
    }
    return result;
  }

  /**
   * Cache helpers
   */
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL,
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const mlPredictionService = new MLPredictionService();
