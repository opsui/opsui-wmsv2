/**
 * Tests for shared utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { classNames, formatRelativeTime, formatNumber, truncate } from './utils';

describe('classNames', () => {
  it('should join classes with spaces', () => {
    expect(classNames('foo', 'bar')).toBe('foo bar');
  });

  it('should filter out false values', () => {
    expect(classNames('foo', false, 'bar')).toBe('foo bar');
  });

  it('should filter out undefined values', () => {
    expect(classNames('foo', undefined, 'bar')).toBe('foo bar');
  });

  it('should filter out null values', () => {
    expect(classNames('foo', null, 'bar')).toBe('foo bar');
  });

  it('should filter out empty strings', () => {
    expect(classNames('foo', '', 'bar')).toBe('foo bar');
  });

  it('should handle empty input', () => {
    expect(classNames()).toBe('');
  });

  it('should handle conditional classes', () => {
    expect(classNames('base', true && 'active', false && 'inactive')).toBe('base active');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "just now" for times less than a minute', () => {
    const date = new Date('2024-01-01T11:59:30Z');
    expect(formatRelativeTime(date)).toBe('just now');
  });

  it('should return "X minute(s) ago" for times less than an hour', () => {
    const date = new Date('2024-01-01T11:30:00Z');
    expect(formatRelativeTime(date)).toBe('30 minutes ago');
  });

  it('should return singular "minute" for 1 minute', () => {
    const date = new Date('2024-01-01T11:59:00Z');
    expect(formatRelativeTime(date)).toBe('1 minute ago');
  });

  it('should return "X hour(s) ago" for times less than a day', () => {
    const date = new Date('2024-01-01T09:00:00Z');
    expect(formatRelativeTime(date)).toBe('3 hours ago');
  });

  it('should return singular "hour" for 1 hour', () => {
    const date = new Date('2024-01-01T11:00:00Z');
    expect(formatRelativeTime(date)).toBe('1 hour ago');
  });

  it('should return "X day(s) ago" for times less than a week', () => {
    const date = new Date('2023-12-30T12:00:00Z');
    expect(formatRelativeTime(date)).toBe('2 days ago');
  });

  it('should return singular "day" for 1 day', () => {
    const date = new Date('2023-12-31T12:00:00Z');
    expect(formatRelativeTime(date)).toBe('1 day ago');
  });

  it('should return formatted date for times older than a week', () => {
    const date = new Date('2023-12-01T12:00:00Z');
    const result = formatRelativeTime(date);
    // The exact format depends on locale, but it should be a date string
    expect(result).toMatch(/\d/);
  });

  it('should handle string dates', () => {
    const date = '2024-01-01T11:30:00Z';
    expect(formatRelativeTime(date)).toBe('30 minutes ago');
  });

  it('should handle future dates', () => {
    const date = new Date('2024-01-01T13:00:00Z');
    const result = formatRelativeTime(date);
    // Future dates should still return something reasonable
    expect(typeof result).toBe('string');
  });
});

describe('formatNumber', () => {
  it('should return string for numbers less than 1000', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(500)).toBe('500');
  });

  it('should format thousands with K suffix', () => {
    expect(formatNumber(1000)).toBe('1.0K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(999999)).toBe('1000.0K');
  });

  it('should format millions with M suffix', () => {
    expect(formatNumber(1000000)).toBe('1.0M');
    expect(formatNumber(1500000)).toBe('1.5M');
    expect(formatNumber(999999999)).toBe('1000.0M');
  });

  it('should format billions with B suffix', () => {
    expect(formatNumber(1000000000)).toBe('1.0B');
    expect(formatNumber(1500000000)).toBe('1.5B');
  });

  it('should handle negative numbers', () => {
    expect(formatNumber(-500)).toBe('-500');
    // Note: formatNumber doesn't handle negative thousands with K suffix
    expect(formatNumber(-1500)).toBe('-1500');
  });

  it('should handle decimal places correctly', () => {
    expect(formatNumber(1234)).toBe('1.2K');
    expect(formatNumber(1567)).toBe('1.6K');
  });
});

describe('truncate', () => {
  it('should return text as-is when shorter than maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('should return text as-is when equal to maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('should truncate text and add ellipsis when longer than maxLength', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });

  it('should handle empty string', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('should handle maxLength of 0', () => {
    expect(truncate('hello', 0)).toBe('...');
  });

  it('should handle maxLength of 1', () => {
    expect(truncate('hello', 1)).toBe('h...');
  });

  it('should preserve unicode characters', () => {
    expect(truncate('hello 世界', 6)).toBe('hello ...');
  });
});
