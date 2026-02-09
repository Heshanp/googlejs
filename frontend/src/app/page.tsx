'use client';

import React from 'react';
import { HeroSearch } from '../components/features/home/HeroSearch';
import { FreshListings } from '../components/features/home/FreshListings';
import { AIFeatures } from '../components/features/home/AIFeatures';
import { TrendingCollections } from '../components/features/home/TrendingCollections';

export default function Home() {
  return (
    <main className="pt-32 pb-24 px-6 relative">
      <HeroSearch />
      <FreshListings />
      <AIFeatures />
      <TrendingCollections />
    </main>
  );
}
