import { useCallback, useMemo } from 'react';
import { ListingFilters, ListingCondition } from '../types';
import { useNavigation } from './useNavigation';

export const useListingFilters = () => {
  const { searchParams, setSearchParams } = useNavigation();

  const filters: ListingFilters = useMemo(() => {
    const params: ListingFilters = {};

    // Basic Filters
    if (searchParams.get('q')) params.query = searchParams.get('q')!;
    if (searchParams.get('location')) params.location = searchParams.get('location')!;
    if (searchParams.get('sort')) params.sortBy = searchParams.get('sort') as any;
    if (searchParams.get('category')) params.category = searchParams.get('category')!;
    if (searchParams.get('subcategory')) params.subcategory = searchParams.get('subcategory')!;

    // Price (support both camelCase and snake_case)
    const priceMin = searchParams.get('priceMin') || searchParams.get('minPrice') || searchParams.get('price_min');
    const priceMax = searchParams.get('priceMax') || searchParams.get('maxPrice') || searchParams.get('price_max');
    if (priceMin) params.priceMin = Number(priceMin);
    if (priceMax) params.priceMax = Number(priceMax);

    // Vehicle Specific Filters
    if (searchParams.get('make')) params.make = searchParams.get('make')!;
    if (searchParams.get('model')) params.model = searchParams.get('model')!;

    const yearMin = searchParams.get('yearMin') || searchParams.get('year_min');
    const yearMax = searchParams.get('yearMax') || searchParams.get('year_max');
    if (yearMin) params.yearMin = Number(yearMin);
    if (yearMax) params.yearMax = Number(yearMax);

    const odometerMin = searchParams.get('odometerMin') || searchParams.get('odometer_min');
    const odometerMax = searchParams.get('odometerMax') || searchParams.get('odometer_max');
    if (odometerMin) params.odometerMin = Number(odometerMin);
    if (odometerMax) params.odometerMax = Number(odometerMax);

    // Other vehicle attributes
    if (searchParams.get('body_style')) params.bodyStyle = searchParams.get('body_style')!;
    if (searchParams.get('fuel_type')) params.fuelType = searchParams.get('fuel_type')!;
    if (searchParams.get('transmission')) params.transmission = searchParams.get('transmission')!;
    if (searchParams.get('engine_size_min')) params.engineSizeMin = searchParams.get('engine_size_min')!;
    if (searchParams.get('engine_size_max')) params.engineSizeMax = searchParams.get('engine_size_max')!;
    if (searchParams.get('style')) params.style = searchParams.get('style')!;
    if (searchParams.get('layout')) params.layout = searchParams.get('layout')!;
    if (searchParams.get('hullType') || searchParams.get('hull_type')) {
      params.hullType = (searchParams.get('hull_type') || searchParams.get('hullType')) as string;
    }
    if (searchParams.get('engineType') || searchParams.get('engine_type')) {
      params.engineType = (searchParams.get('engine_type') || searchParams.get('engineType')) as string;
    }
    if (searchParams.get('color')) params.color = searchParams.get('color')!;
    if (searchParams.get('selfContained') || searchParams.get('self_contained')) {
      const rawSelfContained = searchParams.get('self_contained') || searchParams.get('selfContained');
      params.selfContained = rawSelfContained === 'true' || rawSelfContained === '1';
    }

    const conditions = searchParams
      .getAll('condition')
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean);
    if (conditions.length > 0) params.condition = conditions as ListingCondition[];

    return params;
  }, [searchParams]);

  const setFilter = useCallback((key: keyof ListingFilters | 'sort', value: any) => {
    const paramKey = key === 'sortBy' ? 'sort' : key;
    setSearchParams({ [paramKey]: value });
  }, [setSearchParams]);

  const setFilters = useCallback((updates: Partial<ListingFilters> & { sort?: ListingFilters['sortBy'] }) => {
    const mappedUpdates: Record<string, string | number | boolean | (string | number | boolean)[] | null | undefined> = {};

    Object.entries(updates).forEach(([key, value]) => {
      const paramKey = key === 'sortBy' ? 'sort' : key;
      mappedUpdates[paramKey] = value as string | number | boolean | (string | number | boolean)[] | null | undefined;
    });

    setSearchParams(mappedUpdates);
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    // We can't easily "clear all" with updateSearchParams as it merges.
    // But we can iterate over current keys and set them to null.
    // Or we can use router.push directly for clearing.

    // Better approach for clear: clear everything except 'q'
    const newParams = new URLSearchParams();
    if (searchParams.get('q')) newParams.set('q', searchParams.get('q')!);

    // We need to access router from useNavigation? No, useNavigation exposes navigate/router wrappers.
    // But updateSearchParams merges.

    // Let's just set known keys to null.
    const resetParams: Record<string, null> = {};
    Array.from(searchParams.keys()).forEach(key => {
      if (key !== 'q') resetParams[key] = null;
    });

    setSearchParams(resetParams);
  }, [setSearchParams, searchParams]);

  return { filters, setFilter, setFilters, clearFilters, searchParams };
};
