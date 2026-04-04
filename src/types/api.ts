/**
 * Core Data Models
 * These interfaces define the shape of our data across the app.
 */

export interface Politician {
  canonical_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  party: string;
  state: string;
  seat?: string;
  photo_url?: string;
}

export interface Donor {
  donor_id: string;
  name: string;
  donor_type: string; // e.g., 'Individual' or 'PAC'
  employer?: string;
  state?: string;
  total_contributions?: number;
}
