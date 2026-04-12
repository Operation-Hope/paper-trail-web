export interface Politician {
  id: string;        // Bioguide ID (e.g., "J000294")
  icpsr: number;     // Numeric ID (e.g., 21339)
  name: string;      
  full_name: string; // Added for search results
  party: string;
  state: string;
  district: string;
  role: string;      // "Representative" or "Senator"
  chamber: string;   // Added for search results ("House" or "Senate")
  canonical_id: string; // Added for search results key
  imageUrl?: string;
}

export interface DonationRecord {
  name: string;
  value: number;
  date: string;
}

export interface VoteRecord {
  billId: string;
  title: string;
  date: string;
  position: string;
  result: string;
  category: string;
}