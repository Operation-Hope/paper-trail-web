/**
 * TypeScript type definitions for Paper Trail API responses
 * Updated for new Supabase database schema with snake_case columns and text IDs
 */

export interface Politician {
  canonical_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  party: string;
  state: string;
  seat: string | null;
  is_active: boolean;
  icpsr_id?: number;
  bioguide_id?: string;
  fec_candidate_id?: string;
  nominate_dim1?: number;
  nominate_dim2?: number;
  first_elected_year?: number;
  last_elected_year?: number;
}

export interface Donor {
  donor_id: string; // Changed from number to string
  name: string;
  donor_type: string;
  employer: string | null;
  occupation?: string | null; // New field
  state: string | null;
  total_contributions_count?: number; // New field
  total_amount?: number; // New field
}

export interface Donation {
  transaction_id: string;
  amount: number;
  transaction_date: string;
  industry: string | null;
  election_cycle: number | null;
  // Politician info (from JOIN with canonical_politician)
  canonical_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  party: string;
  state: string;
}

export interface DonationSummary {
  industry: string;
  contribution_count: number; // New field
  total_amount: number;
  avg_amount: number; // New field
}

export interface FilteredDonationSummaryResponse {
  data: DonationSummary[];
  metadata: {
    topic: string;
    industries_included: string[];
    topic_coverage_warning: string;
  };
}

interface BillTopic {
  label: string;
  source: 'CBP' | 'DIME' | 'CongressGov';
  weight: number | null;
  is_primary: boolean;
}

export interface Vote {
  canonical_id: string;
  vote_id: number;
  vote_value: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  // Rollcall info (from JOIN)
  rollcall_id: number;
  congress: number;
  chamber: 'House' | 'Senate';
  rollnumber: number;
  bill_number: string | null;
  bill_description: string | null;
  vote_date: string;
  vote_result: string | null;
  has_topics: boolean;
  topics: BillTopic[];
}

interface VotePagination {
  currentPage: number;
  totalPages: number;
  totalVotes: number;
}

export interface VoteResponse {
  pagination: VotePagination;
  votes: Vote[];
  metadata: {
    topic_coverage: string;
  };
}

/** Valid vote values for filtering */
export type VoteValue = 'Yea' | 'Nay' | 'Present' | 'Not Voting';

export interface VoteParams {
  page?: number;
  sort?: 'ASC' | 'DESC';
  type?: string | string[];
  subject?: string | string[];
  date_from?: string; // ISO date string YYYY-MM-DD
  date_to?: string; // ISO date string YYYY-MM-DD
  vote_value?: VoteValue[];
  search?: string; // Search bill number, description, subjects
}

interface CongressSession {
  congress: number;
  start: string; // ISO date string
  end: string; // ISO date string
}

export interface VoteDateRangeResponse {
  earliest_vote: string | null;
  latest_vote: string | null;
  congress_sessions: CongressSession[];
}

export interface BillSubjectsResponse {
  subjects: string[];
  total_subjects: number;
  by_source: {
    [source: string]: Array<{ subject: string; count: number }>;
  };
  metadata: {
    coverage: string;
    sources: {
      CBP: string;
      DIME: string;
      CongressGov: string;
    };
  };
}
