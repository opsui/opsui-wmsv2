/**
 * Throughput Chart Component
 *
 * Line chart showing orders picked and shipped over time
 * with time range selector dropdown
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Skeleton } from '@/components/shared';
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
import { ChevronDownIcon } from '@heroicons/react/24/outline';

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
  shipped: '#3b82f6', // primary-500
  grid: 'currentColor',
};

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function ThroughputChart({ data, isLoading, onRangeChange }: ThroughputChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('daily');

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

  return (
    <Card
      variant="glass"
      className="card-hover shadow-xl dark:shadow-blue-500/5 shadow-gray-200/50 overflow-hidden"
    >
      <CardHeader className="!flex-row !items-center !justify-between !space-y-0 flex-wrap gap-2">
        <CardTitle className="text-base sm:text-lg">Orders Throughput</CardTitle>
        <TimeRangeSelector value={selectedRange} onChange={handleRangeChange} />
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="relative w-full">
          {/* Subtle glow effect behind the chart */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-48 rounded-full bg-gradient-to-br from-emerald-500/10 to-blue-500/10 blur-2xl" />
          </div>
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="dark:stroke-white/[0.08] stroke-gray-200"
              />
              <XAxis
                dataKey="period"
                tickFormatter={formatPeriodLabel}
                className="dark:fill-gray-500 fill-gray-600"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis className="dark:fill-gray-500 fill-gray-600" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '13px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                }}
                labelFormatter={formatPeriodLabel}
                itemStyle={{ color: '#fff' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }}
                formatter={value => (
                  <span className="dark:text-gray-300 text-gray-700 font-medium">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="picked"
                stroke={COLORS.picked}
                strokeWidth={2.5}
                dot={{ r: 4, fill: COLORS.picked, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: COLORS.picked, strokeWidth: 0 }}
                name="Picked"
              />
              <Line
                type="monotone"
                dataKey="shipped"
                stroke={COLORS.shipped}
                strokeWidth={2.5}
                dot={{ r: 4, fill: COLORS.shipped, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: COLORS.shipped, strokeWidth: 0 }}
                name="Shipped"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

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
