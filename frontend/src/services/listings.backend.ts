/**
 * Backend Listings Service
 * Connects to Go API at http://localhost:8080
 */

import { apiClient } from './api.client';
import { AuthService } from './auth.service';
import { Listing, ListingFilters, Pagination } from '../types';
import { StudioImageSlot } from '../types/studio-image.types';
import { normalizeCategory, supportsQuantityForCategory } from '../data/categories';

// Backend listing type (matches Go API response)
interface BackendListing {
  id: number;
  publicId?: string;
  userId?: string;
  title: string;
  subtitle?: string;
  description: string;
  price: number;
  category: string;
  condition?: string;
  location: string;
  status?: string;
  categoryFields?: Record<string, any>; // Dynamic category-specific fields from JSONB
  shippingOptions?: Record<string, any>;
  paymentMethods?: Record<string, any>;
  returnsPolicy?: Record<string, any>;
  make?: string;  // Legacy field
  model?: string; // Legacy field
  year?: number;  // Legacy field
  odometer?: number; // Legacy field
  createdAt: string;
  updatedAt: string;
  images?: BackendImage[];
  seller?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    createdAt: string;
    location?: {
      city: string;
      suburb: string;
      region: string;
    };
    rating?: number;
    reviewCount?: number;
    isVerified?: boolean;
  };
  reservedFor?: string;
  reservedAt?: string;
  reservationExpiresAt?: string;
  viewCount?: number;
  likeCount?: number;
  isLiked?: boolean;
  expiresAt?: string;
  moderationStatus?: 'not_reviewed' | 'clean' | 'pending_review' | 'flagged' | 'approved' | 'rejected' | 'error';
  moderationSeverity?: 'clean' | 'medium' | 'high' | 'critical';
  moderationSummary?: string;
  moderationFlagProfile?: boolean;
  moderationCheckedAt?: string;
}

interface BackendImage {
  id: number;
  listingId: number;
  url: string;
  filename: string;
  displayOrder: number;
  isActive?: boolean;
  sourceImageId?: number;
  variantType?: 'pro_backdrop';
  aiModel?: string;
  aiPromptVersion?: string;
  createdAt: string;
}

interface ListingsResponse {
  listings: BackendListing[];
  total: number;
}

