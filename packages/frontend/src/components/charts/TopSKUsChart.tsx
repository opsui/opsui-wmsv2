/**
 * Top SKUs Chart Component
 *
 * Horizontal bar chart showing most frequently scanned SKUs
 * with dropdown selector for scan type
 *
 * Design: Data visualization with distinctive styling
 * - Gradient bars with glow effects
 * - Animated hover states
 * - Elegant card with decorative accents
 */

import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/shared';
import { useContainerWidth } from '@/hooks/useContainerWidth';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
  '#a855f7', // blue-500
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
  const [containerRef, containerWidth] = useContainerWidth<HTMLDivElement>();

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

  // Calculate totals
  const totalScans = chartData.reduce((sum, item) => sum + (item.value || 0), 0);

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
        dashboard-stagger-4
      "
    >
      {/* Decorative corner accents */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-bl-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-tr-full pointer-events-none" />

      <CardHeader className="!flex-row !items-center !justify-between !space-y-0 flex-wrap gap-3 relative">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-amber-500/15 border border-indigo-400/20">
            <svg
              className="w-5 h-5 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
              <span className="hero-title-gradient">Top {limit}</span>
              <span className="dark:text-white text-gray-900"> SKUs</span>
            </CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">
              By {valueLabel.toLowerCase()} • {periodLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TimePeriodSelector value={selectedTimePeriod} onChange={handleTimePeriodChange} />
          <ScanTypeSelector value={selectedScanType} onChange={handleScanTypeChange} />
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-6 relative">
        {/* Quick stats row */}
        <div className="flex gap-4 mb-4 pb-4 border-b border-gray-200/50 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-['JetBrains_Mono',monospace]">
              {totalScans.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Top</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-['JetBrains_Mono',monospace]">
              {chartData[0]?.value?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        <div ref={containerRef} className="relative w-full flex justify-center">
          {/* Atmospheric glow effect behind the chart */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-72 h-56 rounded-full bg-gradient-to-br from-indigo-500/8 via-purple-500/8 to-amber-500/5 blur-3xl animate-pulse"
              style={{ animationDuration: '4.5s' }}
            />
          </div>

          {containerWidth > 0 && (
            <ResponsiveContainer width={containerWidth} height={280}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                {/* Gradient definitions for bars */}
                <defs>
                  {chartData.map((entry, index) => (
                    <linearGradient
                      key={`barGradient-${index}`}
                      id={`barGradient-${index}`}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor={entry.color} stopOpacity={0.8} />
                      <stop offset="50%" stopColor={entry.color} stopOpacity={1} />
                      <stop offset="100%" stopColor={entry.color} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                  {/* Bar glow filter */}
                  <filter id="barGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  className="dark:stroke-white/[0.06] stroke-gray-200/60"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  type="number"
                  className="dark:fill-gray-500 fill-gray-600"
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  domain={[0, Math.ceil(maxValue * 1.1)]}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="sku"
                  className="dark:fill-gray-500 fill-gray-600"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                  width={90}
                  tickLine={false}
                  axisLine={false}
                />
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
                  formatter={(value: any, _name: any, props: any) => {
                    const item = props.payload;
                    return [
                      <span key="value">
                        <span className="font-bold font-['JetBrains_Mono',monospace]">{value}</span>
                        <span className="text-gray-400 ml-1">{valueLabel.toLowerCase()}</span>
                        <div className="text-xs text-gray-500 mt-1">{item.name}</div>
                      </span>,
                      valueLabel,
                    ];
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} background={{ fill: 'transparent' }}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#barGradient-${index})`}
                      stroke={entry.color}
                      strokeWidth={1}
                      strokeOpacity={0.5}
                      style={{
                        filter: `drop-shadow(0 4px 12px ${entry.color}50)`,
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom ranking indicator */}
        <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-white/5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">#1</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {chartData[0]?.sku}
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
              <span className="font-mono">{chartData[0]?.value?.toLocaleString() || 0}</span>
              <span>{valueLabel.toLowerCase()}</span>
            </div>
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
