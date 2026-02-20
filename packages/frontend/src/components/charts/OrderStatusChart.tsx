/**
 * Order Status Chart Component
 *
 * Donut chart showing breakdown of orders by status
 *
 * Design: Data visualization with distinctive styling
 * - Animated donut segments
 * - Glowing color indicators
 * - Elegant card with decorative accents
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
  PACKING: '#a855f7', // blue-500
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
      className="
        card-hover 
        shadow-xl 
        dark:shadow-blue-500/5 
        shadow-gray-200/50 
        overflow-hidden
        relative
        dashboard-stagger-3
      "
    >
      {/* Decorative corner accents */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-cyan-500/10 via-pink-500/5 to-transparent rounded-bl-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-tr-full pointer-events-none" />

      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 via-violet-500/15 to-pink-500/10 border border-cyan-400/20">
            <svg
              className="w-5 h-5 text-cyan-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
              <span className="hero-title-gradient">Order Status</span>
              <span className="dark:text-white text-gray-900"> Breakdown</span>
            </CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">
              Distribution across fulfillment stages
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-6 relative">
        {/* Total orders display */}
        <div className="text-center mb-4 pb-4 border-b border-gray-200/50 dark:border-white/5">
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total Orders
          </span>
          <div className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white font-['JetBrains_Mono',monospace]">
            {total.toLocaleString()}
          </div>
        </div>

        <div ref={containerRef} className="relative w-full flex justify-center">
          {/* Atmospheric glow effect behind the chart */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-56 h-56 rounded-full bg-gradient-to-br from-cyan-500/8 via-violet-500/8 to-pink-500/5 blur-3xl animate-pulse"
              style={{ animationDuration: '5s' }}
            />
          </div>

          {containerWidth > 0 && (
            <ResponsiveContainer width={containerWidth} height={260}>
              <PieChart>
                {/* Gradient definitions for donut segments */}
                <defs>
                  {chartData.map((entry, index) => (
                    <linearGradient
                      key={`gradient-${index}`}
                      id={`donutGradient-${index}`}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                      <stop offset="100%" stopColor={entry.color} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                  {/* Center glow */}
                  <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(168, 85, 247, 0.1)" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                </defs>

                {/* Background circle for depth */}
                <circle cx="50%" cy="50%" r="90" fill="url(#centerGlow)" />

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
                  paddingAngle={4}
                  cornerRadius={4}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#donutGradient-${index})`}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth={2}
                      style={{
                        filter: `drop-shadow(0 4px 12px ${entry.color}40)`,
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.96)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '13px',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05)',
                    padding: '12px 16px',
                  }}
                  itemStyle={{ color: '#fff', padding: '4px 0' }}
                  formatter={(value: any, name?: string) => [
                    <span key="value">
                      <span className="font-bold font-['JetBrains_Mono',monospace]">{value}</span>
                      <span className="text-gray-400 ml-1">
                        ({(((value || 0) / total) * 100).toFixed(1)}%)
                      </span>
                    </span>,
                    name || '',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Summary stats - mobile: list layout, desktop: grid layout */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {chartData.map((item, index) => {
            const percentage = ((item.count / total) * 100).toFixed(1);
            return (
              <div
                key={item.status}
                className="
                  group
                  flex flex-col
                  p-3 rounded-xl 
                  dark:bg-white/[0.03] bg-gray-50/80
                  dark:border dark:border-white/[0.06] border border-gray-200/60
                  transition-all duration-300 
                  hover:scale-[1.02] hover:-translate-y-0.5
                  hover:shadow-lg
                  cursor-default 
                  min-w-0
                  relative
                  overflow-hidden
                "
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Hover glow effect */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${item.color}15 0%, transparent 70%)`,
                  }}
                />

                <div className="flex items-center gap-2 mb-1.5 relative">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform duration-300 group-hover:scale-125"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 10px ${item.color}70`,
                    }}
                  />
                  <span className="dark:text-gray-300 text-gray-700 text-xs font-medium truncate">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 relative">
                  <span className="dark:text-white text-gray-900 font-bold text-lg font-['JetBrains_Mono',monospace]">
                    {item.count}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
