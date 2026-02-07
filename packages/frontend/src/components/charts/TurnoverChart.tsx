/**
 * Turnover Chart Component
 *
 * Line chart showing inventory turnover rate over time
 * High turnover = fast moving, Low turnover = slow/stagnant stock
 */

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Skeleton } from '@/components/shared';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useRef, useEffect } from 'react';

interface TurnoverData {
  sku: string;
  name: string;
  turnoverCount: number;
  turnoverRate: 'HIGH' | 'NORMAL' | 'LOW' | 'STAGNANT';
}

interface TurnoverChartProps {
  data?: TurnoverData[];
  isLoading?: boolean;
  period?: string;
}

type PeriodType = 'month' | 'quarter' | 'year';

const PERIOD_OPTIONS = [
  { value: 'month' as PeriodType, label: 'Monthly' },
  { value: 'quarter' as PeriodType, label: 'Quarterly' },
  { value: 'year' as PeriodType, label: 'Yearly' },
];

export function TurnoverChart({ data, isLoading }: TurnoverChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Inventory Turnover</CardTitle>
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
          <CardTitle>Inventory Turnover</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center dark:text-gray-400 text-gray-500">
            No turnover data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Take top 10 items by turnover count
  const chartData = data.slice(0, 10);

  return (
    <Card variant="glass" className="card-hover">
      <CardHeader className="!flex-row !items-center !justify-between !space-y-0">
        <CardTitle>Inventory Turnover</CardTitle>
        <PeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={chartData}
            layout="vertical"
            margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="dark:stroke-white/[0.08] stroke-gray-200"
            />
            <XAxis
              type="number"
              className="dark:fill-gray-500 fill-gray-600"
              tick={{ fontSize: 11 }}
              domain={[0, 'dataMax']}
            />
            <YAxis
              type="category"
              dataKey="sku"
              className="dark:fill-gray-500 fill-gray-600"
              tick={{ fontSize: 10 }}
              width={70}
              interval={0}
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
              formatter={(value: number | undefined, name: string | undefined) => {
                if (name === 'turnoverCount') {
                  return [`${(value ?? 0).toFixed(2)}x`, 'Turnover Rate'];
                }
                return [value ?? 0];
              }}
              labelFormatter={(label) => {
                const item = chartData.find(d => d.sku === label);
                return item ? `${item.sku} - ${item.name}` : label;
              }}
              itemStyle={{ color: '#fff' }}
            />
            {/* Reference lines for turnover rate thresholds */}
            <ReferenceLine
              x={4}
              stroke="#10b981"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{ value: 'High', fill: '#10b981', fontSize: 10 }}
            />
            <ReferenceLine
              x={2}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{ value: 'Low', fill: '#f59e0b', fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="turnoverCount"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2 }}
              activeDot={{ r: 7 }}
              name="Turnover Rate"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="dark:text-gray-300 text-gray-700">High (≥4x)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="dark:text-gray-300 text-gray-700">Normal (2-4x)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="dark:text-gray-300 text-gray-700">Low (0.5-2x)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="dark:text-gray-300 text-gray-700">Stagnant (&lt;0.5x)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: PeriodType;
  onChange: (period: PeriodType) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = PERIOD_OPTIONS.find(opt => opt.value === value);

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
            {PERIOD_OPTIONS.map(option => {
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
