import React, { useEffect, useState } from 'react';
import { ListingsService } from '../../../services';
import { Listing } from '../../../types';
import { ListingCard, ListingCardSkeleton } from './ListingCard';

interface SimilarListingsProps {
  currentListingId: string;
  categoryId: string;
}

export const SimilarListings: React.FC<SimilarListingsProps> = ({ currentListingId, categoryId }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        setLoading(true);

        // Try the new similar listings API with semantic + location matching
        try {
          const res = await ListingsService.getSimilarListings(currentListingId, 8);
          if (res.data.data.items && res.data.data.items.length > 0) {
            setListings(res.data.data.items);
            return;
          }
        } catch (err) {
        }

        // Fallback: Use category-based filtering if similar listings API fails or returns empty
        const res = await ListingsService.getListingsByCategory(categoryId);
        const filtered = res.data.data.items
          .filter(l => l.publicId !== currentListingId)
          .slice(0, 8);
        setListings(filtered);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    if (currentListingId) {
      fetchSimilar();
    }
  }, [categoryId, currentListingId]);

  if (!loading && listings.length === 0) return null;

  return (
    <div className="py-8">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 px-4 md:px-0">
        You might also like
      </h2>

      <div className="flex overflow-x-auto pb-6 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:grid md:grid-cols-4 gap-4 snap-x snap-mandatory no-scrollbar">
        {loading ? (
           [...Array(4)].map((_, i) => (
             <div key={i} className="min-w-[260px] w-[75vw] md:w-auto md:min-w-0 snap-center">
               <ListingCardSkeleton />
             </div>
           ))
        ) : (
          listings.map(listing => (
            <div key={listing.id} className="min-w-[260px] w-[75vw] md:w-auto md:min-w-0 snap-center h-full">
              <ListingCard listing={listing} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
