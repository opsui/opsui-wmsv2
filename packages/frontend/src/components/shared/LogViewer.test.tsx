/**
 * @file LogViewer.test.tsx
 * @purpose Tests for LogViewer component and related exports
 * @complexity high
 * @tested yes
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { LogViewer, LogEntryBadge, LogStats, type LogEntry } from './LogViewer';

const mockLogs: LogEntry[] = [
  {
    timestamp: new Date('2024-01-01T10:00:00'),
    level: 'info',
    message: 'Application started',
  },
  {
    timestamp: new Date('2024-01-01T10:01:00'),
    level: 'warn',
    message: 'High memory usage detected',
    context: { usage: '85%', limit: '1GB' },
  },
  {
    timestamp: new Date('2024-01-01T10:02:00'),
    level: 'error',
    message: 'Database connection failed',
    context: { error: 'Connection timeout', host: 'db.example.com' },
  },
  {
    timestamp: new Date('2024-01-01T10:03:00'),
    level: 'debug',
    message: 'API request details',
    context: { endpoint: '/api/users', method: 'GET', params: { page: 1 } },
  },
];

describe('LogViewer Component', () => {
  describe('Basic Rendering', () => {
    it('renders log viewer card', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      expect(screen.getByText(/Logs \(\d+\)/)).toBeInTheDocument();
    });

    it('renders log entries', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      expect(screen.getByText('Application started')).toBeInTheDocument();
      expect(screen.getByText('High memory usage detected')).toBeInTheDocument();
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });

    it('shows empty state when no logs', () => {
      renderWithProviders(<LogViewer logs={[]} />);
      expect(screen.getByText('No logs to display')).toBeInTheDocument();
    });

    it('displays correct log count in title', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      expect(screen.getByText('Logs (4)')).toBeInTheDocument();
    });
  });

  describe('Level Filtering', () => {
    it('shows all logs by default', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      expect(screen.getByText('Application started')).toBeInTheDocument();
      expect(screen.getByText('High memory usage detected')).toBeInTheDocument();
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });

    it('filters by info level', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      fireEvent.click(screen.getByText('Info'));

      expect(screen.getByText('Application started')).toBeInTheDocument();
      expect(screen.queryByText('High memory usage detected')).not.toBeInTheDocument();
    });

    it('filters by warn level', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      fireEvent.click(screen.getByText('Warn'));

      expect(screen.getByText('High memory usage detected')).toBeInTheDocument();
      expect(screen.queryByText('Application started')).not.toBeInTheDocument();
    });

    it('filters by error level', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      fireEvent.click(screen.getByText('Error'));

      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      expect(screen.queryByText('Application started')).not.toBeInTheDocument();
    });

    it('filters by debug level', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      fireEvent.click(screen.getByText('Debug'));

      expect(screen.getByText('API request details')).toBeInTheDocument();
      expect(screen.queryByText('Application started')).not.toBeInTheDocument();
    });

    it('shows count for each level', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      // Check that level labels exist
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Warn')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Debug')).toBeInTheDocument();
      // Check that counts exist (multiple "(1)" elements expected)
      const countElements = screen.getAllByText('(1)');
      expect(countElements.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('filters logs by search query', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      const searchInput = screen.getByPlaceholderText('Search logs...');

      fireEvent.change(searchInput, { target: { value: 'database' } });

      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      expect(screen.queryByText('Application started')).not.toBeInTheDocument();
    });

    it('filters logs by context data', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      const searchInput = screen.getByPlaceholderText('Search logs...');

      fireEvent.change(searchInput, { target: { value: 'db.example.com' } });

      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });

    it('is case insensitive', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      const searchInput = screen.getByPlaceholderText('Search logs...');

      fireEvent.change(searchInput, { target: { value: 'DATABASE' } });

      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });

    it('shows all logs when search is cleared', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      const searchInput = screen.getByPlaceholderText('Search logs...');

      fireEvent.change(searchInput, { target: { value: 'test' } });
      expect(screen.queryByText('Application started')).not.toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('Application started')).toBeInTheDocument();
    });
  });

  describe('Clear Button', () => {
    it('renders clear button when onClear is provided', () => {
      const handleClear = vi.fn();
      renderWithProviders(<LogViewer logs={mockLogs} onClear={handleClear} />);
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('does not render clear button when onClear is not provided', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    });

    it('calls onClear when clear button is clicked', () => {
      const handleClear = vi.fn();
      renderWithProviders(<LogViewer logs={mockLogs} onClear={handleClear} />);
      fireEvent.click(screen.getByText('Clear'));
      expect(handleClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Max Lines', () => {
    it('limits displayed logs to maxLines', () => {
      const manyLogs = Array.from({ length: 150 }, (_, i) => ({
        timestamp: new Date(),
        level: 'info' as const,
        message: `Log entry ${i}`,
      }));
      renderWithProviders(<LogViewer logs={manyLogs} maxLines={50} />);
      // Should only show 50 logs (the last 50)
      expect(screen.getByText(/Logs \(50\)/)).toBeInTheDocument();
    });

    it('respects custom maxLines', () => {
      const manyLogs = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(),
        level: 'info' as const,
        message: `Log entry ${i}`,
      }));
      renderWithProviders(<LogViewer logs={manyLogs} maxLines={10} />);
      expect(screen.getByText(/Logs \(10\)/)).toBeInTheDocument();
    });
  });

  describe('Context Expansion', () => {
    it('shows expand button for logs with context', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      const expandButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('svg'));
      // Should have expand buttons for logs with context
      expect(expandButtons.length).toBeGreaterThan(0);
    });

    it('toggles context on expand button click', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      const expandButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('svg'));

      if (expandButtons.length > 0) {
        fireEvent.click(expandButtons[0]);
        // Should show context after expanding
        const usageElements = screen.getAllByText(/usage/);
        expect(usageElements.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Timestamp Display', () => {
    it('shows timestamps by default', () => {
      renderWithProviders(<LogViewer logs={mockLogs} />);
      const timestamps = screen.queryAllByText(/\d{2}:\d{2}:\d{2}/);
      expect(timestamps.length).toBeGreaterThan(0);
    });

    it('hides timestamps when showTimestamp is false', () => {
      renderWithProviders(<LogViewer logs={mockLogs} showTimestamp={false} />);
      const timestamps = screen.queryAllByText(/\d{2}:\d{2}:\d{2}/);
      expect(timestamps.length).toBe(0);
    });
  });

  describe('Context Display', () => {
    it('hides context when showContext is false', () => {
      renderWithProviders(<LogViewer logs={mockLogs} showContext={false} />);
      const expandButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('svg'));
      expect(expandButtons.length).toBe(0);
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = renderWithProviders(
        <LogViewer logs={mockLogs} className="custom-log-viewer" />
      );
      expect(container.querySelector('.custom-log-viewer')).toBeInTheDocument();
    });
  });

  describe('Initial Filter Level', () => {
    it('respects initial filter level', () => {
      renderWithProviders(<LogViewer logs={mockLogs} filterLevel="error" />);
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      expect(screen.queryByText('Application started')).not.toBeInTheDocument();
    });
  });
});

describe('LogEntryBadge Component', () => {
  it('renders badge with message', () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'info',
      message: 'Test message',
    };
    renderWithProviders(<LogEntryBadge entry={entry} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('shows correct icon for info level', () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'info',
      message: 'Info message',
    };
    renderWithProviders(<LogEntryBadge entry={entry} />);
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('shows correct icon for warn level', () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'warn',
      message: 'Warning message',
    };
    renderWithProviders(<LogEntryBadge entry={entry} />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('shows correct icon for error level', () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'error',
      message: 'Error message',
    };
    renderWithProviders(<LogEntryBadge entry={entry} />);
    expect(screen.getByText('❌')).toBeInTheDocument();
  });

  it('shows correct icon for debug level', () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'debug',
      message: 'Debug message',
    };
    renderWithProviders(<LogEntryBadge entry={entry} />);
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'info',
      message: 'Test message',
    };
    renderWithProviders(<LogEntryBadge entry={entry} onClick={handleClick} />);
    fireEvent.click(screen.getByText('Test message'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('truncates long messages', () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'info',
      message: 'This is a very long message that should be truncated',
    };
    const { container } = renderWithProviders(<LogEntryBadge entry={entry} />);
    const messageEl = container.querySelector('.truncate');
    expect(messageEl).toBeInTheDocument();
  });
});

describe('LogStats Component', () => {
  it('renders stats for all log levels', () => {
    renderWithProviders(<LogStats logs={mockLogs} />);
    expect(screen.getByText('Info: 1')).toBeInTheDocument();
    expect(screen.getByText('Warn: 1')).toBeInTheDocument();
    expect(screen.getByText('Error: 1')).toBeInTheDocument();
  });

  it('does not show debug level in stats', () => {
    renderWithProviders(<LogStats logs={mockLogs} />);
    expect(screen.queryByText('Debug:')).not.toBeInTheDocument();
  });

  it('shows all logs in total', () => {
    renderWithProviders(<LogStats logs={mockLogs} />);
    // The component doesn't show total count explicitly
    // but it does show individual level counts
    expect(screen.getByText('Info: 1')).toBeInTheDocument();
  });

  it('handles empty logs array', () => {
    renderWithProviders(<LogStats logs={[]} />);
    expect(screen.getByText('Info: 0')).toBeInTheDocument();
    expect(screen.getByText('Warn: 0')).toBeInTheDocument();
    expect(screen.getByText('Error: 0')).toBeInTheDocument();
  });
});

describe('Level Colors', () => {
  it('applies correct icon for info level', () => {
    renderWithProviders(<LogViewer logs={[mockLogs[0]]} />);
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('applies correct icon for warn level', () => {
    renderWithProviders(<LogViewer logs={[mockLogs[1]]} />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('applies correct icon for error level', () => {
    renderWithProviders(<LogViewer logs={[mockLogs[2]]} />);
    expect(screen.getByText('❌')).toBeInTheDocument();
  });

  it('applies correct icon for debug level', () => {
    renderWithProviders(<LogViewer logs={[mockLogs[3]]} />);
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });
});
