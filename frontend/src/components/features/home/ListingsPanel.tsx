'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { useListings } from '../../../hooks/useListings';
import { ListingCard, ListingCardSkeleton } from '../listings/ListingCard';

export const ListingsPanel: React.FC = () => {
  const { featuredListings, recentListings, loading } = useListings();

  // Combine and deduplicate listings by ID, then take first 6
  const featured = Array.isArray(featuredListings) ? featuredListings : [];
  const recent = Array.isArray(recentListings) ? recentListings : [];
  const combinedListings = [...featured, ...recent];
  const uniqueListings = combinedListings.filter((listing, index, self) =>
    index === self.findIndex((l) => l.id === listing.id)
  );
  const displayListings = uniqueListings.slice(0, 6);

  if (loading) {
    return (
      <div className="h-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-neutral-800 dark:text-white">Listing Board</h2>
        </div>
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map((i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-neutral-800 dark:text-white">Listing Board</h2>
        <button className="flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 bg-white dark:bg-neutral-900 px-3 py-1.5 rounded-full shadow-sm border border-app-color transition-colors">
          Recent listed
          <Icon icon="solar:alt-arrow-down-bold-duotone" className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-12rem)] pr-2 custom-scrollbar">
        {displayListings.length > 0 ? (
          displayListings.map((listing, index) => (
            <ListingCard key={listing.id} listing={listing} index={index} />
          ))
        ) : (
          <div className="text-center py-12">
            <Icon icon="solar:box-minimalistic-bold-duotone" className="w-16 h-16 mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">No listings available</p>
          </div>
        )}
      </div>
    </div>
  );
};
