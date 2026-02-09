/**
 * Natural Language Search Parser
 * 
 * Parses natural language queries into structured filter objects
 * Example: "Find me Lexus CT200h after 2012 with 100k or below mileage near Auckland"
 */

import { ListingFilters } from '../../types';

// Known vehicle makes (common in NZ market)
const VEHICLE_MAKES = [
    'toyota', 'honda', 'mazda', 'nissan', 'mitsubishi', 'subaru', 'suzuki',
    'ford', 'holden', 'bmw', 'mercedes', 'audi', 'volkswagen', 'lexus',
    'hyundai', 'kia', 'chevrolet', 'dodge', 'jeep', 'ram',
    'tesla', 'porsche', 'volvo', 'jaguar', 'land rover', 'range rover',
    'peugeot', 'renault', 'citroen', 'fiat', 'alfa romeo',
    'skoda', 'seat', 'mini', 'chrysler', 'isuzu', 'daihatsu'
].map(m => m.toLowerCase());

// Common NZ cities, regions and suburbs for location matching
const NZ_LOCATIONS = [
    'auckland', 'wellington', 'christchurch', 'hamilton', 'tauranga',
    'dunedin', 'palmerston north', 'napier', 'hastings', 'nelson',
    'rotorua', 'new plymouth', 'whangarei', 'invercargill', 'gisborne',
    'timaru', 'queenstown', 'northland', 'waikato', 'bay of plenty',
    'hawkes bay', 'taranaki', 'manawatu', 'wairarapa', 'tasman',
    'marlborough', 'west coast', 'canterbury', 'otago', 'southland',
    // Auckland suburbs
    'mount eden', 'ponsonby', 'parnell', 'newmarket', 'remuera', 'grey lynn',
    'mt eden', 'eden', 'mount', 'cbd', 'city centre',
    // Wellington suburbs
    'te aro', 'newtown', 'thorndon', 'kelburn',
    // Christchurch suburbs
    'riccarton', 'ilam', 'merivale'
].map(l => l.toLowerCase());

// Common colors
const VEHICLE_COLORS = [
    'white', 'black', 'silver', 'grey', 'gray', 'red', 'blue', 'green',
    'yellow', 'orange', 'brown', 'gold', 'beige', 'purple', 'pink'
];

// Condition keywords
const CONDITION_KEYWORDS: { [key: string]: string[] } = {
    'New': ['new', 'brand new'],
    'Like New': ['like new', 'excellent', 'mint', 'pristine', 'vintage', 'classic', 'retro'],
    'Good': ['good', 'good condition', 'well maintained'],
    'Fair': ['fair', 'fair condition', 'used']
};

// Camera brands (should be preserved in search queries)
const CAMERA_BRANDS = [
    'canon', 'nikon', 'sony', 'fujifilm', 'olympus', 'panasonic',
    'leica', 'pentax', 'hasselblad', 'gopro', 'dji'
];

