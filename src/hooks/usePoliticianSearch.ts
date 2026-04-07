import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function usePoliticianSearch() {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: politicians = [], // 🛡️ Default to empty array here too
    isLoading,
    error,
  } = useQuery({
    queryKey: ['politicians', searchQuery],
    queryFn: () => api.searchPoliticians(searchQuery),
    enabled: searchQuery.length >= 2,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const search = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  return {
    politicians,
    isLoading,
    error,
    search,
  };
}