import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api'; // 🛡️ Importing named api object
import { queryKeys } from '../lib/query/keys';
import type { Politician } from '../types/api';

export function usePoliticianSearch() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolitician, setSelectedPolitician] =
    useState<Politician | null>(null);

  const {
    data: politicians = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.politicians.search(searchQuery),
    queryFn: () => api.searchPoliticians(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const search = useCallback(
    (q?: string) => {
      setSearchQuery(q ?? query);
      return Promise.resolve();
    },
    [query]
  );

  const selectPolitician = useCallback(
    (p: Politician) => setSelectedPolitician(p),
    []
  );
  const clearSelection = useCallback(() => setSelectedPolitician(null), []);

  return {
    query,
    setQuery,
    politicians,
    selectedPolitician,
    isLoading,
    error,
    search,
    selectPolitician,
    clearSelection,
  };
}
