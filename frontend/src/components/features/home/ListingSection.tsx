import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Listing } from '../../../types';
import { ListingCard, ListingCardSkeleton } from '../listings/ListingCard';
import { Button } from '../../ui/Button';

interface ListingSectionProps {
  title: string;
  subtitle?: string;
  listings: Listing[];
  loading?: boolean;
  viewAllLink?: string;
  layout?: 'grid' | 'scroll'; // Desktop layout preference
}

export const ListingSection: React.FC<ListingSectionProps> = ({
  title,
  subtitle,
  listings,
  loading,
  viewAllLink = '#'
}) => {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{subtitle}</p>}
        </div>
        <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 gap-1 pr-0">
          View All <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative">
        {/* Mobile: Horizontal Scroll, Desktop: Grid */}
        <div className="flex overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 snap-x snap-mandatory no-scrollbar">
          {loading ? (
            // Skeleton Loading State
            [...Array(4)].map((_, i) => (
              <div key={i} className="min-w-[260px] w-[75vw] sm:w-auto snap-center">
                <ListingCardSkeleton />
              </div>
            ))
          ) : (
            // Listings List
            listings.length > 0 ? (
              listings.slice(0, 8).map((listing) => (
                <div key={listing.id} className="min-w-[260px] w-[75vw] sm:w-auto snap-center h-full">
                  <ListingCard listing={listing} />
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-900 rounded-3xl border border-dashed border-app-color w-full">
                No listings found
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
};
