/**
 * Route Optimization Page
 *
 * Provides UI for optimizing warehouse picking routes
 * Visualizes routes and compares different optimization strategies
 *
 * ============================================================================
 * AESTHETIC DIRECTION: PATH FINDER - GREEN/LIME NAVIGATION
 * ============================================================================
 * Navigation-focused optimization interface:
 * - Green/lime accent color system for path finding
 * - Scale-in entrance animations
 * - Route visualization with path tracing
 * - Algorithm comparison with performance metrics
 * - Location grid with waypoint markers
 * ============================================================================
 */

import { useState } from 'react';
import {
  MapIcon,
  ArrowPathIcon,
  PlayIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { Header, Button, Breadcrumb } from '@/components/shared';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// TYPES
// ============================================================================

interface OptimizedRoute {
  locations: string[];
  optimized_path: string[];
  total_distance_meters: number;
  estimated_time_minutes: number;
  algorithm?: string;
}

interface RouteComparison {
  comparison: Array<{
    algorithm: string;
    locations: string[];
    optimized_path: string[];
    total_distance_meters: number;
    estimated_time_minutes: number;
    error?: string;
  }>;
  best: string | null;
  best_distance: number;
  best_time: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RouteOptimizationPage() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<string[]>([]);
  const [startPoint, setStartPoint] = useState<string>('A-01-01');
  const [algorithm, setAlgorithm] = useState<'tsp' | 'nearest' | 'aisle' | 'zone'>('nearest');
  const [optimizing, setOptimizing] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<OptimizedRoute | null>(null);
  const [comparison, setComparison] = useState<RouteComparison | null>(null);
  const [view, setView] = useState<'optimize' | 'compare'>('optimize');

  const handleAddLocation = () => {
    if (locations.length < 50) {
      setLocations([...locations, '']);
    }
  };

  const handleLocationChange = (index: number, value: string) => {
    const newLocations = [...locations];
    newLocations[index] = value;
    setLocations(newLocations);
  };

  const handleRemoveLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleOptimize = async () => {
    const validLocations = locations.filter(l => l.trim() !== '');
    if (validLocations.length < 2) {
      return;
    }

    setOptimizing(true);
    setResult(null);

    try {
      const response = await fetch('/api/route-optimization/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: validLocations,
          startPoint,
          algorithm,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
      }
    } catch (error) {
      console.error('Optimization failed', error);
    } finally {
      setOptimizing(false);
    }
  };

  const handleCompare = async () => {
    const validLocations = locations.filter(l => l.trim() !== '');
    if (validLocations.length < 2) {
      return;
    }

    setComparing(true);
    setComparison(null);

    try {
      const response = await fetch('/api/route-optimization/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: validLocations,
          startPoint,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setComparison(data.data);
      }
    } catch (error) {
      console.error('Comparison failed', error);
    } finally {
      setComparing(false);
    }
  };

  const generateSampleLocations = () => {
    // Generate sample warehouse locations
    const sampleLocations = [
      'A-05-03',
      'A-12-08',
      'B-03-05',
      'B-15-12',
      'C-08-06',
      'C-18-15',
      'D-04-02',
      'D-10-09',
    ];
    setLocations(sampleLocations);
  };

  const getZoneColor = (zone: string) => {
    const colors: Record<string, string> = {
      A: 'route-zone-a',
      B: 'route-zone-b',
      C: 'route-zone-c',
      D: 'route-zone-d',
    };
    return colors[zone] || 'route-zone-default';
  };

  const parseLocation = (loc: string): { zone: string; aisle: number; shelf: number } | null => {
    const match = loc.match(/^([A-Z])-(\d+)-(\d+)$/);
    if (!match) return null;
    return {
      zone: match[1],
      aisle: parseInt(match[2], 10),
      shelf: parseInt(match[3], 10),
    };
  };

  return (
    <div className="min-h-screen route-page-container">
      <Header />
      {/* Atmospheric background */}
      <div className="route-atmosphere" aria-hidden="true" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-10">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Hero Header */}
        <div className="route-hero">
          <div className="route-hero-content">
            <div className="flex items-center gap-3 mb-3">
              <div className="route-icon-wrapper">
                <MapIcon className="h-6 w-6" />
              </div>
              <div className="route-badge-intelligent">
                <BoltIcon className="h-3 w-3 mr-1" />
                Smart Routing
              </div>
            </div>
            <h1 className="route-title">Route Optimization</h1>
            <p className="route-subtitle">
              Calculate optimal picking routes through warehouse locations
            </p>
          </div>
          <div className="route-hero-visual hidden md:block">
            <div className="route-path-visual">
              <svg viewBox="0 0 200 100" className="w-full h-full">
                <defs>
                  <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="50%" stopColor="#84cc16" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
                {/* Animated path */}
                <path
                  d="M10,50 Q40,20 70,50 T130,50 T190,50"
                  fill="none"
                  stroke="url(#pathGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="route-animated-path"
                />
                {/* Waypoint markers */}
                <circle cx="10" cy="50" r="6" className="route-waypoint route-waypoint-start" />
                <circle cx="70" cy="50" r="4" className="route-waypoint" />
                <circle cx="130" cy="50" r="4" className="route-waypoint" />
                <circle cx="190" cy="50" r="6" className="route-waypoint route-waypoint-end" />
              </svg>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="route-tabs">
          <nav className="route-tabs-nav">
            <button
              onClick={() => setView('optimize')}
              className={cn('route-tab', view === 'optimize' && 'route-tab-active')}
            >
              <PlayIcon className="h-4 w-4" />
              Optimize Route
            </button>
            <button
              onClick={() => setView('compare')}
              className={cn('route-tab', view === 'compare' && 'route-tab-active')}
            >
              <ChartBarIcon className="h-4 w-4" />
              Compare Strategies
            </button>
          </nav>
        </div>

        {/* Optimize View */}
        {view === 'optimize' && (
          <div className="route-optimize-view">
            <div className="route-grid-layout">
              {/* Location Input */}
              <div className="route-card route-locations-card">
                <div className="route-card-header">
                  <div className="route-card-icon">
                    <MapIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="route-card-title">Locations to Visit</h2>
                    <p className="route-card-description">Add warehouse locations to optimize</p>
                  </div>
                  <button onClick={generateSampleLocations} className="route-generate-btn">
                    Generate Sample
                  </button>
                </div>

                <div className="route-card-content">
                  <div className="route-locations-list">
                    {locations.length === 0 ? (
                      <div className="route-locations-empty">
                        <MapIcon className="h-8 w-8 mb-2" />
                        <p>No locations added yet</p>
                        <p className="text-xs">
                          Click "Add Location" or "Generate Sample" to start
                        </p>
                      </div>
                    ) : (
                      locations.map((location, index) => {
                        const parsed = parseLocation(location);
                        return (
                          <div
                            key={index}
                            className={cn(
                              'route-location-item',
                              parsed && getZoneColor(parsed.zone)
                            )}
                            style={{ animationDelay: `${index * 0.03}s` }}
                          >
                            <span className="route-location-index">{index + 1}</span>
                            <input
                              type="text"
                              value={location}
                              onChange={e => handleLocationChange(index, e.target.value)}
                              placeholder="A-01-01"
                              className="route-location-input"
                            />
                            <button
                              onClick={() => handleRemoveLocation(index)}
                              className="route-location-remove"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <button onClick={handleAddLocation} className="route-add-location">
                    + Add Location
                  </button>
                </div>
              </div>

              {/* Options Panel */}
              <div className="route-card route-options-card">
                <div className="route-card-header">
                  <div className="route-card-icon route-card-icon-alt">
                    <BoltIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="route-card-title">Options</h2>
                    <p className="route-card-description">Configure optimization parameters</p>
                  </div>
                </div>

                <div className="route-card-content">
                  <div className="route-option-group">
                    <label className="route-option-label">Start Point</label>
                    <input
                      type="text"
                      value={startPoint}
                      onChange={e => setStartPoint(e.target.value)}
                      placeholder="A-01-01"
                      className="route-option-input"
                    />
                    <p className="route-option-hint">Default starting location in warehouse</p>
                  </div>

                  <div className="route-option-group">
                    <label className="route-option-label">Algorithm</label>
                    <select
                      value={algorithm}
                      onChange={e => setAlgorithm(e.target.value as typeof algorithm)}
                      className="route-option-select"
                    >
                      <option value="nearest">Nearest Neighbor (Fast)</option>
                      <option value="tsp">Traveling Salesman (Optimal)</option>
                      <option value="aisle">Aisle-by-Aisle (S-Shape)</option>
                      <option value="zone">Zone-Based (Multi-Zone)</option>
                    </select>
                    <p className="route-option-hint">
                      {algorithm === 'nearest' && 'Quick approximation, good for most cases'}
                      {algorithm === 'tsp' && 'Most accurate, slower for large sets'}
                      {algorithm === 'aisle' && 'Best for high-density picking'}
                      {algorithm === 'zone' && 'Optimal for multi-zone warehouses'}
                    </p>
                  </div>

                  <div className="route-optimize-section">
                    <button
                      onClick={handleOptimize}
                      disabled={optimizing || locations.filter(l => l.trim()).length < 2}
                      className={cn(
                        'route-optimize-btn',
                        !optimizing && locations.filter(l => l.trim()).length >= 2
                          ? 'route-optimize-btn-active'
                          : 'route-optimize-btn-disabled'
                      )}
                    >
                      {optimizing ? (
                        <>
                          <div className="route-spinner" />
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-5 w-5" />
                          Optimize Route
                        </>
                      )}
                    </button>
                    <p className="route-optimize-hint">
                      {locations.filter(l => l.trim()).length < 2
                        ? 'Add at least 2 locations to optimize'
                        : `${locations.filter(l => l.trim()).length} locations ready`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            {result && (
              <RouteResult
                result={result}
                getZoneColor={getZoneColor}
                parseLocation={parseLocation}
              />
            )}
          </div>
        )}

        {/* Compare View */}
        {view === 'compare' && (
          <div className="route-compare-view">
            <div className="route-card">
              <div className="route-card-header">
                <div className="route-card-icon route-card-icon-compare">
                  <ChartBarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="route-card-title">Compare Algorithms</h2>
                  <p className="route-card-description">See how different strategies perform</p>
                </div>
                <button
                  onClick={handleCompare}
                  disabled={comparing || locations.filter(l => l.trim()).length < 2}
                  className={cn(
                    'route-compare-btn',
                    !comparing && locations.filter(l => l.trim()).length >= 2
                      ? 'route-compare-btn-active'
                      : 'route-compare-btn-disabled'
                  )}
                >
                  {comparing ? (
                    <>
                      <div className="route-spinner" />
                      Comparing...
                    </>
                  ) : (
                    <>
                      <ChartBarIcon className="h-4 w-4" />
                      Compare All
                    </>
                  )}
                </button>
              </div>

              <div className="route-card-content">
                {comparison ? (
                  <ComparisonResults comparison={comparison} />
                ) : (
                  <div className="route-compare-empty">
                    <ChartBarIcon className="h-10 w-10 mb-3" />
                    <p className="text-lg font-medium">No comparison yet</p>
                    <p className="text-sm">
                      Add locations and click "Compare All" to see algorithm performance
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// ROUTE RESULT COMPONENT
// ============================================================================

interface RouteResultProps {
  result: OptimizedRoute;
  getZoneColor: (zone: string) => string;
  parseLocation: (loc: string) => { zone: string; aisle: number; shelf: number } | null;
}

function RouteResult({ result, getZoneColor, parseLocation }: RouteResultProps) {
  return (
    <div className="route-result-section">
      <div className="route-card">
        <div className="route-card-header">
          <div className="route-card-icon route-card-icon-success">
            <CheckCircleIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="route-card-title">Optimization Result</h2>
            <p className="route-card-description">Optimized path calculated</p>
          </div>
          <div className="route-result-metrics">
            <div className="route-metric route-metric-distance">
              <ArrowsRightLeftIcon className="h-4 w-4" />
              <span>{result.total_distance_meters}m</span>
            </div>
            <div className="route-metric route-metric-time">
              <ClockIcon className="h-4 w-4" />
              <span>{result.estimated_time_minutes}min</span>
            </div>
          </div>
        </div>

        <div className="route-card-content">
          {/* Optimized Path */}
          <div className="route-path-section">
            <h3 className="route-path-title">Optimized Path</h3>
            <div className="route-path-flow">
              {result.optimized_path.map((location, index) => {
                const parsed = parseLocation(location);
                return (
                  <div key={location} className="route-path-item-wrapper">
                    <div className={cn('route-path-item', parsed && getZoneColor(parsed.zone))}>
                      <span className="route-path-index">{index + 1}</span>
                      <span className="route-path-location">{location}</span>
                    </div>
                    {index < result.optimized_path.length - 1 && (
                      <div className="route-path-arrow">→</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Statistics */}
          <div className="route-stats-grid">
            <div className="route-stat-card">
              <div className="route-stat-icon route-stat-icon-locations">
                <MapIcon className="h-5 w-5" />
              </div>
              <div className="route-stat-content">
                <p className="route-stat-label">Total Locations</p>
                <p className="route-stat-value">{result.locations.length}</p>
              </div>
            </div>
            <div className="route-stat-card">
              <div className="route-stat-icon route-stat-icon-distance">
                <ArrowsRightLeftIcon className="h-5 w-5" />
              </div>
              <div className="route-stat-content">
                <p className="route-stat-label">Total Distance</p>
                <p className="route-stat-value route-stat-value-green">
                  {result.total_distance_meters}m
                </p>
              </div>
            </div>
            <div className="route-stat-card">
              <div className="route-stat-icon route-stat-icon-time">
                <ClockIcon className="h-5 w-5" />
              </div>
              <div className="route-stat-content">
                <p className="route-stat-label">Est. Time</p>
                <p className="route-stat-value route-stat-value-lime">
                  {result.estimated_time_minutes}m
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPARISON RESULTS COMPONENT
// ============================================================================

interface ComparisonResultsProps {
  comparison: RouteComparison;
}

function ComparisonResults({ comparison }: ComparisonResultsProps) {
  return (
    <div className="route-comparison-section">
      {/* Best Result Summary */}
      {comparison.best && (
        <div className="route-best-result">
          <div className="route-best-icon">
            <CheckCircleIcon className="h-5 w-5" />
          </div>
          <div className="route-best-content">
            <span className="route-best-label">Best Strategy</span>
            <span className="route-best-value">{comparison.best}</span>
          </div>
          <div className="route-best-metrics">
            <div className="route-best-metric">
              <span className="route-best-metric-value">{comparison.best_distance}m</span>
              <span className="route-best-metric-label">Distance</span>
            </div>
            <div className="route-best-metric">
              <span className="route-best-metric-value">{comparison.best_time}m</span>
              <span className="route-best-metric-label">Time</span>
            </div>
          </div>
        </div>
      )}

      {/* Comparison List */}
      <div className="route-comparison-list">
        {comparison.comparison
          .filter(r => !r.error)
          .sort((a, b) => a.total_distance_meters - b.total_distance_meters)
          .map((result, index) => (
            <div
              key={result.algorithm}
              className={cn(
                'route-comparison-item',
                result.algorithm === comparison.best && 'route-comparison-best'
              )}
            >
              <div className="route-comparison-rank">
                <span className="route-comparison-rank-number">{index + 1}</span>
              </div>
              <div className="route-comparison-info">
                <h3 className="route-comparison-name">
                  {result.algorithm === 'tsp' && 'Traveling Salesman'}
                  {result.algorithm === 'nearest' && 'Nearest Neighbor'}
                  {result.algorithm === 'aisle' && 'Aisle-by-Aisle'}
                  {result.algorithm === 'zone' && 'Zone-Based'}
                </h3>
                <p className="route-comparison-description">
                  {result.algorithm === 'tsp' && 'Optimal for small sets'}
                  {result.algorithm === 'nearest' && 'Fast, good approximation'}
                  {result.algorithm === 'aisle' && 'Best for high-density picking'}
                  {result.algorithm === 'zone' && 'Optimal for multi-zone'}
                </p>
              </div>
              <div className="route-comparison-metrics">
                <div className="route-comparison-metric route-comparison-distance">
                  {result.total_distance_meters}m
                </div>
                <div className="route-comparison-metric route-comparison-time">
                  {result.estimated_time_minutes}m
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
export default RouteOptimizationPage;
