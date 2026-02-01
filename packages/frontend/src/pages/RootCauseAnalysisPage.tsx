/**
 * Root Cause Analysis Page
 *
 * Analytics page for variance root cause categorization with Pareto analysis,
 * category breakdown, trending analysis, and drill-down capabilities by SKU and zone.
 */

import { useState } from 'react';
import {
  useRootCausePareto,
  useRootCauseCategoryBreakdown,
  useRootCauseTrending,
} from '@/services/api';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface FilterState {
  days: number;
  category?: string;
  sku?: string;
  zone?: string;
}

export function RootCauseAnalysisPage() {
  const [filters, setFilters] = useState<FilterState>({ days: 30 });
  const [activeTab, setActiveTab] = useState<'pareto' | 'breakdown' | 'trending' | 'sku' | 'zone'>(
    'pareto'
  );
  const [skuInput, setSkuInput] = useState('');
  const [zoneInput, setZoneInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const { data: paretoData = [], isLoading: isLoadingPareto } = useRootCausePareto(filters.days);
  const { data: categoryBreakdown = [], isLoading: isLoadingBreakdown } =
    useRootCauseCategoryBreakdown(filters.days);
  const { data: trendingData = [], isLoading: isLoadingTrending } = useRootCauseTrending(
    filters.days
  );

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
      <div className="pareto-chart">
        <div className="chart-header">
          <h3>Pareto Analysis (80/20 Rule)</h3>
          <p className="subtitle">Top root causes contributing to 80% of variances</p>
        </div>

        <div className="chart-body">
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchTerm ? 'No root causes match your search' : 'No data available'}
            </div>
          ) : (
            filteredData.map(item => (
              <div key={item.categoryId} className="pareto-bar-container">
                <div className="bar-label">{item.category}</div>
                <div className="bar-wrapper">
                  <div
                    className="bar-fill-count"
                    style={{
                      width: `${(item.count / maxCount) * 100}%`,
                      backgroundColor: getCategoryColor(item.category),
                    }}
                  />
                  <div
                    className="bar-fill-variance"
                    style={{
                      width: `${(item.totalVariance / maxVariance) * 100}%`,
                      backgroundColor: `${getCategoryColor(item.category)}40`,
                    }}
                  />
                </div>
                <div className="bar-values">
                  <span className="count">{item.count}</span>
                  <span className="percent">{formatPercent(item.cumulativePercent)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#3B82F6' }} />
            <span>Count</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#3B82F640' }} />
            <span>Total Variance</span>
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
      <div className="category-breakdown-chart">
        <div className="chart-header">
          <h3>Category Breakdown</h3>
          <p className="subtitle">Detailed breakdown by root cause category with trends</p>
        </div>

        <div className="chart-grid">
          {filteredData.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-400">
              {searchTerm ? 'No categories match your search' : 'No data available'}
            </div>
          ) : (
            filteredData.map(item => (
              <div key={item.categoryId} className="category-card">
                <div className="card-header">
                  <h4>{item.category}</h4>
                  <span className={`trend-badge ${item.trend.toLowerCase()}`}>
                    {item.trend === 'INCREASING' && '↑'}
                    {item.trend === 'DECREASING' && '↓'}
                    {item.trend === 'STABLE' && '→'}
                    {item.trendPercent && ` ${formatPercent(item.trendPercent)}`}
                  </span>
                </div>

                <div className="card-stats">
                  <div className="stat">
                    <span className="label">Variance Count</span>
                    <span className="value">{item.varianceCount}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Avg Variance</span>
                    <span className="value">{formatPercent(item.averageVariancePercent)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Total Variance</span>
                    <span className="value">{item.totalVariance}</span>
                  </div>
                  <div className="stat">
                    <span className="label">% of Total</span>
                    <span className="value">
                      {formatPercent((item.totalVariance / totalVariance) * 100)}
                    </span>
                  </div>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(item.totalVariance / totalVariance) * 100}%`,
                      backgroundColor: getCategoryColor(item.category),
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
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
      <div className="trending-chart">
        <div className="chart-header">
          <h3>Trending Root Causes</h3>
          <p className="subtitle">Categories with significant changes</p>
        </div>

        <div className="trending-list">
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchTerm ? 'No trending causes match your search' : 'No data available'}
            </div>
          ) : (
            filteredData.map(item => (
              <div key={item.categoryId} className="trending-item">
                <div className="item-header">
                  <span className="category">{item.category}</span>
                  <span className={`direction ${item.trendDirection.toLowerCase()}`}>
                    {item.trendDirection === 'UP' ? '⬆️ Increasing' : '⬇️ Decreasing'}
                  </span>
                </div>

                <div className="item-stats">
                  <div className="stat-comparison">
                    <span className="period">Previous: {item.previousPeriodCount}</span>
                    <span className="period">Current: {item.currentPeriodCount}</span>
                  </div>
                  <div className="percent-change">
                    Change:{' '}
                    <span className={item.percentChange >= 0 ? 'positive' : 'negative'}>
                      {formatPercent(Math.abs(item.percentChange))}
                    </span>
                  </div>
                </div>

                <div className="avg-variance">
                  Avg Variance: {formatPercent(item.averageVariancePercent)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="root-cause-analysis-page">
      <div className="page-header">
        <h1>Root Cause Analysis</h1>
        <div className="header-actions">
          <select
            value={filters.days}
            onChange={e => handleDaysChange(parseInt(e.target.value))}
            className="select"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'pareto' ? 'active' : ''}`}
          onClick={() => setActiveTab('pareto')}
        >
          Pareto Analysis
        </button>
        <button
          className={`tab ${activeTab === 'breakdown' ? 'active' : ''}`}
          onClick={() => setActiveTab('breakdown')}
        >
          Category Breakdown
        </button>
        <button
          className={`tab ${activeTab === 'trending' ? 'active' : ''}`}
          onClick={() => setActiveTab('trending')}
        >
          Trending
        </button>
        <button
          className={`tab ${activeTab === 'sku' ? 'active' : ''}`}
          onClick={() => setActiveTab('sku')}
        >
          By SKU
        </button>
        <button
          className={`tab ${activeTab === 'zone' ? 'active' : ''}`}
          onClick={() => setActiveTab('zone')}
        >
          By Zone
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'pareto' &&
          (isLoadingPareto ? (
            <div className="loading">Loading...</div>
          ) : (
            <ParetoChart data={paretoData} searchTerm={searchQuery} />
          ))}

        {activeTab === 'breakdown' &&
          (isLoadingBreakdown ? (
            <div className="loading">Loading...</div>
          ) : (
            <CategoryBreakdownChart data={categoryBreakdown} searchTerm={searchQuery} />
          ))}

        {activeTab === 'trending' &&
          (isLoadingTrending ? (
            <div className="loading">Loading...</div>
          ) : (
            <TrendingChart data={trendingData} searchTerm={searchQuery} />
          ))}

        {activeTab === 'sku' && (
          <div className="sku-drilldown">
            <div className="drilldown-header">
              <h3>Drill Down by SKU</h3>
              <div className="search-input">
                <input
                  type="text"
                  value={skuInput}
                  onChange={e => setSkuInput(e.target.value)}
                  placeholder="Enter SKU..."
                  className="input"
                />
                <button
                  onClick={() => setFilters({ ...filters, sku: skuInput })}
                  className="btn btn-primary"
                  disabled={!skuInput}
                >
                  Analyze
                </button>
              </div>
            </div>

            {filters.sku && (
              <div className="sku-results">
                {/* Results would be fetched using useRootCauseBySKU hook */}
                <p>Analysis for SKU: {filters.sku}</p>
              </div>
            )}

            {!filters.sku && (
              <div className="empty-state">
                <p>Enter an SKU to view root cause analysis for that specific item.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'zone' && (
          <div className="zone-drilldown">
            <div className="drilldown-header">
              <h3>Drill Down by Zone</h3>
              <div className="search-input">
                <input
                  type="text"
                  value={zoneInput}
                  onChange={e => setZoneInput(e.target.value)}
                  placeholder="Enter zone..."
                  className="input"
                />
                <button
                  onClick={() => setFilters({ ...filters, zone: zoneInput })}
                  className="btn btn-primary"
                  disabled={!zoneInput}
                >
                  Analyze
                </button>
              </div>
            </div>

            {filters.zone && (
              <div className="zone-results">
                {/* Results would be fetched using useRootCauseByZone hook */}
                <p>Analysis for Zone: {filters.zone}</p>
              </div>
            )}

            {!filters.zone && (
              <div className="empty-state">
                <p>Enter a zone to view root cause analysis for that specific warehouse area.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-card">
          <span className="label">Total Root Causes Recorded</span>
          <span className="value">{paretoData.reduce((sum, item) => sum + item.count, 0)}</span>
        </div>
        <div className="stat-card">
          <span className="label">Top Contributing Cause</span>
          <span className="value">{paretoData[0]?.category || 'N/A'}</span>
        </div>
        <div className="stat-card">
          <span className="label">Analysis Period</span>
          <span className="value">Last {filters.days} days</span>
        </div>
      </div>
    </div>
  );
}

export default RootCauseAnalysisPage;
