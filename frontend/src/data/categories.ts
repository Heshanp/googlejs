import { Category, CategoryTree } from '../types';

/**
 * Category system designed for marketplace filtering
 * Categories are kept separate when they have distinct, useful filterable attributes
 */
export const CATEGORIES: Category[] = [
  // Product categories - items for sale
  { id: 'cat_vehicles', name: 'Vehicles', slug: 'vehicles', icon: 'Car' },
  { id: 'cat_phones', name: 'Phones & Tablets', slug: 'phones', icon: 'Smartphone' },
  { id: 'cat_computers', name: 'Computers & Tech', slug: 'computers', icon: 'Laptop' },
  { id: 'cat_gaming', name: 'Gaming', slug: 'gaming', icon: 'Gamepad2' },
  { id: 'cat_fashion', name: 'Fashion', slug: 'fashion', icon: 'Shirt' },
  { id: 'cat_furniture', name: 'Home & Furniture', slug: 'furniture', icon: 'Sofa' },
  { id: 'cat_jewelry', name: 'Watches & Jewelry', slug: 'jewelry', icon: 'Watch' },
  { id: 'cat_baby', name: 'Baby & Kids', slug: 'baby', icon: 'Baby' },
  { id: 'cat_sports', name: 'Sports & Outdoors', slug: 'sports', icon: 'Bike' },
  { id: 'cat_hobbies', name: 'Hobbies & Collectibles', slug: 'hobbies', icon: 'Music' },
  { id: 'cat_pets', name: 'Pets & Animals', slug: 'pets', icon: 'PawPrint' },

  // Non-product categories - rentals, jobs, services
  { id: 'cat_property', name: 'Property', slug: 'property', icon: 'Home' },
  { id: 'cat_jobs', name: 'Jobs', slug: 'jobs', icon: 'Briefcase' },
  { id: 'cat_services', name: 'Services', slug: 'services', icon: 'Wrench' },
  { id: 'cat_free', name: 'Free Stuff', slug: 'free', icon: 'Gift' },

  // Catch-all
  { id: 'cat_general', name: 'General', slug: 'general', icon: 'Package' },
];

// Legacy slug mapping for backward compatibility with existing listings
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  // Electronics subcategories
  'electronics': 'computers',
  'mobile-phones': 'phones',
  'cameras': 'computers',
  'audio': 'computers',
  'tablets': 'phones',

  // Vehicles subcategories
  'cars': 'vehicles',
  'motorcycles': 'vehicles',
  'boats': 'vehicles',
  'car-parts': 'vehicles',
  'caravans': 'vehicles',

  // Fashion subcategories
  'women': 'fashion',
  'men': 'fashion',
  'shoes': 'fashion',
  'bags': 'fashion',
  'accessories': 'fashion',
  'clothing': 'fashion',

  // Home subcategories
  'home-living': 'furniture',
  'home': 'furniture',
  'kitchen': 'furniture',
  'garden': 'furniture',
  'appliances': 'furniture',
  'decor': 'furniture',

  // Sports & Outdoors subcategories
  'sports': 'sports',
  'camping': 'sports',
  'bicycles': 'sports',
  'bikes': 'sports',
  'fitness': 'sports',
  'gym': 'sports',
  'outdoors': 'sports',
  'fishing': 'sports',
  'skiing': 'sports',
  'golf': 'sports',
  'water-sports': 'sports',

  // Hobbies & Collectibles subcategories
  'instruments': 'hobbies',
  'Musical Instruments': 'hobbies',
  'music': 'hobbies',
  'toys': 'hobbies',
  'collectibles': 'hobbies',
  'antiques': 'hobbies',
  'art': 'hobbies',
  'crafts': 'hobbies',
  'books': 'hobbies',
  'movies': 'hobbies',
  'photography': 'hobbies',
  'board-games': 'hobbies',

  // Pets & Animals subcategories
  'pets': 'pets',
  'dogs': 'pets',
  'cats': 'pets',
  'birds': 'pets',
  'fish': 'pets',
  'pet-supplies': 'pets',
  'horses': 'pets',
  'livestock': 'pets',

  // Property subcategories
  'property': 'property',
  'for-rent': 'property',
  'flatmates': 'property',
  'parking': 'property',
  'rentals': 'property',

  // Jobs subcategories
  'jobs': 'jobs',
  'employment': 'jobs',

  // Services subcategories
  'services': 'services',
  'trades': 'services',
  'tutoring': 'services',
  'cleaning': 'services',

  // Free stuff
  'free-stuff': 'free',
  'giveaway': 'free',
  'freebies': 'free',

  // Gaming subcategories
  'gaming-consoles': 'gaming',
  'video-games': 'gaming',
  'consoles': 'gaming',

  // Jewelry subcategories
  'watches': 'jewelry',
  'jewellery': 'jewelry',
  'rings': 'jewelry',
  'necklaces': 'jewelry',

  // Baby subcategories
  'baby': 'baby',
  'baby-gear': 'baby',
  'kids': 'baby',
  'children': 'baby',
  'maternity': 'baby',

  // Everything else falls through to general
  'other': 'general',
  'misc': 'general',
};

// Categories where quantity is not a meaningful listing field
const NON_QUANTITY_CATEGORIES = new Set(['vehicles', 'property', 'jobs', 'services']);

/**
 * Normalize a category slug to the new flat system
 * Handles legacy subcategories and old naming conventions
 */
export function normalizeCategory(slug: string): string {
  // Remove cat_ prefix if present
  const normalized = slug.replace(/^cat_/, '');

  // Check if it's a legacy slug that needs mapping
  if (LEGACY_CATEGORY_MAP[normalized]) {
    return LEGACY_CATEGORY_MAP[normalized];
  }

  // Check if it's already a valid new category
  const validCategory = CATEGORIES.find(c => c.slug === normalized);
  if (validCategory) {
    return normalized;
  }

  // Default to 'general' for unknown categories
  return 'general';
}

/**
 * Returns true when a category should expose quantity controls.
 */
export function supportsQuantityForCategory(slug: string): boolean {
  const normalizedSlug = normalizeCategory(slug || 'general');
  return !NON_QUANTITY_CATEGORIES.has(normalizedSlug);
}

/**
 * Get category by slug (with legacy support)
 */
export function getCategoryBySlug(slug: string): Category | undefined {
  const normalizedSlug = normalizeCategory(slug);
  return CATEGORIES.find(c => c.slug === normalizedSlug);
}

// Build tree (flat structure now, but keeping for API compatibility)
export function buildCategoryTree(categories: Category[]): CategoryTree[] {
  return categories.map(cat => ({ ...cat, children: [] }));
}

export const CATEGORY_TREE = buildCategoryTree(CATEGORIES);