// API base URL for constructing full image URLs
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Convert backend listing to frontend listing format
function convertToFrontendListing(backendListing: BackendListing): Listing {
  // Map backend images to frontend format
  const images = (backendListing.images || []).map((img, idx) => ({
    id: img.id.toString(),
    url: img.url.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`,
    order: img.displayOrder,
    isThumbnail: idx === 0,
    isActive: img.isActive ?? true,
    sourceImageId: img.sourceImageId ? img.sourceImageId.toString() : undefined,
    variantType: img.variantType,
    aiModel: img.aiModel,
    aiPromptVersion: img.aiPromptVersion,
  }));

  // Use seller info from backend if available, otherwise create placeholder
  const seller = backendListing.seller ? {
    id: backendListing.seller.id,
    email: backendListing.seller.email,
    name: backendListing.seller.name || 'Unknown Seller',
    avatar: backendListing.seller.avatar || '',
    createdAt: backendListing.seller.createdAt || backendListing.createdAt,
    isVerified: backendListing.seller.isVerified ?? false,
    rating: backendListing.seller.rating ?? 0,
    reviewCount: backendListing.seller.reviewCount ?? 0,
    location: backendListing.seller.location,
  } : {
    id: backendListing.userId || '',
    email: '',
    name: 'Seller',
    avatar: '',
    createdAt: backendListing.createdAt,
    isVerified: false,
    rating: 0,
    reviewCount: 0,
  };

  return {
    id: backendListing.id.toString(),
    publicId: backendListing.publicId,
    title: backendListing.title,
    subtitle: backendListing.subtitle || '',
    description: backendListing.description,
    price: backendListing.price,
    currency: 'NZD',
    category: backendListing.category || 'vehicles',
    subcategory: '',
    condition: (backendListing.condition as any) || 'Good',
    location: {
      suburb: '',
      city: backendListing.location || '',
      region: '',
    },
    images: images,
    sellerId: backendListing.userId || '',
    seller,
    createdAt: backendListing.createdAt,
    updatedAt: backendListing.updatedAt,
    status: (backendListing.status as 'active' | 'sold' | 'reserved' | 'deleted' | 'expired' | 'pending_review' | 'blocked') || 'active',
    viewCount: backendListing.viewCount ?? 0,
    likeCount: backendListing.likeCount ?? 0,
    isLiked: backendListing.isLiked ?? false,
    // Use categoryFields from backend
    categoryFields: backendListing.categoryFields || {},
    // Shipping, payment, returns
    shippingOptions: backendListing.shippingOptions as any,
    paymentMethods: backendListing.paymentMethods as any,
    returnsPolicy: backendListing.returnsPolicy as any,
    // Reservation fields
    reservedFor: backendListing.reservedFor,
    reservedAt: backendListing.reservedAt,
    reservationExpiresAt: backendListing.reservationExpiresAt,
    // Expiration
    expiresAt: backendListing.expiresAt,
    moderationStatus: backendListing.moderationStatus,
    moderationSeverity: backendListing.moderationSeverity,
    moderationSummary: backendListing.moderationSummary,
    moderationFlagProfile: backendListing.moderationFlagProfile,
    moderationCheckedAt: backendListing.moderationCheckedAt,
  };
}

const toTimestamp = (value?: string): number => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const sortListings = (items: Listing[], sortBy?: ListingFilters['sortBy']): Listing[] => {
  const resolvedSort = sortBy || 'newest';
  const next = [...items];

  switch (resolvedSort) {
    case 'price_asc':
      return next.sort((a, b) => {
        if (a.price !== b.price) return a.price - b.price;
        return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
      });
    case 'price_desc':
      return next.sort((a, b) => {
        if (a.price !== b.price) return b.price - a.price;
        return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
      });
    case 'popular':
      return next.sort((a, b) => {
        if ((a.likeCount || 0) !== (b.likeCount || 0)) return (b.likeCount || 0) - (a.likeCount || 0);
        return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
      });
    case 'newest':
    default:
      return next.sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
  }
};

// Convert frontend listing/form data to backend format
function convertToBackendListing(listing: any) {
  // Handle location - can be Location object or string
  let locationStr = '';
  if (typeof listing.location === 'object' && listing.location !== null) {
    locationStr = listing.location.city || listing.location.suburb || '';
  } else if (typeof listing.location === 'string') {
    locationStr = listing.location;
  }

  // Get category - can be category or categoryId (from form)
  // Default to 'general' since AI may not set a specific category
  const category = listing.categoryId || listing.category || 'general';
  const normalizedCategory = normalizeCategory(String(category));
  const parsedQuantity = Number(listing.quantity);
  const quantity = supportsQuantityForCategory(normalizedCategory) && parsedQuantity > 0
    ? parsedQuantity
    : 1;

  return {
    title: listing.title || '',
    subtitle: listing.subtitle || '',
    description: listing.description || '',
    price: Number(listing.price) || 0,
    quantity,
    category: category,
    condition: listing.condition || 'Good',
    location: locationStr,
    categoryFields: listing.categoryFields || {}, // Send full categoryFields object
    // New fields for shipping, payment, and returns
    shippingOptions: listing.shippingOptions || {},
    paymentMethods: listing.paymentMethods || {},
    returnsPolicy: listing.returnsPolicy || {},
    // Legacy fields for backward compatibility
    make: listing.categoryFields?.make || '',
    model: listing.categoryFields?.model || '',
    year: listing.categoryFields?.year ? Number(listing.categoryFields.year) : 0,
    odometer: listing.categoryFields?.mileage ? Number(listing.categoryFields.mileage) : 0,
    // Expiration
    expiresAt: listing.expiresAt || null,
  };
}

interface UploadImageEntry {
  file: File;
  clientId: string;
  displayOrder: number;
  isActive: boolean;
  sourceClientId?: string;
  sourceImageId?: number;
  variantType?: 'pro_backdrop';
  aiModel?: string;
  aiPromptVersion?: string;
}

interface ImageUploadPlan {
  filesToUpload: File[];
  uploadEntries: UploadImageEntry[];
  keepImageIds: number[];
  deactivateImageIds: number[];
}

function createClientId(prefix: string, index: number): string {
  return `${prefix}-${index}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeImageIDs(ids: number[]): number[] {
  return Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
}

export function buildImageUploadPlan(imageSlots: StudioImageSlot[]): ImageUploadPlan {
  const filesToUpload: File[] = [];
  const uploadEntries: UploadImageEntry[] = [];
  const keepImageIds: number[] = [];
  const deactivateImageIds: number[] = [];

  const queueUpload = (entry: UploadImageEntry) => {
    filesToUpload.push(entry.file);
    uploadEntries.push(entry);
  };

  imageSlots.forEach((slot, slotIndex) => {
    const displayOrder = slotIndex;
    const active = slot.active;
    const original = slot.original;
    const variantMeta = slot.variantMeta;

    if (active.kind === 'existing') {
      keepImageIds.push(active.imageId);
      return;
    }

    if (original?.kind === 'file') {
      const sourceClientID = original.clientId || createClientId('source', slotIndex);
      queueUpload({
        file: original.file,
        clientId: sourceClientID,
        displayOrder,
        isActive: false,
      });

      queueUpload({
        file: active.file,
        clientId: active.clientId || createClientId('variant', slotIndex),
        displayOrder,
        isActive: true,
        sourceClientId: sourceClientID,
        variantType: variantMeta?.variantType,
        aiModel: variantMeta?.aiModel,
        aiPromptVersion: variantMeta?.aiPromptVersion,
      });
      return;
    }

    if (original?.kind === 'existing') {
      deactivateImageIds.push(original.imageId);
      queueUpload({
        file: active.file,
        clientId: active.clientId || createClientId('variant', slotIndex),
        displayOrder,
        isActive: true,
        sourceImageId: original.imageId,
        variantType: variantMeta?.variantType,
        aiModel: variantMeta?.aiModel,
        aiPromptVersion: variantMeta?.aiPromptVersion,
      });
      return;
    }

    queueUpload({
      file: active.file,
      clientId: active.clientId || createClientId('image', slotIndex),
      displayOrder,
      isActive: true,
    });
  });

  return {
    filesToUpload,
    uploadEntries,
    keepImageIds: normalizeImageIDs(keepImageIds),
    deactivateImageIds: normalizeImageIDs(deactivateImageIds),
  };
}

async function uploadFiles(files: File[]): Promise<Array<{ url: string; filename: string }>> {
  if (files.length === 0) {
    return [];
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  const uploadResponse = await fetch(`${API_BASE_URL}/api/upload/multiple`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AuthService.getStoredToken()}`,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(errorText || 'Failed to upload images');
  }

  const uploaded = await uploadResponse.json();
  if (!uploaded || !Array.isArray(uploaded)) {
    throw new Error('Failed to upload images - no images were processed');
  }

  return uploaded;
}

export const BackendListingsService = {
  async getListings(
    filters: ListingFilters = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ) {
    const limit = pagination.limit;
    const response = await apiClient.get<ListingsResponse>(`/api/listings?limit=${limit}`);

    const items = sortListings(response.listings.map(convertToFrontendListing), filters.sortBy);

    return {
      data: {
        data: {
          items,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: response.total,
            hasMore: items.length >= pagination.limit,
          } as Pagination,
        },
      },
      status: 200,
      statusText: 'OK',
    };
  },

  async getListingById(id: string) {
    const listing = await apiClient.get<BackendListing>(`/api/listings/${id}`);
    return {
      data: {
        data: convertToFrontendListing(listing),
      },
      status: 200,
      statusText: 'OK',
    };
  },

  async getListingsByCategory(slug: string, pagination?: { page: number; limit: number }) {
    // Reuse getListings with category filter
    return this.getListings({ category: slug }, pagination);
  },

  /**
   * Get similar listings based on semantic similarity and location proximity
   */
  async getSimilarListings(listingId: string, limit: number = 8) {
    interface SimilarListingItem {
      id: number;
      publicId?: string;
      title: string;
      description: string;
      price: number;
      category: string;
      location: string;
      condition: string;
      createdAt: string;
      images: Array<{ id: string; url: string; displayOrder: string }>;
      semanticScore: number;
      locationScore: number;
      combinedScore: number;
      locationMatch: string;
    }

    interface SimilarListingsResponse {
      listings: SimilarListingItem[];
      total: number;
      currentLocation: string;
      nearbyLocations: string[];
    }

    const response = await apiClient.get<SimilarListingsResponse>(
      `/api/listings/${listingId}/similar?limit=${limit}`
    );

    // Convert to frontend listing format
    const items = (response.listings || []).map((item): Listing => ({
      id: item.id.toString(),
      publicId: item.publicId,
      title: item.title,
      subtitle: '',
      description: item.description,
      price: item.price,
      currency: 'NZD',
      category: item.category || 'vehicles',
      subcategory: '',
      condition: (item.condition as any) || 'Good',
      location: {
        suburb: '',
        city: item.location || '',
        region: '',
      },
      images: (item.images || []).map((img, idx) => ({
        id: img.id,
        url: img.url.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`,
        order: parseInt(img.displayOrder, 10) || idx,
        isThumbnail: idx === 0,
      })),
      sellerId: '',
      seller: {
        id: '',
        email: '',
        name: 'Seller',
        avatar: '',
        createdAt: item.createdAt,
        isVerified: false,
        rating: 0,
        reviewCount: 0,
      },
      createdAt: item.createdAt,
      updatedAt: item.createdAt,
      status: 'active',
      viewCount: 0,
      likeCount: 0,
      isLiked: false,
      categoryFields: {},
    }));

    return {
      data: {
        data: {
          items,
          total: response.total,
          currentLocation: response.currentLocation,
          nearbyLocations: response.nearbyLocations,
        },
      },
      status: 200,
      statusText: 'OK',
    };
  },

  async createListing(data: Partial<Listing>) {
    const backendData = convertToBackendListing(data);
    const idempotencyKey =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `publish-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const imageSlots = ((data as any).imageSlots || []) as StudioImageSlot[];
    const uploadedImages: Array<{
      url: string;
      filename: string;
      displayOrder: number;
      clientId?: string;
      sourceClientId?: string;
      sourceImageId?: number;
      isActive?: boolean;
      variantType?: 'pro_backdrop';
      aiModel?: string;
      aiPromptVersion?: string;
    }> = [];

    if (Array.isArray(imageSlots) && imageSlots.length > 0) {
      const uploadPlan = buildImageUploadPlan(imageSlots);
      if (uploadPlan.keepImageIds.length > 0) {
        throw new Error('Create listing cannot include existing image references');
      }

      const uploaded = await uploadFiles(uploadPlan.filesToUpload);
      for (let i = 0; i < uploaded.length; i++) {
        const entry = uploadPlan.uploadEntries[i];
        uploadedImages.push({
          url: uploaded[i].url,
          filename: uploaded[i].filename,
          displayOrder: entry.displayOrder,
          clientId: entry.clientId,
          sourceClientId: entry.sourceClientId,
          sourceImageId: entry.sourceImageId,
          isActive: entry.isActive,
          variantType: entry.variantType,
          aiModel: entry.aiModel,
          aiPromptVersion: entry.aiPromptVersion,
        });
      }
    } else {
      const files = (data as any).images || [];
      const uploaded = await uploadFiles(files.filter((file: unknown) => file instanceof File));
      for (let i = 0; i < uploaded.length; i++) {
        uploadedImages.push({
          url: uploaded[i].url,
          filename: uploaded[i].filename,
          displayOrder: i,
          isActive: true,
        });
      }
    }

    const created = await apiClient.post<BackendListing>(
      '/api/listings',
      {
        ...backendData,
        uploadedImages,
      },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );

    return {
      data: {
        data: convertToFrontendListing(created),
      },
    };
  },

  async updateListing(id: string, data: Partial<Listing>) {
    const backendData = convertToBackendListing(data);
    const idempotencyKey =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `publish-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const imageSlots = ((data as any).imageSlots || []) as StudioImageSlot[];
    const uploadedImages: Array<{
      url: string;
      filename: string;
      displayOrder: number;
      clientId?: string;
      sourceClientId?: string;
      sourceImageId?: number;
      isActive?: boolean;
      variantType?: 'pro_backdrop';
      aiModel?: string;
      aiPromptVersion?: string;
    }> = [];

    let keepImageIds: number[] = [];
    let deactivateImageIds: number[] = [];

    if (Array.isArray(imageSlots) && imageSlots.length > 0) {
      const uploadPlan = buildImageUploadPlan(imageSlots);
      keepImageIds = uploadPlan.keepImageIds;
      deactivateImageIds = uploadPlan.deactivateImageIds;

      const uploaded = await uploadFiles(uploadPlan.filesToUpload);
      for (let i = 0; i < uploaded.length; i++) {
        const entry = uploadPlan.uploadEntries[i];
        uploadedImages.push({
          url: uploaded[i].url,
          filename: uploaded[i].filename,
          displayOrder: entry.displayOrder,
          clientId: entry.clientId,
          sourceClientId: entry.sourceClientId,
          sourceImageId: entry.sourceImageId,
          isActive: entry.isActive,
          variantType: entry.variantType,
          aiModel: entry.aiModel,
          aiPromptVersion: entry.aiPromptVersion,
        });
      }
    } else {
      const newImages = (data as any).images || [];
      const existingImages = (data as any).existingImages || [];
      keepImageIds = existingImages
        .filter((img: any) => img.id)
        .map((img: any) => typeof img.id === 'string' ? parseInt(img.id, 10) : img.id)
        .filter((imgId: any) => Number.isInteger(imgId));

      const uploaded = await uploadFiles(newImages.filter((file: unknown) => file instanceof File));
      for (let i = 0; i < uploaded.length; i++) {
        uploadedImages.push({
          url: uploaded[i].url,
          filename: uploaded[i].filename,
          displayOrder: keepImageIds.length + i,
          isActive: true,
        });
      }
    }

    const updated = await apiClient.put<BackendListing>(
      `/api/listings/${id}`,
      {
        ...backendData,
        keepImageIds,
        deactivateImageIds,
        uploadedImages,
      },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );

    return {
      data: {
        data: convertToFrontendListing(updated),
      },
      status: 200,
      statusText: 'OK',
    };
  },

  async deleteListing(id: string) {
    await apiClient.delete(`/api/listings/${id}`);
    return {
      data: {
        data: true,
      },
      status: 200,
      statusText: 'OK',
    };
  },

  /**
   * Semantic search using backend AI-powered search API
   */
  async searchListings(query: string, filters: ListingFilters = {}, pagination?: { page: number; limit: number }) {
    const limit = pagination?.limit || 20;

    // If no query, fallback to regular listings (search API requires 'q' parameter)
    if (!query || query.trim() === '') {
      return this.getListings(filters, pagination || { page: 1, limit });
    }

    // Build query params for semantic search API
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    // Add optional filters
    if (filters.category) params.append('category', filters.category);
    if (filters.subcategory) params.append('subcategory', filters.subcategory);
    if (filters.make) params.append('make', filters.make);
    if (filters.model) params.append('model', filters.model);
    if (filters.location) params.append('location', filters.location);
    if (filters.yearMin !== undefined) params.append('yearMin', filters.yearMin.toString());
    if (filters.yearMax !== undefined) params.append('yearMax', filters.yearMax.toString());
    if (filters.priceMin !== undefined) params.append('priceMin', filters.priceMin.toString());
    if (filters.priceMax !== undefined) params.append('priceMax', filters.priceMax.toString());
    if (filters.odometerMin !== undefined) params.append('odometerMin', filters.odometerMin.toString());
    if (filters.odometerMax !== undefined) params.append('odometerMax', filters.odometerMax.toString());
    if (filters.color) params.append('color', filters.color);
    if (filters.bodyStyle) params.append('body_style', filters.bodyStyle);
    if (filters.fuelType) params.append('fuel_type', filters.fuelType);
    if (filters.transmission) params.append('transmission', filters.transmission);
    if (filters.engineSizeMin !== undefined) params.append('engine_size_min', String(filters.engineSizeMin));
    if (filters.engineSizeMax !== undefined) params.append('engine_size_max', String(filters.engineSizeMax));
    if (filters.style) params.append('style', filters.style);
    if (filters.layout) params.append('layout', filters.layout);
    if (filters.hullType) params.append('hull_type', filters.hullType);
    if (filters.engineType) params.append('engine_type', filters.engineType);
    if (filters.selfContained !== undefined && filters.selfContained !== null) {
      params.append('self_contained', String(!!filters.selfContained));
    }
    if (filters.condition && filters.condition.length > 0) {
      params.append('condition', filters.condition[0]);
    }

    try {
      interface SearchResponse {
        listings: BackendListing[];
        total: number;
        query: string;
        interpretation?: string;
        aiParsed?: boolean;
      }

      const response = await apiClient.get<SearchResponse>(`/api/search?${params.toString()}`);

      const items = sortListings((response.listings || []).map(convertToFrontendListing), filters.sortBy);

      return {
        data: {
          data: {
            items,
            pagination: {
              page: pagination?.page || 1,
              limit: limit,
              total: response.total,
              hasMore: items.length >= limit,
            } as Pagination,
            interpretation: response.interpretation,
            aiParsed: response.aiParsed,
          },
        },
        status: 200,
        statusText: 'OK',
      };
    } catch (error) {
      // Do not fall back to generic latest listings; that creates irrelevant "random" results.
      // Backend already performs keyword fallback when vector/embedding search fails.
      return {
        data: {
          data: {
            items: [],
            pagination: {
              page: pagination?.page || 1,
              limit: limit,
              total: 0,
              hasMore: false,
            } as Pagination,
          },
        },
        status: 200,
        statusText: 'OK',
      };
    }
  },

  // Like/unlike operations
  async likeListing(id: string) {
    const token = AuthService.getStoredToken();

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/listings/${id}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to like listing: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return { data: { data: data }, status: 200, statusText: 'OK' };
  },

  async unlikeListing(id: string) {
    const token = AuthService.getStoredToken();

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/listings/${id}/like`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to unlike listing: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return { data: { data: data }, status: 200, statusText: 'OK' };
  },

  async markAsSold(id: string) {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/listings/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AuthService.getStoredToken()}`,
      },
      body: JSON.stringify({ status: 'sold' }),
    });

    if (!response.ok) {
      throw new Error('Failed to update listing status');
    }

    const data = await response.json();
    return { data: { data: data }, status: 200, statusText: 'OK' };
  },

  async incrementViewCount(id: string) {
    // Views are now tracked automatically server-side when fetching a listing
    // No explicit call needed - this is a no-op for backward compatibility
  },

  async getUserListings(userId: string, status?: string) {
    try {
      interface UserListingsResponse {
        data: BackendListing[] | null;
        total: number;
      }
      const response = await apiClient.get<UserListingsResponse>(`/api/users/${userId}/listings`);
      const items = (response.data || []).map(convertToFrontendListing);
      return {
        data: { data: items },
        status: 200,
        statusText: 'OK'
      };
    } catch (error) {
      return { data: { data: [] }, status: 500, statusText: 'Error' };
    }
  },

  async getFeaturedListings() {
    const response = await this.getListings({}, { page: 1, limit: 8 });
    return response;
  },

  async getRecentListings() {
    const response = await this.getListings({}, { page: 1, limit: 8 });
    return response;
  },

  async cancelReservation(id: string) {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/listings/${id}/cancel-reservation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AuthService.getStoredToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to cancel reservation');
    }

    const data = await response.json();
    return { data: { data: data }, status: 200, statusText: 'OK' };
  },
};
