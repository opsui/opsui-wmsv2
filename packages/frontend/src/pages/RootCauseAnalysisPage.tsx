/**
 * Root Cause Analysis Page
 *
 * Analytics page for variance root cause categorization with Pareto analysis,
 * category breakdown, trending analysis, and drill-down capabilities by SKU and zone.
 */

import { useState, useEffect } from 'react';
import {
  useRootCausePareto,
  useRootCauseCategoryBreakdown,
  useRootCauseTrending,
} from '@/services/api';
import type { RootCauseParetoData, CategoryBreakdown, TrendingRootCause } from '@opsui/shared';
import {
  MagnifyingGlassIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CubeIcon,
  MapPinIcon,
  FunnelIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { Header, Card, CycleCountNavigation, Skeleton } from '@/components/shared';

interface FilterState {
  days: number;
  category?: string;
  sku?: string;
  zone?: string;
}

// Animated counter hook
function useCounter(target: number, duration = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(target * easeOutQuart));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  return count;
}

// Sample data for preview purposes
const SAMPLE_PARETO_DATA: RootCauseParetoData[] = [
  {
    category: 'Data Entry Error',
    categoryId: 'DATA_ENTRY',
    count: 45,
    cumulativePercent: 42.5,
    totalVariance: 156,
    averageVariancePercent: 3.2,
  },
  {
    category: 'Product Damage',
    categoryId: 'DAMAGE',
    count: 28,
    cumulativePercent: 68.8,
    totalVariance: 89,
    averageVariancePercent: 2.8,
  },
  {
    category: 'Theft/Loss',
    categoryId: 'THEFT',
    count: 18,
    cumulativePercent: 85.7,
    totalVariance: 67,
    averageVariancePercent: 4.1,
  },
  {
    category: 'Receiving Error',
    categoryId: 'RECEIVING',
    count: 12,
    cumulativePercent: 97.0,
    totalVariance: 34,
    averageVariancePercent: 2.1,
  },
  {
    category: 'Cycle Count Slip',
    categoryId: 'CYCLE_COUNT',
    count: 3,
    cumulativePercent: 100.0,
    totalVariance: 8,
    averageVariancePercent: 1.5,
  },
];

const SAMPLE_CATEGORY_BREAKDOWN: CategoryBreakdown[] = [
  {
    category: 'Data Entry Error',
    categoryId: 'DATA_ENTRY',
    varianceCount: 45,
    averageVariancePercent: 3.2,
    totalVariance: 156,
    trend: 'INCREASING',
    trendPercent: 12.5,
  },
  {
    category: 'Product Damage',
    categoryId: 'DAMAGE',
    varianceCount: 28,
    averageVariancePercent: 2.8,
    totalVariance: 89,
    trend: 'STABLE',
  },
  {
    category: 'Theft/Loss',
    categoryId: 'THEFT',
    varianceCount: 18,
    averageVariancePercent: 4.1,
    totalVariance: 67,
    trend: 'DECREASING',
    trendPercent: 8.3,
  },
  {
    category: 'Receiving Error',
    categoryId: 'RECEIVING',
    varianceCount: 12,
    averageVariancePercent: 2.1,
    totalVariance: 34,
    trend: 'STABLE',
  },
  {
    category: 'Cycle Count Slip',
    categoryId: 'CYCLE_COUNT',
    varianceCount: 3,
    averageVariancePercent: 1.5,
    totalVariance: 8,
    trend: 'INCREASING',
    trendPercent: 5.2,
  },
];

const SAMPLE_TRENDING_DATA: TrendingRootCause[] = [
  {
    category: 'Data Entry Error',
    categoryId: 'DATA_ENTRY',
    currentPeriodCount: 45,
    previousPeriodCount: 40,
    percentChange: 12.5,
    trendDirection: 'UP',
    averageVariancePercent: 3.2,
  },
  {
    category: 'Theft/Loss',
    categoryId: 'THEFT',
    currentPeriodCount: 18,
    previousPeriodCount: 22,
    percentChange: -18.2,
    trendDirection: 'DOWN',
    averageVariancePercent: 4.1,
  },
  {
    category: 'Cycle Count Slip',
    categoryId: 'CYCLE_COUNT',
    currentPeriodCount: 3,
    previousPeriodCount: 2,
    percentChange: 50.0,
    trendDirection: 'UP',
    averageVariancePercent: 1.5,
  },
];

