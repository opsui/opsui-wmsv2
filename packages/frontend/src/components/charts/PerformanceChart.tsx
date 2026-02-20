/**
 * Performance Chart Component
 *
 * Bar chart showing performance metrics for different roles
 * with time range and role selector dropdowns
 *
 * Design: Data visualization with distinctive styling
 * - Grouped bars with gradient fills
 * - Animated hover states
 * - Elegant card with decorative accents
 */

import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/shared';
import { useContainerWidth } from '@/hooks/useContainerWidth';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { UserRole } from '@opsui/shared';
import { useEffect, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface PerformanceData {
  userId: string;
  userName: string;
  tasksCompleted: number;
  ordersCompleted: number;
  totalItemsProcessed: number;
  averageTimePerTask: number;
}

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';
type RoleType = UserRole.PICKER | UserRole.PACKER | UserRole.STOCK_CONTROLLER;

interface PerformanceChartProps {
  data?: PerformanceData[];
  isLoading?: boolean;
  onRangeChange?: (range: TimeRange) => void;
  onRoleChange?: (role: RoleType) => void;
}

const COLORS = {
  tasksCompleted: '#a855f7', // blue-500
  ordersCompleted: '#10b981', // green-500
  itemsProcessed: '#8b5cf6', // purple-500
};

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const ROLE_OPTIONS: { value: RoleType; label: string }[] = [
  { value: UserRole.PICKER, label: 'Pickers' },
  { value: UserRole.PACKER, label: 'Packers' },
  { value: UserRole.STOCK_CONTROLLER, label: 'Stock Controllers' },
];

// Role-specific label mappings
const ROLE_LABELS: Record<
  RoleType,
  {
    tasksLabel: string;
    ordersLabel: string;
    itemsLabel: string;
    tableHeader: string;
  }
> = {
  [UserRole.PICKER]: {
    tasksLabel: 'Tasks Completed',
    ordersLabel: 'Orders Completed',
    itemsLabel: 'Items Picked',
    tableHeader: 'Picker',
  },
  [UserRole.PACKER]: {
    tasksLabel: 'Tasks Completed',
    ordersLabel: 'Orders Completed',
    itemsLabel: 'Items Packed',
    tableHeader: 'Packer',
  },
  [UserRole.STOCK_CONTROLLER]: {
    tasksLabel: 'Transactions',
    ordersLabel: 'Transactions',
    itemsLabel: 'Items Processed',
    tableHeader: 'Controller',
  },
};

export function PerformanceChart({
  data,
  isLoading,
  onRangeChange,
  onRoleChange,
}: PerformanceChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('weekly');
  const [selectedRole, setSelectedRole] = useState<RoleType>(UserRole.PICKER);
  const [containerRef, containerWidth] = useContainerWidth<HTMLDivElement>();

  const handleRangeChange = (newRange: TimeRange) => {
    setSelectedRange(newRange);
    onRangeChange?.(newRange);
  };

  const handleRoleChange = (newRole: RoleType) => {
    setSelectedRole(newRole);
    onRoleChange?.(newRole);
  };

  const roleLabels = ROLE_LABELS[selectedRole];
  const chartTitle = `${selectedRange.charAt(0).toUpperCase() + selectedRange.slice(1)} ${roleLabels.tableHeader} Performance`;

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{chartTitle}</CardTitle>
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>{chartTitle}</CardTitle>
            <div className="flex items-center gap-2">
              <RoleSelector value={selectedRole} onChange={handleRoleChange} />
              <TimeRangeSelector value={selectedRange} onChange={handleRangeChange} />
            </div>
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

  // Format data for chart - shorten names if needed
  // Handle different property names from backend (pickerName, packerName, controllerName, userName)
  const chartData = data.map(item => {
    const userName =
      (item as any).pickerName ||
      (item as any).packerName ||
      (item as any).controllerName ||
      item.userName ||
      'Unknown';
    return {
      ...item,
      displayName: userName.length > 15 ? userName.substring(0, 12) + '...' : userName,
      // Convert average time from seconds to minutes for display
      avgTimeMinutes: item.averageTimePerTask ? (item.averageTimePerTask / 60).toFixed(1) : 0,
    };
  });

  // Calculate totals for summary
  const totalTasks = chartData.reduce((sum, item) => sum + (item.tasksCompleted || 0), 0);
  const totalOrders = chartData.reduce((sum, item) => sum + (item.ordersCompleted || 0), 0);
  const totalItems = chartData.reduce((sum, item) => sum + (item.totalItemsProcessed || 0), 0);

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
        dashboard-stagger-5
      "
    >
      {/* Decorative corner accents */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-blue-500/10 via-emerald-500/5 to-transparent rounded-bl-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-tr-full pointer-events-none" />

      <CardHeader className="relative">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 via-emerald-500/15 to-violet-500/10 border border-blue-400/20">
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
                  d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                <span className="hero-title-gradient">{roleLabels.tableHeader}</span>
                <span className="dark:text-white text-gray-900"> Performance</span>
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">
                {selectedRange.charAt(0).toUpperCase() + selectedRange.slice(1)} metrics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RoleSelector value={selectedRole} onChange={handleRoleChange} />
            <TimeRangeSelector value={selectedRange} onChange={handleRangeChange} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-6 relative">
        {/* Quick stats row */}
        <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-gray-200/50 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Tasks</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-['JetBrains_Mono',monospace]">
              {totalTasks.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Orders</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-['JetBrains_Mono',monospace]">
              {totalOrders.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Items</span>
            <span className="text-sm font-bold text-violet-600 dark:text-violet-400 font-['JetBrains_Mono',monospace]">
              {totalItems.toLocaleString()}
            </span>
          </div>
        </div>

        <div ref={containerRef} className="relative w-full flex justify-center">
          {/* Atmospheric glow effect behind the chart */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-72 h-56 rounded-full bg-gradient-to-br from-blue-500/8 via-emerald-500/8 to-violet-500/5 blur-3xl animate-pulse"
              style={{ animationDuration: '5s' }}
            />
          </div>

          {containerWidth > 0 && (
            <ResponsiveContainer width={containerWidth} height={320}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                {/* Gradient definitions for bars */}
                <defs>
                  <linearGradient id="tasksGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={COLORS.tasksCompleted} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLORS.tasksCompleted} stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="ordersGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={COLORS.ordersCompleted} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLORS.ordersCompleted} stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="itemsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={COLORS.itemsProcessed} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLORS.itemsProcessed} stopOpacity={0.5} />
                  </linearGradient>
                  {/* Glow filters */}
                  <filter id="glow-blue-bar" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="glow-green-bar" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="glow-purple-bar" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  className="dark:stroke-white/[0.06] stroke-gray-200/60"
                  vertical={false}
                />
                <XAxis
                  dataKey="displayName"
                  className="dark:fill-gray-500 fill-gray-600"
                  tick={{ fontSize: 11, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  interval={0}
                  textAnchor="middle"
                  height={50}
                  axisLine={{ stroke: 'rgba(156, 163, 175, 0.2)' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  className="dark:fill-gray-500 fill-gray-600"
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  className="dark:fill-gray-500 fill-gray-600"
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
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
                  labelStyle={{ fontWeight: 600, marginBottom: '8px', color: '#94a3b8' }}
                  formatter={(value: any, name?: string) => {
                    if (name === 'Avg Time (min)')
                      return [
                        <span key="time">
                          <span className="font-bold font-['JetBrains_Mono',monospace]">
                            {value}
                          </span>
                          <span className="text-gray-400 ml-1">min</span>
                        </span>,
                        name,
                      ];
                    return [
                      <span key="value">
                        <span className="font-bold font-['JetBrains_Mono',monospace]">{value}</span>
                      </span>,
                      name || '',
                    ];
                  }}
                  labelFormatter={label => {
                    const item = chartData.find(d => d.displayName === label);
                    return item?.displayName || label;
                  }}
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
                <Bar
                  yAxisId="left"
                  dataKey="tasksCompleted"
                  fill="url(#tasksGradient)"
                  name={roleLabels.tasksLabel}
                  radius={[8, 8, 0, 0]}
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(168, 85, 247, 0.4))' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="ordersCompleted"
                  fill="url(#ordersGradient)"
                  name={roleLabels.ordersLabel}
                  radius={[8, 8, 0, 0]}
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.4))' }}
                />
                <Bar
                  yAxisId="right"
                  dataKey="totalItemsProcessed"
                  fill="url(#itemsGradient)"
                  name={roleLabels.itemsLabel}
                  radius={[8, 8, 0, 0]}
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(139, 92, 246, 0.4))' }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Performance summary table */}
        <div className="mt-4 overflow-x-auto rounded-xl dark:bg-white/[0.02] bg-gray-50/50 dark:border dark:border-white/[0.04] border-gray-200/60 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="dark:text-gray-400 text-gray-600 border-b dark:border-white/[0.05] border-gray-200/60">
                <th className="text-left py-3 px-3 font-medium">{roleLabels.tableHeader}</th>
                <th className="text-right py-3 px-3 font-medium">
                  {selectedRole === UserRole.STOCK_CONTROLLER ? 'Trans' : 'Tasks'}
                </th>
                <th className="text-right py-3 font-medium">
                  {selectedRole === UserRole.STOCK_CONTROLLER ? 'Trans' : 'Orders'}
                </th>
                <th className="text-right py-3 px-3 font-medium">Items</th>
                <th className="text-right py-3 px-3 font-medium">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {chartData.slice(0, 5).map((item, index) => (
                <tr
                  key={item.userId}
                  className="
                    group
                    dark:text-gray-300 
                    text-gray-700 
                    border-b 
                    dark:border-white/[0.02] 
                    border-gray-100/80
                    hover:dark:bg-white/[0.04] 
                    hover:bg-gray-100/50 
                    transition-all 
                    duration-200
                  "
                >
                  <td className="py-3 px-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      {item.displayName}
                    </div>
                  </td>
                  <td className="text-right py-3 px-3 font-['JetBrains_Mono',monospace]">
                    {item.tasksCompleted}
                  </td>
                  <td className="text-right py-3 font-['JetBrains_Mono',monospace]">
                    {item.ordersCompleted}
                  </td>
                  <td className="text-right py-3 px-3 font-['JetBrains_Mono',monospace]">
                    {item.totalItemsProcessed}
                  </td>
                  <td className="text-right py-3 px-3 font-['JetBrains_Mono',monospace]">
                    {item.avgTimeMinutes}m
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <div className="relative z-[9998]" ref={dropdownRef}>
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
        <div className="absolute top-full right-0 mt-2 w-36 dark:bg-gray-900 bg-white rounded-xl dark:border-gray-700 border-gray-200 shadow-2xl animate-fade-in">
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

// Role Selector Component - Dropdown matching header style
function RoleSelector({
  value,
  onChange,
}: {
  value: RoleType;
  onChange: (role: RoleType) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = ROLE_OPTIONS.find(opt => opt.value === value);

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
        <div className="absolute top-full right-0 mt-2 w-40 dark:bg-gray-900 bg-white rounded-xl dark:border-gray-700 border-gray-200 shadow-2xl animate-fade-in">
          <div className="py-2">
            {ROLE_OPTIONS.map(option => {
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