// Category keywords mapping
const CATEGORY_KEYWORDS: { [key: string]: string[] } = {
    'electronics': [
        'camera', 'cameras', 'dslr', 'mirrorless', 'canon', 'nikon', 'sony camera',
        'phone', 'iphone', 'samsung', 'smartphone', 'mobile',
        'laptop', 'macbook', 'computer', 'pc', 'desktop',
        'tablet', 'ipad', 'kindle',
        'headphones', 'earbuds', 'airpods', 'headset',
        'tv', 'television', 'monitor', 'screen',
        'console', 'playstation', 'xbox', 'nintendo', 'gaming',
        'speaker', 'bluetooth speaker', 'soundbar',
        'watch', 'smartwatch', 'apple watch'
    ],
    'furniture': [
        'sofa', 'couch', 'chair', 'table', 'desk', 'bed', 'mattress',
        'cabinet', 'wardrobe', 'shelf', 'shelving', 'bookshelf',
        'dining table', 'coffee table', 'bedframe'
    ],
    'fashion': [
        'shoes', 'sneakers', 'boots', 'dress', 'shirt', 'pants', 'jeans',
        'jacket', 'coat', 'sweater', 'hoodie', 'bag', 'handbag', 'backpack'
    ],
    'sports': [
        'bike', 'bicycle', 'cycling', 'treadmill', 'weights', 'dumbbells',
        'golf', 'surfboard', 'skateboard', 'kayak', 'ski', 'snowboard'
    ],
    'home': [
        'appliance', 'fridge', 'refrigerator', 'washing machine', 'dryer',
        'microwave', 'oven', 'dishwasher', 'vacuum', 'heater', 'fan'
    ],
    'vehicles': [
        'car', 'cars', 'vehicle', 'vehicles', 'auto', 'automobile',
        'truck', 'trucks', 'suv', 'suvs', 'van', 'vans', 'ute', 'utes',
        'sedan', 'hatchback', 'coupe', 'convertible', 'wagon',
        'motorcycle', 'motorbike', 'scooter', 'moped',
        'boat', 'boats', 'caravan', 'caravans', 'motorhome', 'campervan'
    ]
};

interface ParsedQuery {
    filters: ListingFilters;
    interpretedAs?: string;
    originalQuery: string;
}

export function parseNaturalLanguageQuery(query: string): ParsedQuery {
    const lowerQuery = query.toLowerCase();
    const filters: ListingFilters = {};
    const interpretedParts: string[] = [];

    // 1. Extract Make
    const make = extractMake(lowerQuery);
    if (make) {
        filters.make = make;
        interpretedParts.push(`Make: ${make}`);
    }

    // 2. Extract Model (anything after make that's not a keyword)
    const model = extractModel(lowerQuery, make);
    if (model) {
        filters.model = model;
        interpretedParts.push(`Model: ${model}`);
    }

    // 3. Extract Year
    const yearRange = extractYearRange(lowerQuery);
    if (yearRange.min || yearRange.max) {
        if (yearRange.min) {
            filters.yearMin = yearRange.min;
            interpretedParts.push(`From: ${yearRange.min}`);
        }
        if (yearRange.max) {
            filters.yearMax = yearRange.max;
            interpretedParts.push(`To: ${yearRange.max}`);
        }
    }

    // 4. Extract Price
    const priceRange = extractPriceRange(lowerQuery);
    if (priceRange.min !== undefined || priceRange.max !== undefined) {
        if (priceRange.min !== undefined) {
            filters.priceMin = priceRange.min;
            interpretedParts.push(`Min price: $${priceRange.min.toLocaleString()}`);
        }
        if (priceRange.max !== undefined) {
            filters.priceMax = priceRange.max;
            interpretedParts.push(`Max price: $${priceRange.max.toLocaleString()}`);
        }
    }

    // 5. Extract Mileage/Odometer
    const odometerRange = extractOdometerRange(lowerQuery);
    if (odometerRange.min !== undefined || odometerRange.max !== undefined) {
        if (odometerRange.min !== undefined) {
            filters.odometerMin = odometerRange.min;
            interpretedParts.push(`Min odometer: ${odometerRange.min.toLocaleString()} km`);
        }
        if (odometerRange.max !== undefined) {
            filters.odometerMax = odometerRange.max;
            interpretedParts.push(`Max odometer: ${odometerRange.max.toLocaleString()} km`);
        }
    }

    // 6. Extract Location
    const location = extractLocation(lowerQuery);
    if (location) {
        filters.location = location;
        interpretedParts.push(`Location: ${location}`);
    }

    // 7. Extract Color
    const color = extractColor(lowerQuery);
    if (color) {
        filters.color = color;
        interpretedParts.push(`Color: ${color}`);
    }

    // 8. Extract Condition
    const condition = extractCondition(lowerQuery);
    if (condition) {
        filters.condition = [condition as any];
        interpretedParts.push(`Condition: ${condition}`);
    }

    // 9. Category detection DISABLED for semantic search
    // We intentionally do NOT set category filters because:
    // - Database uses inconsistent category names (general, cat_general, vehicles, etc.)
    // - Semantic search should work across ALL categories
    // - Users searching for "car" should see cars regardless of their category field
    // If category filtering is needed, users can use the category filter UI explicitly

    // const detectedCategory = extractCategory(lowerQuery);
    // if (detectedCategory) {
    //     filters.category = detectedCategory;
    //     interpretedParts.push(`Category: ${detectedCategory}`);
    // }

    // Clean query by removing filler words for better keyword matching
    const cleanedQuery = cleanQuery(query);
    filters.query = cleanedQuery;

    return {
        filters,
        interpretedAs: interpretedParts.length > 0 ? interpretedParts.join(' · ') : undefined,
        originalQuery: query
    };
}

