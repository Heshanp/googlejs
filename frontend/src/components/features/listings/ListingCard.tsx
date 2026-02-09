'use client';

import React from 'react';
import Link from 'next/link';
import { Listing } from '../../../types';
import { formatCurrency, cn, formatRelativeTime } from '../../../lib/utils';
import { Skeleton } from '../../ui/Skeleton';
import { ROUTES } from '../../../lib/routes';
import { motion } from 'framer-motion';
import { LikeButton } from '../favorites/LikeButton';
import { useAuth } from '../../../hooks/useAuth';
import { MapPin } from 'lucide-react';

interface ListingCardProps {
  listing: Listing;
  className?: string;
  index?: number;
  hideLikeButton?: boolean;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  className,
  index = 0,
  hideLikeButton = false
}) => {
  if (!listing) return null;
  if (!listing.publicId) return null;
  const { user } = useAuth();
  const listingOwnerId = listing.sellerId || listing.seller?.id || (listing as any).userId;
  const isOwner = user?.id === listingOwnerId;

  const imageSrc = listing.images?.[0]?.url || 'https://via.placeholder.com/400?text=No+Image';
  const listingUrlId = listing.publicId;
  const postedAt = formatRelativeTime(listing.createdAt);
  const locationLabel = typeof listing.location === 'string'
    ? listing.location
    : listing.location?.suburb || listing.location?.city || listing.location?.region || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="h-full"
    >
      <Link
        href={ROUTES.LISTING(listingUrlId)}
        className={cn("group cursor-pointer block h-full", className)}
      >
        {/* Image Container */}
        <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-900 rounded-2xl overflow-hidden border border-app-color transition-all duration-500">
          <img
            src={imageSrc}
            alt={listing.title}
            width="400"
            height="400"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />

          {/* Hover Actions Overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none group-hover:pointer-events-auto">
            {!hideLikeButton && !isOwner && (
              <LikeButton
                listingId={listingUrlId}
                price={listing.price}
                variant="overlay"
                size="md"
              />
            )}
          </div>

          {/* Posted Time */}
          {postedAt && (
            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/10">
              {postedAt}
            </div>
          )}

          {/* Sold Overlay */}
          {listing.status?.toLowerCase() === 'sold' && (
            <div className="absolute inset-0 z-20 bg-white/50 dark:bg-black/50 flex items-center justify-center">
              <span className="bg-neutral-900 text-white text-xs font-bold px-3 py-1 uppercase tracking-widest">Sold</span>
            </div>
          )}

          {(listing.status?.toLowerCase() === 'pending_review' || listing.status?.toLowerCase() === 'blocked') && (
            <div className="absolute inset-0 z-20 bg-white/40 dark:bg-black/40 flex items-center justify-center">
              <span className="bg-amber-600 text-white text-xs font-bold px-3 py-1 uppercase tracking-widest">Pending Review</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-1 pt-3">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-white leading-tight line-clamp-2 group-hover:text-accent transition-colors">
            {listing.title}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <p className="text-lg font-display font-bold text-neutral-900 dark:text-white">
              {formatCurrency(listing.price)}
            </p>
            {locationLabel && (
              <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-zinc-400">
                <MapPin className="w-3 h-3" />
                <span className="line-clamp-1">{locationLabel}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export const ListingCardSkeleton: React.FC = () => (
  <div className="h-full">
    <Skeleton className="aspect-square w-full rounded-2xl" />
    <div className="mt-3 space-y-2 px-1">
      <Skeleton className="h-4 w-3/4 rounded-md" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-3 w-16 rounded-md" />
      </div>
    </div>
  </div>
);
