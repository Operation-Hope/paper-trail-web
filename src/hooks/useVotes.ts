/**
 * Custom hook for managing politician vote data with server-side filtering and pagination
 * Supports search, date range, vote outcome, bill type, and subject filters
 */
import { useState, useEffect, useRef, startTransition, useMemo, useCallback } from 'react';
import { useSuspenseQuery, useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { queryKeys, type VoteFilters } from '../lib/query/keys';
import type { VoteResponse, VoteParams, VoteValue } from '../types/api';

// Type for setter that supports both direct value and functional updates
type SetterOrFn<T> = T | ((prev: T) => T);

interface UseVoteFiltersParams {
  politicianId: string;
}

interface UseVoteFiltersResult {
  currentPage: number;
  sortOrder: 'ASC' | 'DESC';
  billType: string;
  subject: string;
  searchQuery: string;
  dateFrom: string | null;
  dateTo: string | null;
  voteValues: VoteValue[];
  filters: VoteFilters;
  setCurrentPage: (page: number) => void;
  setSortOrder: (order: 'ASC' | 'DESC') => void;
  setBillType: (typeOrFn: SetterOrFn<string>) => void;
  setSubject: (subject: string) => void;
  setSearchQuery: (query: string) => void;
  setDateFrom: (date: string | null) => void;
  setDateTo: (date: string | null) => void;
  setVoteValues: (values: VoteValue[]) => void;
  clearAllFilters: () => void;
}

/**
 * Hook for managing vote filter state only (no data fetching)
 * This allows filters to remain stable while data is loading
 */
export function useVoteFilters({ politicianId }: UseVoteFiltersParams): UseVoteFiltersResult {
  const [currentPage, setCurrentPageState] = useState(1);
  const [sortOrder, setSortOrderState] = useState<'ASC' | 'DESC'>('DESC');
  const [billType, setBillTypeState] = useState('');
  const [subject, setSubjectState] = useState('');
  const [searchQuery, setSearchQueryState] = useState('');
  const [dateFrom, setDateFromState] = useState<string | null>(null);
  const [dateTo, setDateToState] = useState<string | null>(null);
  const [voteValues, setVoteValuesState] = useState<VoteValue[]>([]);
  const prevPoliticianIdRef = useRef<string>(politicianId);

  // Memoized setters to prevent unnecessary re-renders
  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageState(page);
  }, []);

  const setSortOrder = useCallback((order: 'ASC' | 'DESC') => {
    setSortOrderState(order);
  }, []);

  const setBillType = useCallback((typeOrFn: SetterOrFn<string>) => {
    setBillTypeState(typeOrFn);
  }, []);

  const setSubject = useCallback((subject: string) => {
    setSubjectState(subject);
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
  }, []);

  const setDateFrom = useCallback((date: string | null) => {
    setDateFromState(date);
  }, []);

  const setDateTo = useCallback((date: string | null) => {
    setDateToState(date);
  }, []);

  const setVoteValues = useCallback((values: VoteValue[]) => {
    setVoteValuesState(values);
  }, []);

  // Clear all filters helper
  const clearAllFilters = useCallback(() => {
    startTransition(() => {
      setCurrentPageState(1);
      setSortOrderState('DESC');
      setBillTypeState('');
      setSubjectState('');
      setSearchQueryState('');
      setDateFromState(null);
      setDateToState(null);
      setVoteValuesState([]);
    });
  }, []);

  // Reset filters when politician changes
  useEffect(() => {
    if (prevPoliticianIdRef.current !== politicianId) {
      prevPoliticianIdRef.current = politicianId;
      startTransition(() => {
        setCurrentPageState(1);
        setSortOrderState('DESC');
        setBillTypeState('');
        setSubjectState('');
        setSearchQueryState('');
        setDateFromState(null);
        setDateToState(null);
        setVoteValuesState([]);
      });
    }
  }, [politicianId]);

  // Build filters object for query key
  const filters = useMemo((): VoteFilters => {
    const filterObj: VoteFilters = {};
    if (billType) {
      filterObj.types = billType.split(',').filter(Boolean);
    }
    if (subject) {
      filterObj.subjects = subject.split(',').filter(Boolean);
    }
    if (searchQuery) {
      filterObj.search = searchQuery;
    }
    if (dateFrom) {
      filterObj.dateFrom = dateFrom;
    }
    if (dateTo) {
      filterObj.dateTo = dateTo;
    }
    if (voteValues.length > 0) {
      filterObj.voteValues = voteValues;
    }
    return filterObj;
  }, [billType, subject, searchQuery, dateFrom, dateTo, voteValues]);

  // Reset to page 1 when filters change (but not on initial mount)
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    startTransition(() => {
      setCurrentPageState(1);
    });
  }, [billType, subject, searchQuery, dateFrom, dateTo, voteValues]);

  return {
    currentPage,
    sortOrder,
    billType,
    subject,
    searchQuery,
    dateFrom,
    dateTo,
    voteValues,
    filters,
    setCurrentPage,
    setSortOrder,
    setBillType,
    setSubject,
    setSearchQuery,
    setDateFrom,
    setDateTo,
    setVoteValues,
    clearAllFilters,
  };
}

