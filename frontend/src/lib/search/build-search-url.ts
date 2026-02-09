import { parseNaturalLanguageQuery } from '../utils/nlp-search-parser';
import { resolveSearchLocation } from './location-preference';

interface BuildSearchUrlOptions {
  searchPath?: string;
}

export function buildSearchUrlFromQuery(rawQuery: string, options: BuildSearchUrlOptions = {}): string {
  const normalizedQuery = rawQuery.trim();
  if (!normalizedQuery) {
    return options.searchPath || '/search';
  }

  const parsed = parseNaturalLanguageQuery(normalizedQuery);
  const params = new URLSearchParams();

  const backendQuery = (parsed.filters.query || normalizedQuery).trim() || normalizedQuery;
  params.set('q', backendQuery);
  params.set('original', normalizedQuery);

  if (parsed.filters.make) params.set('make', parsed.filters.make);
  if (parsed.filters.model) params.set('model', parsed.filters.model);
  if (parsed.filters.yearMin !== undefined) params.set('yearMin', parsed.filters.yearMin.toString());
  if (parsed.filters.yearMax !== undefined) params.set('yearMax', parsed.filters.yearMax.toString());
  if (parsed.filters.priceMin !== undefined) params.set('priceMin', parsed.filters.priceMin.toString());
  if (parsed.filters.priceMax !== undefined) params.set('priceMax', parsed.filters.priceMax.toString());
  if (parsed.filters.odometerMin !== undefined) params.set('odometerMin', parsed.filters.odometerMin.toString());
  if (parsed.filters.odometerMax !== undefined) params.set('odometerMax', parsed.filters.odometerMax.toString());

  const resolvedLocation = resolveSearchLocation(parsed.filters.location);
  if (resolvedLocation) params.set('location', resolvedLocation);
  if (parsed.filters.color) params.set('color', parsed.filters.color);
  if (parsed.filters.condition && parsed.filters.condition.length > 0) {
    params.set('condition', parsed.filters.condition.join(','));
  }
  if (parsed.filters.category) params.set('category', parsed.filters.category);
  if (parsed.interpretedAs) params.set('interpreted', parsed.interpretedAs);

  const basePath = options.searchPath || '/search';
  return `${basePath}?${params.toString()}`;
}
