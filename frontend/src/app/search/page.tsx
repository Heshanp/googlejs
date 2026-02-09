'use client';

import React, { useEffect, useState } from 'react';
import { ListingsService } from '../../services';
import { Listing } from '../../types';
import { ListingGrid } from '../../components/features/listings/ListingGrid';
import { InventoryTopFilters } from '../../components/features/listings/InventoryTopFilters';
import { SortDropdown } from '../../components/features/listings/SortDropdown';
import { useListingFilters } from '../../hooks/useListingFilters';
import { useDetectedCategory } from '../../hooks/useDetectedCategory';
import { Seo } from '../../components/shared/Seo';
import { useNavigation } from '../../hooks/useNavigation';
import { parseNaturalLanguageQuery } from '../../lib/utils/nlp-search-parser';
import { resolveSearchLocation } from '../../lib/search/location-preference';
import { PageShell } from '../../components/layout/PageShell';
import { VisionSearchButton } from '../../components/features/search/VisionSearchButton';
import { buildSearchUrlFromQuery } from '../../lib/search/build-search-url';
import { Search } from 'lucide-react';

export default function SearchPage() {
  const { searchParams, navigate } = useNavigation();
  const query = searchParams.get('q') || '';
  const originalQuery = searchParams.get('original') || query; // Original user input for display
  const { filters, setFilter, clearFilters } = useListingFilters();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketplaceSearch, setMarketplaceSearch] = useState(originalQuery);
  const hasInitializedFilters = React.useRef(false);

  // Auto-detect category from search results for smart filter display
  const detectedCategory = useDetectedCategory(listings);

  // Extract NLP-parsed filters from URL on mount (only once)
  useEffect(() => {
    // Only run once when component mounts
    if (hasInitializedFilters.current) return;
    hasInitializedFilters.current = true;

    const make = searchParams.get('make');
    const model = searchParams.get('model');
    const yearMin = searchParams.get('yearMin');
    const yearMax = searchParams.get('yearMax');
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    const odometerMin = searchParams.get('odometerMin');
    const odometerMax = searchParams.get('odometerMax');
    const location = searchParams.get('location');
    const color = searchParams.get('color');
    const condition = searchParams.get('condition');

    // Check if URL has any pre-parsed filters (from HeroSection NLP parsing)
    const hasUrlFilters = make || model || yearMin || yearMax || priceMin || priceMax ||
      odometerMin || odometerMax || location || color || condition;

    // If no filters in URL but we have a query, run NLP parser as fallback
    // This handles direct navigation to /search?q=... without going through HeroSection
    if (!hasUrlFilters && query) {
      const parsed = parseNaturalLanguageQuery(query);

      // Build URL with ALL parsed filters at once to avoid multiple redirects
      const params = new URLSearchParams(searchParams.toString());
      const cleanedQuery = (parsed.filters.query || query).trim() || query;
      params.set('q', cleanedQuery);
      if (!params.get('original')) {
        params.set('original', query);
      }

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

      // Replace current URL with the new one containing all filters
      navigate(`/search?${params.toString()}`);
      return;
    }

    // If we reach here, filters are already in the URL (from HeroSection)
  }, []); // Run only once on mount


  useEffect(() => {
    setMarketplaceSearch(originalQuery);
  }, [originalQuery]);

  useEffect(() => {
    // Don't search until filter initialization has run
    if (!hasInitializedFilters.current) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const listingsRes = await ListingsService.searchListings(query, filters);
        setListings(listingsRes.data.data.items);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [query, filters]);

  // Save to recent searches (simple implementation)
  useEffect(() => {
    if (query) {
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      if (!recent.includes(query)) {
        const updated = [query, ...recent].slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      }
    }
  }, [query]);


  const getDynamicTitle = () => {
    if (originalQuery) return `Results for "${originalQuery}"`;

    const make = searchParams.get('make');
    const model = searchParams.get('model');
    const location = searchParams.get('location');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');

    const parts = [];
    if (make) parts.push(make.charAt(0).toUpperCase() + make.slice(1));
    if (model) parts.push(model.charAt(0).toUpperCase() + model.slice(1));

    if (parts.length === 0) {
      if (subcategory) parts.push(subcategory.charAt(0).toUpperCase() + subcategory.slice(1));
      else if (category && category !== 'all') parts.push(category.charAt(0).toUpperCase() + category.slice(1));
    }

    if (parts.length > 0) {
      let title = parts.join(' ');
      if (location && location !== 'all') title += ` in ${location.charAt(0).toUpperCase() + location.slice(1)}`;
      return title;
    }

    if (location && location !== 'all') return `Listings in ${location.charAt(0).toUpperCase() + location.slice(1)}`;

    return 'All Listings';
  };

  const displayTitle = getDynamicTitle();

  const title = query ? `Search results for "${query}"` : displayTitle;

  const runMarketplaceSearch = (rawQuery: string) => {
    const normalizedQuery = rawQuery.trim();
    if (!normalizedQuery) return;
    navigate(buildSearchUrlFromQuery(normalizedQuery));
  };

  const handleMarketplaceSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    runMarketplaceSearch(marketplaceSearch);
  };

  return (
    <PageShell>
      <Seo
        title={title}
        // Usually search pages should be noindexed to prevent spam index bloat
        noindex={!query}
      />

      <div className="bg-white dark:bg-neutral-900 pt-8 pb-6 border-b border-app-color">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">
              Marketplace
            </h1>
          </div>

          <div className="mt-6 space-y-4">
            <InventoryTopFilters detectedCategory={detectedCategory} />
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-zinc-500" />
              </div>
              <input
                type="text"
                value={marketplaceSearch}
                onChange={(e) => setMarketplaceSearch(e.target.value)}
                onKeyDown={handleMarketplaceSearch}
                className="w-full rounded-full py-3 pl-12 pr-14 text-sm transition-all shadow focus:outline-none focus:ring-4 focus:ring-accent/10 bg-white border border-app-color text-neutral-900 placeholder-neutral-400 focus:border-accent/50 dark:bg-white/5 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-black/50"
                placeholder="Search in marketplace..."
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                <VisionSearchButton
                  size="sm"
                  variant="default"
                  onDetectedQuery={(text) => {
                    setMarketplaceSearch(text);
                    runMarketplaceSearch(text);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6">
        {/* Toolbar - Only showing count now */}
        <div className="flex items-center justify-between py-6">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {listings.length} results found
          </p>
          <SortDropdown
            value={filters.sortBy || 'newest'}
            onChange={(val) => setFilter('sortBy', val)}
          />
        </div>

        {/* Grid */}
        <ListingGrid
          listings={listings}
          loading={loading}
          onClearFilters={clearFilters}
          emptyTitle={originalQuery ? `No results for "${originalQuery}"` : "No results found"}
          emptyMessage={originalQuery ? "Try checking your spelling or use more general terms." : "Try adjusting your filters to find what you're looking for."}
        />
      </div>

    </PageShell>
  );
}
