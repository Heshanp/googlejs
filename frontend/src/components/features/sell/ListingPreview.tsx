import React, { useState } from 'react';
import { ListingFormData, Listing } from '../../../types';
import { ListingCard } from '../listings/ListingCard';
import { ImageCarousel } from '../listings/ImageCarousel';
import { SellerCard } from '../listings/SellerCard';
import { formatCurrency, cn } from '../../../lib/utils';
import { MapPin, Calendar, Eye, Heart, Shield, ChevronDown } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { formatDistanceToNow } from 'date-fns';

interface ListingPreviewProps {
  data: ListingFormData;
}

export const ListingPreview: React.FC<ListingPreviewProps> = ({ data }) => {
  const [showFullDesc, setShowFullDesc] = useState(false);

  const previewListing: Listing = {
    id: 'preview',
    title: data.title || 'Untitled Listing',
    description: data.description || 'No description provided.',
    price: data.price || 0,
    currency: 'NZD',
    category: data.categoryId,
    condition: data.condition,
    location: data.location || { suburb: 'Unknown', city: 'Unknown', region: '' },
    images: (data.images || []).map((file, i) => {
      // Handle both File objects (new uploads) and existing image objects (edit mode)
      const url = file instanceof File
        ? URL.createObjectURL(file)
        : typeof file === 'string'
          ? file
          : (file as any).url || '';

      return {
        id: `prev_${i}`,
        url,
        order: i,
        isThumbnail: i === 0
      };
    }),
    sellerId: 'me',
    seller: {
      id: 'me',
      name: 'You',
      email: 'you@example.com',
      isVerified: true,
      rating: 5.0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    viewCount: 0,
    likeCount: 0
  };

  const timeAgo = 'Just now';
  const locationStr = data.location ? `${data.location.suburb}, ${data.location.city}` : 'Location';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 p-4 rounded-xl text-yellow-800 dark:text-yellow-200 text-sm text-center">
        This is a preview of how your listing will appear to others.
      </div>

      {/* Card Preview */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Card View</h3>
        <div className="max-w-xs mx-auto md:mx-0">
          <ListingCard listing={previewListing} hideLikeButton />
        </div>
      </div>

      {/* Full Page Preview - Condensed */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Detail View</h3>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-app-color overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            {/* Left - Images */}
            <div>
              {previewListing.images.length > 0 ? (
                <ImageCarousel images={previewListing.images} title={previewListing.title} />
              ) : (
                <div className="aspect-[4/3] bg-gray-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center text-gray-400">
                  No Images
                </div>
              )}
            </div>

            {/* Right - Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
                  {previewListing.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {timeAgo}
                  </span>
                </div>
              </div>

              <div className="flex items-end gap-3">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {formatCurrency(previewListing.price)}
                </div>
                <div className="mb-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-700 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {previewListing.condition}
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-app-color p-4">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Description</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {previewListing.description}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" /> {locationStr}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
