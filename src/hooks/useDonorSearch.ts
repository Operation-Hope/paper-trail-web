/**
 * Custom hook for donor search functionality
 * Manages donor search state, selected donor, and donation history
 * Uses TanStack Query for server state management
 *
 * @returns Object containing search state, functions, and data
 * @property query - Current search query string
 * @property setQuery - Function to update search query
 * @property donors - Array of donor search results
 * @property selectedDonor - Currently selected donor (null if none)
 * @property donations - Array of donations for selected donor
 * @property isSearching - Loading state for donor search
 * @property isLoadingDonations - Loading state for donation fetch
 * @property searchError - Error message from donor search (null if no error)
 * @property donationsError - Error message from donation fetch (null if no error)
 * @property search - Function to trigger donor search
 * @property selectDonor - Function to select a donor and load their donations
 * @property clearSelection - Function to deselect current donor
 */
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { queryKeys } from '../lib/query/keys';
import type { Donor, Donation } from '../types/api';

interface UseDonorSearchResult {
  query: string;
  setQuery: (query: string) => void;
  donors: Donor[];
  selectedDonor: Donor | null;
  donations: Donation[];
  isSearching: boolean;
  isLoadingDonations: boolean;
  searchError: string | null;
  donationsError: string | null;
  search: (searchQuery?: string) => Promise<void>;
  selectDonor: (donor: Donor) => void;
  clearSelection: () => void;
}

export function useDonorSearch(): UseDonorSearchResult {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);

  // Use TanStack Query for donor search
  const {
    data: donors = [],
    isLoading: isSearching,
    error: searchQueryError,
  } = useQuery({
    queryKey: queryKeys.donors.search(searchQuery),
    queryFn: () => api.searchDonors(searchQuery),
    enabled: searchQuery.length >= 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use TanStack Query for donations fetch
  const {
    data: donations = [],
    isLoading: isLoadingDonations,
    error: donationsQueryError,
  } = useQuery({
    queryKey: queryKeys.donors.donations(selectedDonor?.donor_id ?? '0'),
    queryFn: () => api.getDonorDonations(selectedDonor!.donor_id),
    enabled: selectedDonor !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const search = useCallback(
    async (searchQueryParam?: string) => {
      const queryToSearch = searchQueryParam ?? query;
      if (queryToSearch.length < 3) {
        setSearchQuery('');
        return;
      }

      setSearchQuery(queryToSearch);
    },
    [query]
  );

  const selectDonor = useCallback((donor: Donor) => {
    setSelectedDonor(donor);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDonor(null);
  }, []);

  return {
    query,
    setQuery,
    donors,
    selectedDonor,
    donations,
    isSearching,
    isLoadingDonations,
    searchError: searchQueryError
      ? searchQueryError instanceof Error
        ? searchQueryError.message
        : 'Search failed'
      : null,
    donationsError: donationsQueryError
      ? donationsQueryError instanceof Error
        ? donationsQueryError.message
        : 'Failed to load donations'
      : null,
    search,
    selectDonor,
    clearSelection,
  };
}
