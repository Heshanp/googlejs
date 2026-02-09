'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { ListingsService, CategoriesService } from '../../../services';
import { Category, Listing } from '../../../types';
import { ListingGrid } from '../../../components/features/listings/ListingGrid';
import { ListingFilters } from '../../../components/features/listings/ListingFilters';
import { SortDropdown } from '../../../components/features/listings/SortDropdown';
import { Button } from '../../../components/ui/Button';
import { useListingFilters } from '../../../hooks/useListingFilters';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Seo } from '../../../components/shared/Seo';
import { Breadcrumbs } from '../../../components/shared/Breadcrumbs';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { filters, setFilter, clearFilters } = useListingFilters();

  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!slug) return;

        // Fetch Category Info
        const catRes = await CategoriesService.getCategoryBySlug(slug);
        setCategory(catRes.data.data);

        // Fetch Subcategories
        const treeRes = await CategoriesService.getCategories();
        const treeNode = treeRes.data.data.find((c: any) => c.id === catRes.data.data.id || c.slug === slug);
        if (treeNode && treeNode.children) {
          setSubcategories(treeNode.children);
        } else {
          setSubcategories([]);
        }

        // Fetch Listings
        const listingsRes = await ListingsService.getListings({
          ...filters,
          category: catRes.data.data.id // Use ID for service
        });
        setListings(listingsRes.data.data.items);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug, filters]);

  const title = category ? `${category.name} for Sale in New Zealand` : 'Category';
  const description = category
    ? `Browse ${listings.length > 0 ? listings.length : ''} ${category.name} listings. Find great deals on ${category.name.toLowerCase()} near you.`
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 pb-20">
      {category && <Seo title={title} description={description} />}

      <div className="container mx-auto px-4 py-4 md:py-8">

        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumbs items={[
            { label: 'Categories', path: '/categories' },
            { label: category?.name || 'Loading...' }
          ]} />
        </div>

        {/* Header */}
        <div className="mb-8">
          {loading && !category ? (
            <Skeleton className="h-10 w-48 mb-4" />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {category?.name}
            </h1>
          )}

          {/* Subcategories */}
          {subcategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {subcategories.map(sub => (
                <Link
                  key={sub.id}
                  href={`/category/${sub.slug}`}
                  className="flex-shrink-0 px-4 py-2 bg-white dark:bg-neutral-800 border border-app-color rounded-full text-sm font-medium hover:border-primary-500 hover:text-primary-600 transition-colors"
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar (Desktop) */}
          <ListingFilters />

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                {listings.length} results
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden gap-2"
                  onClick={() => setMobileFiltersOpen(true)}
                >
                  <SlidersHorizontal className="w-4 h-4" /> Filters
                </Button>
                <SortDropdown
                  value={filters.sortBy || 'newest'}
                  onChange={(val) => setFilter('sortBy', val)}
                />
              </div>
            </div>

            {/* Grid */}
            <ListingGrid
              listings={listings}
              loading={loading}
              onClearFilters={clearFilters}
            />

            {/* Load More */}
            {!loading && listings.length > 0 && (
              <div className="mt-12 text-center">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  Load More
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters */}
      <ListingFilters
        isMobile
        mobileIsOpen={mobileFiltersOpen}
        mobileOnClose={() => setMobileFiltersOpen(false)}
      />
    </div>
  );
}