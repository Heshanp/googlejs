import { apiClient } from './api.client';

export interface NZLocation {
  id: number;
  name: string;
  city: string;
  region: string;
  population: number;
  type: 'Suburb' | 'Locality';
}

export interface NZCity {
  name: string;
  region: string;
  population: number;
}

let majorCitiesCache: NZCity[] | null = null;
const suburbCache = new Map<string, NZLocation[]>();

export const LocationsService = {
  async searchLocations(q: string, limit = 20): Promise<NZLocation[]> {
    const query = q.trim();
    if (query.length < 2) return [];

    const response = await apiClient.get<{ locations: NZLocation[] }>(
      `/api/locations/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.locations ?? [];
  },

  async getMajorCities(limit = 80): Promise<NZCity[]> {
    const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 80;

    if (majorCitiesCache && majorCitiesCache.length > 0) {
      return majorCitiesCache.slice(0, normalizedLimit);
    }

    const response = await apiClient.get<{ cities: NZCity[] }>(
      `/api/locations/cities?limit=${normalizedLimit}`
    );
    majorCitiesCache = response.cities ?? [];
    return majorCitiesCache.slice(0, normalizedLimit);
  },

  async getSuburbsByCity(city: string, limit = 500): Promise<NZLocation[]> {
    const normalizedCity = city.trim();
    if (!normalizedCity) return [];

    const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 500;
    const cacheKey = `${normalizedCity.toLowerCase()}::${normalizedLimit}`;
    const cached = suburbCache.get(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get<{ suburbs: NZLocation[] }>(
      `/api/locations/suburbs?city=${encodeURIComponent(normalizedCity)}&limit=${normalizedLimit}`
    );
    const suburbs = response.suburbs ?? [];
    suburbCache.set(cacheKey, suburbs);
    return suburbs;
  },
};
