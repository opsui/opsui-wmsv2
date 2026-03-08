/**
 * MiniChartPanel — compact visualization panels for the Enterprise Overview.
 *
 * Variants:
 * - stacked-bar: horizontal stacked bar (e.g. Inventory health breakdown)
 * - donut: mini donut/pie chart (e.g. Production order status)
 * - funnel-bar: horizontal bars showing pipeline stages (e.g. Sales funnel)
 * - gauge: radial gauge for a single percentage (e.g. Gross Margin)
 */

import { Card, CardContent } from './Card';
import { memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// ============================================================================
// TYPES
// ============================================================================

interface SegmentData {
  label: string;
  value: number;
  color: string;
}

interface StackedBarProps {
  type: 'stacked-bar';
  title: string;
  headline?: string;
  subtitle?: string;
  segments: SegmentData[];
  navigateTo?: string;
}

interface DonutProps {
  type: 'donut';
  title: string;
  segments: SegmentData[];
  navigateTo?: string;
}

interface FunnelBarProps {
  type: 'funnel-bar';
  title: string;
  headline?: string;
  stages: SegmentData[];
  navigateTo?: string;
}

interface GaugeProps {
  type: 'gauge';
  title: string;
  value: number;
  max?: number;
  label: string;
  color: string;
  navigateTo?: string;
}

export type MiniChartConfig = StackedBarProps | DonutProps | FunnelBarProps | GaugeProps;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StackedBar({ segments }: { segments: SegmentData[] }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="h-5 rounded-full bg-gray-200 dark:bg-gray-700" />;

  return (
    <div className="space-y-2">
      <div className="flex h-5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        {segments.map(seg => {
          const pct = (seg.value / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={seg.label}
              className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
              title={`${seg.label}: ${seg.value}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-gray-500 dark:text-gray-400">{seg.label}</span>
            <span className="font-bold text-gray-700 dark:text-gray-200">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniDonut({ segments }: { segments: SegmentData[] }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  const data = segments.filter(s => s.value > 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400 dark:text-gray-500">
        No data
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-28 h-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="90%"
              strokeWidth={2}
              stroke="transparent"
            >
              {data.map(entry => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-1.5 min-w-0">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-gray-500 dark:text-gray-400 truncate">{seg.label}</span>
            <span className="font-bold text-gray-700 dark:text-gray-200 ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelBar({ stages }: { stages: SegmentData[] }) {
  const maxVal = Math.max(...stages.map(s => s.value), 1);

  return (
    <div className="space-y-2.5">
      {stages.map(stage => {
        const pct = (stage.value / maxVal) * 100;
        return (
          <div key={stage.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">{stage.label}</span>
              <span className="font-bold text-gray-700 dark:text-gray-200">{stage.value}</span>
            </div>
            <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: stage.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RadialGauge({
  value,
  max = 100,
  color,
  label,
}: {
  value: number;
  max?: number;
  color: string;
  label: string;
}) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct * 0.75); // 270 degrees max arc
  const rotation = -225; // Start from bottom-left

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        {/* Background arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          className="text-gray-200 dark:text-gray-700"
          transform={`rotate(${rotation} 50 50)`}
        />
        {/* Value arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={dashOffset}
          className="transition-all duration-700"
          transform={`rotate(${rotation} 50 50)`}
        />
        {/* Value text */}
        <text
          x="50"
          y="48"
          textAnchor="middle"
          className="fill-gray-900 dark:fill-white text-sm font-black"
          style={{ fontSize: '16px' }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MiniChartPanel = memo(function MiniChartPanel({
  config,
  index = 0,
  onClick,
}: {
  config: MiniChartConfig;
  index?: number;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`${onClick ? 'cursor-pointer' : ''} dashboard-stagger-${index + 1}`}
    >
      <Card
        variant="glass"
        className="
          relative overflow-hidden
          bg-gradient-to-br from-purple-500/10 via-transparent to-purple-500/5
          dark:from-purple-500/10 dark:via-transparent dark:to-purple-500/5
          border border-purple-400/20 dark:border-purple-500/15
          backdrop-blur-xl
          transition-all duration-500 ease-out
          hover:scale-[1.01] hover:-translate-y-0.5
          hover:shadow-xl hover:shadow-purple-500/10
          group h-full
        "
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full opacity-50" />

        <CardContent className="p-4 sm:p-5 relative">
          {config.type === 'stacked-bar' && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  {config.title}
                </h4>
                {config.subtitle && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {config.subtitle}
                  </span>
                )}
              </div>
              {config.headline && (
                <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight font-['JetBrains_Mono',monospace]">
                  {config.headline}
                </p>
              )}
              <StackedBar segments={config.segments} />
            </div>
          )}

          {config.type === 'donut' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {config.title}
              </h4>
              <MiniDonut segments={config.segments} />
            </div>
          )}

          {config.type === 'funnel-bar' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {config.title}
              </h4>
              {config.headline && (
                <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight font-['JetBrains_Mono',monospace]">
                  {config.headline}
                </p>
              )}
              <FunnelBar stages={config.stages} />
            </div>
          )}

          {config.type === 'gauge' && (
            <div className="flex flex-col items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {config.title}
              </h4>
              <RadialGauge
                value={config.value}
                max={config.max}
                color={config.color}
                label={config.label}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