interface UseVoteDataParams {
  politicianId: string;
  currentPage: number;
  sortOrder: 'ASC' | 'DESC';
  filters: VoteFilters;
}

/**
 * Hook for fetching vote data with suspense
 * Separated from filter state so filters don't reload during data fetching
 */
export function useVoteData({ politicianId, currentPage, sortOrder, filters }: UseVoteDataParams): VoteResponse {
  const voteData = useSuspenseQuery({
    queryKey: queryKeys.politicians.votes(politicianId, currentPage, sortOrder, filters),
    queryFn: async () => {
      const params: VoteParams = { page: currentPage, sort: sortOrder };

      if (filters.types) {
        params.type = filters.types.length === 1 ? filters.types[0] : filters.types;
      }
      if (filters.subjects) {
        params.subject =
          filters.subjects.length === 1 ? filters.subjects[0] : filters.subjects;
      }
      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.dateFrom) {
        params.date_from = filters.dateFrom;
      }
      if (filters.dateTo) {
        params.date_to = filters.dateTo;
      }
      if (filters.voteValues && filters.voteValues.length > 0) {
        params.vote_value = filters.voteValues;
      }

      return api.getPoliticianVotes(politicianId, params);
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  }).data;

  return voteData;
}

// Legacy hook for backwards compatibility - combines both hooks
interface UseVotesParams {
  politicianId: string;
}

interface UseVotesResult {
  voteData: VoteResponse;
  currentPage: number;
  sortOrder: 'ASC' | 'DESC';
  billType: string;
  subject: string;
  searchQuery: string;
  dateFrom: string | null;
  dateTo: string | null;
  voteValues: VoteValue[];
  setCurrentPage: (page: number) => void;
  setSortOrder: (order: 'ASC' | 'DESC') => void;
  setBillType: (typeOrFn: SetterOrFn<string>) => void;
  setSubject: (subject: string) => void;
  setSearchQuery: (query: string) => void;
  setDateFrom: (date: string | null) => void;
  setDateTo: (date: string | null) => void;
  setVoteValues: (values: VoteValue[]) => void;
  clearAllFilters: () => void;
}

function useVotes({ politicianId }: UseVotesParams): UseVotesResult {
  const filterState = useVoteFilters({ politicianId });
  const voteData = useVoteData({
    politicianId,
    currentPage: filterState.currentPage,
    sortOrder: filterState.sortOrder,
    filters: filterState.filters,
  });

  return {
    ...filterState,
    voteData,
  };
}

/**
 * Hook for fetching date range metadata for a politician's votes
 * Returns earliest/latest vote dates and congress sessions
 * 
 * NOTE: Uses useQuery (not useSuspenseQuery) so the filter panel doesn't
 * suspend while date range data is loading. The date boundaries are optional
 * for the UI - filters work fine without them initially.
 */
export function useVoteDateRange(politicianId: string) {
  return useQuery({
    queryKey: queryKeys.politicians.votesDateRange(politicianId),
    queryFn: () => api.getPoliticianVotesDateRange(politicianId),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
}

/**
 * Hook for fetching available bill subjects
 * Uses TanStack Query for caching
 */
function useBillSubjects() {
  return useSuspenseQuery({
    queryKey: queryKeys.bills.subjects(),
    queryFn: api.getBillSubjects,
    staleTime: Infinity, // Subjects rarely change
  });
}
