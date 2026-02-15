/**
 * Order Status Chart Component
 *
 * Donut chart showing breakdown of orders by status
 */

import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/shared';
import { useContainerWidth } from '@/hooks/useContainerWidth';
import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

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
  PENDING: '#06b6d4', // cyan-500
  PICKING: '#f59e0b', // amber-500
  PICKED: '#10b981', // emerald-500
  PACKING: '#3b82f6', // blue-500
  PACKED: '#8b5cf6', // violet-500
  SHIPPED: '#ec4899', // pink-500
  CANCELLED: '#ef4444', // red-500
  ON_HOLD: '#f97316', // orange-500
  BACKORDERED: '#14b8a6', // teal-500
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
  BACKORDERED: 'Backordered',
};

export function OrderStatusChart({ data, isLoading, error }: OrderStatusChartProps) {
  const [containerRef, containerWidth] = useContainerWidth<HTMLDivElement>();

  // Memoize chart data to prevent re-renders
  const { chartData, total } = useMemo(() => {
    const allStatuses = [
      'PENDING',
      'PICKING',
      'PICKED',
      'PACKING',
      'PACKED',
      'SHIPPED',
      'CANCELLED',
      'ON_HOLD',
      'BACKORDERED',
    ];

    const dataMap = new Map<string, number>();
    if (data) {
      data.forEach(item => {
        dataMap.set(item.status, item.count);
      });
    }

    const chartData = allStatuses
      .map(status => ({
        status,
        count: dataMap.get(status) || 0,
        name: STATUS_LABELS[status] || status,
        color: STATUS_COLORS[status] || '#6b7280',
      }))
      .filter(item => item.count > 0);

    const total = chartData.reduce((sum, item) => sum + item.count, 0);

    return { chartData, total };
  }, [data]);

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
    <Card
      variant="glass"
      className="card-hover shadow-xl dark:shadow-blue-500/5 shadow-gray-200/50 overflow-hidden"
    >
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Order Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div ref={containerRef} className="relative w-full flex justify-center">
          {/* Subtle glow effect behind the chart */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-2xl" />
          </div>
          {containerWidth > 0 && (
            <ResponsiveContainer width={containerWidth} height={280}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={90}
                innerRadius={55}
                dataKey="count"
                isAnimationActive={false}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={2}
                    style={{
                      filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))',
                    }}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '13px',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
                }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: any, name?: string) => [
                  `${value || 0} (${(((value || 0) / total) * 100).toFixed(1)}%)`,
                  name || '',
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Summary stats - responsive grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {chartData.map(item => {
            const percentage = ((item.count / total) * 100).toFixed(1);
            return (
              <div
                key={item.status}
                className="flex items-center justify-between p-3 rounded-lg dark:bg-white/[0.04] bg-gray-50 dark:border dark:border-white/[0.06] border-gray-200 shadow-sm dark:shadow-none transition-all duration-200 hover:scale-[1.02] cursor-default"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 8px ${item.color}60`,
                    }}
                  />
                  <span className="dark:text-gray-300 text-gray-700 text-xs font-medium whitespace-nowrap">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="dark:text-white text-gray-900 font-bold text-xs">
                    {item.count}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-[10px]">
                    ({percentage}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
