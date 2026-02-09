import { beforeEach, describe, expect, it } from 'vitest';
import { buildSearchUrlFromQuery } from './build-search-url';
import { HEADER_LOCATION_STORAGE_KEY } from './location-preference';

describe('buildSearchUrlFromQuery', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('builds a basic search URL', () => {
    const url = buildSearchUrlFromQuery('laptop');
    expect(url).toBe('/search?q=laptop&original=laptop');
  });

  it('includes parsed location from query', () => {
    const url = buildSearchUrlFromQuery('coffee machine in Auckland');
    expect(url).toContain('/search?q=coffee+machine');
    expect(url).toContain('location=Auckland');
  });

  it('uses stored preferred location when query has no location', () => {
    window.localStorage.setItem(HEADER_LOCATION_STORAGE_KEY, 'Wellington');
    const url = buildSearchUrlFromQuery('sony camera');
    expect(url).toContain('location=Wellington');
  });

  it('returns base search path for empty query', () => {
    const url = buildSearchUrlFromQuery('   ');
    expect(url).toBe('/search');
  });
});
