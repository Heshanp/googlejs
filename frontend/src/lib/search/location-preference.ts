export const HEADER_LOCATION_STORAGE_KEY = 'header.preferredCity';
export const ALL_NZ_LOCATION_LABEL = 'All NZ';

export function getStoredPreferredLocation(): string | null {
  if (typeof window === 'undefined') return null;

  const value = window.localStorage.getItem(HEADER_LOCATION_STORAGE_KEY)?.trim();
  if (!value || value === ALL_NZ_LOCATION_LABEL) return null;

  return value;
}

export function resolveSearchLocation(explicitLocation?: string | null): string | null {
  const normalizedExplicit = explicitLocation?.trim();
  if (normalizedExplicit) return normalizedExplicit;
  return getStoredPreferredLocation();
}
