/**
 * Image Analysis Service
 * Connects to Go backend for AI-powered image analysis using Gemini
 * Supports hybrid listing system with category-aware dynamic fields
 */

import { apiClient } from './api.client';
import { CategoryDetection, AIAnalysisMetadata } from '../types';

// Category detection from AI
export interface AnalysisCategoryDetection {
    primary: string;     // 'electronics', 'vehicles', etc
    subcategory: string; // 'phones', 'cars', etc
    path: string[];      // ['Electronics', 'Phones']
    confidence: number;  // 0-1
}

// Suggestions from AI (not auto-filled)
export interface AnalysisSuggestions {
    priceRange?: {
        min: number;
        max: number;
        currency: string;
    };
    keywords?: string[];
    searchTerms?: string[];
}

// Full analysis result from backend (two-tier flow)
export interface AnalysisResult {
    // Core fields (always present for all items)
    title: string;
    description: string;
    condition: string;
    confidence: number;

    // Category slug for listing (matches frontend categories)
    // Values: vehicles, phones, computers, gaming, fashion, furniture, jewelry, baby, sports, hobbies, pets, property, jobs, services, free, general
    category?: string;

    // Item type classification - determines which form to show
    // Values: "vehicle", "phone", "computer", "general"
    itemType: string;

    // Structured fields - only populated for special categories (vehicle, phone, computer)
    // Contains pre-filled values like {"make": "Toyota", "model": "Corolla", "year": "2019"}
    structuredFields?: Record<string, any>;

    // Per-field confidence scores from Gemini 3 (e.g., {"make": 0.95, "model": 0.88})
    fieldConfidence?: Record<string, number>;

    // AI reasoning explanation for the analysis
    reasoning?: string;

    // Gemini 3 thinking summary (from model's internal reasoning)
    thinkingSummary?: string;

    // Optional suggestions
    suggestions?: AnalysisSuggestions;
}

interface AnalysisResponse {
    success: boolean;
    data?: AnalysisResult;
    error?: string;
}

// Map backend category to frontend category ID (for legacy compatibility)
const categoryMapping: Record<string, string> = {
    // New categories (direct mapping)
    'vehicles': 'vehicles',
    'phones': 'phones',
    'computers': 'computers',
    'gaming': 'gaming',
    'fashion': 'fashion',
    'furniture': 'furniture',
    'jewelry': 'jewelry',
    'baby': 'baby',
    'sports': 'sports',
    'hobbies': 'hobbies',
    'pets': 'pets',
    'property': 'property',
    'jobs': 'jobs',
    'services': 'services',
    'free': 'free',
    'general': 'general',
    // Legacy mappings
    'electronics': 'computers',
    'clothing': 'fashion',
    'collectibles': 'hobbies',
    'home': 'furniture',
    'home-living': 'furniture',
    'garden': 'furniture',
    'other': 'general',
};

// Map backend condition to frontend condition
const conditionMapping: Record<string, string> = {
    'New': 'New',
    'Like New': 'Like New',
    'Good': 'Good',
    'Fair': 'Fair',
};

/**
 * Convert File objects to base64 for API upload
 */
async function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data:image/xxx;base64, prefix
            const base64 = result.split(',')[1];
            resolve({
                data: base64,
                mimeType: file.type || 'image/jpeg',
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Normalize category detection from AI response
 */
function normalizeCategory(category: AnalysisCategoryDetection | string): AnalysisCategoryDetection {
    // Handle legacy string format (backward compatibility)
    if (typeof category === 'string') {
        const normalized = categoryMapping[category.toLowerCase()] || category;
        return {
            primary: normalized,
            subcategory: '',
            path: [category],
            confidence: 0.7, // Lower confidence for legacy format
        };
    }

    // Normalize the primary category slug
    return {
        ...category,
        primary: categoryMapping[category.primary?.toLowerCase()] || category.primary,
    };
}

export const AnalysisService = {
    /**
     * Analyze images using Gemini AI and return suggested listing fields
     * Returns AI-directed fields for the listing form
     */
    async analyzeImages(images: File[]): Promise<AnalysisResult | null> {
        if (!images || images.length === 0) {
            return null;
        }

        try {
            // Convert files to base64
            const imageDataPromises = images.slice(0, 5).map(fileToBase64);
            const imageData = await Promise.all(imageDataPromises);

            // Send to backend
            const response = await apiClient.post<AnalysisResponse>('/api/analyze-images', {
                images: imageData,
            });

            if (!response.success || !response.data) {
                return null;
            }

            const result = response.data;

            // Normalize the response for two-tier flow
            const normalized: AnalysisResult = {
                title: result.title || '',
                description: result.description || '',
                condition: conditionMapping[result.condition] || result.condition || 'Good',
                confidence: result.confidence || 0.5,
                category: result.category || 'general',
                itemType: result.itemType || 'general',
                structuredFields: result.structuredFields || {},
                fieldConfidence: result.fieldConfidence,
                reasoning: result.reasoning,
                thinkingSummary: result.thinkingSummary,
                suggestions: result.suggestions,
            };

            return normalized;
        } catch (error) {
            return null;
        }
    },

    /**
     * Check if analysis service is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            // We can't easily check without making a request
            // Return true and let actual analysis handle errors
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Map analysis result to form fields (two-tier flow)
     * For vehicle/phone/computer, includes structured fields
     * For general items, only core fields are returned
     */
    mapToFormFields(analysis: AnalysisResult): {
        title: string;
        description: string;
        condition: string;
        category: string;
        itemType: string;
        structuredFields: Record<string, any>;
        aiMetadata: {
            confidence: number;
            itemType: string;
            category: string;
            detectedKeywords: string[];
            analyzedAt: string;
        };
    } {
        return {
            title: analysis.title || '',
            description: analysis.description || '',
            condition: analysis.condition || 'Good',
            category: analysis.category || 'general',
            itemType: analysis.itemType || 'general',
            structuredFields: analysis.structuredFields || {},
            aiMetadata: {
                confidence: analysis.confidence,
                itemType: analysis.itemType,
                category: analysis.category || 'general',
                detectedKeywords: analysis.suggestions?.keywords || [],
                analyzedAt: new Date().toISOString(),
            },
        };
    },
};
