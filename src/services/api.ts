/**
 * API service layer for Paper Trail application
 * Updated for new Supabase database schema with text-based IDs
 */

import type {
  Politician,
  Donor,
  Donation,
  DonationSummary,
  FilteredDonationSummaryResponse,
  VoteResponse,
  VoteParams,
  VoteDateRangeResponse,
  BillSubjectsResponse,
} from '../types/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  // Get API base URL from environment, with fallback to localhost for development
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? 'http://localhost:5001' : undefined);

  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL must be set in production');
  }

  // Construct absolute URL by prepending API base URL
  const absoluteUrl = `${apiBaseUrl}${url}`;
  const response = await fetch(absoluteUrl, options);
  if (!response.ok) {
    throw new Error(
      `API error: ${response.status.toString()} ${response.statusText}`
    );
  }
  return response.json() as Promise<T>;
}

export const api = {
  /**
   * Search for politicians by name
   * @param query - Search query (minimum 2 characters)
   * @returns Array of matching politicians
   */
  searchPoliticians: async (query: string): Promise<Politician[]> => {
    return fetchJSON<Politician[]>(
      `/api/politicians/search?name=${encodeURIComponent(query)}`
    );
  },

  /**
   * Get a single politician by ID
   * @param politicianId - The politician's ID (now text like "cand1002")
   * @returns Politician data
   */
  getPolitician: async (politicianId: string): Promise<Politician> => {
    return fetchJSON<Politician>(`/api/politician/${politicianId}`);
  },

  /**
   * Search for donors by name
   * @param query - Search query (minimum 3 characters)
   * @returns Array of matching donors
   */
  searchDonors: async (query: string): Promise<Donor[]> => {
    return fetchJSON<Donor[]>(
      `/api/donors/search?name=${encodeURIComponent(query)}`
    );
  },

  /**
   * Get a single donor by ID
   * @param donorId - The donor's ID (now text)
   * @returns Donor data
   */
  getDonor: async (donorId: string): Promise<Donor> => {
    return fetchJSON<Donor>(`/api/donor/${donorId}`);
  },

  /**
   * Get all donations made by a specific donor
   * @param donorId - The donor's ID (now text)
   * @param options - Optional fetch options including signal for cancellation
   * @returns Array of donations with recipient politician information
   */
  getDonorDonations: async (
    donorId: string,
    options?: RequestInit
  ): Promise<Donation[]> => {
    return fetchJSON<Donation[]>(`/api/donor/${donorId}/donations`, options);
  },

  /**
   * Get paginated voting history for a politician with optional filters
   * @param politicianId - The politician's ID (now text like "cand1002")
   * @param params - Optional pagination and filter parameters
   * @returns Paginated vote response with metadata
   */
  getPoliticianVotes: async (
    politicianId: string,
    params: VoteParams = {}
  ): Promise<VoteResponse> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.sort) searchParams.set('sort', params.sort);

    // Handle array parameters for type and subject filters
    if (params.type) {
      const types = Array.isArray(params.type) ? params.type : [params.type];
      types.forEach((t) => {
        searchParams.append('type', t);
      });
    }
    if (params.subject) {
      const subjects = Array.isArray(params.subject)
        ? params.subject
        : [params.subject];
      subjects.forEach((s) => {
        searchParams.append('subject', s);
      });
    }

    // Date range filters
    if (params.date_from) searchParams.set('date_from', params.date_from);
    if (params.date_to) searchParams.set('date_to', params.date_to);

    // Vote outcome filter (Yea, Nay, Present, Not Voting)
    if (params.vote_value && params.vote_value.length > 0) {
      params.vote_value.forEach((v) => {
        searchParams.append('vote_value', v);
      });
    }

    // Search filter (searches bill number, description, subjects)
    if (params.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    const url = `/api/politician/${politicianId}/votes${queryString ? `?${queryString}` : ''}`;
    return fetchJSON<VoteResponse>(url);
  },

  /**
   * Get date range metadata for a politician's voting history
   * @param politicianId - The politician's ID
   * @returns Date range and congress sessions for the politician
   */
  getPoliticianVotesDateRange: async (
    politicianId: string
  ): Promise<VoteDateRangeResponse> => {
    return fetchJSON<VoteDateRangeResponse>(
      `/api/politician/${politicianId}/votes/date-range`
    );
  },

  /**
   * Get donation summary grouped by industry for a politician
   * Uses materialized view for fast aggregation (~50ms)
   * @param politicianId - The politician's ID (now text like "cand1002")
   * @returns Array of industry donation summaries sorted by total amount
   */
  getDonationSummary: async (
    politicianId: string
  ): Promise<DonationSummary[]> => {
    return fetchJSON<DonationSummary[]>(
      `/api/politician/${politicianId}/donations/summary`
    );
  },

  /**
   * Get donation summary filtered by bill topic/subject
   * Uses materialized view for fast filtering
   * @param politicianId - The politician's ID (now text like "cand1002")
   * @param topic - The bill topic to filter by (e.g., "Health", "Finance")
   * @returns Response with donation data and metadata about topic coverage
   */
  getFilteredDonationSummary: async (
    politicianId: string,
    topic: string
  ): Promise<FilteredDonationSummaryResponse> => {
    return fetchJSON<FilteredDonationSummaryResponse>(
      `/api/politician/${politicianId}/donations/summary/filtered?topic=${encodeURIComponent(topic)}`
    );
  },

  /**
   * Get all unique bill subjects from the database
   * Note: Topic data only available for bills from 2003-2014
   * @returns Response with subjects array and metadata
   */
  getBillSubjects: async (): Promise<BillSubjectsResponse> => {
    return fetchJSON<BillSubjectsResponse>('/api/bills/subjects');
  },
};
