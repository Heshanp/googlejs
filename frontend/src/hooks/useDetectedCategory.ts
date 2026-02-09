import { useMemo } from 'react';
import { Listing } from '../types';
import { normalizeCategory } from '../data/categories';

/**
 * Analyzes listings to detect the predominant category.
 * Returns the normalized category slug ONLY if results are highly homogeneous (70%+).
 * Returns null if mixed or empty - this ensures general filters are shown for mixed results.
 */
export function useDetectedCategory(listings: Listing[]): string | null {
    return useMemo(() => {
        if (!listings || listings.length === 0) return null;

        // Count categories (normalized to slug format)
        const categoryCounts: Record<string, number> = {};
        for (const listing of listings) {
            // Normalize category (e.g., 'cat_vehicles' -> 'vehicles')
            const cat = normalizeCategory(listing.category || 'general');
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }

        // Find the most common category
        let topCategory = '';
        let topCount = 0;
        for (const [cat, count] of Object.entries(categoryCounts)) {
            if (count > topCount) {
                topCategory = cat;
                topCount = count;
            }
        }

        // Only return category if it represents 70%+ of results
        // This prevents category-specific filters from showing on mixed-result pages
        const threshold = 0.7;
        const totalListings = listings.length;
        if (topCount / totalListings >= threshold) {
            return topCategory || null;
        }

        // Mixed results - return null to show general filters
        return null;
    }, [listings]);
}
