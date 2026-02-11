/**
 * Lot Expiration Chart Component
 *
 * Shows lots approaching expiration with timeline visualization
 * Critical for FEFO (First Expired First Out) picking
 */

import { Card, CardHeader, CardTitle, CardContent, Skeleton } from '@/components/shared';
import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useRef, useEffect } from 'react';

interface ExpiringInventoryItem {
  sku: string;
  name: string;
  lotNumber: string;
  expirationDate: Date;
  daysUntilExpiration: number;
  quantity: number;
  available: number;
  binLocation: string;
  urgency: 'CRITICAL' | 'WARNING' | 'INFO';
}

interface LotExpirationChartProps {
  data?: ExpiringInventoryItem[];
  isLoading?: boolean;
}

type UrgencyFilter = 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO';

const URGENCY_OPTIONS = [
  { value: 'ALL' as UrgencyFilter, label: 'All Lots' },
  { value: 'CRITICAL' as UrgencyFilter, label: 'Critical' },
  { value: 'WARNING' as UrgencyFilter, label: 'Warning' },
  { value: 'INFO' as UrgencyFilter, label: 'Info' },
];

const URGENCY_STYLES = {
  CRITICAL: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    text: 'text-red-400',
    dot: 'bg-red-500',
  },
  WARNING: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
  },
  INFO: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    dot: 'bg-blue-500',
  },
};

