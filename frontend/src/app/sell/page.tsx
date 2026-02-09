import React from 'react';
import { ListingStudio } from '../../components/features/sell/ListingStudio';

export default function SellPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-neutral-50 dark:bg-black pt-20">
      <ListingStudio />
    </div>
  );
}