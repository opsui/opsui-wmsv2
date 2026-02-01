/**
 * Order Duration Prediction Component
 * Displays ML-predicted order fulfillment time
 */

import { useState, useEffect } from 'react';
import {
  ClockIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

interface DurationPrediction {
  duration_minutes: number;
  duration_hours: number;
}

interface OrderDurationPredictionProps {
  orderId?: string;
  orderData: {
    item_count: number;
    total_value: number;
    sku_count: number;
    zone_diversity: number;
    priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
    created_at: string;
  };
}

export function OrderDurationPrediction({ orderId, orderData }: OrderDurationPredictionProps) {
  const [prediction, setPrediction] = useState<DurationPrediction | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch prediction when order data changes
  useEffect(() => {
    const fetchPrediction = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const hourOfDay = new Date(orderData.created_at).getHours();
        const dayOfWeek = new Date(orderData.created_at).getDay();
        const isPeakHour = [8, 9, 10, 14, 15, 16].includes(hourOfDay) ? 1 : 0;
        const isWeekend = [0, 6].includes(dayOfWeek) ? 1 : 0;
        const priorityLevel =
          orderData.priority === 'URGENT'
            ? 4
            : orderData.priority === 'HIGH'
              ? 3
              : orderData.priority === 'NORMAL'
                ? 2
                : 1;

        const response = await apiClient.post<{
          prediction: DurationPrediction;
          confidence: number;
        }>('/ml/predict/duration', {
          order_id: orderId,
          order_item_count: orderData.item_count,
          order_total_value: orderData.total_value,
          hour_of_day: hourOfDay,
          day_of_week: dayOfWeek,
          is_peak_hour: isPeakHour,
          is_weekend: isWeekend,
          sku_count: orderData.sku_count,
          avg_sku_popularity: 50, // Would be fetched from API
          max_sku_popularity: 100,
          zone_diversity: orderData.zone_diversity,
          max_distance_zone: 3,
          priority_level: priorityLevel,
          picker_count: 5,
        });

        setPrediction(response.data.prediction);
        setConfidence(response.data.confidence);
      } catch (err) {
        setError('Failed to load prediction');
        console.error('Prediction error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce prediction requests
    const timer = setTimeout(fetchPrediction, 500);
    return () => clearTimeout(timer);
  }, [orderId, orderData]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return null;
  }

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'text-green-600';
    if (conf >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.9) return 'High';
    if (conf >= 0.7) return 'Medium';
    return 'Low';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <ClockIcon className="h-6 w-6 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Predicted Fulfillment Time</h3>
        </div>
        {confidence && (
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">Confidence:</span>
            <span className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
              {getConfidenceLabel(confidence)} ({(confidence * 100).toFixed(1)}%)
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="text-sm text-indigo-600 font-medium mb-1">Estimated Duration</div>
          <div className="text-2xl font-bold text-indigo-900">
            {prediction.duration_minutes.toFixed(0)} min
          </div>
          <div className="text-sm text-indigo-600 mt-1">
            ({prediction.duration_hours.toFixed(2)} hours)
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium mb-1">Expected Completion</div>
          <div className="text-2xl font-bold text-green-900">
            {new Date(Date.now() + prediction.duration_minutes * 60000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div className="text-sm text-green-600 mt-1">
            {new Date(Date.now() + prediction.duration_minutes * 60000).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      {confidence && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Model Confidence</span>
            <span>{(confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                confidence >= 0.9
                  ? 'bg-green-500'
                  : confidence >= 0.7
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${confidence * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Additional insights */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-600">
          <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
          <span>Based on ML model v1.0.0 (XGBoost)</span>
        </div>
      </div>
    </div>
  );
}
