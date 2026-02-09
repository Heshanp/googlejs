'use client';

import React from 'react';
import { useNavigation } from '../../../hooks/useNavigation';
import Link from 'next/link';
import { Search, PackageX } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Seo } from '../../../components/shared/Seo';
import { RecentlyViewed } from '../../../components/features/listings/RecentlyViewed';

export default function ListingNotFound() {
  const { navigate } = useNavigation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 pb-20">
      <Seo title="Listing Unavailable" noindex />

      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="w-24 h-24 bg-gray-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6">
          <PackageX className="w-12 h-12 text-gray-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          This listing is no longer available
        </h1>

        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          The item may have been sold, deleted by the seller, or the listing has expired.
          Don't worry, there are thousands of other items to discover!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          <Button onClick={() => navigate('/explore')} className="w-full" size="lg">
            <Search className="w-4 h-4 mr-2" /> Browse Similar Items
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full" size="lg">
              Go to Homepage
            </Button>
          </Link>
        </div>

        <RecentlyViewed />
      </div>
    </div>
  );
}