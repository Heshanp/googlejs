import { ListingFormData } from './listing.types';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface CreateListingRequest extends Omit<ListingFormData, 'images'> {
  // Images handled via multipart/form-data
}

export interface UpdateListingRequest extends Partial<CreateListingRequest> {
  id: string;
}