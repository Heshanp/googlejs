'use client';


import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Calendar, Eye, Heart, Shield, Info, ChevronDown, Sparkles } from 'lucide-react';
import { ListingsService } from '../../../services';
import { Listing } from '../../../types';
import { formatCurrency, cn } from '../../../lib/utils';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ImageCarousel } from '../../../components/features/listings/ImageCarousel';
import { SellerCard } from '../../../components/features/listings/SellerCard';
import { ListingActions } from '../../../components/features/listings/ListingActions';
import { SimilarListings } from '../../../components/features/listings/SimilarListings';
import { RecentlyViewed } from '../../../components/features/listings/RecentlyViewed';
import { CategoryFieldsDisplay } from '../../../components/features/listings/CategoryFieldsDisplay';
import { formatDistanceToNow } from 'date-fns';
import { useRecentlyViewed } from '../../../hooks/useRecentlyViewed';
import { Seo } from '../../../components/shared/Seo';
import { JsonLd } from '../../../components/shared/JsonLd';
import { Breadcrumbs } from '../../../components/shared/Breadcrumbs';
import { SITE_CONFIG, truncateDescription } from '../../../lib/seo';
import ListingNotFound from './not-found';
import { ROUTES } from '../../../lib/routes';
import { AssistantPanel } from '../../../components/features/assistant/AssistantPanel';
import dynamic from 'next/dynamic';
import { getCategoryBySlug, normalizeCategory } from '../../../data/categories';