function cleanQuery(query: string): string {
    // Remove common filler words and location prepositions
    const fillerWords = [
        'find', 'show', 'search', 'looking for', 'want', 'need',
        'near', 'in', 'at', 'around', 'from',
        'me', 'a', 'an', 'the'
    ];

    let cleaned = query.toLowerCase();

    // Remove filler words
    for (const filler of fillerWords) {
        cleaned = cleaned.replace(new RegExp(`\\b${filler}\\b`, 'gi'), ' ');
    }

    // Remove location names (already extracted as filter)
    for (const location of NZ_LOCATIONS) {
        cleaned = cleaned.replace(new RegExp(`\\b${location}\\b`, 'gi'), ' ');
    }

    // Remove vehicle makes (already extracted as filter) - but NOT camera brands
    for (const make of VEHICLE_MAKES) {
        // Skip if this make is also a camera brand (like 'sony')
        if (!CAMERA_BRANDS.includes(make.toLowerCase())) {
            cleaned = cleaned.replace(new RegExp(`\\b${make}\\b`, 'gi'), ' ');
        }
    }

    // Remove condition keywords (already extracted as filter)
    for (const keywords of Object.values(CONDITION_KEYWORDS)) {
        for (const keyword of keywords) {
            cleaned = cleaned.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), ' ');
        }
    }

    // Remove price indicators (already extracted as filter), including compact forms like 1.5k
    cleaned = cleaned.replace(
        /\b(under|below|above|over|less than|more than)\s+\$?\d+(?:,\d{3})*(?:\.\d+)?\s*[km]?\b/gi,
        ' '
    );
    cleaned = cleaned.replace(
        /\bbetween\s+\$?\d+(?:,\d{3})*(?:\.\d+)?\s*[km]?\b\s+and\s+\$?\d+(?:,\d{3})*(?:\.\d+)?\s*[km]?\b/gi,
        ' '
    );
    cleaned = cleaned.replace(/\$\d+(?:,\d{3})*(?:\.\d+)?\s*[km]?/gi, ' ');

    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned || query; // Fallback to original if everything was removed
}

function extractCategory(query: string): string | undefined {
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(query)) {
                return category;
            }
        }
    }
    return undefined;
}

