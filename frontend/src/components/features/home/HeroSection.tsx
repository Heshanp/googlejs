'use client';

import React from 'react';
import { Search, Plus, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useStore } from '../../../store/useStore';
import { useNavigation } from '../../../hooks/useNavigation';
import { motion } from 'framer-motion';
import { parseNaturalLanguageQuery } from '../../../lib/utils/nlp-search-parser';
import { resolveSearchLocation } from '../../../lib/search/location-preference';

export const HeroSection: React.FC = () => {
  const { searchQuery, setSearchQuery } = useStore();
  const { navigate } = useNavigation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse natural language query
    const parsed = parseNaturalLanguageQuery(searchQuery);

    // Build URL with filters
    const params = new URLSearchParams();
    const normalizedQuery = searchQuery.trim();
    const backendQuery = (parsed.filters.query || normalizedQuery).trim() || normalizedQuery;
    params.set('q', backendQuery);
    params.set('original', normalizedQuery); // Keep original user input for display

    // Add parsed filters to URL
    if (parsed.filters.make) params.set('make', parsed.filters.make);
    if (parsed.filters.model) params.set('model', parsed.filters.model);
    if (parsed.filters.yearMin !== undefined) params.set('yearMin', parsed.filters.yearMin.toString());
    if (parsed.filters.yearMax !== undefined) params.set('yearMax', parsed.filters.yearMax.toString());
    if (parsed.filters.priceMin !== undefined) params.set('priceMin', parsed.filters.priceMin.toString());
    if (parsed.filters.priceMax !== undefined) {
      params.set('priceMax', parsed.filters.priceMax.toString());
    }
    if (parsed.filters.odometerMin !== undefined) params.set('odometerMin', parsed.filters.odometerMin.toString());
    if (parsed.filters.odometerMax !== undefined) params.set('odometerMax', parsed.filters.odometerMax.toString());
    const resolvedLocation = resolveSearchLocation(parsed.filters.location);
    if (resolvedLocation) params.set('location', resolvedLocation);
    if (parsed.filters.color) params.set('color', parsed.filters.color);
    if (parsed.filters.condition && parsed.filters.condition.length > 0) {
      params.set('condition', parsed.filters.condition.join(','));
    }
    if (parsed.filters.category) params.set('category', parsed.filters.category);
    if (parsed.interpretedAs) params.set('interpreted', parsed.interpretedAs);

    const url = `/search?${params.toString()}`;
    navigate(url);
  };


  return (
    <section className="relative overflow-hidden pt-8 pb-12 md:pt-24 md:pb-32">
      {/* Animated Aurora Background */}
      <div className="absolute inset-0 -z-10 bg-background dark:bg-neutral-950">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-200/40 dark:bg-primary-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-200/40 dark:bg-purple-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-200/40 dark:bg-pink-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 backdrop-blur-md text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider mb-8 shadow-sm">
              <Sparkles className="w-3 h-3" /> The New Standard
            </span>

            <h1 className="text-5xl md:text-7xl font-extrabold text-neutral-900 dark:text-white mb-8 tracking-tight leading-[1.1]">
              Buy & Sell <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400 dark:from-primary-400 dark:to-primary-200">
                Reimagined.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Discover a curated marketplace for unique items. Join thousands of Kiwis trading securely with peace of mind.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative max-w-xl mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-500 rounded-3xl blur-xl opacity-20 dark:opacity-40 transform translate-y-4" />
            <form onSubmit={handleSearch} className="relative bg-white dark:bg-neutral-900/90 backdrop-blur-xl p-2 rounded-3xl shadow flex gap-2">
              <div className="relative flex-grow flex items-center">
                <Search className="absolute left-5 text-neutral-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for anything..."
                  className="w-full h-14 pl-14 pr-4 bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 text-base font-medium focus-visible:ring-2 focus-visible:ring-primary-500/20 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button size="lg" className="rounded-2xl h-14 px-8 shadow text-base" type="submit">
                Search
              </Button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6"
          >
            <button onClick={() => navigate('/categories')} className="group flex items-center gap-3 text-sm font-semibold text-neutral-900 dark:text-white hover:text-primary-600 transition-colors">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-app-color flex items-center justify-center group-hover:scale-110 transition-transform text-primary-600">
                <ArrowRight className="w-5 h-5" />
              </div>
              Browse categories
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
