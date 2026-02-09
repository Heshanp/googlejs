'use client';

import { useState, useEffect } from 'react';
import { Listing, Category } from '../types';
import { ListingsService, CategoriesService } from '../services';

export const useListings = () => {
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Execute in parallel for performance
        const [featuredRes, recentRes, categoriesRes] = await Promise.all([
          ListingsService.getFeaturedListings(),
          ListingsService.getRecentListings(),
          CategoriesService.getCategories()
        ]);

        const featuredData = featuredRes.data.data as any;
        const recentData = recentRes.data.data as any;

        setFeaturedListings(Array.isArray(featuredData) ? featuredData : (featuredData?.items || []));
        setRecentListings(Array.isArray(recentData) ? recentData : (recentData?.items || []));
        setCategories(categoriesRes.data.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { featuredListings, recentListings, categories, loading, error };
};
