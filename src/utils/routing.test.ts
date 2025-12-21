import { describe, it, expect } from 'vitest';
import {
  parseComparisonIds,
  buildComparisonUrl,
  buildPoliticianUrl,
  buildDonorUrl,
  buildSearchUrl,
} from './routing';

describe('routing utilities', () => {
  describe('parseComparisonIds', () => {
    it('parses comma-separated IDs', () => {
      expect(parseComparisonIds('412,300072,300011')).toEqual([
        '412', '300072', '300011',
      ]);
    });

    it('handles whitespace', () => {
      expect(parseComparisonIds('412, 300072, 300011')).toEqual([
        '412', '300072', '300011',
      ]);
    });

    it('filters empty strings', () => {
      expect(parseComparisonIds('412,,300072')).toEqual(['412', '300072']);
    });

    it('returns empty array for null', () => {
      expect(parseComparisonIds(null)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(parseComparisonIds('')).toEqual([]);
    });
  });

  describe('buildPoliticianUrl', () => {
    it('builds politician detail URL with string ID', () => {
      expect(buildPoliticianUrl('412')).toBe('/politician/412');
    });

    it('handles text IDs', () => {
      expect(buildPoliticianUrl('cand1001')).toBe('/politician/cand1001');
    });
  });

  describe('buildDonorUrl', () => {
    it('builds donor detail URL with string ID', () => {
      expect(buildDonorUrl('123456')).toBe('/donor/123456');
    });

    it('handles text IDs', () => {
      expect(buildDonorUrl('donor999')).toBe('/donor/donor999');
    });
  });

  describe('buildComparisonUrl', () => {
    it('builds comparison URL with two politician IDs', () => {
      expect(buildComparisonUrl(['412', '300072'])).toBe(
        '/politician/compare?ids=412,300072'
      );
    });

    it('builds comparison URL with three politician IDs', () => {
      expect(buildComparisonUrl(['412', '300072', '300011'])).toBe(
        '/politician/compare?ids=412,300072,300011'
      );
    });

    it('handles single ID (invalid but should not crash)', () => {
      expect(buildComparisonUrl(['412'])).toBe('/politician/compare?ids=412');
    });

    it('handles empty array', () => {
      expect(buildComparisonUrl([])).toBe('/politician/compare?ids=');
    });
  });

  describe('buildSearchUrl', () => {
    it('builds politician search URL with query', () => {
      expect(buildSearchUrl('politician', 'warren')).toBe(
        '/politician?search=warren'
      );
    });

    it('builds donor search URL with query', () => {
      expect(buildSearchUrl('donor', 'google')).toBe('/donor?search=google');
    });

    it('builds politician search URL without query', () => {
      expect(buildSearchUrl('politician')).toBe('/politician');
    });

    it('builds donor search URL without query', () => {
      expect(buildSearchUrl('donor')).toBe('/donor');
    });

    it('encodes special characters in search query', () => {
      expect(buildSearchUrl('politician', 'john doe & associates')).toBe(
        '/politician?search=john%20doe%20%26%20associates'
      );
    });

    it('handles empty string query', () => {
      expect(buildSearchUrl('politician', '')).toBe('/politician');
    });
  });
});
