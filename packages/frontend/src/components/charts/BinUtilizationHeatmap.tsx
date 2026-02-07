/**
 * Bin Utilization Heatmap Component
 *
 * Visual grid showing warehouse bin capacity utilization
 * Uses color intensity to indicate capacity usage (green = OK, red = over capacity)
 */

import { Card, CardHeader, CardTitle, CardContent, Skeleton } from '@/components/shared';
import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface BinUtilization {
  binLocation: string;
  zone: string;
  capacityType: 'WEIGHT' | 'VOLUME' | 'QUANTITY';
  maximumCapacity: number;
  currentUtilization: number;
  availableCapacity: number;
  utilizationPercent: number;
  status: 'OK' | 'WARNING' | 'OVER_CAPACITY';
  itemsCount: number;
}

interface BinUtilizationHeatmapProps {
  data?: BinUtilization[];
  zoneSummary?: Array<{
    zone: string;
    totalBins: number;
    occupiedBins: number;
    averageUtilization: number;
    overCapacityBins: number;
  }>;
  isLoading?: boolean;
}

type ZoneFilter = 'ALL' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J';

const ZONE_OPTIONS: { value: ZoneFilter; label: string }[] = [
  { value: 'ALL', label: 'All Zones' },
  { value: 'A', label: 'Zone A' },
  { value: 'B', label: 'Zone B' },
  { value: 'C', label: 'Zone C' },
  { value: 'D', label: 'Zone D' },
  { value: 'E', label: 'Zone E' },
];

function getUtilizationColor(percent: number, status: string): string {
  if (status === 'OVER_CAPACITY') return 'rgba(239, 68, 68, 0.8)'; // red
  if (status === 'WARNING') return 'rgba(245, 158, 11, 0.8)'; // amber
  if (percent >= 80) return 'rgba(251, 191, 36, 0.8)'; // yellow
  if (percent >= 60) return 'rgba(16, 185, 129, 0.8)'; // emerald
  if (percent >= 40) return 'rgba(59, 130, 246, 0.8)'; // blue
  return 'rgba(107, 114, 128, 0.8)'; // gray (empty)
}

function getStatusTextColor(status: string): string {
  if (status === 'OVER_CAPACITY') return 'text-red-400';
  if (status === 'WARNING') return 'text-amber-400';
  return 'text-emerald-400';
}

