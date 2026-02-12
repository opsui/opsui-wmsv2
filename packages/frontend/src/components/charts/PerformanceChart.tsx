/**
 * Performance Chart Component
 *
 * Bar chart showing performance metrics for different roles
 * with time range and role selector dropdowns
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
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { UserRole } from '@opsui/shared';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

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
  tasksCompleted: '#3b82f6', // blue-500
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

  return (
    <Card
      variant="glass"
      className="card-hover shadow-xl dark:shadow-blue-500/5 shadow-gray-200/50"
    >
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
        <div className="relative">
          {/* Subtle glow effect behind the chart */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-48 rounded-full bg-gradient-to-br from-blue-500/10 to-emerald-500/10 blur-2xl" />
          </div>
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="dark:stroke-white/[0.08] stroke-gray-200"
              />
              <XAxis
                dataKey="displayName"
                className="dark:fill-gray-500 fill-gray-600"
                tick={{ fontSize: 12 }}
                interval={0}
                textAnchor="middle"
                height={50}
              />
              <YAxis
                yAxisId="left"
                className="dark:fill-gray-500 fill-gray-600"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                className="dark:fill-gray-500 fill-gray-600"
                tick={{ fontSize: 11 }}
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
                  return item?.displayName || label;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }}
                formatter={value => (
                  <span className="dark:text-gray-300 text-gray-700 font-medium">{value}</span>
                )}
              />
              <Bar
                yAxisId="left"
                dataKey="tasksCompleted"
                fill={COLORS.tasksCompleted}
                name={roleLabels.tasksLabel}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="ordersCompleted"
                fill={COLORS.ordersCompleted}
                name={roleLabels.ordersLabel}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="totalItemsProcessed"
                fill={COLORS.itemsProcessed}
                name={roleLabels.itemsLabel}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance summary table */}
        <div className="mt-4 overflow-x-auto rounded-xl dark:bg-white/[0.02] bg-gray-50/50 dark:border dark:border-white/[0.04] border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="dark:text-gray-400 text-gray-600 border-b dark:border-white/[0.05] border-gray-200">
                <th className="text-left py-3 px-3">{roleLabels.tableHeader}</th>
                <th className="text-right py-3 px-3">
                  {selectedRole === UserRole.STOCK_CONTROLLER ? 'Trans' : 'Tasks'}
                </th>
                <th className="text-right py-3">
                  {selectedRole === UserRole.STOCK_CONTROLLER ? 'Trans' : 'Orders'}
                </th>
                <th className="text-right py-3 px-3">Items</th>
                <th className="text-right py-3 px-3">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {chartData.slice(0, 5).map(item => (
                <tr
                  key={item.userId}
                  className="dark:text-gray-300 text-gray-700 border-b dark:border-white/[0.02] border-gray-100 hover:dark:bg-white/[0.03] hover:bg-gray-100/50 transition-colors duration-200"
                >
                  <td className="py-2.5 px-3 font-medium">{item.displayName}</td>
                  <td className="text-right py-2.5 px-3">{item.tasksCompleted}</td>
                  <td className="text-right py-2.5 px-3">{item.ordersCompleted}</td>
                  <td className="text-right py-2.5 px-3">{item.totalItemsProcessed}</td>
                  <td className="text-right py-2.5 px-3">{item.avgTimeMinutes}m</td>
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
