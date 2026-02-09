export interface Location {
  suburb: string;
  city: string;
  region: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  meta?: Pagination;
}

export interface SortOption {
  value: string;
  label: string;
}