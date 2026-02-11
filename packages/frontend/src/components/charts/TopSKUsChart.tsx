/**
 * Top SKUs Chart Component
 *
 * Horizontal bar chart showing most frequently scanned SKUs
 * with dropdown selector for scan type
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Skeleton } from '@/components/shared';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface TopSKUData {
  sku: string;
  name: string;
  picks: number;
  scans?: number;
  packVerifies?: number;
}

type ScanType = 'pick' | 'pack' | 'verify' | 'all';
type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface TopSKUsChartProps {
  data?: TopSKUData[];
  isLoading?: boolean;
  limit?: number;
  onScanTypeChange?: (type: ScanType) => void;
  onTimePeriodChange?: (period: TimePeriod) => void;
}

const SCAN_TYPE_OPTIONS: { value: ScanType; label: string }[] = [
  { value: 'pick', label: 'Pick Frequency' },
  { value: 'pack', label: 'Pack Verify' },
  { value: 'verify', label: 'Verify Scans' },
  { value: 'all', label: 'All Scans' },
];

const TIME_PERIOD_OPTIONS: { value: TimePeriod; label: string; days: number }[] = [
  { value: 'daily', label: 'Daily', days: 1 },
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'yearly', label: 'Yearly', days: 365 },
];

// Color palette for bars
const BAR_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#8b5cf6', // purple-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
];

export function TopSKUsChart({
  data,
  isLoading,
  limit = 10,
  onScanTypeChange,
  onTimePeriodChange,
}: TopSKUsChartProps) {
  const [selectedScanType, setSelectedScanType] = useState<ScanType>('pick');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>('monthly');

  const handleScanTypeChange = (type: ScanType) => {
    setSelectedScanType(type);
    onScanTypeChange?.(type);
  };

  const handleTimePeriodChange = (period: TimePeriod) => {
    setSelectedTimePeriod(period);
    onTimePeriodChange?.(period);
  };

  const selectedPeriodOption = TIME_PERIOD_OPTIONS.find(opt => opt.value === selectedTimePeriod);
  const periodLabel = selectedPeriodOption?.label ?? '30 days';

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader className="!flex-row !items-center !justify-between !space-y-0 flex-wrap gap-2">
          <CardTitle>
            Top {limit} SKUs by Scan Frequency ({periodLabel})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" width={100} height={32} />
            <Skeleton variant="rounded" width={120} height={32} />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton variant="rectangular" className="w-full h-80 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card variant="glass">
        <CardHeader className="!flex-row !items-center !justify-between !space-y-0 flex-wrap gap-2">
          <CardTitle>
            Top {limit} SKUs by Scan Frequency ({periodLabel})
          </CardTitle>
          <div className="flex items-center gap-2">
            <TimePeriodSelector value={selectedTimePeriod} onChange={handleTimePeriodChange} />
            <ScanTypeSelector value={selectedScanType} onChange={handleScanTypeChange} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center dark:text-gray-400 text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get the data key based on selected scan type
  const getDataKey = () => {
    switch (selectedScanType) {
      case 'pack':
        return 'packVerifies';
      case 'verify':
        return 'scans';
      case 'all':
        return 'scans';
      default:
        return 'picks';
    }
  };

  const dataKey = getDataKey();

  // Format data for chart - combine SKU and name for display
  const chartData = data.slice(0, limit).map((item, index) => ({
    ...item,
    displayName: `${item.sku} - ${item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name}`,
    color: BAR_COLORS[index % BAR_COLORS.length],
    value: (item[dataKey as keyof TopSKUData] as number) || item.picks,
  }));

  // Find max value for X axis scaling
  const maxValue = Math.max(...chartData.map(d => d.value || 0));

  const getLabel = () => {
    switch (selectedScanType) {
      case 'pack':
        return 'Pack Verifies';
      case 'verify':
        return 'Verify Scans';
      case 'all':
        return 'Total Scans';
      default:
        return 'Picks';
    }
  };

  const valueLabel = getLabel();

  return (
    <Card
      variant="glass"
      className="card-hover shadow-xl dark:shadow-blue-500/5 shadow-gray-200/50"
    >
      <CardHeader className="!flex-row !items-center !justify-between !space-y-0 flex-wrap gap-2">
        <CardTitle>
          Top {limit} SKUs by Scan Frequency ({periodLabel})
        </CardTitle>
        <div className="flex items-center gap-2">
          <TimePeriodSelector value={selectedTimePeriod} onChange={handleTimePeriodChange} />
          <ScanTypeSelector value={selectedScanType} onChange={handleScanTypeChange} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Subtle glow effect behind the chart */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-48 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-2xl" />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="dark:stroke-white/[0.08] stroke-gray-200"
              />
              <XAxis
                type="number"
                className="dark:fill-gray-500 fill-gray-600"
                tick={{ fontSize: 11 }}
                domain={[0, Math.ceil(maxValue * 1.1)]}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                className="dark:fill-gray-500 fill-gray-600"
                tick={{ fontSize: 10 }}
                width={200}
                tickLine={false}
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
                formatter={(value: any) => [`${value || 0}`, valueLabel]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} background={{ fill: 'transparent' }}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary stats */}
        <div className="mt-4 flex items-center justify-between p-3 rounded-xl dark:bg-white/[0.03] bg-gray-50/80 dark:border dark:border-white/[0.06] border-gray-200 shadow-sm dark:shadow-none">
          <div className="dark:text-gray-400 text-gray-600 text-sm">
            <span className="dark:text-gray-200 text-gray-900 font-semibold">
              {chartData[0]?.value || 0}
            </span>{' '}
            {valueLabel.toLowerCase()} for top SKU
            {chartData[0] && (
              <span className="ml-2 dark:text-gray-500 text-gray-500">({chartData[0].sku})</span>
            )}
          </div>
          <div className="dark:text-gray-400 text-gray-600 text-sm">
            Total:{' '}
            <span className="dark:text-gray-200 text-gray-900 font-semibold">
              {chartData.reduce((sum, item) => sum + (item.value || 0), 0)}
            </span>{' '}
            {valueLabel.toLowerCase()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Scan Type Selector Component - Dropdown matching header style
function ScanTypeSelector({
  value,
  onChange,
}: {
  value: ScanType;
  onChange: (type: ScanType) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = SCAN_TYPE_OPTIONS.find(opt => opt.value === value);

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
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
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
        <div className="absolute top-full right-0 mt-2 w-44 dark:bg-gray-900 bg-white rounded-xl dark:border-gray-700 border-gray-200 shadow-2xl animate-fade-in">
          <div className="py-2">
            {SCAN_TYPE_OPTIONS.map(option => {
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
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

// Time Period Selector Component - Dropdown matching header style
function TimePeriodSelector({
  value,
  onChange,
}: {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = TIME_PERIOD_OPTIONS.find(opt => opt.value === value);

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
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
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
        <div className="absolute top-full right-0 mt-2 w-44 dark:bg-gray-900 bg-white rounded-xl dark:border-gray-700 border-gray-200 shadow-2xl animate-fade-in">
          <div className="py-2">
            {TIME_PERIOD_OPTIONS.map(option => {
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
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
