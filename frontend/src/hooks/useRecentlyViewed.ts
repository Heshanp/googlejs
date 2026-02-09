'use client';

import { useState, useEffect, useCallback } from 'react';
import { Listing } from '../types';

const MAX_ITEMS = 20;
const STORAGE_KEY = 'justsell_recently_viewed';

// We store a simplified version to save space
export interface RecentItem {
  id: string;
  title: string;
  price: number;
  image: string;
  condition: string;
  viewedAt: number;
}

export const useRecentlyViewed = () => {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecentItems(JSON.parse(stored));
      } catch (e) {
      }
    }
  }, []);

  const addToRecentlyViewed = useCallback((listing: Listing) => {
    setRecentItems(prev => {
      const urlId = listing.publicId;
      if (!urlId) return prev;
      const newItem: RecentItem = {
        id: urlId,
        title: listing.title,
        price: listing.price,
        image: listing.images?.[0]?.url || '',
        condition: listing.condition,
        viewedAt: Date.now()
      };

      // Remove existing if present (to move to top)
      const filtered = prev.filter(item => item.id !== urlId);
      
      const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecentItems([]);
  }, []);

  return {
    recentItems,
    addToRecentlyViewed,
    clearRecentlyViewed
  };
};
