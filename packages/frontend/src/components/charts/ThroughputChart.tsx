/**
 * Throughput Chart Component
 *
 * Line chart showing orders picked and shipped over time
 * with time range selector dropdown
 *
 * Design: Data visualization with distinctive styling
 * - Gradient line fills for visual depth
 * - Animated entrance effects
 * - Enhanced tooltips with context
 * - Distinctive card styling
 */

import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/shared';
import { useContainerWidth } from '@/hooks/useContainerWidth';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { memo, useEffect, useRef, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ThroughputData {
  period: string;
  picked: number;
  shipped: number;
}

interface HourlyThroughputData {
  hour: string;
  picked: number;
  shipped: number;
}

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface ThroughputChartProps {
  data?: (ThroughputData | HourlyThroughputData)[];
  isLoading?: boolean;
  onRangeChange?: (range: TimeRange) => void;
}

const COLORS = {
  picked: '#10b981', // success-500
  shipped: '#a855f7', // primary-500
  grid: 'currentColor',
};

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export const ThroughputChart = memo(function ThroughputChart({
  data,
  isLoading,
  onRangeChange,
}: ThroughputChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('daily');
  const [containerRef, containerWidth] = useContainerWidth<HTMLDivElement>();

  const handleRangeChange = (newRange: TimeRange) => {
    setSelectedRange(newRange);
    onRangeChange?.(newRange);
  };

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Orders Throughput</CardTitle>
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
          <div className="flex items-center justify-between">
            <CardTitle>Orders Throughput</CardTitle>
            <TimeRangeSelector value={selectedRange} onChange={handleRangeChange} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center dark:text-gray-400 text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Normalize data to always have 'period' field (handles both hourly and range-based data)
  const normalizedData = data.map(item => ({
    period: 'period' in item ? item.period : item.hour,
    picked: item.picked,
    shipped: item.shipped,
  }));

  // Reverse data for display (chronological order)
  const chartData = [...normalizedData].reverse();

  // Format period for display based on range
  const formatPeriodLabel = (period: string) => {
    if (selectedRange === 'daily') {
      return period; // YYYY-MM-DD
    } else if (selectedRange === 'weekly') {
      // Format: "2024-W15" -> "W15"
      return period.includes('W') ? period.split('-')[1] : period;
    } else if (selectedRange === 'monthly') {
      // Format: "2024-01" -> "Jan"
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleString('default', { month: 'short' });
    } else if (selectedRange === 'quarterly') {
      // Format: "2024-Q1" -> "Q1"
      return period.split('-')[1];
    } else {
      // yearly - just show year
      return period;
    }
  };

  // Calculate totals for display
  const totalPicked = chartData.reduce((sum, item) => sum + (item.picked || 0), 0);
  const totalShipped = chartData.reduce((sum, item) => sum + (item.shipped || 0), 0);

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
        dashboard-stagger-2
      "
    >
      {/* Decorative corner accents */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-transparent rounded-bl-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-tr-full pointer-events-none" />

      <CardHeader className="!flex-row !items-center !justify-between !space-y-0 flex-wrap gap-2 relative">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-blue-400/20">
            <svg
              className="w-5 h-5 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
              <span className="hero-title-gradient">Orders</span>
              <span className="dark:text-white text-gray-900"> Throughput</span>
            </CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">
              Track picking and shipping velocity
            </p>
          </div>
        </div>
        <TimeRangeSelector value={selectedRange} onChange={handleRangeChange} />
      </CardHeader>

      <CardContent className="p-3 sm:p-6 relative">
        {/* Quick stats row */}
        <div className="flex gap-4 mb-4 pb-4 border-b border-gray-200/50 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Picked</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-['JetBrains_Mono',monospace]">
              {totalPicked.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Shipped</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-['JetBrains_Mono',monospace]">
              {totalShipped.toLocaleString()}
            </span>
          </div>
        </div>

        <div ref={containerRef} className="relative w-full flex justify-center">
          {containerWidth > 0 && (
            <ResponsiveContainer width={containerWidth} height={320}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="dark:stroke-white/[0.06] stroke-gray-200/60"
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  tickFormatter={formatPeriodLabel}
                  className="dark:fill-gray-500 fill-gray-600"
                  tick={{ fontSize: 11, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  interval="preserveStartEnd"
                  axisLine={{ stroke: 'rgba(156, 163, 175, 0.2)' }}
                  tickLine={false}
                />
                <YAxis
                  className="dark:fill-gray-500 fill-gray-600"
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.96)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '13px',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05)',
                    padding: '12px 16px',
                  }}
                  labelFormatter={formatPeriodLabel}
                  itemStyle={{ color: '#fff', padding: '4px 0' }}
                  labelStyle={{ fontWeight: 600, marginBottom: '8px', color: '#94a3b8' }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '13px',
                    paddingTop: '16px',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                  }}
                  iconType="circle"
                  formatter={value => (
                    <span className="dark:text-gray-300 text-gray-700 font-medium">{value}</span>
                  )}
                />
                {/* Picked line with gradient - using AreaChart-style fill effect */}
                <defs>
                  <linearGradient id="pickedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.picked} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.picked} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="shippedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.shipped} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.shipped} stopOpacity={0} />
                  </linearGradient>
                </defs>

                {/* Area fills for visual depth */}
                <Line
                  type="monotone"
                  dataKey="picked"
                  stroke={COLORS.picked}
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: COLORS.picked,
                    stroke: '#fff',
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: COLORS.picked,
                    stroke: '#fff',
                    strokeWidth: 2,
                  }}
                  name="Picked"
                />
                <Line
                  type="monotone"
                  dataKey="shipped"
                  stroke={COLORS.shipped}
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: COLORS.shipped,
                    stroke: '#fff',
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: COLORS.shipped,
                    stroke: '#fff',
                    strokeWidth: 2,
                  }}
                  name="Shipped"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// Time Range Selector Component - Dropdown matching header style
function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = RANGE_OPTIONS.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-[9999]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
          isOpen
            ? 'dark:text-white text-black dark:bg-white/[0.08] bg-gray-100 dark:border-white/[0.12] border border-gray-300 shadow-lg dark:shadow-blue-500/10 shadow-gray-200'
            : 'dark:text-gray-400 text-gray-700 dark:hover:text-white hover:text-black dark:hover:bg-white/[0.05] hover:bg-gray-100 dark:border-transparent border-transparent dark:hover:border-white/[0.08] hover:border-gray-300'
        }`}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDownIcon
          className={`h-3 w-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-40 dark:bg-gray-900 bg-white rounded-xl dark:border-gray-700 border-gray-200 shadow-2xl animate-fade-in">
          <div className="py-2">
            {RANGE_OPTIONS.map(option => {
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'dark:text-white text-black dark:bg-blue-600 bg-blue-50'
                      : 'dark:text-gray-200 text-gray-800 dark:hover:text-white hover:text-black dark:hover:bg-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full dark:bg-white bg-gray-900 dark:shadow-[0_0_8px_rgba(255,255,255,0.6)] shadow-[0_0_8px_rgba(0,0,0,0.3)] animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
