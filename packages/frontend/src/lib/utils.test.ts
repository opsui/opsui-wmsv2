/**
 * Utility Functions Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatDate,
  formatDateShort,
  formatTime,
  calculatePercentage,
  formatNumber,
  truncate,
  debounce,
  generateId,
  sleep,
  parseBinLocation,
  formatBinLocation,
} from './utils';

describe('cn (className merge)', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('handles undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('handles empty strings', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });
});

describe('formatDate', () => {
  it('formats Date object to readable string', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatDate(date);
    expect(result).toContain('2024');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });

  it('formats ISO date string to readable string', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toContain('2024');
  });
});

describe('formatDateShort', () => {
  it('formats date without time', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatDateShort(date);
    expect(result).toMatch(/\w{3} \d{2}, \d{4}/);
  });
});

describe('formatTime', () => {
  it('formats time from Date object', () => {
    const date = new Date('2024-01-15T14:30:45Z');
    const result = formatTime(date);
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('formats time from ISO string', () => {
    const result = formatTime('2024-01-15T14:30:45Z');
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });
});

describe('calculatePercentage', () => {
  it('calculates percentage correctly', () => {
    expect(calculatePercentage(25, 100)).toBe(25);
    expect(calculatePercentage(1, 4)).toBe(25);
  });

  it('returns 0 when total is 0', () => {
    expect(calculatePercentage(50, 0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(calculatePercentage(1, 3)).toBe(33);
    expect(calculatePercentage(2, 3)).toBe(67);
  });
});

describe('formatNumber', () => {
  it('formats number with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(1234567.89)).toBe('1,234,567.89');
  });

  it('handles small numbers', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(42)).toBe('42');
  });

  it('handles negative numbers', () => {
    expect(formatNumber(-1000)).toBe('-1,000');
  });
});

describe('truncate', () => {
  it('truncates text longer than maxLength', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
  });

  it('returns original text if shorter than maxLength', () => {
    expect(truncate('Hi', 5)).toBe('Hi');
  });

  it('returns original text if equal to maxLength', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delays function execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancels previous calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);

    debouncedFn();
    vi.advanceTimersByTime(100);
    debouncedFn();
    vi.advanceTimersByTime(100);
    debouncedFn();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to debounced function', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn('arg1', 'arg2');

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('generateId', () => {
  it('generates a unique ID', () => {
    const id1 = generateId();
    const id2 = generateId();

    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
  });

  it('generates ID with timestamp and random string', () => {
    const id = generateId();
    expect(id).toMatch(/\d+-[a-z0-9]+/);
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves after specified time', async () => {
    const promise = sleep(100);

    let resolved = false;
    promise.then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);

    vi.advanceTimersByTime(100);
    await promise;

    expect(resolved).toBe(true);
  });
});

describe('parseBinLocation', () => {
  it('parses valid bin location', () => {
    const result = parseBinLocation('A-01-01');
    expect(result).toEqual({
      zone: 'A',
      aisle: '01',
      shelf: '01',
    });
  });

  it('parses bin location with multi-digit aisle', () => {
    const result = parseBinLocation('B-123-45');
    expect(result).toEqual({
      zone: 'B',
      aisle: '123',
      shelf: '45',
    });
  });

  it('returns null for invalid format', () => {
    expect(parseBinLocation('invalid')).toBeNull();
    expect(parseBinLocation('A-1')).toBeNull();
    expect(parseBinLocation('A-01-01-extra')).toBeNull();
  });

  it('returns null for lowercase zone', () => {
    expect(parseBinLocation('a-01-01')).toBeNull();
  });
});

describe('formatBinLocation', () => {
  it('formats valid bin location', () => {
    const result = formatBinLocation('A-01-01');
    expect(result).toContain('Zone A');
    expect(result).toContain('Aisle 01');
    expect(result).toContain('Shelf 01');
  });

  it('returns original string for invalid format', () => {
    expect(formatBinLocation('invalid')).toBe('invalid');
  });
});
