/**
 * Query key factory for TanStack Query
 * Provides type-safe, hierarchical query keys for all API endpoints
 */

import type { VoteValue } from '../../types/api';

export interface VoteFilters {
  types?: string[];
  subjects?: string[];
  dateFrom?: string;
  dateTo?: string;
  voteValues?: VoteValue[];
  search?: string;
}

export const queryKeys = {
  // Politicians
  politicians: {
    all: ['politicians'] as const,
    search: (query: string) => ['politicians', 'search', query] as const,
    detail: (id: number | string) => ['politicians', 'detail', id] as const,
    votes: (
      id: number | string,
      page: number,
      sort: 'ASC' | 'DESC',
      filters?: VoteFilters
    ) => ['politicians', 'votes', id, page, sort, filters] as const,
    votesDateRange: (id: number | string) =>
      ['politicians', 'votes', id, 'date-range'] as const,
    donations: (id: number | string) =>
      ['politicians', 'donations', id] as const,
    donationsFiltered: (id: number | string, topic: string) =>
      ['politicians', 'donations', id, 'filtered', topic] as const,
  },

  // Donors
  donors: {
    all: ['donors'] as const,
    search: (query: string) => ['donors', 'search', query] as const,
    detail: (id: number | string) => ['donors', 'detail', id] as const,
    donations: (id: number | string) => ['donors', 'donations', id] as const,
  },

  // Bills
  bills: {
    all: ['bills'] as const,
    subjects: () => ['bills', 'subjects'] as const,
  },
} as const;
