/**
 * Line Chart Component
 *
 * Simple SVG-based line chart for monitoring metrics
 */

import { useMemo } from 'react';

export interface ChartDataPoint {
  timestamp: string | Date;
  value: number;
  label?: string;
}

interface LineChartProps {
  data: ChartDataPoint[];
  title: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (timestamp: string | Date) => string;
  className?: string;
}

const colorMap = {
  blue: {
    stroke: '#3b82f6',
    fill: 'rgba(59, 130, 246, 0.1)',
    gradient: ['rgba(59, 130, 246, 0.3)', 'rgba(59, 130, 246, 0)'],
  },
  green: {
    stroke: '#10b981',
    fill: 'rgba(16, 185, 129, 0.1)',
    gradient: ['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0)'],
  },
  amber: {
    stroke: '#f59e0b',
    fill: 'rgba(245, 158, 11, 0.1)',
    gradient: ['rgba(245, 158, 11, 0.3)', 'rgba(245, 158, 11, 0)'],
  },
  red: {
    stroke: '#ef4444',
    fill: 'rgba(239, 68, 68, 0.1)',
    gradient: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0)'],
  },
  purple: {
    stroke: '#8b5cf6',
    fill: 'rgba(139, 92, 246, 0.1)',
    gradient: ['rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0)'],
  },
};

export function LineChart({
  data,
  title,
  color = 'blue',
  height = 200,
  showGrid = true,
  showTooltip = true,
  valueFormatter = (v) => v.toString(),
  labelFormatter = (t) => new Date(t).toLocaleTimeString(),
  className = '',
}: LineChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return { points: '', min: 0, max: 100, scaledData: [] };

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const scaledData = data.map((d, i) => ({
      ...d,
      x: (i / (data.length - 1)) * 100,
      y: 100 - ((d.value - min) / range) * 100,
    }));

    const points = scaledData.map(d => `${d.x},${d.y}`).join(' ');

    return { points, min, max, scaledData };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className={className}>
        <div className="text-sm font-medium dark:text-white mb-2">{title}</div>
        <div
          className="bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center"
          style={{ height }}
        >
          <p className="text-gray-400 text-sm">No data available</p>
        </div>
      </div>
    );
  }

  const colors = colorMap[color];
  const gridLines = [0, 25, 50, 75, 100];

  return (
    <div className={className}>
      <div className="text-sm font-medium dark:text-white mb-2">{title}</div>
      <div className="relative bg-gray-50 dark:bg-gray-800 rounded-lg" style={{ height }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.gradient[0]} />
              <stop offset="100%" stopColor={colors.gradient[1]} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {showGrid && gridLines.map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.1"
              className="text-gray-400"
            />
          ))}

          {/* Area fill */}
          <polygon
            points={`0,100 ${chartData.points} 100,100`}
            fill={`url(#gradient-${color})`}
          />

          {/* Line */}
          <polyline
            points={chartData.points}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {chartData.scaledData.map((d, i) => (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r="1"
              fill={colors.stroke}
              className="hover:r-2 transition-all cursor-pointer"
            >
              {showTooltip && (
                <title>
                  {labelFormatter(d.timestamp)}: {valueFormatter(d.value)}
                </title>
              )}
            </circle>
          ))}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-1 top-2 bottom-2 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{valueFormatter(chartData.max)}</span>
          <span>{valueFormatter(chartData.min)}</span>
        </div>
      </div>

      {/* X-axis labels (show first, middle, last) */}
      {data.length > 2 && (
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 px-6">
          <span>{labelFormatter(data[0].timestamp)}</span>
          <span>{labelFormatter(data[Math.floor(data.length / 2)].timestamp)}</span>
          <span>{labelFormatter(data[data.length - 1].timestamp)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Multi-line chart for comparing multiple series
 */
export interface MultiLineChartProps {
  series: Array<{
    data: ChartDataPoint[];
    label: string;
    color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  }>;
  title: string;
  height?: number;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (timestamp: string | Date) => string;
  className?: string;
}

export function MultiLineChart({
  series,
  title,
  height = 200,
  valueFormatter = (v) => v.toString(),
  labelFormatter = (t) => new Date(t).toLocaleTimeString(),
  className = '',
}: MultiLineChartProps) {
  return (
    <div className={className}>
      <div className="text-sm font-medium dark:text-white mb-2">{title}</div>
      <div className="relative bg-gray-50 dark:bg-gray-800 rounded-lg" style={{ height }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {series.map((s, seriesIndex) => {
            const colors = colorMap[s.color || ['blue', 'green', 'amber', 'red', 'purple'][seriesIndex % 5]];

            if (s.data.length === 0) return null;

            const values = s.data.map(d => d.value);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const range = max - min || 1;

            const points = s.data
              .map((d, i) => {
                const x = (i / (s.data.length - 1)) * 100;
                const y = 100 - ((d.value - min) / range) * 100;
                return `${x},${y}`;
              })
              .join(' ');

            return (
              <g key={seriesIndex}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.8"
                />
                {s.data.map((d, i) => {
                  const x = (i / (s.data.length - 1)) * 100;
                  const y = 100 - ((d.value - min) / range) * 100;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="0.8"
                      fill={colors.stroke}
                    >
                      <title>
                        {s.label} - {labelFormatter(d.timestamp)}: {valueFormatter(d.value)}
                      </title>
                    </circle>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {series.map((s, i) => {
            const colors = colorMap[s.color || ['blue', 'green', 'amber', 'red', 'purple'][i % 5]];
            return (
              <div key={i} className="flex items-center gap-1 text-xs">
                <div
                  className="w-3 h-0.5"
                  style={{ backgroundColor: colors.stroke }}
                />
                <span className="text-gray-600 dark:text-gray-400">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Mini sparkline for compact displays
 */
export function Sparkline({
  data,
  color = 'blue',
  width = 100,
  height = 30,
}: {
  data: number[];
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  width?: number;
  height?: number;
}) {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const colors = colorMap[color];

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ width, height }}
      className="inline-block"
    >
      <polyline
        points={points}
        fill="none"
        stroke={colors.stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
