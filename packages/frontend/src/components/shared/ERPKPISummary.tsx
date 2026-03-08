/**
 * ERPKPISummary
 *
 * Cross-module KPI grid for the admin dashboard.
 * Renders module sections as groups of MetricCards with optional
 * mini chart visualizations, matching the Industrial Command Center aesthetic.
 */

import { MetricCard } from './MetricCard';
import { MetricCardSkeleton } from './Skeleton';
import { MiniChartPanel } from './MiniChartPanel';
import type { ERPKPISection } from '@/hooks/useERPDashboardMetrics';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

interface ERPKPISummaryProps {
  sections: ERPKPISection[];
}

export function ERPKPISummary({ sections }: ERPKPISummaryProps) {
  const navigate = useNavigate();

  if (sections.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <h2
          className="
            text-lg sm:text-xl font-black uppercase tracking-[0.2em]
            text-gray-800 dark:text-white/90
          "
        >
          Enterprise Overview
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent" />
      </div>

      {/* Module sections */}
      {sections.map((section, sIdx) => {
        const SectionIcon = section.icon;
        // Stagger indices continue after the 4 warehouse metrics (indices 1-4)
        // and 2 chart rows, so we start at 7+
        const baseStaggerIndex = 7 + sIdx * 4;

        return (
          <div key={section.id} className="space-y-3">
            {/* Module section header */}
            <button
              onClick={() => navigate(section.navigateTo)}
              className="
                flex items-center gap-2 group/header
                hover:opacity-80 transition-opacity
              "
            >
              <div
                className="
                  p-1.5 rounded-lg
                  bg-purple-500/10 dark:bg-purple-500/20
                  text-purple-600 dark:text-purple-400
                "
              >
                <SectionIcon className="h-4 w-4" />
              </div>
              <h3
                className="
                  text-sm font-bold uppercase tracking-widest
                  text-gray-600 dark:text-gray-400
                  group-hover/header:text-purple-600 dark:group-hover/header:text-purple-400
                  transition-colors
                "
              >
                {section.title}
              </h3>
              <ChevronRightIcon
                className="
                  h-3.5 w-3.5 text-gray-400 dark:text-gray-500
                  group-hover/header:text-purple-500
                  group-hover/header:translate-x-0.5
                  transition-all
                "
              />
            </button>

            {/* Metrics grid with optional visualization */}
            <div
              className={`grid gap-3 sm:gap-5 ${
                section.visualization
                  ? 'grid-cols-2 lg:grid-cols-4 xl:grid-cols-5'
                  : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }`}
            >
              {section.isLoading
                ? Array.from({ length: section.metrics.length || 4 }).map((_, i) => (
                    <MetricCardSkeleton key={i} />
                  ))
                : section.metrics.map((metric, mIdx) => (
                    <MetricCard
                      key={metric.title}
                      title={metric.title}
                      value={metric.value}
                      icon={metric.icon}
                      color={metric.color}
                      onClick={metric.onClick}
                      index={baseStaggerIndex + mIdx}
                    />
                  ))}

              {/* Mini Chart Visualization */}
              {section.visualization && !section.isLoading && (
                <div
                  className={`
                  col-span-2 lg:col-span-1
                  ${section.metrics.length % 4 === 0 ? 'lg:col-start-auto' : ''}
                `}
                >
                  <MiniChartPanel
                    config={section.visualization}
                    index={baseStaggerIndex + section.metrics.length}
                    onClick={() => {
                      const navTo = section.visualization?.navigateTo || section.navigateTo;
                      if (navTo) navigate(navTo);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
