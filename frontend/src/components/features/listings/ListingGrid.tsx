import React from 'react';
import { Listing } from '../../../types';
import { ListingCard, ListingCardSkeleton } from './ListingCard';
import { Ghost } from 'lucide-react';
import { EmptyState } from '../../shared/EmptyState';

interface ListingGridProps {
  listings: Listing[];
  loading: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  onClearFilters?: () => void;
}

export const ListingGrid: React.FC<ListingGridProps> = ({ 
  listings, 
  loading,
  emptyTitle = "No listings found",
  emptyMessage = "Try adjusting your filters or search query to find what you're looking for.",
  onClearFilters
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-app-color">
        <EmptyState
          title={emptyTitle}
          description={emptyMessage}
          icon={Ghost}
          action={onClearFilters ? {
            label: "Clear all filters",
            onClick: onClearFilters,
            variant: "outline"
          } : undefined}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
};