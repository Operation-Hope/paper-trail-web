// src/types/api.ts

export interface Politician {
  canonical_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  party: string;
  state: string;
  chamber: string; 
}

export interface Donor {
  donor_id: string;
  name: string;
  donor_type: string;
  state?: string;
  total_donated: number;
}

// --- ADD THIS SECTION BELOW ---
export interface CongressSession {
  congress: number;
  start: string;
  end: string;
}

export interface VoteDateRangeResponse {
  earliest_vote: string;
  latest_vote: string;
  congress_sessions: CongressSession[];
}