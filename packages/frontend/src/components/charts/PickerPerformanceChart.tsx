/**
 * Picker Performance Chart Component
 *
 * Bar chart showing picker performance metrics
 */

import { Card, CardHeader, CardTitle, CardContent, Skeleton } from '@/components/shared';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useContainerWidth } from '@/hooks/useContainerWidth';

interface PickerPerformanceData {
  pickerId: string;
  pickerName: string;
  tasksCompleted: number;
  ordersCompleted: number;
  totalItemsPicked: number;
  averageTimePerTask: number;
}

interface PickerPerformanceChartProps {
  data?: PickerPerformanceData[];
  isLoading?: boolean;
}

const COLORS = {
  tasksCompleted: '#3b82f6', // blue-500
  ordersCompleted: '#10b981', // green-500
  itemsPicked: '#8b5cf6', // purple-500
};

export function PickerPerformanceChart({ data, isLoading }: PickerPerformanceChartProps) {
  const [containerRef, containerWidth] = useContainerWidth<HTMLDivElement>();
  const isMobile = containerWidth < 500;
  const isSmall = containerWidth < 400;

  // Show skeleton while loading
  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Picker Performance (7 days)</CardTitle>
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
          <CardTitle>Picker Performance (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center dark:text-gray-400 text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart - shorten names more aggressively on mobile
  const maxNameLength = isSmall ? 8 : isMobile ? 10 : 12;
  const chartData = data.map(item => ({
    ...item,
    displayName:
      item.pickerName.length > maxNameLength
        ? item.pickerName.substring(0, maxNameLength - 2) + '...'
        : item.pickerName,
    // Convert average time from seconds to minutes for display
    avgTimeMinutes: item.averageTimePerTask ? (item.averageTimePerTask / 60).toFixed(1) : 0,
  }));

  // Adjust chart margins for rotated labels on mobile
  const chartMargin = isMobile
    ? { top: 20, right: 15, left: 15, bottom: 60 }
    : { top: 20, right: 30, left: 20, bottom: 5 };

  // Calculate minimum bar size based on number of pickers and container width
  const minBarGap = 4;
  const barCategoryGap = isMobile ? '20%' : '30%';

  return (
    <Card variant="glass" className="card-hover">
      <CardHeader className="!flex-row !items-center !justify-center !space-y-0">
        <CardTitle>Picker Performance (7 days)</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="flex justify-center" ref={containerRef}>
          {containerWidth > 0 && (
            <ResponsiveContainer
            width={containerWidth}
            height={isMobile ? 320 : 300}
          >
            <BarChart
              data={chartData}
              margin={chartMargin}
              barCategoryGap={barCategoryGap}
              barGap={minBarGap}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="dark:stroke-white/[0.08] stroke-gray-200"
              />
              <XAxis
                dataKey="displayName"
                className="dark:fill-gray-500 fill-gray-600"
                tick={{
                  fontSize: isMobile ? 10 : 12,
                  angle: isMobile ? -45 : 0,
                  textAnchor: isMobile ? 'end' : 'middle',
                }}
                interval={0}
                height={isMobile ? 70 : 50}
              />
              <YAxis
                yAxisId="left"
                className="dark:fill-gray-500 fill-gray-600"
                tick={{ fontSize: isMobile ? 10 : 11 }}
                width={isMobile ? 35 : 45}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                className="dark:fill-gray-500 fill-gray-600"
                tick={{ fontSize: isMobile ? 10 : 11 }}
                width={isMobile ? 35 : 45}
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
                itemStyle={{ color: '#fff' }}
                formatter={(value: any, name?: string) => {
                  if (name === 'Avg Time (min)') return [`${value} min`, name];
                  return [value || 0, name || ''];
                }}
                labelFormatter={label => {
                  const item = chartData.find(d => d.displayName === label);
                  return item?.pickerName || label;
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: isMobile ? '11px' : '13px',
                  paddingTop: isMobile ? '4px' : '8px',
                }}
                formatter={value => (
                  <span className="dark:text-gray-300 text-gray-700 font-medium">{value}</span>
                )}
              />
              <Bar
                yAxisId="left"
                dataKey="tasksCompleted"
                fill={COLORS.tasksCompleted}
                name="Tasks Completed"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="ordersCompleted"
                fill={COLORS.ordersCompleted}
                name="Orders Completed"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="totalItemsPicked"
                fill={COLORS.itemsPicked}
                name="Items Picked"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Performance summary table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="dark:text-gray-400 text-gray-600 border-b dark:border-white/[0.05] border-gray-200">
                <th className="text-left py-2 px-2">Picker</th>
                <th className="text-right py-2 px-2">Tasks</th>
                <th className="text-right py-2 px-2">Orders</th>
                <th className="text-right py-2 px-2">Items</th>
                <th className="text-right py-2 px-2">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {chartData.slice(0, 5).map(item => (
                <tr
                  key={item.pickerId}
                  className="dark:text-gray-300 text-gray-700 border-b dark:border-white/[0.02] border-gray-100 hover:dark:bg-white/[0.02] hover:bg-gray-50"
                >
                  <td className="py-2 px-2 font-medium">{item.pickerName}</td>
                  <td className="text-right py-2 px-2">{item.tasksCompleted}</td>
                  <td className="text-right py-2 px-2">{item.ordersCompleted}</td>
                  <td className="text-right py-2 px-2">{item.totalItemsPicked}</td>
                  <td className="text-right py-2 px-2">{item.avgTimeMinutes}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