export function RootCauseAnalysisPage() {
  const [filters, setFilters] = useState<FilterState>({ days: 30 });
  const [activeTab, setActiveTab] = useState<'pareto' | 'breakdown' | 'trending' | 'sku' | 'zone'>(
    'pareto'
  );
  const [skuInput, setSkuInput] = useState('');
  const [zoneInput, setZoneInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [useSampleData, setUseSampleData] = useState(true); // Toggle for preview

  // Queries
  const { data: paretoDataReal = [], isLoading: isLoadingPareto } = useRootCausePareto(
    filters.days
  );
  const { data: categoryBreakdownReal = [], isLoading: isLoadingBreakdown } =
    useRootCauseCategoryBreakdown(filters.days);
  const { data: trendingDataReal = [], isLoading: isLoadingTrending } = useRootCauseTrending(
    filters.days
  );

  // Use sample data for preview if enabled or if real data is empty
  const paretoData =
    useSampleData || paretoDataReal.length === 0 ? SAMPLE_PARETO_DATA : paretoDataReal;
  const categoryBreakdown =
    useSampleData || categoryBreakdownReal.length === 0
      ? SAMPLE_CATEGORY_BREAKDOWN
      : categoryBreakdownReal;
  const trendingData =
    useSampleData || trendingDataReal.length === 0 ? SAMPLE_TRENDING_DATA : trendingDataReal;

  // Colors for charts
  const categoryColors: Record<string, string> = {
    'Data Entry Error': '#3B82F6',
    'Product Damage': '#EF4444',
    'Theft/Loss': '#F59E0B',
    'Receiving Error': '#10B981',
    'Shipping Error': '#8B5CF6',
    'System Error': '#EC4899',
    'Cycle Count Slip': '#6366F1',
    Unknown: '#9CA3AF',
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Get color for category
  const getCategoryColor = (categoryName: string) => {
    return categoryColors[categoryName] || '#6B7280';
  };

  // Handle filter change
  const handleDaysChange = (days: number) => {
    setFilters({ ...filters, days });
  };

  // Pareto Chart Component
  const ParetoChart = ({ data, searchTerm }: { data: typeof paretoData; searchTerm?: string }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const maxVariance = Math.max(...data.map(d => d.totalVariance), 1);
    const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());

    // Staggered entrance animation
    useEffect(() => {
      data.forEach((_, index) => {
        setTimeout(() => {
          setVisibleItems(prev => new Set(prev).add(index));
        }, index * 100);
      });
    }, [data]);

    // Filter data based on search term
    const filteredData = searchTerm
      ? data.filter(item => {
          const query = searchTerm.toLowerCase();
          return (
            item.category?.toLowerCase().includes(query) ||
            item.categoryId?.toLowerCase().includes(query)
          );
        })
      : data;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10 animate-fade-in">
          <div className="p-2 rounded-lg bg-blue-500/10 animate-pulse-slow">
            <ChartBarIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Pareto Analysis (80/20 Rule)</h3>
            <p className="text-sm text-gray-400">
              Top root causes contributing to 80% of variances
            </p>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <BeakerIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {searchTerm ? 'No root causes match your search' : 'No data available'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredData.map((item, index) => {
              const isVisible = visibleItems.has(index);
              return (
                <div
                  key={item.categoryId}
                  className={`bg-white/[0.02] rounded-xl p-4 border border-white/5 hover:border-white/10 hover:shadow-lg hover:shadow-blue-500/5 hover:scale-[1.01] hover:bg-white/[0.03] transition-all duration-300 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getCategoryColor(item.category) }}
                      />
                      <span className="font-medium text-white">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="text-gray-400">Count</p>
                        <p className="font-semibold text-white">{item.count}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400">Cumulative</p>
                        <p className="font-semibold text-white">
                          {formatPercent(item.cumulativePercent)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Variance bar */}
                  <div className="relative h-8 bg-gray-800/50 rounded-lg overflow-hidden group">
                    <div
                      className="absolute top-0 left-0 h-full rounded-lg opacity-80 transition-all duration-1000 ease-out group-hover:opacity-100"
                      style={{
                        width: isVisible ? `${(item.count / maxCount) * 100}%` : '0%',
                        backgroundColor: getCategoryColor(item.category),
                      }}
                    />
                    <div
                      className="absolute top-0 left-0 h-full rounded-lg opacity-30 transition-all duration-1000 ease-out delay-100 group-hover:opacity-50"
                      style={{
                        width: isVisible ? `${(item.totalVariance / maxVariance) * 100}%` : '0%',
                        backgroundColor: getCategoryColor(item.category),
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <span className="text-xs text-white/80">Variance: {item.totalVariance}</span>
                      <span className="text-xs text-white/80">Count: {item.count}</span>
                    </div>
                  </div>

                  {index === 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-400 animate-glow">
                      <LightBulbIcon className="h-3 w-3 animate-pulse" />
                      <span className="font-medium">
                        Top contributor - prioritize addressing this category
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/10 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded opacity-80 bg-blue-500" />
            <span className="text-gray-400">Incident Count</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded opacity-30 bg-blue-500" />
            <span className="text-gray-400">Total Variance</span>
          </div>
        </div>
      </div>
    );
  };

  // Category Breakdown Chart
  const CategoryBreakdownChart = ({
    data,
    searchTerm,
  }: {
    data: typeof categoryBreakdown;
    searchTerm?: string;
  }) => {
    const totalVariance = data.reduce((sum, item) => sum + item.totalVariance, 0);
    const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());

    // Staggered entrance animation
    useEffect(() => {
      data.forEach((_, index) => {
        setTimeout(() => {
          setVisibleCards(prev => new Set(prev).add(index));
        }, index * 80);
      });
      return () => setVisibleCards(new Set());
    }, [data]);

    // Filter data based on search term
    const filteredData = searchTerm
      ? data.filter(item => {
          const query = searchTerm.toLowerCase();
          return (
            item.category?.toLowerCase().includes(query) ||
            item.categoryId?.toLowerCase().includes(query)
          );
        })
      : data;

    const getTrendIcon = (trend: string) => {
      switch (trend) {
        case 'INCREASING':
          return <ArrowTrendingUpIcon className="h-4 w-4" />;
        case 'DECREASING':
          return <ArrowTrendingUpIcon className="h-4 w-4 rotate-180" />;
        default:
          return null;
      }
    };

    const getTrendColor = (trend: string) => {
      switch (trend) {
        case 'INCREASING':
          return 'text-red-400 bg-red-500/10';
        case 'DECREASING':
          return 'text-green-400 bg-green-500/10';
        default:
          return 'text-gray-400 bg-gray-500/10';
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10 animate-fade-in">
          <div className="p-2 rounded-lg bg-purple-500/10 animate-pulse-slow">
            <FunnelIcon className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Category Breakdown</h3>
            <p className="text-sm text-gray-400">
              Detailed analysis by root cause with trend indicators
            </p>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <BeakerIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {searchTerm ? 'No categories match your search' : 'No data available'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredData.map((item, index) => {
              const percentOfTotal = (item.totalVariance / totalVariance) * 100;
              const isVisible = visibleCards.has(index);
              return (
                <div
                  key={item.categoryId}
                  className={`bg-white/[0.02] rounded-xl p-4 border border-white/5 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-1 hover:bg-white/[0.04] ${
                    isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full animate-pulse-slow"
                        style={{ backgroundColor: getCategoryColor(item.category) }}
                      />
                      <h4 className="font-semibold text-white">{item.category}</h4>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all duration-300 hover:scale-105 ${getTrendColor(item.trend)}`}
                    >
                      {getTrendIcon(item.trend)}
                      {item.trend === 'INCREASING'
                        ? 'Rising'
                        : item.trend === 'DECREASING'
                          ? 'Falling'
                          : 'Stable'}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-black/20 rounded-lg p-3 transition-all duration-300 hover:bg-black/30 hover:scale-105">
                      <p className="text-xs text-gray-500 mb-1">Incidents</p>
                      <p className="text-lg font-bold text-white">{item.varianceCount}</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 transition-all duration-300 hover:bg-black/30 hover:scale-105">
                      <p className="text-xs text-gray-500 mb-1">Avg Variance</p>
                      <p className="text-lg font-bold text-white">
                        {formatPercent(item.averageVariancePercent)}
                      </p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 transition-all duration-300 hover:bg-black/30 hover:scale-105">
                      <p className="text-xs text-gray-500 mb-1">Total Variance</p>
                      <p className="text-lg font-bold text-white">{item.totalVariance}</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 transition-all duration-300 hover:bg-black/30 hover:scale-105">
                      <p className="text-xs text-gray-500 mb-1">% of Total</p>
                      <p className="text-lg font-bold text-white">
                        {formatPercent(percentOfTotal)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                      style={{
                        width: visibleCards.has(index) ? `${percentOfTotal}%` : '0%',
                        backgroundColor: getCategoryColor(item.category),
                      }}
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Trending Chart
  const TrendingChart = ({
    data,
    searchTerm,
  }: {
    data: typeof trendingData;
    searchTerm?: string;
  }) => {
    const [visibleTrends, setVisibleTrends] = useState<Set<number>>(new Set());

    // Staggered entrance animation
    useEffect(() => {
      data.forEach((_, index) => {
        setTimeout(() => {
          setVisibleTrends(prev => new Set(prev).add(index));
        }, index * 100);
      });
      return () => setVisibleTrends(new Set());
    }, [data]);

    // Filter data based on search term
    const filteredData = searchTerm
      ? data.filter(item => {
          const query = searchTerm.toLowerCase();
          return (
            item.category?.toLowerCase().includes(query) ||
            item.categoryId?.toLowerCase().includes(query)
          );
        })
      : data;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10 animate-fade-in">
          <div className="p-2 rounded-lg bg-amber-500/10 animate-pulse-slow">
            <ArrowTrendingUpIcon className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Trending Analysis</h3>
            <p className="text-sm text-gray-400">
              Categories showing significant changes over time
            </p>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <BeakerIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {searchTerm ? 'No trending causes match your search' : 'No data available'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredData.map((item, index) => (
              <div
                key={item.categoryId}
                className={`bg-white/[0.02] rounded-xl p-4 border border-white/5 hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-1 hover:bg-white/[0.04] ${
                  visibleTrends.has(index)
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-4'
                }`}
                style={{ transitionDelay: `${index * 75}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getCategoryColor(item.category) }}
                    />
                    <span className="font-medium text-white">{item.category}</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.trendDirection === 'UP'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {item.trendDirection === 'UP' ? '↑ Increasing' : '↓ Decreasing'}
                  </span>
                </div>

                {/* Period Comparison */}
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center p-3 bg-black/20 rounded-lg transition-all duration-300 hover:bg-black/30 hover:scale-105">
                    <p className="text-xs text-gray-500 mb-1">Previous Period</p>
                    <p className="text-lg font-bold text-white">{item.previousPeriodCount}</p>
                  </div>
                  <div className="text-center p-3 bg-black/20 rounded-lg transition-all duration-300 hover:bg-black/30 hover:scale-105">
                    <p className="text-xs text-gray-500 mb-1">Current Period</p>
                    <p className="text-lg font-bold text-white">{item.currentPeriodCount}</p>
                  </div>
                  <div
                    className={`text-center p-3 rounded-lg transition-all duration-300 hover:scale-105 ${
                      item.percentChange >= 0
                        ? 'bg-red-500/10 hover:bg-red-500/20'
                        : 'bg-green-500/10 hover:bg-green-500/20'
                    }`}
                  >
                    <p className="text-xs text-gray-500 mb-1">Change</p>
                    <p
                      className={`text-lg font-bold ${
                        item.percentChange >= 0 ? 'text-red-400' : 'text-green-400'
                      }`}
                    >
                      {item.percentChange >= 0 ? '+' : ''}
                      {formatPercent(Math.abs(item.percentChange))}
                    </p>
                  </div>
                </div>

                {/* Average Variance */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-sm text-gray-400">Average Variance</span>
                  <span className="font-semibold text-white">
                    {formatPercent(item.averageVariancePercent)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Root Cause Analysis
              </h1>
              <p className="text-gray-400 mt-1">
                Identify and categorize the underlying causes of inventory variances
              </p>
            </div>
            <CycleCountNavigation activePage="root-cause" />
          </div>

          {/* Filters Bar */}
          <Card variant="glass" className="p-4 animate-fade-in">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <FunnelIcon className="h-4 w-4" />
                <span>Time Period:</span>
              </div>
              <select
                value={filters.days}
                onChange={e => handleDaysChange(parseInt(e.target.value))}
                className="px-4 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 focus:scale-[1.02]"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
              <div className="flex-1 min-w-[200px] relative group">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 focus:scale-[1.01] focus:shadow-lg focus:shadow-blue-500/10"
                />
              </div>
              <button
                onClick={() => setUseSampleData(!useSampleData)}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
                  useSampleData
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 hover:border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/30 hover:bg-gray-700 hover:border-gray-500'
                }`}
              >
                {useSampleData ? '📊 Sample Data' : '🔄 Live Data'}
              </button>
            </div>
          </Card>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 bg-white/[0.02] backdrop-blur rounded-xl p-1.5 border border-white/5 overflow-x-auto animate-fade-in hover:bg-white/[0.03] hover:border-white/10 transition-all duration-300">
            <TabButton
              active={activeTab === 'pareto'}
              icon={<ChartBarIcon className="h-4 w-4" />}
              label="Pareto Analysis"
              onClick={() => setActiveTab('pareto')}
            />
            <TabButton
              active={activeTab === 'breakdown'}
              icon={<FunnelIcon className="h-4 w-4" />}
              label="Categories"
              onClick={() => setActiveTab('breakdown')}
            />
            <TabButton
              active={activeTab === 'trending'}
              icon={<ArrowTrendingUpIcon className="h-4 w-4" />}
              label="Trending"
              onClick={() => setActiveTab('trending')}
            />
            <TabButton
              active={activeTab === 'sku'}
              icon={<CubeIcon className="h-4 w-4" />}
              label="By SKU"
              onClick={() => setActiveTab('sku')}
            />
            <TabButton
              active={activeTab === 'zone'}
              icon={<MapPinIcon className="h-4 w-4" />}
              label="By Zone"
              onClick={() => setActiveTab('zone')}
            />
          </div>

          {/* Tab Content */}
          <Card variant="glass" className="p-6 min-h-[500px]">
            <div className="animate-fade-in">
              {activeTab === 'pareto' &&
                (isLoadingPareto ? (
                  <LoadingSkeleton />
                ) : (
                  <ParetoChart data={paretoData} searchTerm={searchQuery} />
                ))}

              {activeTab === 'breakdown' &&
                (isLoadingBreakdown ? (
                  <LoadingSkeleton />
                ) : (
                  <CategoryBreakdownChart data={categoryBreakdown} searchTerm={searchQuery} />
                ))}

              {activeTab === 'trending' &&
                (isLoadingTrending ? (
                  <LoadingSkeleton />
                ) : (
                  <TrendingChart data={trendingData} searchTerm={searchQuery} />
                ))}

              {activeTab === 'sku' && (
                <DrillDownView
                  type="SKU"
                  icon={<CubeIcon className="h-8 w-8" />}
                  placeholder="Enter SKU (e.g., ABC-12345)"
                  inputValue={skuInput}
                  onInputChange={setSkuInput}
                  onAnalyze={() => setFilters({ ...filters, sku: skuInput })}
                  currentValue={filters.sku}
                  description="Analyze root causes for a specific product or item"
                />
              )}

              {activeTab === 'zone' && (
                <DrillDownView
                  type="Zone"
                  icon={<MapPinIcon className="h-8 w-8" />}
                  placeholder="Enter zone (e.g., A, B, C)"
                  inputValue={zoneInput}
                  onInputChange={setZoneInput}
                  onAnalyze={() => setFilters({ ...filters, zone: zoneInput })}
                  currentValue={filters.zone}
                  description="Analyze root causes for a specific warehouse area"
                />
              )}
            </div>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              label="Total Recorded"
              value={paretoData.reduce((sum, item) => sum + item.count, 0).toString()}
              sublabel="Root cause incidents"
              color="blue"
            />
            <SummaryCard
              label="Top Contributor"
              value={paretoData[0]?.category || 'N/A'}
              sublabel={`${formatPercent(paretoData[0]?.cumulativePercent || 0)} of total`}
              color="purple"
            />
            <SummaryCard
              label="Analysis Period"
              value={`Last ${filters.days} days`}
              sublabel="Time range for data"
              color="green"
            />
          </div>

          {/* Insight Card */}
          {paretoData.length > 0 && (
            <Card
              variant="glass"
              className="p-5 border-l-4 border-l-amber-500 animate-fade-in hover:bg-white/[0.03] hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 group"
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors duration-300">
                    <LightBulbIcon className="h-6 w-6 text-amber-400 animate-pulse-slow" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Key Insight</h3>
                  <p className="text-gray-400">
                    <span className="font-semibold text-white">{paretoData[0]?.category}</span> is
                    the leading cause of inventory variances, accounting for{' '}
                    <span className="font-semibold text-amber-400">
                      {formatPercent(paretoData[0]?.cumulativePercent || 0)}
                    </span>{' '}
                    of all incidents. Addressing this category first could have the greatest impact
                    on reducing overall variance.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap overflow-hidden group ${
        active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
          : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
      }`}
    >
      {/* Ripple effect container */}
      <span className="absolute inset-0 overflow-hidden rounded-lg">
        <span
          className={`absolute inset-0 rounded-lg transition-transform duration-500 ${
            active ? 'bg-blue-400/20 scale-100' : 'bg-white/5 scale-0 group-hover:scale-100'
          }`}
        />
      </span>
      <span className="relative flex items-center gap-2">
        <span
          className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}
        >
          {icon}
        </span>
        {label}
      </span>
      {/* Active indicator */}
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white rounded-full animate-pulse" />
      )}
    </button>
  );
}

// Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-white/10 animate-fade-in">
        <Skeleton variant="rectangular" className="w-10 h-10 rounded-lg animate-pulse" />
        <div>
          <Skeleton variant="text" className="w-48 h-6" />
          <Skeleton variant="text" className="w-64 h-4 mt-1" />
        </div>
      </div>
      {[1, 2, 3].map((i, index) => (
        <div
          key={i}
          className={`bg-white/[0.02] rounded-xl p-4 border border-white/5 transition-all duration-500 ${
            index === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
          style={{
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'forwards',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Skeleton variant="rectangular" className="w-3 h-3 rounded-full animate-pulse" />
              <Skeleton variant="text" className="w-32 h-5" />
            </div>
            <div className="flex gap-4">
              <Skeleton variant="text" className="w-12 h-5" />
              <Skeleton variant="text" className="w-16 h-5" />
            </div>
          </div>
          <Skeleton
            variant="rectangular"
            className="w-full h-8 rounded-lg animate-shimmer bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 bg-[length:200%_100%]"
          />
        </div>
      ))}
    </div>
  );
}

// Drill Down View Component
function DrillDownView({
  type,
  icon,
  placeholder,
  inputValue,
  onInputChange,
  onAnalyze,
  currentValue,
  description,
}: {
  type: string;
  icon: React.ReactNode;
  placeholder: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onAnalyze: () => void;
  currentValue?: string;
  description: string;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center max-w-md mx-auto">
        <div className="inline-flex p-4 rounded-2xl bg-white/[0.02] mb-4 animate-float">{icon}</div>
        <h3 className="text-xl font-semibold text-white mb-2">Drill Down by {type}</h3>
        <p className="text-gray-400">{description}</p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 focus:scale-[1.02] focus:shadow-lg focus:shadow-blue-500/10"
          />
          <button
            onClick={onAnalyze}
            disabled={!inputValue}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 disabled:hover:scale-100"
          >
            Analyze
          </button>
        </div>
      </div>

      {currentValue ? (
        <div className="max-w-2xl mx-auto animate-scale-in">
          <div className="bg-white/[0.02] rounded-xl p-6 border border-white/5 text-center hover:bg-white/[0.03] hover:border-amber-500/20 transition-all duration-300">
            <ExclamationTriangleIcon className="h-12 w-12 text-amber-400 mx-auto mb-3 animate-pulse-slow" />
            <h4 className="text-lg font-semibold text-white mb-2">
              Analysis Results for {type}: {currentValue}
            </h4>
            <p className="text-gray-400">
              This feature requires additional data integration. Results will appear here once the
              backend service is configured to provide detailed root cause analysis by{' '}
              {type.toLowerCase()}.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 animate-fade-in">
          <BeakerIcon className="h-16 w-16 text-gray-700 mx-auto mb-4 animate-bounce-slow" />
          <p className="text-gray-500 max-w-md mx-auto">
            Enter a {type.toLowerCase()} above to view detailed root cause analysis for that
            specific category.
          </p>
        </div>
      )}
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  label,
  value,
  sublabel,
  color,
}: {
  label: string;
  value: string;
  sublabel: string;
  color: 'blue' | 'purple' | 'green';
}) {
  const colorClasses = {
    blue: 'border-l-blue-500 group-hover:border-l-blue-400',
    purple: 'border-l-purple-500 group-hover:border-l-purple-400',
    green: 'border-l-green-500 group-hover:border-l-green-400',
  };

  const shadowClasses = {
    blue: 'hover:shadow-blue-500/10',
    purple: 'hover:shadow-purple-500/10',
    green: 'hover:shadow-green-500/10',
  };

  const numericValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
  const animatedValue = useCounter(numericValue, 1500);
  const displayValue = value.match(/[A-Za-z]/) ? value : animatedValue.toString();

  return (
    <Card
      variant="glass"
      className={`p-5 border-l-4 ${colorClasses[color]} hover:bg-white/[0.03] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${shadowClasses[color]} group cursor-default`}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</p>
      <p className="text-2xl font-bold text-white mt-1 group-hover:scale-105 transition-transform duration-300">
        {displayValue}
      </p>
      <p className="text-sm text-gray-400 mt-1">{sublabel}</p>
    </Card>
  );
}

export default RootCauseAnalysisPage;
