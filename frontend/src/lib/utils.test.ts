import { describe, it, expect } from 'vitest';
import { formatDate, formatRelativeTime } from './utils';

describe('formatRelativeTime', () => {
  const now = new Date('2026-02-06T12:00:00Z');

  it('returns empty string for missing or invalid dates', () => {
    expect(formatRelativeTime(null, now)).toBe('');
    expect(formatRelativeTime(undefined, now)).toBe('');
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });

  it('returns "Just now" for recent times and future times', () => {
    const recent = new Date(now.getTime() - 30 * 1000);
    const future = new Date(now.getTime() + 5 * 60 * 1000);
    expect(formatRelativeTime(recent, now)).toBe('Just now');
    expect(formatRelativeTime(future, now)).toBe('Just now');
  });

  it('returns minutes for durations under an hour', () => {
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    expect(formatRelativeTime(fifteenMinutesAgo, now)).toBe('15m ago');
  });

  it('returns hours for durations under a day', () => {
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    expect(formatRelativeTime(fiveHoursAgo, now)).toBe('5h ago');
  });

  it('returns days for durations under a week', () => {
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoDaysAgo, now)).toBe('2d ago');
  });

  it('falls back to formatted date for older timestamps', () => {
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(tenDaysAgo, now)).toBe(formatDate(tenDaysAgo));
  });
});
