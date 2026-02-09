import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_NZ_LOCATION_LABEL, HEADER_LOCATION_STORAGE_KEY, resolveSearchLocation } from './location-preference';

describe('location-preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns explicit location when provided', () => {
    window.localStorage.setItem(HEADER_LOCATION_STORAGE_KEY, 'Auckland');
    expect(resolveSearchLocation('Wellington')).toBe('Wellington');
  });

  it('falls back to stored preferred location', () => {
    window.localStorage.setItem(HEADER_LOCATION_STORAGE_KEY, 'Auckland');
    expect(resolveSearchLocation('')).toBe('Auckland');
  });

  it('returns null when stored location is All NZ', () => {
    window.localStorage.setItem(HEADER_LOCATION_STORAGE_KEY, ALL_NZ_LOCATION_LABEL);
    expect(resolveSearchLocation('')).toBeNull();
  });
});
