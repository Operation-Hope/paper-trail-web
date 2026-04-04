// src/types/api.ts

export interface Politician {
  canonical_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  party: string;
  state: string;
  chamber: string; // <--- ADD THIS LINE
  // ... keep any other existing properties (like image_url, etc.)
}

export interface Donor {
  donor_id: string;
  name: string;
  donor_type: string;
  state?: string;
  total_donated: number;
}