export function LotExpirationChart({ data, isLoading }: LotExpirationChartProps) {
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyFilter>('ALL');

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Expiring Lots</CardTitle>
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
          <CardTitle>Expiring Lots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center dark:text-gray-400 text-gray-500">
            No expiring lots found
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredData =
    selectedUrgency === 'ALL' ? data : data.filter(item => item.urgency === selectedUrgency);

  return (
    <Card
      variant="glass"
      className="card-hover shadow-xl dark:shadow-blue-500/5 shadow-gray-200/50"
    >
      <CardHeader className="!flex-row !items-center !justify-between !space-y-0 flex-wrap gap-2">
        <CardTitle>Expiring Lots (FEFO)</CardTitle>
        <UrgencyFilter value={selectedUrgency} onChange={setSelectedUrgency} />
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/20 shadow-sm">
            <div className="text-xs text-red-400 mb-1">Expired/Critical</div>
            <div className="text-2xl font-bold text-red-400">
              {data.filter(d => d.urgency === 'CRITICAL').length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/20 shadow-sm">
            <div className="text-xs text-amber-400 mb-1">Warning (≤14 days)</div>
            <div className="text-2xl font-bold text-amber-400">
              {data.filter(d => d.urgency === 'WARNING').length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/20 shadow-sm">
            <div className="text-xs text-blue-400 mb-1">Coming Up (≤30 days)</div>
            <div className="text-2xl font-bold text-blue-400">
              {data.filter(d => d.urgency === 'INFO').length}
            </div>
          </div>
        </div>

        {/* Timeline Table */}
        <div className="overflow-x-auto rounded-xl dark:bg-white/[0.02] bg-gray-50/50 dark:border dark:border-white/[0.04] border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-white/10 border-gray-200">
                <th className="text-left py-3 px-4 dark:text-gray-400 text-gray-600 font-medium text-sm">
                  SKU
                </th>
                <th className="text-left py-3 px-4 dark:text-gray-400 text-gray-600 font-medium text-sm">
                  Name
                </th>
                <th className="text-left py-3 px-4 dark:text-gray-400 text-gray-600 font-medium text-sm">
                  Lot
                </th>
                <th className="text-left py-3 px-4 dark:text-gray-400 text-gray-600 font-medium text-sm">
                  Expires
                </th>
                <th className="text-center py-3 px-4 dark:text-gray-400 text-gray-600 font-medium text-sm">
                  Days Left
                </th>
                <th className="text-right py-3 px-4 dark:text-gray-400 text-gray-600 font-medium text-sm">
                  Qty
                </th>
                <th className="text-left py-3 px-4 dark:text-gray-400 text-gray-600 font-medium text-sm">
                  Location
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, index) => {
                const styles = URGENCY_STYLES[item.urgency];
                const isExpired = item.daysUntilExpiration < 0;

                return (
                  <tr
                    key={`${item.sku}-${item.lotNumber}-${index}`}
                    className={`border-b dark:border-white/5 border-gray-100 dark:hover:bg-white/[0.02] hover:bg-gray-100/50 transition-colors ${styles.bg}`}
                  >
                    <td className="py-3 px-4">
                      <span className="dark:text-white text-gray-900 font-medium">{item.sku}</span>
                    </td>
                    <td className="py-3 px-4 dark:text-gray-300 text-gray-700 text-sm">
                      {item.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="dark:text-gray-200 text-gray-800 font-mono text-xs">
                        {item.lotNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="dark:text-gray-300 text-gray-700 text-sm">
                        {item.expirationDate.toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${styles.text} ${styles.border} border`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></span>
                        {isExpired ? 'EXPIRED' : `${Math.abs(item.daysUntilExpiration)} days`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right dark:text-white text-gray-900 font-medium">
                      {item.available}
                    </td>
                    <td className="py-3 px-4 dark:text-gray-400 text-gray-600 text-sm">
                      {item.binLocation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Timeline Visualization */}
        <div className="mt-6">
          <div className="text-sm dark:text-gray-400 text-gray-600 mb-3">Expiration Timeline</div>
          <div className="relative h-4 dark:bg-gray-700 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            {/* Critical zone (expired to 7 days) */}
            <div className="absolute left-0 top-0 h-full bg-red-500" style={{ width: '23%' }} />
            {/* Warning zone (7-14 days) */}
            <div
              className="absolute left-[23%] top-0 h-full bg-amber-500"
              style={{ width: '23%' }}
            />
            {/* Info zone (14-30 days) */}
            <div
              className="absolute left-[46%] top-0 h-full bg-blue-500"
              style={{ width: '54%' }}
            />

            {/* Markers for items */}
            {filteredData.slice(0, 10).map((item, index) => {
              // Position: 0% = 30+ days, 100% = expired
              // Map daysUntilExpiration to position
              // 30+ days = 0%, 0 days = 70%, expired = 100%
              const position = Math.max(
                0,
                Math.min(100, 70 + (Math.min(item.daysUntilExpiration, 30) / 30) * 30)
              );
              const isUniquePosition = filteredData
                .slice(0, index)
                .every(
                  other =>
                    Math.abs(
                      Math.max(
                        0,
                        Math.min(100, 70 + (Math.min(other.daysUntilExpiration, 30) / 30) * 30)
                      ) - position
                    ) > 2
                );

              if (!isUniquePosition) return null;

              return (
                <div
                  key={`marker-${index}`}
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg"
                  style={{
                    left: `${position}%`,
                    backgroundColor:
                      item.urgency === 'CRITICAL'
                        ? '#ef4444'
                        : item.urgency === 'WARNING'
                          ? '#f59e0b'
                          : '#3b82f6',
                  }}
                  title={`${item.sku} - ${item.daysUntilExpiration} days`}
                />
              );
            })}
          </div>

          {/* Timeline labels */}
          <div className="flex justify-between text-xs dark:text-gray-500 text-gray-600 mt-2">
            <span>Expired</span>
            <span>7 days</span>
            <span>14 days</span>
            <span>30 days</span>
            <span>30+ days</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="dark:text-gray-400 text-gray-600">Critical (≤7 days)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="dark:text-gray-400 text-gray-600">Warning (8-14 days)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="dark:text-gray-400 text-gray-600">Info (15-30 days)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UrgencyFilter({
  value,
  onChange,
}: {
  value: UrgencyFilter;
  onChange: (urgency: UrgencyFilter) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = URGENCY_OPTIONS.find(opt => opt.value === value);

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
            {URGENCY_OPTIONS.map(option => {
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
