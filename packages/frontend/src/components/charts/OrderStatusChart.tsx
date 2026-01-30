/**
 * Order Status Chart Component
 *
 * Donut chart showing breakdown of orders by status
 */

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Skeleton } from '@/components/shared';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface OrderStatusData {
  status: string;
  count: number;
}

interface OrderStatusChartProps {
  data?: OrderStatusData[];
  isLoading?: boolean;
  error?: unknown;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#06b6d4',      // cyan-500 (info)
  PICKING: '#f59e0b',     // amber-500 (warning)
  PICKED: '#10b981',      // emerald-500 (success)
  PACKING: '#3b82f6',     // blue-500 (info)
  PACKED: '#06b6d4',      // cyan-500 (info)
  SHIPPED: '#10b981',     // emerald-500 (success)
  CANCELLED: '#ef4444',   // red-500 (error)
  ON_HOLD: '#8b5cf6',     // violet-500 (warning/info)
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PICKING: 'Picking',
  PICKED: 'Picked',
  PACKING: 'Packing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  CANCELLED: 'Cancelled',
  ON_HOLD: 'On Hold',
};

export function OrderStatusChart({ data, isLoading, error }: OrderStatusChartProps) {
  // Memoize chart data to prevent re-renders
  const { chartData, total } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], total: 0 };
    }

    const total = data.reduce((sum, item) => sum + item.count, 0);
    const chartData = data.map((item) => ({
      ...item,
      name: STATUS_LABELS[item.status] || item.status,
      color: STATUS_COLORS[item.status] || '#6b7280',
    }));

    return { chartData, total };
  }, [data]);

  // Memoize label renderer to prevent re-renders
  const renderLabel = useMemo(() => {
    return ({ name, percent }: { name?: string; percent?: number }) => {
      const percentValue = percent ? (percent * 100).toFixed(0) : '0';
      // Only show label if slice is large enough (>5%)
      if (Number(percentValue) > 5) {
        return `${name}: ${percentValue}%`;
      }
      return '';
    };
  }, []);

  if (error) {
    return (
      <Card variant="glass" className="card-hover">
        <CardHeader>
          <CardTitle>Order Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center dark:text-gray-400 text-gray-500">
            Error loading data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Order Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton variant="rectangular" className="w-full h-64 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card variant="glass" className="card-hover">
        <CardHeader>
          <CardTitle>Order Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center dark:text-gray-400 text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card variant="glass" className="card-hover">
        <CardHeader>
          <CardTitle>Order Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center dark:text-gray-400 text-gray-500">
            No orders in system
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="card-hover">
      <CardHeader>
        <CardTitle>Order Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={100}
              innerRadius={60}
              dataKey="count"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '13px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: any, name?: string) => [
                `${value || 0} (${(((value || 0) / total) * 100).toFixed(1)}%)`,
                name || '',
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {chartData.slice(0, 6).map((item) => (
            <div
              key={item.status}
              className="flex items-center justify-between p-2.5 rounded-lg dark:bg-white/[0.03] bg-gray-50 dark:border dark:border-white/[0.05] border-gray-100"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{
                    backgroundColor: item.color,
                    boxShadow: `0 0 8px ${item.color}40`
                  }}
                />
                <span className="dark:text-gray-400 text-gray-600 text-sm font-medium">
                  {item.name}
                </span>
              </div>
              <span className="dark:text-white text-gray-900 font-semibold text-sm">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
