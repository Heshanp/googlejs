import React, { useEffect, useState } from 'react';
import { Listing } from '../../../types';
import { ListingCard } from '../listings/ListingCard';
import { ListingsService } from '../../../services';
import { useFavorites } from '../../../hooks/useFavorites';
import { HeartOff, Loader2, TrendingDown, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import Link from 'next/link';
import { formatCurrency } from '../../../lib/utils';

export const LikedListings: React.FC = () => {
  const { favorites, removeFavorite } = useFavorites();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (favorites.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const all = await ListingsService.getListings({}, { page: 1, limit: 1000 });
        const favIds = new Set(favorites.map(f => f.id));
        const favs = all.data.data.items.filter((l) => {
          const matchId = l.publicId || l.id;
          return matchId ? favIds.has(matchId) : false;
        });
        setListings(favs);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [favorites.length]); // Reload if count changes

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-app-color">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-400 rounded-full flex items-center justify-center mb-4">
          <HeartOff className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No liked listings yet</h3>
        <p className="text-gray-500 max-w-xs mb-6">Like items you love to track their price and availability.</p>
        <Link href="/explore">
          <Button variant="outline">Explore Items</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {listings.map(listing => {
        const listingKey = listing.publicId || listing.id;
        const favData = favorites.find(f => f.id === listingKey);
        const priceDrop = favData && listing.price < favData.priceWhenLiked 
          ? favData.priceWhenLiked - listing.price 
          : 0;
        
        return (
          <div key={listing.id} className="relative group">
            <ListingCard listing={listing} />
            
            {priceDrop > 0 && (
              <div className="absolute top-2 left-2 z-20 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1 animate-in fade-in slide-in-from-top-2">
                <TrendingDown className="w-3 h-3" /> Drop {formatCurrency(priceDrop)}
              </div>
            )}

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (listingKey) {
                  removeFavorite(listingKey);
                }
              }}
              className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-neutral-800/90 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-neutral-800 z-30"
              title="Remove from liked"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
