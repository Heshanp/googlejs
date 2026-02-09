'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { UsersService } from '../../../services';
import { Listing, User, Review } from '../../../types';
import { ProfileHeader } from '../../../components/features/profile/ProfileHeader';
import { ListingCard } from '../../../components/features/listings/ListingCard';
import { useAuth } from '../../../hooks/useAuth';
import { ReviewsSection } from '../../../components/features/profile/ReviewsSection';
import { Tabs } from '../../../components/ui/Tabs';
import { Loader2 } from 'lucide-react';
import { Seo } from '../../../components/shared/Seo';
import { JsonLd } from '../../../components/shared/JsonLd';
import { SITE_CONFIG } from '../../../lib/seo';
import { PageShell } from '../../../components/layout/PageShell';

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('listings');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!id) return;
        const res = await UsersService.getPublicProfile(id);
        setUser(res.data.data.user);
        setListings(res.data.data.listings);
        setReviews(res.data.data.reviews);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <Seo title="User Not Found" noindex />
        User not found
      </div>
    );
  }

  const title = `${user.name} on ${SITE_CONFIG.name}`;
  const description = `View ${user.name}'s listings and reviews on ${SITE_CONFIG.name}. ${user.rating} star rating from ${user.reviewCount} reviews.`;

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": user.name,
    "image": user.avatar,
    "url": `${SITE_CONFIG.domain}/profile/${user.id}`
  };

  const isOwnProfile = !!authUser && authUser.id === id;

  return (
    <PageShell>
      <Seo
        title={title}
        description={description}
        image={user.avatar}
        type="profile"
      />
      <JsonLd data={personSchema} />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <ProfileHeader
          user={user}
          stats={{
            listingsCount: listings.length,
            soldCount: Math.floor(user.reviewCount * 0.8)
          }}
        />

        <div className="mt-8">
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            className="mb-6"
            tabs={[
              { id: 'listings', label: 'Listings', count: listings.length },
              { id: 'reviews', label: 'Reviews', count: reviews.length },
            ]}
          />

          <div className="animate-in fade-in duration-300">
            {activeTab === 'listings' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map(listing => (
                  <ListingCard key={listing.id} listing={listing} hideLikeButton={isOwnProfile} />
                ))}
                {listings.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    No active listings
                  </div>
                )}
              </div>
            )}
            {activeTab === 'reviews' && (
              <ReviewsSection reviews={reviews} />
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
