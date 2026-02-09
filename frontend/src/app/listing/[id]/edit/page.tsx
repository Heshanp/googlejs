'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useNavigation } from '../../../../hooks/useNavigation';
import { ListingStudio } from '../../../../components/features/sell/ListingStudio';
import { ListingsService } from '../../../../services';
import { Listing } from '../../../../types';
import { Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const { navigate } = useNavigation();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (listing && listing.publicId === id) return;

    const fetchListing = async () => {
      setLoading(true);
      try {
        const res = await ListingsService.getListingById(id);
        setListing(res.data.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load listing');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id, listing?.publicId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-red-500 mb-2">Error</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  if (!listing.publicId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-red-500 mb-2">Error</h2>
        <p className="text-gray-500 mb-4">Listing public ID missing</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black pt-20">
      <ListingStudio
        mode="edit"
        initialData={listing}
        listingId={listing.publicId}
      />
    </div>
  );
}
