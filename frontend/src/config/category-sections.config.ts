/**
 * Category Sections Configuration
 * 
 * Defines which seller sections appear for each category.
 * This enables the hybrid listing form to adapt based on detected category.
 */

// Which sections are available for a category
export interface CategorySectionsConfig {
    // Standard shipping (NZ Post, Courier)
    hasShipping: boolean;

    // Pickup option
    hasPickup: boolean;

    // Returns policy
    hasReturns: boolean;

    // Viewing/inspection (for vehicles, property)
    hasViewing: boolean;

    // Finance calculator display
    hasFinanceDisplay: boolean;

    // Transport quote (for large items like vehicles)
    hasTransportQuote: boolean;

    // Step title customization
    stepTitle: string;

    // Step description
    stepDescription: string;
}

// Default config for unknown/unconfigured categories
const DEFAULT_SECTIONS: CategorySectionsConfig = {
    hasShipping: true,
    hasPickup: true,
    hasReturns: true,
    hasViewing: false,
    hasFinanceDisplay: false,
    hasTransportQuote: false,
    stepTitle: 'Shipping & Payment',
    stepDescription: 'Choose how buyers can receive this item',
};

// Category-specific configurations
export const CATEGORY_SECTIONS_CONFIG: Record<string, CategorySectionsConfig> = {
    // ============================================================================
    // VEHICLES - No shipping, pickup/viewing focused
    // ============================================================================
    'vehicles': {
        hasShipping: false,        // Can't ship a car via NZ Post!
        hasPickup: true,           // Required - where to see/collect
        hasReturns: false,         // As-is sales
        hasViewing: true,          // Test drives, inspections
        hasFinanceDisplay: true,   // Weekly payment calculator
        hasTransportQuote: true,   // Transport quote for delivery
        stepTitle: 'Pickup & Viewing',
        stepDescription: 'Where can buyers view and collect this vehicle?',
    },

    // ============================================================================
    // ELECTRONICS - Standard shipping + returns
    // ============================================================================
    'electronics': {
        hasShipping: true,
        hasPickup: true,
        hasReturns: true,          // Important for electronics
        hasViewing: false,
        hasFinanceDisplay: false,
        hasTransportQuote: false,
        stepTitle: 'Shipping & Returns',
        stepDescription: 'Choose shipping options and returns policy',
    },

    // ============================================================================
    // FASHION - Standard shipping + returns (sizing)
    // ============================================================================
    'fashion': {
        hasShipping: true,
        hasPickup: true,
        hasReturns: true,          // Very important for clothing sizing
        hasViewing: false,
        hasFinanceDisplay: false,
        hasTransportQuote: false,
        stepTitle: 'Shipping & Returns',
        stepDescription: 'Choose shipping options and returns policy',
    },

    // ============================================================================
    // HOME & LIVING - May need transport for large furniture
    // ============================================================================
    'home-living': {
        hasShipping: true,         // Small items can ship
        hasPickup: true,
        hasReturns: true,
        hasViewing: false,
        hasFinanceDisplay: false,
        hasTransportQuote: true,   // Large furniture may need transport
        stepTitle: 'Shipping & Delivery',
        stepDescription: 'Choose delivery options for this item',
    },

    // ============================================================================
    // PROPERTY - Viewing focused, no shipping
    // ============================================================================
    'property': {
        hasShipping: false,
        hasPickup: false,
        hasReturns: false,
        hasViewing: true,          // Open homes, private viewings
        hasFinanceDisplay: true,   // Mortgage calculator
        hasTransportQuote: false,
        stepTitle: 'Viewing',
        stepDescription: 'Set up viewing availability for this property',
    },

    // ============================================================================
    // SERVICES - No physical delivery
    // ============================================================================
    'services': {
        hasShipping: false,
        hasPickup: false,
        hasReturns: false,
        hasViewing: false,
        hasFinanceDisplay: false,
        hasTransportQuote: false,
        stepTitle: 'Service Details',
        stepDescription: 'Additional service information',
    },

    // ============================================================================
    // JOBS - No shipping, minimal sections
    // ============================================================================
    'jobs': {
        hasShipping: false,
        hasPickup: false,
        hasReturns: false,
        hasViewing: false,
        hasFinanceDisplay: false,
        hasTransportQuote: false,
        stepTitle: 'Application Details',
        stepDescription: 'How can candidates apply?',
    },
};

/**
 * Get section configuration for a category
 * Falls back to DEFAULT_SECTIONS for unconfigured categories
 */
export function getSectionsForCategory(categorySlug: string): CategorySectionsConfig {
    return CATEGORY_SECTIONS_CONFIG[categorySlug] || DEFAULT_SECTIONS;
}

/**
 * Check if a category should skip the shipping/delivery step entirely
 * (e.g., jobs, services)
 */
export function shouldSkipDeliveryStep(categorySlug: string): boolean {
    const config = getSectionsForCategory(categorySlug);
    return !config.hasShipping && !config.hasPickup && !config.hasViewing && !config.hasTransportQuote;
}