const ListingMap = dynamic(
  () => import('../../../components/features/listings/ListingMap').then((mod) => mod.ListingMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 dark:bg-neutral-800 animate-pulse flex items-center justify-center">
        <span className="text-gray-400 text-sm">Loading map...</span>
      </div>
    )
  }
);

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const { addToRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    if (!id) return;
    if (listing && listing.publicId === id) return;

    const fetchListing = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await ListingsService.getListingById(id);
        setListing(res.data.data);

        // Add to recently viewed
        addToRecentlyViewed(res.data.data);

        // Increment view count (fire and forget)
        ListingsService.incrementViewCount(id);

        // Scroll to top
        window.scrollTo(0, 0);
      } catch (err: any) {
        setError('Listing not found or removed');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id, listing?.publicId, addToRecentlyViewed]);

  if (loading) {
    return <ListingPageSkeleton />;
  }

  if (error || !listing) {
    return <ListingNotFound />;
  }

  if (!listing.publicId) {
    return <ListingNotFound />;
  }

  // Helper for location display
  const locationStr = typeof listing.location === 'string'
    ? listing.location
    : `${listing.location.suburb}, ${listing.location.city}`;

  const timeAgo = formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true });
  const seoTitle = `${listing.title} - ${formatCurrency(listing.price)}`;
  const seoDesc = truncateDescription(listing.description);
  const seoImage = listing.images?.[0]?.url;
  const listingUrlId = listing.publicId;
  const normalizedCategorySlug = normalizeCategory(listing.category || 'general');
  const categoryLabel = getCategoryBySlug(normalizedCategorySlug)?.name
    || normalizedCategorySlug.replace(/-/g, ' ');
  const isPendingReview = listing.status === 'pending_review' || listing.status === 'blocked';

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": listing.title,
    "description": seoDesc,
    "image": listing.images?.map(img => img.url) || [],
    "sku": listingUrlId,
    "offers": {
      "@type": "Offer",
      "price": listing.price,
      "priceCurrency": listing.currency || "NZD",
      "availability": listing.status === 'active' ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      "itemCondition": `https://schema.org/${listing.condition.replace(' ', '')}Condition`,
      "url": `${SITE_CONFIG.domain}${ROUTES.LISTING(listingUrlId)}`
    },
    "seller": {
      "@type": "Person",
      "name": listing.seller?.name || "Unknown Seller"
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-neutral-950 pt-[var(--app-header-offset)] pb-24 md:pb-12">
      <Seo
        title={seoTitle}
        description={seoDesc}
        image={seoImage}
        type="product"
      />
      <JsonLd data={productSchema} />

      {/* Breadcrumb */}
      <div className="bg-white dark:bg-neutral-900 border-b border-app-color">
        <div className="max-w-[1440px] mx-auto px-6 py-1">
          <Breadcrumbs items={[
            { label: 'Categories', path: ROUTES.CATEGORIES },
            { label: categoryLabel, path: ROUTES.CATEGORY(normalizedCategorySlug) },
            { label: listing.title }
          ]} />
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column - Images */}
          <div className="lg:col-span-7 space-y-6">
            <div className="lg:sticky lg:top-24 space-y-4">
              <ImageCarousel images={listing.images} title={listing.title} />

              {/* Desktop Details hidden on mobile to keep structure */}
              <div className="hidden lg:block space-y-6">
                {/* Specifications Section */}
                {listing.categoryFields && Object.keys(listing.categoryFields).length > 0 && (
                  <CategoryFieldsDisplay
                    categorySlug={listing.category}
                    subcategorySlug={listing.subcategory}
                    fields={listing.categoryFields}
                  />
                )}

                <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 border border-app-color shadow-sm">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Description</h3>
                  <div className="prose dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {listing.description}
                  </div>
                </div>

                {/* Map Section */}
                <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-app-color overflow-hidden">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Location</h3>
                  <div className="aspect-video bg-gray-100 dark:bg-neutral-700 rounded-xl relative overflow-hidden">
                    {/* Leaflet map needs to be dynamically imported to avoid SSR issues with 'window' */}
                    <div className="w-full h-full">
                      <ListingMap location={listing.location} title={listing.title} />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Right Column - Info & Actions */}
          <div className="lg:col-span-5 space-y-6">

            {/* Header Info */}
            <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 md:p-8 border border-app-color shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white leading-tight mb-2">
                    {listing.title}
                  </h1>
                  {listing.subtitle && (
                    <p className="text-base text-neutral-600 dark:text-neutral-400 mb-2">
                      {listing.subtitle}
                    </p>
                  )}
                  {isPendingReview && (
                    <p className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-semibold mb-2">
                      Publishing is taking longer than usual
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {timeAgo}
                    </span>
                    <span className="w-1 h-1 bg-gray-300 dark:bg-neutral-600 rounded-full" />
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {listing.viewCount} views
                    </span>
                    <span className="w-1 h-1 bg-gray-300 dark:bg-neutral-600 rounded-full" />
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" /> {listing.likeCount} likes
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-end gap-3 mb-6">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {formatCurrency(listing.price)}
                </div>
                <div className="mb-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-700 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {listing.condition}
                </div>
              </div>

              {/* Action Buttons (Desktop Inline) */}
              <div className="hidden lg:block">
                <ListingActions listing={listing} />
              </div>
            </div>

            {/* Seller Info */}
            {listing.seller && (
              <SellerCard
                user={listing.seller}
                listingId={listingUrlId}
                listingUrlId={listingUrlId}
              />
            )}

            {/* Mobile Details & Specs */}
            <div className="lg:hidden space-y-6">
              {/* Specs Mobile */}
              {listing.categoryFields && Object.keys(listing.categoryFields).length > 0 && (
                <CategoryFieldsDisplay
                  categorySlug={listing.category}
                  subcategorySlug={listing.subcategory}
                  fields={listing.categoryFields}
                />
              )}

              <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 border border-app-color">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Description</h3>
                <div className={cn(
                  "prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed relative",
                  !showFullDesc && "max-h-32 overflow-hidden"
                )}>
                  {listing.description}
                  {!showFullDesc && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-neutral-800 to-transparent" />
                  )}
                </div>
                <button
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="mt-3 text-primary-600 font-medium text-sm flex items-center gap-1 hover:underline"
                >
                  {showFullDesc ? 'Show less' : 'Read more'} <ChevronDown className={cn("w-4 h-4 transition-transform", showFullDesc && "rotate-180")} />
                </button>
              </div>
            </div>

            {/* Safety Tips Accordion */}
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5" /> Safety Tips
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300/80 list-disc pl-5">
                <li>Meet in a safe, public place</li>
                <li>Check the item before paying</li>
                <li>Never transfer money in advance</li>
              </ul>
              <Link href={ROUTES.SAFETY} className="mt-3 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1">
                <Info className="w-3 h-3" /> Read full safety guide
              </Link>
            </div>

            {/* Shipping & Pickup Section */}
            {listing.shippingOptions && (
              <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 border border-app-color">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Shipping & Pickup</h3>
                <div className="space-y-2 text-sm">
                  {/* Pickup Status */}
                  {listing.shippingOptions.pickupOption === 'must_pickup' && (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">Must pick-up (no shipping)</span>
                    </div>
                  )}
                  {listing.shippingOptions.pickupOption === 'allowed' && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <MapPin className="w-4 h-4" />
                      <span>Pick-up available</span>
                    </div>
                  )}
                  {listing.shippingOptions.pickupOption === 'no_pickup' && (
                    <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                      <MapPin className="w-4 h-4" />
                      <span>No pick-up available</span>
                    </div>
                  )}

                  {/* Only show shipping if NOT must_pickup */}
                  {listing.shippingOptions.pickupOption !== 'must_pickup' && listing.shippingOptions.shippingType && (
                    <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                      <span className="font-medium">Shipping:</span>
                      <span className="capitalize">
                        {listing.shippingOptions.shippingType === 'custom'
                          ? 'Custom rates'
                          : listing.shippingOptions.shippingType === 'free'
                            ? 'Free shipping'
                            : 'Contact seller'}
                      </span>
                    </div>
                  )}
                  {listing.shippingOptions.pickupOption !== 'must_pickup' && listing.shippingOptions.customCosts?.length > 0 && (
                    <div className="space-y-1 pl-4 border-l-2 border-app-color">
                      {listing.shippingOptions.customCosts.map((cost: any, idx: number) => (
                        cost.description ? (
                          <div key={idx} className="text-neutral-600 dark:text-neutral-400">
                            {cost.description}: ${cost.cost}
                          </div>
                        ) : null
                      ))}
                    </div>
                  )}
                  {listing.shippingOptions.pickupOption !== 'must_pickup' && listing.shippingOptions.handlingTime && (
                    <div className="text-neutral-500 dark:text-neutral-400 text-xs">
                      Handling: {listing.shippingOptions.handlingTime}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Methods Section */}
            {listing.paymentMethods && (
              <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 border border-app-color">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Payment Methods</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.paymentMethods.acceptsBankTransfer && (
                    <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                      Bank Transfer
                    </span>
                  )}
                  {listing.paymentMethods.acceptsCash && (
                    <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                      Cash
                    </span>
                  )}
                  {listing.paymentMethods.acceptsLayby && (
                    <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-medium">
                      Layby
                    </span>
                  )}
                  {listing.paymentMethods.acceptsOther && listing.paymentMethods.otherPaymentDetails && (
                    <span className="px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium">
                      {listing.paymentMethods.otherPaymentDetails}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Returns Policy Section */}
            {listing.returnsPolicy && (
              <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 border border-app-color">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Returns Policy</h3>
                <div className="text-sm">
                  {listing.returnsPolicy.acceptsReturns ? (
                    <div className="space-y-1">
                      <span className="text-green-600 dark:text-green-400 font-medium">Returns accepted</span>
                      {listing.returnsPolicy.returnWindow && (
                        <p className="text-neutral-600 dark:text-neutral-400 text-xs">
                          Window: {listing.returnsPolicy.returnWindow}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {listing.returnsPolicy.noReturnReason === 'as-is'
                        ? 'Sold as-is, no returns'
                        : 'No returns accepted'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Similar Listings */}
        <div className="mt-12 pt-8 border-t border-app-color">
          <SimilarListings currentListingId={listing.publicId} categoryId={listing.category} />
        </div>

        {/* Recently Viewed */}
        <RecentlyViewed />
      </div>

      {/* Floating Ask AI Button */}
      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all group"
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-semibold">Ask AI</span>
        <span className="text-[10px] opacity-70 hidden sm:inline">Gemini 3</span>
      </button>

      {/* AI Shopping Assistant Panel */}
      <AssistantPanel
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        listingId={listingUrlId}
        listingTitle={listing.title}
        listingCategory={listing.category}
      />

      {/* Sticky Mobile Actions */}
      <ListingActions listing={listing} isSticky />
    </div>
  );
}

const ListingPageSkeleton = () => (
  <div className="min-h-screen pb-12">
    <div className="bg-white dark:bg-neutral-900 h-12 border-b border-app-color" />
    <div className="max-w-[1440px] mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <Skeleton className="w-full aspect-[4/3] rounded-2xl" />
          <div className="hidden lg:block space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </div>
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4 rounded-lg" />
            <Skeleton className="h-6 w-1/2 rounded-lg" />
            <Skeleton className="h-12 w-1/3 rounded-lg" />
          </div>
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="lg:hidden">
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
