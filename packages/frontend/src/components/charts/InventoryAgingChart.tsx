/**
 * Inventory Aging Chart Component
 *
 * Bar chart showing inventory items grouped by aging buckets
 * Helps identify old/obsolete stock that needs attention
 */

import { Card, CardHeader, CardTitle, CardContent, Skeleton } from '@/components/shared';
import { useContainerWidth } from '@/hooks/useContainerWidth';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface AgingBucket {
  range: string;
  itemCount: number;
  totalQuantity: number;
}

interface InventoryAgingChartProps {
  data?: AgingBucket[];
  isLoading?: boolean;
}

const AGING_COLORS: Record<string, string> = {
  '0-30 days': '#10b981', // success - fresh
  '31-60 days': '#3b82f6', // primary - normal
  '61-90 days': '#f59e0b', // warning - aging
  '91-180 days': '#f97316', // orange - old
  '180+ days': '#ef4444', // error - obsolete
};

const AGING_COLOR_ORDER = ['0-30 days', '31-60 days', '61-90 days', '91-180 days', '180+ days'];

export function InventoryAgingChart({ data, isLoading }: InventoryAgingChartProps) {
  const [containerRef, containerWidth] = useContainerWidth<HTMLDivElement>();

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Inventory Aging</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton variant="rectangular" className="w-full h-64 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Inventory Aging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center dark:text-gray-400 text-gray-500">
            No aging data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ensure data is in the correct order
  const chartData = AGING_COLOR_ORDER.map(range => data.find(d => d.range === range)).filter(
    Boolean
  ) as AgingBucket[];

  return (
    <Card
      variant="glass"
      className="card-hover shadow-xl dark:shadow-blue-500/5 shadow-gray-200/50"
    >
      <CardHeader>
        <CardTitle>Inventory Aging</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative flex justify-center" ref={containerRef}>
          {/* Subtle glow effect behind the chart */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-48 rounded-full bg-gradient-to-br from-emerald-500/10 to-amber-500/10 blur-2xl" />
          </div>
          <ResponsiveContainer width={containerWidth > 0 ? containerWidth : '100%'} height={280}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                className="dark:stroke-white/[0.08] stroke-gray-200"
              />
              <XAxis
                type="number"
                className="dark:fill-gray-500 fill-gray-600"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="range"
                className="dark:fill-gray-500 fill-gray-600"
                tick={{ fontSize: 11 }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '13px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                }}
                formatter={(value: number | undefined, name: string | undefined) => [
                  name === 'itemCount' ? `${value ?? 0} items` : `${value ?? 0} units`,
                ]}
                itemStyle={{ color: '#fff' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }}
                formatter={value => (
                  <span className="dark:text-gray-300 text-gray-700 font-medium">{value}</span>
                )}
              />
              <Bar dataKey="itemCount" name="Items" radius={[0, 8, 8, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={AGING_COLORS[entry.range] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary below chart */}
        <div className="mt-4 grid grid-cols-5 gap-2 text-center">
          {chartData.map(bucket => (
            <div
              key={bucket.range}
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${AGING_COLORS[bucket.range]}20` }}
            >
              <div className="text-xs text-gray-400 mb-1">{bucket.range}</div>
              <div className="text-lg font-bold" style={{ color: AGING_COLORS[bucket.range] }}>
                {bucket.itemCount}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
