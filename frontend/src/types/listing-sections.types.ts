/**
 * Seller-controlled sections for hybrid listings
 * These sections are NOT AI-generated and require manual entry or profile defaults
 */

// ============================================================================
// SHIPPING
// ============================================================================

export type ShippingRegion = 'nationwide' | 'north-island' | 'south-island' | 'local-pickup';

export interface ShippingMethod {
    id: string;
    name: string; // 'NZ Post Standard', 'Courier', 'Pickup Only'
    price: number;
    estimatedDays: string; // '2-5 business days'
    regions: ShippingRegion[];
}

export interface ShippingOptions {
    methods: ShippingMethod[];
    freeShippingThreshold?: number; // Free shipping above this price
    handlingTime?: 'same-day' | '1-2 days' | '3-5 days' | '1 week' | 'custom';
    customHandlingDays?: number;
    pickupAvailable: boolean;
    pickupLocation?: string; // 'Auckland CBD', etc.

    // New Fields for revamped UI
    pickupOption?: 'no_pickup' | 'allowed' | 'must_pickup';
    shippingType?: 'free' | 'custom' | 'undecided';
    customCosts?: { cost: number; description: string }[];
    isRural?: boolean; // Often goes with shipping costs
}

// ============================================================================
// PAYMENT
// ============================================================================

export interface PaymentMethods {
    acceptsBankTransfer: boolean;
    acceptsCash: boolean;
    acceptsLayby: boolean;
    acceptsAfterPay?: boolean; // Future
    acceptsOther?: boolean;
    otherPaymentDetails?: string;
    preferredMethod?: 'bank-transfer' | 'cash' | 'afterpay';
    laybyTerms?: string; // '10% deposit, 8 weeks to pay'
}

// ============================================================================
// RETURNS
// ============================================================================

export type NoReturnReason = 'as-is' | 'final-sale' | 'hygiene' | 'custom-made' | 'other';

export interface ReturnsPolicy {
    acceptsReturns: boolean;
    returnWindow?: number; // days (7, 14, 30)
    returnConditions?: string; // 'Unused, in original packaging'
    buyerPaysReturn: boolean;
    noReturnReason?: NoReturnReason;
    noReturnExplanation?: string;
}

// ============================================================================
// AI ANALYSIS METADATA
// ============================================================================

export interface CategoryDetection {
    primary: string; // 'electronics'
    subcategory?: string; // 'phones'
    path: string[]; // ['Electronics', 'Phones & Accessories', 'Mobile Phones']
    confidence: number; // 0-1
}

export interface AIAnalysisMetadata {
    confidence: number; // Overall confidence 0-1
    category: CategoryDetection;
    suggestedPrice?: {
        min: number;
        max: number;
        average: number;
        basedOnCount: number; // Number of similar items analyzed
    };
    detectedKeywords: string[];
    analyzedAt: string; // ISO timestamp
    modelVersion: string; // For tracking which AI model was used
}

// ============================================================================
// SELLER DEFAULTS (stored in user profile)
// ============================================================================

export interface SellerDefaults {
    shippingOptions: ShippingOptions;
    paymentMethods: PaymentMethods;
    returnsPolicy: ReturnsPolicy;
    defaultLocation?: {
        city: string;
        region: string;
        postcode?: string;
    };
}

// ============================================================================
// DEFAULT PRESETS
// ============================================================================

export const DEFAULT_SHIPPING_OPTIONS: ShippingOptions = {
    methods: [],
    // handlingTime removed as default
    pickupAvailable: true,
};

export const DEFAULT_PAYMENT_METHODS: PaymentMethods = {
    acceptsBankTransfer: true,
    acceptsCash: true,
    acceptsLayby: false,
};

export const DEFAULT_RETURNS_POLICY: ReturnsPolicy = {
    acceptsReturns: false,
    buyerPaysReturn: true,
    noReturnReason: 'as-is',
};

// Common shipping presets for NZ
export const NZ_SHIPPING_PRESETS: ShippingMethod[] = [
    {
        id: 'nzpost-standard',
        name: 'NZ Post Standard',
        price: 6.50,
        estimatedDays: '3-5 business days',
        regions: ['nationwide'],
    },
    {
        id: 'nzpost-express',
        name: 'NZ Post Express',
        price: 9.50,
        estimatedDays: '1-2 business days',
        regions: ['nationwide'],
    },
    {
        id: 'courier',
        name: 'Courier (Signature Required)',
        price: 12.00,
        estimatedDays: '1-2 business days',
        regions: ['nationwide'],
    },
    {
        id: 'pickup',
        name: 'Local Pickup',
        price: 0,
        estimatedDays: 'Arrange with seller',
        regions: ['local-pickup'],
    },
];
