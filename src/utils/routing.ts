/**
 * Type-safe routing utilities for Paper Trail application.
 * Provides URL building and parsing functions for politician and donor routes.
 */

/**
 * Entity types supported by the routing system
 */
type EntityType = 'politician' | 'donor';

/**
 * Parse comparison IDs from query parameter.
 * Returns array of politician IDs as strings.
 */
export function parseComparisonIds(idsParam: string | null): string[] {
  if (!idsParam || idsParam.trim() === '') return [];
  return idsParam
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/**
 * Build comparison URL from politician IDs.
 */
export function buildComparisonUrl(politicianIds: string[]): string {
  const ids = politicianIds.join(',');
  return `/politician/compare?ids=${ids}`;
}

/**
 * Build politician detail URL.
 */
export function buildPoliticianUrl(politicianId: string): string {
  return `/politician/${politicianId}`;
}

/**
 * Build donor detail URL.
 */
export function buildDonorUrl(donorId: string): string {
  return `/donor/${donorId}`;
}

/**
 * Build search URL with optional query parameter.
 * Empty or whitespace-only queries return the base path.
 */
export function buildSearchUrl(
  entityType: EntityType,
  searchQuery?: string
): string {
  const basePath = entityType === 'politician' ? '/politician' : '/donor';
  if (!searchQuery || searchQuery.trim() === '') return basePath;
  return `${basePath}?search=${encodeURIComponent(searchQuery)}`;
}
