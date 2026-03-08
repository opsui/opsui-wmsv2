/**
 * MetricCard — reusable KPI card with Industrial Command Center styling.
 *
 * Extracted from DashboardPage so it can be shared across the main dashboard
 * and the cross-module ERP KPI summary.
 *
 * Supports optional sparkline visualization for hero cards.
 */

import { Card, CardContent } from './Card';
import { memo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

// ============================================================================
// COLOR STYLES
// ============================================================================

export const METRIC_CARD_COLOR_STYLES = {
  primary: {
    bg: 'bg-gradient-to-br from-purple-500/20 via-violet-600/10 to-purple-500/20 dark:from-purple-500/20 dark:via-violet-600/10 dark:to-purple-500/20',
    icon: 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-purple-500/40',
    border: 'border-purple-400/30 dark:border-purple-500/20',
    glow: 'hover:shadow-purple-500/20',
  },
  success: {
    bg: 'bg-gradient-to-br from-emerald-500/20 via-green-600/10 to-teal-500/20 dark:from-emerald-500/20 dark:via-green-600/10 dark:to-teal-500/20',
    icon: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/40',
    border: 'border-emerald-400/30 dark:border-emerald-500/20',
    glow: 'hover:shadow-emerald-500/20',
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-500/20 via-orange-600/10 to-yellow-500/20 dark:from-amber-500/20 dark:via-orange-600/10 dark:to-yellow-500/20',
    icon: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/40',
    border: 'border-amber-400/30 dark:border-amber-500/20',
    glow: 'hover:shadow-amber-500/20',
  },
  error: {
    bg: 'bg-gradient-to-br from-red-500/20 via-rose-600/10 to-pink-500/20 dark:from-red-500/20 dark:via-rose-600/10 dark:to-pink-500/20',
    icon: 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/40',
    border: 'border-red-400/30 dark:border-red-500/20',
    glow: 'hover:shadow-red-500/20',
  },
} as const;

export type MetricCardColor = keyof typeof METRIC_CARD_COLOR_STYLES;

// Sparkline colors mapping
const SPARKLINE_COLORS: Record<MetricCardColor, { stroke: string; fill: string }> = {
  primary: { stroke: '#a855f7', fill: 'url(#sparklineGradientPurple)' },
  success: { stroke: '#10b981', fill: 'url(#sparklineGradientGreen)' },
  warning: { stroke: '#f59e0b', fill: 'url(#sparklineGradientAmber)' },
  error: { stroke: '#ef4444', fill: 'url(#sparklineGradientRed)' },
};

export interface SparklineDataPoint {
  value: number;
  label?: string;
}

// ============================================================================
// SPARKLINE COMPONENT
// ============================================================================

interface SparklineProps {
  data: SparklineDataPoint[];
  color: MetricCardColor;
}

function Sparkline({ data, color }: SparklineProps) {
  if (!data || data.length === 0) return null;

  const colors = SPARKLINE_COLORS[color];
  const chartData = data.map((d, i) => ({
    value: d.value,
    index: i,
  }));

  return (
    <div className="w-full h-10 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id="sparklineGradientPurple" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="sparklineGradientGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="sparklineGradientAmber" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="sparklineGradientRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.stroke}
            strokeWidth={2}
            fill={colors.fill}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: MetricCardColor;
  onClick?: () => void;
  index?: number;
  /** Optional sparkline data for hero cards */
  sparkline?: SparklineDataPoint[];
}

export const MetricCard = memo(function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'primary',
  onClick,
  index = 0,
  sparkline,
}: MetricCardProps) {
  const style = METRIC_CARD_COLOR_STYLES[color];
  const hasSparkline = sparkline && sparkline.length > 0;

  return (
    <div
      onClick={onClick}
      className={`${onClick ? 'cursor-pointer' : ''} dashboard-stagger-${index + 1}`}
    >
      <Card
        variant="glass"
        className={`
          relative overflow-hidden
          ${style.bg} ${style.border}
          border backdrop-blur-xl
          transition-all duration-500 ease-out
          hover:scale-[1.02] hover:-translate-y-1
          hover:shadow-2xl ${style.glow}
          group h-full
          before:absolute before:inset-0
          before:bg-gradient-to-br before:from-white/10 before:to-transparent
          before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
        `}
      >
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full opacity-50" />

        <CardContent className="p-4 sm:p-5 lg:p-6 relative">
          <div className="flex flex-col items-center text-center gap-3">
            {/* Icon with enhanced styling */}
            <div
              className={`
                p-3 sm:p-4 rounded-2xl
                ${style.icon}
                shadow-lg
                transition-all duration-500
                group-hover:scale-110 group-hover:rotate-3
                group-hover:shadow-xl
                shrink-0
                relative
                after:absolute after:inset-0 after:rounded-2xl
                after:bg-gradient-to-br after:from-white/30 after:to-transparent
              `}
            >
              <Icon className="h-6 w-6 sm:h-7 sm:w-7 relative z-10" />
            </div>

            {/* Content */}
            <div className="flex flex-col items-center gap-1 w-full">
              <p
                className="
                text-xs sm:text-sm font-bold
                text-gray-600 dark:text-gray-400
                uppercase tracking-widest
                leading-tight text-center
                transition-colors duration-300
                group-hover:text-gray-700 dark:group-hover:text-gray-300
              "
              >
                {title}
              </p>
              <p
                className={`
                  font-black
                  text-gray-900 dark:text-white
                  tracking-tight
                  transition-all duration-300
                  group-hover:scale-105
                  font-['JetBrains_Mono',monospace]
                  ${hasSparkline ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-3xl sm:text-4xl lg:text-5xl'}
                `}
              >
                {value}
              </p>

              {/* Sparkline chart */}
              {hasSparkline && <Sparkline data={sparkline} color={color} />}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
