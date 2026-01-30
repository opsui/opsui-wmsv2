/**
 * Log Viewer Component
 *
 * Displays log entries with filtering and real-time updates
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/shared';
import {
  XMarkIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { classNames } from '@/components/shared/utils';

export interface LogEntry {
  timestamp: string | Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
}

interface LogViewerProps {
  logs: LogEntry[];
  onClear?: () => void;
  filterLevel?: 'all' | 'info' | 'warn' | 'error' | 'debug';
  maxLines?: number;
  autoScroll?: boolean;
  showTimestamp?: boolean;
  showContext?: boolean;
  className?: string;
}

const levelColors = {
  info: {
    bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'ℹ️',
  },
  warn: {
    bg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    icon: '⚠️',
  },
  error: {
    bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    icon: '❌',
  },
  debug: {
    bg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
    icon: '🔍',
  },
};

export function LogViewer({
  logs,
  onClear,
  filterLevel: initialFilterLevel = 'all',
  maxLines = 100,
  autoScroll = true,
  showTimestamp = true,
  showContext = true,
  className = '',
}: LogViewerProps) {
  const [filterLevel, setFilterLevel] = useState(initialFilterLevel);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesSearch =
      !searchQuery ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.context &&
        JSON.stringify(log.context).toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesLevel && matchesSearch;
  });

  const displayedLogs = filteredLogs.slice(-maxLines);

  const toggleExpanded = (index: number) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getLevelCounts = () => {
    return {
      all: logs.length,
      info: logs.filter(l => l.level === 'info').length,
      warn: logs.filter(l => l.level === 'warn').length,
      error: logs.filter(l => l.level === 'error').length,
      debug: logs.filter(l => l.level === 'debug').length,
    };
  };

  const counts = getLevelCounts();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Logs ({displayedLogs.length})</CardTitle>
          <div className="flex items-center gap-2">
            {onClear && (
              <Button variant="secondary" size="sm" onClick={onClear}>
                <XMarkIcon className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {/* Level filter */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['all', 'info', 'warn', 'error', 'debug'] as const).map(level => {
              const isActive = filterLevel === level;
              return (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level)}
                  className={classNames(
                    'px-3 py-1 text-xs font-medium rounded-md transition-all',
                    isActive
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
                  <span className="ml-1 text-gray-400">({counts[level]})</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
          ref={scrollRef}
          className="bg-gray-900 dark:bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm"
        >
          {displayedLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No logs to display
            </div>
          ) : (
            <div className="space-y-1">
              {displayedLogs.map((log, i) => {
                const colors = levelColors[log.level];
                const hasContext = log.context && Object.keys(log.context).length > 0;
                const isExpanded = expandedEntries.has(i);

                return (
                  <div
                    key={i}
                    className={classNames(
                      'flex items-start gap-2 p-2 rounded border-l-2',
                      colors.border
                    )}
                  >
                    {/* Level indicator */}
                    <span className="flex-shrink-0">{colors.icon}</span>

                    {/* Timestamp */}
                    {showTimestamp && (
                      <span className="flex-shrink-0 text-gray-500 text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    )}

                    {/* Message */}
                    <span className="flex-1 text-gray-300 break-words">{log.message}</span>

                    {/* Expand button */}
                    {hasContext && showContext && (
                      <button
                        onClick={() => toggleExpanded(i)}
                        className="flex-shrink-0 text-gray-500 hover:text-gray-300"
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {/* Context (expanded) */}
                    {isExpanded && hasContext && (
                      <pre className="w-full mt-2 text-xs text-gray-400 bg-gray-800 rounded p-2 overflow-x-auto">
                        {JSON.stringify(log.context, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact log entry for inline display
 */
export function LogEntryBadge({ entry, onClick }: { entry: LogEntry; onClick?: () => void }) {
  const colors = levelColors[entry.level];

  return (
    <button
      onClick={onClick}
      className={classNames(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
        colors.bg,
        onClick && 'cursor-pointer hover:opacity-80'
      )}
    >
      <span>{colors.icon}</span>
      <span className="max-w-[200px] truncate">{entry.message}</span>
    </button>
  );
}

/**
 * Log stats summary
 */
export function LogStats({ logs }: { logs: LogEntry[] }) {
  const stats = {
    total: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
    debug: logs.filter(l => l.level === 'debug').length,
  };

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-gray-600 dark:text-gray-400">Info: {stats.info}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-gray-600 dark:text-gray-400">Warn: {stats.warn}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-gray-600 dark:text-gray-400">Error: {stats.error}</span>
      </div>
    </div>
  );
}
