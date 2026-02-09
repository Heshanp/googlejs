'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ListingsService, ReviewsService } from '../../services';
import { Listing, UserProfile, Review, ReviewSummary } from '../../types';
import { ProfileHeader } from '../../components/features/profile/ProfileHeader';
import { ListingsTab } from '../../components/features/profile/ListingsTab';
import { ReviewsSection } from '../../components/features/profile/ReviewsSection';
import { LikedListings } from '../../components/features/profile/LikedListings';
import { Tabs } from '../../components/ui/Tabs';
import { useNavigation } from '../../hooks/useNavigation';
import { Loader2 } from 'lucide-react';
import { Seo } from '../../components/shared/Seo';
import { AccountLayout } from '../../components/layout/AccountLayout';
import { ROUTES } from '../../lib/routes';

export default function ProfilePage() {
  const { user: authUser, isAuthenticated, hasHydrated } = useAuth();
  const { searchParams, setSearchParams } = useNavigation();

  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | undefined>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const activeTab = searchParams.get('tab') || 'listings';

  useEffect(() => {
    // Wait for hydration before checking auth state to prevent false redirects
    if (!hasHydrated) return;

    if (!isAuthenticated || !authUser) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch user profile, listings and reviews for the user
        // We fetch fresh user data to get updated reviewCount and rating
        const [userRes, listingsRes, reviewsRes] = await Promise.allSettled([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/users/${authUser.id}`).then(async (r) => {
            if (!r.ok) {
              throw new Error(`Failed to fetch user profile (${r.status})`);
            }
            return r.json();
          }),
          ListingsService.getUserListings(authUser.id),
          ReviewsService.getReviewsForUser(authUser.id),
        ]);

        // Update profile with fresh data from API
        if (userRes.status === 'fulfilled' && userRes.value?.user) {
          setProfile({
            ...userRes.value.user,
            bio: '',
            socialLinks: {},
            memberSince: userRes.value.user.createdAt || new Date().toISOString(),
            lastActive: new Date().toISOString(),
            preferences: {
              notifications: { email: true, push: true, sms: false },
              privacy: { showEmail: false, showPhone: false, showLocation: true },
              theme: 'system',
              language: 'en'
            }
          });
        } else if (userRes.status === 'rejected') {
        }

        if (listingsRes.status === 'fulfilled') {
          setListings(listingsRes.value.data.data);
        } else {
          setListings([]);
        }

        const fallbackStats = {
          averageRating: 0,
          totalReviews: 0,
          breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        };

        if (reviewsRes.status === 'fulfilled') {
          const stats = reviewsRes.value.stats || fallbackStats;
          setReviews(reviewsRes.value.reviews || []);
          setReviewSummary({
            userId: authUser.id,
            averageRating: stats.averageRating,
            totalReviews: stats.totalReviews,
            breakdown: stats.breakdown as { 5: number; 4: number; 3: number; 2: number; 1: number },
          });
        } else {
          setReviews([]);
          setReviewSummary({
            userId: authUser.id,
            averageRating: fallbackStats.averageRating,
            totalReviews: fallbackStats.totalReviews,
            breakdown: fallbackStats.breakdown,
          });
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authUser, isAuthenticated, hasHydrated]);

  // Show loading while hydrating or not authenticated
  if (!hasHydrated || !isAuthenticated || !authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const soldCount = listings.filter(l => l.status === 'sold').length;

  return (
    <>
      <Seo title="My Profile" noindex />
      <AccountLayout
        title="Profile"
        description="Manage your public profile, listings, and reviews."
        activeNav="profile"
        showBreadcrumbs={false}
        breadcrumb={[
          { label: 'Home', href: ROUTES.HOME },
          { label: 'Profile' },
        ]}
      >
        <div className="space-y-6">
          <ProfileHeader
            user={profile || authUser}
            isOwnProfile
            stats={{ listingsCount: listings.length, soldCount }}
            className="bg-white/90 dark:bg-neutral-900/70 border border-app-color shadow mb-0"
          />

          <div className="rounded-3xl border border-app-color bg-white/90 dark:bg-neutral-900/70 backdrop-blur-xl p-4 md:p-6 shadow">
            <Tabs
              variant="pill"
              activeTab={activeTab}
              onChange={(id) => setSearchParams({ tab: id })}
              className="mb-6"
              tabs={[
                { id: 'favorites', label: 'Liked' },
                { id: 'listings', label: 'My Listings', count: listings.length },
                { id: 'reviews', label: 'Reviews', count: reviews.length },
              ]}
            />

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {activeTab === 'listings' && (
                <ListingsTab listings={listings} isOwner onRefresh={() => window.location.reload()} />
              )}
              {activeTab === 'reviews' && (
                <ReviewsSection reviews={reviews} summary={reviewSummary} />
              )}
              {activeTab === 'favorites' && (
                <LikedListings />
              )}
            </div>
          </div>
        </div>
      </AccountLayout>
    </>
  );
}
