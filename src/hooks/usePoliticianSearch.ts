/**
 * Custom hook for managing politician search state and operations
 * Handles search queries, results, selection, and loading/error states
 * Uses TanStack Query for server state management
 */
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { queryKeys } from '../lib/query/keys';
import type { Politician } from '../types/api';

interface UsePoliticianSearchResult {
  query: string;
  setQuery: (query: string) => void;
  politicians: Politician[];
  selectedPolitician: Politician | null;
  comparisonPoliticians: Politician[];
  isComparing: boolean;
  isLoading: boolean;
  error: string | null;
  search: (searchQuery?: string) => Promise<void>;
  selectPolitician: (politician: Politician) => void;
  toggleComparison: (politician: Politician) => void;
  setComparisonPoliticians: (politicians: Politician[]) => void;
  clearSelection: () => void;
  clearComparison: () => void;
}

export function usePoliticianSearch(): UsePoliticianSearchResult {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolitician, setSelectedPolitician] =
    useState<Politician | null>(null);
  const [comparisonPoliticians, setComparisonPoliticiansState] = useState<
    Politician[]
  >([]);

  // Use TanStack Query for search results
  const {
    data: politicians = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.politicians.search(searchQuery),
    queryFn: () => api.searchPoliticians(searchQuery),
    enabled: searchQuery.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const search = useCallback(
    async (searchQueryParam?: string) => {
      const queryToSearch = searchQueryParam ?? query;
      if (queryToSearch.length < 2) {
        setSearchQuery('');
        return;
      }

      setSearchQuery(queryToSearch);
    },
    [query]
  );

  const selectPolitician = useCallback((politician: Politician) => {
    setSelectedPolitician(politician);
    setComparisonPoliticiansState([]);
  }, []);

  const toggleComparison = useCallback((politician: Politician) => {
    setSelectedPolitician(null);
    setComparisonPoliticiansState((prev) => {
      const isSelected = prev.some(
        (p) => p.canonical_id === politician.canonical_id
      );
      if (isSelected) {
        return prev.filter((p) => p.canonical_id !== politician.canonical_id);
      }
      if (prev.length >= 2) {
        return [prev[1], politician];
      }
      return [...prev, politician];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPolitician(null);
  }, []);

  const clearComparison = useCallback(() => {
    setComparisonPoliticiansState([]);
  }, []);

  const setComparisonPoliticians = useCallback((politicians: Politician[]) => {
    setComparisonPoliticiansState(politicians);
  }, []);

  const isComparing = comparisonPoliticians.length === 2;

  return {
    query,
    setQuery,
    politicians,
    selectedPolitician,
    comparisonPoliticians,
    isComparing,
    isLoading,
    error: queryError
      ? queryError instanceof Error
        ? queryError.message
        : 'Search failed'
      : null,
    search,
    selectPolitician,
    toggleComparison,
    setComparisonPoliticians,
    clearSelection,
    clearComparison,
  };
}