export function BinUtilizationHeatmap({
  data,
  zoneSummary,
  isLoading,
}: BinUtilizationHeatmapProps) {
  const [selectedZone, setSelectedZone] = useState<ZoneFilter>('ALL');
  const [selectedBin, setSelectedBin] = useState<BinUtilization | null>(null);

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Bin Utilization</CardTitle>
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
          <CardTitle>Bin Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center dark:text-gray-400 text-gray-500">
            No bin utilization data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter bins by zone
  const filteredBins =
    selectedZone === 'ALL'
      ? data
      : data.filter(bin => bin.zone === selectedZone);

  // Group bins by zone for display
  const binsByZone = filteredBins.reduce((acc, bin) => {
    if (!acc[bin.zone]) acc[bin.zone] = [];
    acc[bin.zone].push(bin);
    return acc;
  }, {} as Record<string, BinUtilization[]>);

  const sortedZones = Object.keys(binsByZone).sort();

  return (
    <Card variant="glass" className="card-hover">
      <CardHeader className="!flex-row !items-center !justify-between !space-y-0 flex-wrap gap-2">
        <CardTitle>Bin Utilization</CardTitle>
        <ZoneFilter value={selectedZone} onChange={setSelectedZone} />
      </CardHeader>
      <CardContent>
        {/* Zone Summary Cards */}
        {zoneSummary && zoneSummary.length > 0 && (
          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {zoneSummary
              .filter(z => selectedZone === 'ALL' || z.zone === selectedZone)
              .slice(0, 4)
              .map(zone => (
                <div
                  key={zone.zone}
                  className="p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="text-xs text-gray-400 mb-1">Zone {zone.zone}</div>
                  <div className="text-2xl font-bold text-white">
                    {Math.round(zone.averageUtilization)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {zone.occupiedBins}/{zone.totalBins} bins
                    {zone.overCapacityBins > 0 && (
                      <span className="ml-2 text-red-400">
                        ({zone.overCapacityBins} over)
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Heatmap Grid */}
        <div className="space-y-4">
          {sortedZones.map(zone => (
            <div key={zone}>
              <div className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <span>Zone {zone}</span>
                <span className="text-xs text-gray-500">
                  ({binsByZone[zone].length} bins)
                </span>
              </div>
              <div className="grid grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-1">
                {binsByZone[zone]
                  .sort((a, b) => a.binLocation.localeCompare(b.binLocation))
                  .map(bin => (
                    <div
                      key={bin.binLocation}
                      className="relative aspect-square rounded cursor-pointer transition-transform hover:scale-110 hover:z-10"
                      style={{
                        backgroundColor: getUtilizationColor(
                          bin.utilizationPercent,
                          bin.status
                        ),
                      }}
                      onClick={() => setSelectedBin(bin)}
                      title={`${bin.binLocation}: ${bin.utilizationPercent.toFixed(1)}%`}
                    >
                      {/* Bin label */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white drop-shadow-lg">
                          {bin.binLocation.split('-').pop()}
                        </span>
                      </div>

                      {/* Over capacity indicator */}
                      {bin.status === 'OVER_CAPACITY' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(107, 114, 128, 0.8)' }} />
            <span className="dark:text-gray-400 text-gray-600">Empty (&lt;40%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.8)' }} />
            <span className="dark:text-gray-400 text-gray-600">Low (40-60%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.8)' }} />
            <span className="dark:text-gray-400 text-gray-600">Good (60-80%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(251, 191, 36, 0.8)' }} />
            <span className="dark:text-gray-400 text-gray-600">High (80-100%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.8)' }} />
            <span className="dark:text-gray-400 text-gray-600">Warning</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }} />
            <span className="dark:text-gray-400 text-gray-600">Over Capacity</span>
          </div>
        </div>

        {/* Selected Bin Details Modal */}
        {selectedBin && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedBin(null)}
          >
            <div
              className="max-w-md w-full dark:bg-gray-900 bg-white rounded-xl border border-white/20 shadow-2xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{selectedBin.binLocation}</h3>
                <button
                  onClick={() => setSelectedBin(null)}
                  className="dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-black"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Zone:</span>
                  <span className="text-white font-medium">{selectedBin.zone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Capacity Type:</span>
                  <span className="text-white font-medium">{selectedBin.capacityType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current:</span>
                  <span className="text-white font-medium">
                    {selectedBin.currentUtilization} / {selectedBin.maximumCapacity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Utilization:</span>
                  <span
                    className={`font-bold ${getStatusTextColor(selectedBin.status)}`}
                  >
                    {selectedBin.utilizationPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Available:</span>
                  <span className="text-white font-medium">
                    {selectedBin.availableCapacity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Items Stored:</span>
                  <span className="text-white font-medium">{selectedBin.itemsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span
                    className={`font-medium ${
                      selectedBin.status === 'OVER_CAPACITY'
                        ? 'text-red-400'
                        : selectedBin.status === 'WARNING'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                    }`}
                  >
                    {selectedBin.status === 'OVER_CAPACITY'
                      ? 'Over Capacity'
                      : selectedBin.status === 'WARNING'
                        ? 'Near Capacity'
                        : 'Normal'}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      selectedBin.status === 'OVER_CAPACITY'
                        ? 'bg-red-500'
                        : selectedBin.status === 'WARNING'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(selectedBin.utilizationPercent, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ZoneFilter({
  value,
  onChange,
}: {
  value: ZoneFilter;
  onChange: (zone: ZoneFilter) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = ZONE_OPTIONS.find(opt => opt.value === value);

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
        <div className="absolute top-full right-0 mt-2 w-36 dark:bg-gray-900 bg-white rounded-xl dark:border-gray-700 border-gray-200 shadow-2xl animate-fade-in">
          <div className="py-2">
            {ZONE_OPTIONS.map(option => {
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
