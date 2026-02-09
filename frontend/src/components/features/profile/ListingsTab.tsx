import React, { useState } from 'react';
import { Listing, ListingStatus, PendingReview } from '../../../types';
import { ListingCard } from '../listings/ListingCard';
import { Button } from '../../ui/Button';
import { Edit, Trash2, CheckCircle, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { ListingsService } from '../../../services';
import { Dropdown, DropdownItem } from '../../ui/Dropdown';
import { useToast } from '../../ui/Toast';
import { ReviewPromptModal } from '../reviews/ReviewPromptModal';

interface ListingsTabProps {
  listings: Listing[];
  isOwner?: boolean;
  onRefresh?: () => void;
}

export const ListingsTab: React.FC<ListingsTabProps> = ({ listings, isOwner, onRefresh }) => {
  const [filter, setFilter] = useState<ListingStatus | 'all'>('all');
  const { success, error } = useToast();
  const [reviewPrompt, setReviewPrompt] = useState<PendingReview | null>(null);

  const filteredListings = listings.filter(l =>
    filter === 'all' ? l.status?.toLowerCase() !== 'deleted' : l.status?.toLowerCase() === filter.toLowerCase()
  );

  const handleMarkSold = async (listing: Listing) => {
    try {
      if (!listing.publicId) {
        error('Listing public ID is missing');
        return;
      }

      await ListingsService.markAsSold(listing.publicId);
      success('Marked as sold');

      // If the listing was reserved for a buyer, prompt the seller to leave a review
      if (listing.reservedFor) {
        setReviewPrompt({
          listingId: parseInt(listing.id, 10),
          listingTitle: listing.title,
          listingImage: listing.images?.[0]?.url,
          otherPartyId: listing.reservedFor,
          otherPartyName: 'Buyer', // We don't have buyer name readily available
          role: 'seller',
          soldAt: new Date().toISOString(),
        });
        // Don't refresh yet - wait for review modal to close
      } else {
        // No review prompt, can refresh immediately
        onRefresh?.();
      }
    } catch (err) {
      error('Failed to update listing');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      try {
        await ListingsService.deleteListing(id);
        success('Listing deleted');
        onRefresh?.();
      } catch (err) {
        error('Failed to delete listing');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['all', 'active', 'pending_review', 'blocked', 'sold', 'reserved'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === status
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
            }`}
          >
            {status === 'pending_review'
              ? 'Pending review'
              : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredListings.map(listing => (
          <div key={listing.id} className="relative group">
            <ListingCard listing={listing} hideLikeButton={isOwner} />

            {isOwner && (
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity z-40">
                <Dropdown
                  trigger={
                    <button className="p-3 bg-white dark:bg-neutral-900 rounded-full shadow-lg border border-app-color hover:bg-gray-50">
                      <MoreHorizontal className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                  }
                >
                  {listing.publicId && (
                    <DropdownItem onClick={() => { }}>
                      <Link href={`/listing/${listing.publicId}/edit`} className="flex items-center w-full">
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </Link>
                    </DropdownItem>
                  )}
                  {(listing.status === 'active' || listing.status === 'reserved') && (
                    <DropdownItem onClick={() => handleMarkSold(listing)}>
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Mark as Sold
                    </DropdownItem>
                  )}
                  <DropdownItem onClick={() => listing.publicId && handleDelete(listing.publicId)} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownItem>
                </Dropdown>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredListings.length === 0 && (
        <div className="text-center py-16 bg-gray-50 dark:bg-neutral-800/50 rounded-2xl border border-dashed border-app-color">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No listings found in this category.</p>
          {isOwner && (
            <Link href="/sell">
              <Button>Create New Listing</Button>
            </Link>
          )}
        </div>
      )}

      {/* Review Prompt Modal */}
      {reviewPrompt && (
        <ReviewPromptModal
          isOpen={true}
          onClose={() => {
            setReviewPrompt(null);
            onRefresh?.();
          }}
          pendingReview={reviewPrompt}
          onSuccess={() => {
            setReviewPrompt(null);
            success('Thank you for your review!');
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
};
