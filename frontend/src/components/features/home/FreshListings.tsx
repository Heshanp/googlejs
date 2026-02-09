'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '../../../lib/routes';
import { useListings } from '../../../hooks/useListings';
import { ListingCard, ListingCardSkeleton } from '../listings/ListingCard';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export const FreshListings: React.FC = () => {
  const { recentListings, loading } = useListings();
  const listings = Array.isArray(recentListings) ? recentListings : [];
  const isXl = useMediaQuery('(min-width: 1280px)');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const isMd = useMediaQuery('(min-width: 768px)');
  const columns = isXl ? 5 : isLg ? 4 : isMd ? 3 : 2;
  const maxItems = columns * 2;
  const displayListings = listings.slice(0, maxItems);

  return (
    <section className="max-w-[1800px] mx-auto px-2 sm:px-4 lg:px-8">
      <div className="flex items-end justify-between mb-8 px-2">
        <div>
          <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">Fresh Listings</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Latest items just posted.</p>
        </div>
        <Link
          href={ROUTES.SEARCH}
          className="text-sm font-medium text-accent hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1 group"
        >
          View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 lg:gap-x-6 lg:gap-y-10">
        {loading ? (
          [...Array(maxItems)].map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))
        ) : displayListings.length > 0 ? (
          displayListings.map((listing, index) => (
            <ListingCard key={listing.id} listing={listing} index={index} />
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-neutral-500 dark:text-neutral-400">
            No fresh listings available
          </div>
        )}
      </div>
    </section>
  );
};
