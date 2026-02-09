
import { Location } from './common.types';
import { User } from './user.types';
import {
  ShippingOptions,
  PaymentMethods,
  ReturnsPolicy,
  AIAnalysisMetadata,
} from './listing-sections.types';

export type ListingCondition = 'New' | 'Like New' | 'Good' | 'Fair';
export type ListingStatus =
  | 'active'
  | 'sold'
  | 'reserved'
  | 'deleted'
  | 'expired'
  | 'pending_review'
  | 'blocked';

export interface ListingImage {
  id: string;
  url: string;
  order: number;
  isThumbnail?: boolean;
  isActive?: boolean;
  sourceImageId?: string;
  variantType?: 'pro_backdrop';
  aiModel?: string;
  aiPromptVersion?: string;
}

export interface Listing {
  id: string;
  publicId?: string;
  title: string;
  subtitle?: string;
  description: string;
  price: number;
  currency: string; // usually 'NZD' or 'USD'
  images: ListingImage[];
  category: string; // ID or slug
  subcategory?: string;
  condition: ListingCondition;
  location: Location | string; // Backend often returns string
  sellerId: string;
  seller?: User;
  createdAt: string;
  updatedAt: string;
  status: ListingStatus;
  viewCount: number;
  likeCount: number;
  isLiked?: boolean;
  isFeatured?: boolean;
  isPromoted?: boolean; // Legacy support / Ad system
  categoryFields?: Record<string, any>; // Dynamic fields storage

  // === RESERVATION FIELDS ===
  reservedFor?: string; // User ID of buyer who accepted offer
  reservedAt?: string; // Timestamp when reservation was created
  reservationExpiresAt?: string; // Auto-release timestamp (48 hours)

  // === EXPIRATION ===
  expiresAt?: string; // When listing expires (1 day to 1 month from creation)

  // Moderation state
  moderationStatus?: 'not_reviewed' | 'clean' | 'pending_review' | 'flagged' | 'approved' | 'rejected' | 'error';
  moderationSeverity?: 'clean' | 'medium' | 'high' | 'critical';
  moderationSummary?: string;
  moderationFlagProfile?: boolean;
  moderationCheckedAt?: string;

  // === HYBRID SECTIONS ===
  // Seller-controlled sections (not AI-generated)
  shippingOptions?: ShippingOptions;
  paymentMethods?: PaymentMethods;
  returnsPolicy?: ReturnsPolicy;
  sellerNotes?: string; // Additional info from seller

  // AI analysis metadata (for debugging and confidence display)
  aiAnalysis?: AIAnalysisMetadata;
}

// UI specific subset
export interface ListingCardItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  thumbnail: string;
  condition: ListingCondition;
  location: Location | string; // Support legacy string location
  createdAt: string; // or postedAt
  status: ListingStatus;
  likes: number; // or likeCount
  isLiked?: boolean;
  isPromoted?: boolean;
  isFeatured?: boolean;
  category: string;
}

export interface ListingFormData {
  title: string;
  description: string;
  price: number;
  categoryId: string;
  subcategoryId?: string;
  condition: ListingCondition;
  location: Location;
  images: File[];
  categoryFields?: Record<string, any>;
}

export interface ListingFilters {
  priceMin?: number;
  priceMax?: number;
  condition?: ListingCondition[];
  category?: string;
  location?: string;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  query?: string;
  // Vehicle-specific filters for natural language search
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  odometerMin?: number;
  odometerMax?: number;
  color?: string;
  subcategory?: string;
  bodyStyle?: string;
  fuelType?: string;
  transmission?: string;
  engineSizeMin?: number | string;
  engineSizeMax?: number | string;
  style?: string;
  layout?: string;
  hullType?: string;
  engineType?: string;
  selfContained?: boolean;
  // We can extend this with category specific filters dynamically later
  [key: string]: any;
}
