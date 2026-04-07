export interface Politician {
  canonical_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  party: string;
  state: string;
  district: string;
  is_active: boolean;
  bioguide_id: string;
  icpsr_id: number;
  fec_candidate_id?: string;
  nominate_dim1: number;
  nominate_dim2: number;
  chamber: 'House' | 'Senate';
}

export interface Vote {
  vote_id: string;
  vote_value: string;
  bill_number: string;
  bill_title: string;
  action_type: string;
  bill_description: string;
  vote_date: string;
  topics: string[];
}

export interface VoteResponse {
  votes: Vote[];
  pagination: { currentPage: number; totalPages: number; totalVotes: number };
}