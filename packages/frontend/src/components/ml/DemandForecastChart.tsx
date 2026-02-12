/**
 * Demand Forecast Chart Component
 * Displays ML-predicted demand forecasts for SKUs
 */

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ArrowTrendingUpIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

interface ForecastDataPoint {
  day: number;
  forecast_date: string;
  forecast_quantity: number;
}

interface ForecastResponse {
  prediction_id: string;
  model_version: string;
  prediction: {
    sku_id: string;
    forecast_horizon_days: number;
    forecasts: ForecastDataPoint[];
  };
  confidence: number;
  metadata: {
    model_type: string;
    predicted_at: string;
    historical_days: number;
  };
}

interface DemandForecastChartProps {
  skuId: string;
  forecastHorizonDays?: number;
}

export function DemandForecastChart({ skuId, forecastHorizonDays = 14 }: DemandForecastChartProps) {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForecast = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post<ForecastResponse>('/ml/predict/demand', {
          sku_id: skuId,
          forecast_horizon_days: forecastHorizonDays,
        });

        setForecast(response.data);
      } catch (err) {
        setError('Failed to load demand forecast');
        console.error('Forecast error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForecast();
  }, [skuId, forecastHorizonDays]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!forecast) {
    return null;
  }

  const chartData = forecast.prediction.forecasts.map(point => ({
    date: new Date(point.forecast_date).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    }),
    quantity: Math.round(point.forecast_quantity),
  }));

  const totalForecast = chartData.reduce((sum, point) => sum + point.quantity, 0);
  const avgForecast = totalForecast / chartData.length;
  const maxForecast = Math.max(...chartData.map(p => p.quantity));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <ArrowTrendingUpIcon className="h-6 w-6 text-indigo-600 mr-2" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Demand Forecast</h3>
            <p className="text-sm text-gray-500">SKU: {forecast.prediction.sku_id}</p>
          </div>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <CalendarIcon className="h-4 w-4 mr-1" />
          <span>{forecastHorizonDays}-day forecast</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium mb-1">Total Forecast</div>
          <div className="text-2xl font-bold text-blue-900">{Math.round(totalForecast)}</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium mb-1">Daily Average</div>
          <div className="text-2xl font-bold text-green-900">{Math.round(avgForecast)}</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium mb-1">Peak Demand</div>
          <div className="text-2xl font-bold text-purple-900">{Math.round(maxForecast)}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex justify-center">
        <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6B7280" />
          <YAxis
            label={{ value: 'Quantity', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
            stroke="#6B7280"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="quantity"
            stroke="#6366F1"
            strokeWidth={2}
            dot={{ fill: '#6366F1', r: 4 }}
            activeDot={{ r: 6 }}
            name="Forecasted Demand"
          />
        </LineChart>
      </ResponsiveContainer>
      </div>

      {/* Metadata */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            Model: {forecast.metadata.model_type.toUpperCase()} v{forecast.model_version}
          </span>
          <span>Confidence: {(forecast.confidence * 100).toFixed(1)}%</span>
          <span>Historical data: {forecast.metadata.historical_days} days</span>
        </div>
      </div>
    </div>
  );
}
