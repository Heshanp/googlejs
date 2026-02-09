import { getFilterableFields } from '../config/category-fields/index';
import { FieldSchema } from '../types/category-fields.types';

/**
 * Category-specific filter field definitions.
 * Maps each category to the filter IDs that should be shown.
 */
const CATEGORY_FILTER_IDS: Record<string, string[]> = {
    // Product categories
    vehicles: ['make', 'model', 'year', 'body_type', 'transmission', 'fuel_type', 'mileage', 'engine_size'],
    phones: ['brand', 'storage_capacity', 'color', 'condition'],
    computers: ['brand', 'computer_type', 'ram', 'storage_capacity', 'condition'],
    gaming: ['platform', 'console_model', 'condition'],
    fashion: ['brand', 'size', 'color', 'condition_details'],
    furniture: ['material', 'style', 'room_type', 'condition'],
    jewelry: ['item_type', 'metal_type', 'watch_type', 'condition'],
    baby: ['item_type', 'age_range', 'brand', 'condition'],
    sports: ['sport_type', 'brand', 'size', 'condition'],
    hobbies: ['hobby_type', 'brand', 'condition'],
    pets: ['listing_type', 'animal_type', 'breed'],

    // Non-product categories
    property: ['listing_type', 'property_type', 'bedrooms', 'bathrooms', 'furnished', 'pets_allowed'],
    jobs: ['job_type', 'industry', 'experience_level', 'work_arrangement', 'salary_range'],
    services: ['service_type', 'pricing_type', 'service_area'],
    free: ['item_type', 'condition', 'pickup_flexibility'],

    // General - catch-all
    general: ['condition'],
};

/**
 * Universal filters shown for all categories or when category is unknown.
 */
export const UNIVERSAL_FILTER_IDS = ['condition', 'location'];

/**
 * Get filter field IDs for a given category.
 * Returns category-specific filters if available, otherwise universal filters.
 */
export function getFilterIdsForCategory(category: string | null): string[] {
    if (!category) return UNIVERSAL_FILTER_IDS;

    const normalizedCategory = category.toLowerCase().trim();
    return CATEGORY_FILTER_IDS[normalizedCategory] || UNIVERSAL_FILTER_IDS;
}

/**
 * Get full filter field schemas for a category.
 * Uses the category-fields config which has complete field definitions.
 */
export function getFiltersForCategory(category: string | null): FieldSchema[] {
    if (!category) return [];

    // Use the existing category-fields infrastructure for full schema
    return getFilterableFields(category);
}

/**
 * Check if a category has specific filters defined.
 */
export function hasSpecificFilters(category: string | null): boolean {
    if (!category) return false;
    const normalizedCategory = category.toLowerCase().trim();
    return normalizedCategory in CATEGORY_FILTER_IDS;
}

/**
 * Get display name for a category.
 */
export function getCategoryDisplayName(category: string | null): string {
    if (!category) return 'All Items';

    const displayNames: Record<string, string> = {
        vehicles: 'Vehicles',
        phones: 'Phones & Tablets',
        computers: 'Computers & Tech',
        gaming: 'Gaming',
        fashion: 'Fashion',
        furniture: 'Home & Furniture',
        jewelry: 'Watches & Jewelry',
        baby: 'Baby & Kids',
        sports: 'Sports & Outdoors',
        hobbies: 'Hobbies & Collectibles',
        pets: 'Pets & Animals',
        property: 'Property',
        jobs: 'Jobs',
        services: 'Services',
        free: 'Free Stuff',
        general: 'General',
    };

    return displayNames[category.toLowerCase()] || category.charAt(0).toUpperCase() + category.slice(1);
}
