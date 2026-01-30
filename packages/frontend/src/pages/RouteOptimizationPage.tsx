/**
 * Route Optimization Page
 *
 * Provides UI for optimizing warehouse picking routes
 * Visualizes routes and compares different optimization strategies
 */

import { useState } from 'react';
import {
  MapIcon,
  ArrowPathIcon,
  PlayIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  SignalIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Header, useToast } from '@/components/shared';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface Location {
  location: string;
  zone: string;
  aisle: number;
  shelf: number;
}

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

interface Waypoint {
  location: string;
  sequence: number;
  coordinates: { x: number; y: number };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RouteOptimizationPage() {
  const [locations, setLocations] = useState<string[]>([]);
  const [startPoint, setStartPoint] = useState<string>('A-01-01');
  const [algorithm, setAlgorithm] = useState<'tsp' | 'nearest' | 'aisle' | 'zone'>('nearest');
  const [optimizing, setOptimizing] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<OptimizedRoute | null>(null);
  const [comparison, setComparison] = useState<RouteComparison | null>(null);
  const [view, setView] = useState<'optimize' | 'compare'>('optimize');
  const [searchQuery, setSearchQuery] = useState('');

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

  const generateWarehouseLayout = () => {
    // Generate sample warehouse locations
    const sampleLocations = [
      'A-05-03', 'A-12-08', 'B-03-05', 'B-15-12',
      'C-08-06', 'C-18-15', 'D-04-02', 'D-10-09'
    ];
    setLocations(sampleLocations);
  };

  const getZoneColor = (zone: string) => {
    const colors: Record<string, string> = {
      'A': 'bg-blue-500/20 border-blue-500/30',
      'B': 'bg-green-500/20 border-green-500/30',
      'C': 'bg-yellow-500/20 border-yellow-500/30',
      'D': 'bg-purple-500/20 border-purple-500/30',
    };
    return colors[zone] || 'bg-gray-500/20 border-gray-500/30';
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
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Route Optimization</h1>
          <p className="mt-2 text-gray-400">
            Calculate optimal picking routes through warehouse locations
          </p>
        </div>

        {/* View Toggle */}
        <div className="mb-6 border-b border-gray-800">
          <nav className="flex space-x-8">
            <button
              onClick={() => setView('optimize')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                view === 'optimize'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              Optimize Route
            </button>
            <button
              onClick={() => setView('compare')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                view === 'compare'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              Compare Strategies
            </button>
          </nav>
        </div>

        {/* Optimize View */}
        {view === 'optimize' && (
          <div className="space-y-6">
            {/* Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Location Input */}
              <div className="lg:col-span-2 glass-card rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MapIcon className="h-5 w-5 text-blue-400" />
                    Locations to Visit
                  </h2>
                  <button
                    onClick={generateWarehouseLayout}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Generate Sample
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  {(() => {
                    const filteredLocations = searchQuery
                      ? locations.filter(loc => {
                          const query = searchQuery.toLowerCase();
                          return loc.toLowerCase().includes(query);
                        })
                      : locations;

                    return filteredLocations.length === 0 && searchQuery ? (
                      <div className="text-center py-4 text-gray-400">
                        No locations match your search
                      </div>
                    ) : (
                      filteredLocations.map((location, index) => {
                        const actualIndex = locations.indexOf(location);
                        const parsed = parseLocation(location);
                        return (
                          <div key={actualIndex} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-6">{actualIndex + 1}.</span>
                            <input
                              type="text"
                              value={location}
                              onChange={(e) => handleLocationChange(actualIndex, e.target.value)}
                              placeholder="A-01-01"
                              className={cn(
                                'flex-1 px-3 py-2 rounded-md bg-black/20 border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono',
                                parsed ? getZoneColor(parsed.zone) : 'border-white/[0.08]'
                              )}
                            />
                            <button
                              onClick={() => handleRemoveLocation(actualIndex)}
                              className="p-2 text-red-400 hover:text-red-300 rounded hover:bg-red-900/30"
                            >
                              <XCircleIcon className="h-5 w-5" />
                            </button>
                          </div>
                        );
                      })
                    );
                  })()}
                </div>

                <button
                  onClick={handleAddLocation}
                  className="w-full px-4 py-2 border border-dashed border-gray-700 rounded-md text-gray-400 hover:text-white hover:border-gray-600 text-sm"
                >
                  + Add Location
                </button>
              </div>

              {/* Options */}
              <div className="glass-card rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Options</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Start Point</label>
                    <input
                      type="text"
                      value={startPoint}
                      onChange={(e) => setStartPoint(e.target.value)}
                      placeholder="A-01-01"
                      className="w-full px-3 py-2 rounded-md bg-black/20 border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Algorithm</label>
                    <select
                      value={algorithm}
                      onChange={(e) => setAlgorithm(e.target.value as typeof algorithm)}
                      className="w-full px-3 py-2 rounded-md bg-black/20 border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="nearest">Nearest Neighbor (Fast)</option>
                      <option value="tsp">Traveling Salesman (Optimal)</option>
                      <option value="aisle">Aisle-by-Aisle (S-Shape)</option>
                      <option value="zone">Zone-Based (Multi-Zone)</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <button
                      onClick={handleOptimize}
                      disabled={optimizing || locations.filter(l => l.trim()).length < 2}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors',
                        (!optimizing && locations.filter(l => l.trim()).length >= 2)
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      )}
                    >
                      {optimizing ? (
                        <>
                          <ArrowPathIcon className="h-5 w-5 animate-spin" />
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-5 w-5" />
                          Optimize Route
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            {result && (
              <RouteResult result={result} getZoneColor={getZoneColor} parseLocation={parseLocation} />
            )}
          </div>
        )}

        {/* Compare View */}
        {view === 'compare' && (
          <div className="space-y-6">
            <div className="glass-card rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Compare Strategies</h2>
                <button
                  onClick={handleCompare}
                  disabled={comparing || locations.filter(l => l.trim()).length < 2}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors',
                    (!comparing && locations.filter(l => l.trim()).length >= 2)
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {comparing ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Comparing...
                    </>
                  ) : (
                    <>
                      <ChartBarIcon className="h-5 w-5" />
                      Compare All
                    </>
                  )}
                </button>
              </div>

              {comparison && (
                <ComparisonResults comparison={comparison} getZoneColor={getZoneColor} parseLocation={parseLocation} />
              )}
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
    <div className="glass-card rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Optimization Result</h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-green-400">
            <ArrowsRightLeftIcon className="h-4 w-4" />
            <span>{result.total_distance_meters}m</span>
          </div>
          <div className="flex items-center gap-1 text-blue-400">
            <ClockIcon className="h-4 w-4" />
            <span>{result.estimated_time_minutes}min</span>
          </div>
        </div>
      </div>

      {/* Optimized Path */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-400">Optimized Path:</h3>
        <div className="flex flex-wrap gap-2">
          {result.optimized_path.map((location, index) => {
            const parsed = parseLocation(location);
            return (
              <div
                key={location}
                className={cn(
                  'px-3 py-1.5 rounded-md border text-sm font-mono',
                  parsed ? getZoneColor(parsed.zone) : 'border-gray-700'
                )}
              >
                <span className="text-gray-400 mr-1">{index + 1}.</span>
                {location}
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-black/20 border border-white/[0.08]">
          <div className="text-xs text-gray-400 mb-1">Total Locations</div>
          <div className="text-2xl font-bold text-white">{result.locations.length}</div>
        </div>
        <div className="p-4 rounded-lg bg-black/20 border border-white/[0.08]">
          <div className="text-xs text-gray-400 mb-1">Total Distance</div>
          <div className="text-2xl font-bold text-green-400">{result.total_distance_meters}m</div>
        </div>
        <div className="p-4 rounded-lg bg-black/20 border border-white/[0.08]">
          <div className="text-xs text-gray-400 mb-1">Est. Time</div>
          <div className="text-2xl font-bold text-blue-400">{result.estimated_time_minutes}m</div>
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
  getZoneColor: (zone: string) => string;
  parseLocation: (loc: string) => { zone: string; aisle: number; shelf: number } | null;
}

function ComparisonResults({ comparison, getZoneColor, parseLocation }: ComparisonResultsProps) {
  return (
    <div className="space-y-6">
      {/* Best Result Summary */}
      {comparison.best && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircleIcon className="h-5 w-5" />
            <span className="font-semibold">Best Strategy: {comparison.best}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Distance: </span>
              <span className="ml-2 font-medium text-white">{comparison.best_distance}m</span>
            </div>
            <div>
              <span className="text-gray-400">Time: </span>
              <span className="ml-2 font-medium text-white">{comparison.best_time}m</span>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="space-y-4">
        {comparison.comparison
          .filter(r => !r.error)
          .sort((a, b) => a.total_distance_meters - b.total_distance_meters)
          .map((result, index) => (
            <div
              key={result.algorithm}
              className={cn(
                'p-4 rounded-lg border transition-all',
                result.algorithm === comparison.best
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-white/5 border-white/[0.08]'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    result.algorithm === comparison.best
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-700 text-gray-300'
                  )}>
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-white capitalize">{result.algorithm} Algorithm</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {result.algorithm === 'tsp' && 'Optimal for small sets'}
                      {result.algorithm === 'nearest' && 'Fast, good approximation'}
                      {result.algorithm === 'aisle' && 'Best for high-density picking'}
                      {result.algorithm === 'zone' && 'Optimal for multi-zone'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-green-400">{result.total_distance_meters}m</div>
                  <div className="text-blue-400">{result.estimated_time_minutes}m</div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
export default RouteOptimizationPage;