function extractMake(query: string): string | undefined {
    for (const make of VEHICLE_MAKES) {
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${make}\\b`, 'i');
        if (regex.test(query)) {
            return make.charAt(0).toUpperCase() + make.slice(1);
        }
    }
    return undefined;
}

function extractModel(query: string, make?: string): string | undefined {
    if (!make) return undefined;

    // Find the make in the query
    const makeRegex = new RegExp(`\\b${make}\\b`, 'i');
    const makeMatch = query.match(makeRegex);
    if (!makeMatch) return undefined;

    // Get text after the make
    const afterMake = query.substring(makeMatch.index! + makeMatch[0].length).trim();

    // Extract the next word(s) as model, stopping at common keywords
    const stopWords = ['after', 'before', 'from', 'in', 'near', 'under', 'below', 'with', 'around', 'between', 'to'];
    const words = afterMake.split(/\s+/);
    const modelParts: string[] = [];

    for (const word of words) {
        const cleanWord = word.replace(/[,\.;]/g, '');
        if (stopWords.includes(cleanWord.toLowerCase())) break;
        if (/^\d{4}$/.test(cleanWord)) break; // Stop at year
        if (/^\$/.test(cleanWord)) break; // Stop at price
        modelParts.push(cleanWord);
        // Usually model is 1-2 words
        if (modelParts.length >= 2) break;
    }

    return modelParts.length > 0 ? modelParts.join(' ') : undefined;
}

function extractYearRange(query: string): { min?: number; max?: number } {
    const result: { min?: number; max?: number } = {};

    // Pattern: "after 2012", "since 2015", "from 2010"
    const afterMatch = query.match(/(?:after|since|from)\s+(\d{4})/i);
    if (afterMatch) {
        result.min = parseInt(afterMatch[1]);
    }

    // Pattern: "before 2020", "until 2018"
    const beforeMatch = query.match(/(?:before|until)\s+(\d{4})/i);
    if (beforeMatch) {
        result.max = parseInt(beforeMatch[1]);
    }

    // Pattern: "2015-2018", "2015 to 2018"
    const rangeMatch = query.match(/(\d{4})\s*(?:-|to)\s*(\d{4})/i);
    if (rangeMatch) {
        result.min = parseInt(rangeMatch[1]);
        result.max = parseInt(rangeMatch[2]);
    }

    // Pattern: exact year "2020"
    if (!result.min && !result.max) {
        const exactMatch = query.match(/\b(19\d{2}|20\d{2})\b/);
        if (exactMatch) {
            const year = parseInt(exactMatch[1]);
            result.min = year;
            result.max = year;
        }
    }

    return result;
}

function extractPriceRange(query: string): { min?: number; max?: number } {
    const result: { min?: number; max?: number } = {};

    // Pattern: "under $20k", "below 16k", "under $20000", "under 20000", "below $15000", "below 699"
    // Handles: k suffix (16k = 16000), comma-formatted (1,000), plain numbers (1000)
    const underMatch = query.match(/(?:under|below|less than)\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*([km])?\b/i);
    if (underMatch) {
        const value = parseCompactNumber(underMatch[1], underMatch[2]);
        result.max = value;
    }

    // Pattern: "over $10k", "above 15k", "over $10000", "above 15000", "more than $12000"
    const overMatch = query.match(/(?:over|above|more than)\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*([km])?\b/i);
    if (overMatch) {
        const value = parseCompactNumber(overMatch[1], overMatch[2]);
        result.min = value;
    }

    // Pattern: "between $10000 and $20000"
    const betweenMatch = query.match(/between\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*([km])?\s+and\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*([km])?/i);
    if (betweenMatch) {
        result.min = parseCompactNumber(betweenMatch[1], betweenMatch[2]);
        result.max = parseCompactNumber(betweenMatch[3], betweenMatch[4]);
    }

    // Pattern: "$15000-$25000" or "15000 to 25000"
    // But only if no year-like pattern and values are reasonable prices (not years like 2015-2020)
    const rangeDashMatch = query.match(/\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*([km])?\s*(?:-|to)\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*([km])?/i);
    if (rangeDashMatch && !betweenMatch) {
        const val1 = parseCompactNumber(rangeDashMatch[1], rangeDashMatch[2]);
        const val2 = parseCompactNumber(rangeDashMatch[3], rangeDashMatch[4]);
        // Only treat as price if values are in reasonable range (>1000) to avoid matching years
        if (val1 > 1000 && val2 > 1000) {
            result.min = Math.min(val1, val2);
            result.max = Math.max(val1, val2);
        }
    }
    return result;
}

function extractOdometerRange(query: string): { min?: number; max?: number } {
    const result: { min?: number; max?: number } = {};

    const hasVehicleContext = /\b(car|cars|vehicle|vehicles|truck|trucks|suv|suvs|van|vans|ute|utes|sedan|hatchback|wagon|coupe|motorbike|motorcycle)\b/i.test(query);
    const hasMileageContext = /\b(mileage|odometer|km|kms|kilometer|kilometers|kilometre|kilometres)\b/i.test(query);

    // Pattern: "100k or below mileage"
    const trailingContextMatch = query.match(/\b(\d{1,3}(?:\.\d+)?)k\b\s*(?:or\s+)?(?:below|under|less)\s*(?:mileage|odometer|km|kms|kilometers|kilometres)?/i);
    if (trailingContextMatch) {
        result.max = parseCompactNumber(trailingContextMatch[1], 'k');
    }

    // Pattern: "under 150000 km", "below 200k km"
    const kmBoundedMatch = query.match(/(?:under|below|less than)\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k)?\s*(?:km|kms|kilometers|kilometres|mileage|odometer)\b/i);
    if (kmBoundedMatch) {
        result.max = parseCompactNumber(kmBoundedMatch[1], kmBoundedMatch[2]);
    }

    // Pattern: "over 50k km", "more than 100k mileage"
    const overKmBoundedMatch = query.match(/(?:over|above|more than)\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k)?\s*(?:km|kms|kilometers|kilometres|mileage|odometer)\b/i);
    if (overKmBoundedMatch) {
        result.min = parseCompactNumber(overKmBoundedMatch[1], overKmBoundedMatch[2]);
    }

    // Heuristic fallback for vehicle queries with large k-values (e.g. "cars under 150k").
    // We intentionally require >=50k to avoid colliding with budget-like text (e.g. 1.5k).
    if (result.max === undefined && (hasMileageContext || hasVehicleContext)) {
        const underKMatch = query.match(/(?:under|below|less than)\s+(\d{1,3}(?:\.\d+)?)k\b/i);
        if (underKMatch) {
            const km = parseCompactNumber(underKMatch[1], 'k');
            if (km >= 50000) {
                result.max = km;
            }
        }
    }
    if (result.min === undefined && (hasMileageContext || hasVehicleContext)) {
        const overKMatch = query.match(/(?:over|above|more than)\s+(\d{1,3}(?:\.\d+)?)k\b/i);
        if (overKMatch) {
            const km = parseCompactNumber(overKMatch[1], 'k');
            if (km >= 50000) {
                result.min = km;
            }
        }
    }

    return result;
}

function extractLocation(query: string): string | undefined {
    for (const location of NZ_LOCATIONS) {
        // Pattern: "in Auckland", "near Wellington", "Auckland"
        const regex = new RegExp(`(?:in|near|at|around|from)\\s+${location}\\b|\\b${location}\\b`, 'i');
        if (regex.test(query)) {
            return location.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
    }
    return undefined;
}

function extractColor(query: string): string | undefined {
    for (const color of VEHICLE_COLORS) {
        const regex = new RegExp(`\\b${color}\\b`, 'i');
        if (regex.test(query)) {
            return color.charAt(0).toUpperCase() + color.slice(1);
        }
    }
    return undefined;
}

function extractCondition(query: string): string | undefined {
    for (const [condition, keywords] of Object.entries(CONDITION_KEYWORDS)) {
        for (const keyword of keywords) {
            if (query.includes(keyword)) {
                return condition;
            }
        }
    }
    return undefined;
}

function parseNumber(numStr: string): number {
    return parseFloat(numStr.replace(/,/g, ''));
}

function parseCompactNumber(numStr: string, suffix?: string): number {
    const base = parseNumber(numStr);
    const unit = (suffix || '').toLowerCase();
    if (unit === 'k') return Math.round(base * 1000);
    if (unit === 'm') return Math.round(base * 1000000);
    return Math.round(base);
}
