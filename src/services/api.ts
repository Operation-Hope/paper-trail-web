import { Politician, Donor } from '../types/api';

export const api = {
  /**
   * 1. Search Politicians (Plural)
   */
  searchPoliticians: async (query: string): Promise<Politician[]> => {
    const response = await fetch(
      `/api/politicians/search?name=${encodeURIComponent(query)}`
    );
    if (!response.ok) return [];
    return await response.json();
  },

  /**
   * 2. Search Donors (Plural)
   */
  searchDonors: async (query: string): Promise<Donor[]> => {
    const response = await fetch(
      `/api/donors/search?name=${encodeURIComponent(query)}`
    );
    if (!response.ok) return [];
    return await response.json();
  },

  /**
   * 3. Get Individual Politician (Singular)
   * Reverted to singular because plural caused the "No Politician Found" popup.
   */
  getPolitician: async (id: string): Promise<Politician> => {
    const response = await fetch(`/api/politician/${id}`);
    if (!response.ok) throw new Error('Politician not found');
    return await response.json();
  },

  /**
   * 4. Get Individual Donor (Singular)
   */
  getDonor: async (id: string): Promise<Donor> => {
    const response = await fetch(`/api/donor/${id}`);
    if (!response.ok) throw new Error('Donor not found');
    return await response.json();
  },

  /**
   * 5. Voting Records (Singular)
   * Includes a safety check for Content-Type to prevent the "Unexpected token <" error.
   */
  getPoliticianVotes: async (id: string): Promise<any[]> => {
    try {
      const response = await fetch(`/api/politician/${id}/votes`);
      
      const contentType = response.headers.get("content-type");
      if (!response.ok || !contentType?.includes("application/json")) {
        // If the API returns a 404 HTML page, we return an empty array 
        // to keep the UI from crashing.
        console.warn(`Votes not found at /api/politician/${id}/votes. Content-Type: ${contentType}`);
        return [];
      }
      
      return await response.json();
    } catch (err) {
      console.error("Failed to fetch voting records:", err);
      return [];
    }
  },

  /**
   * 6. Donation Summary Stub
   * Returning an empty array [] so that the Donation Chart doesn't 
   * trigger the ".map is not a function" error.
   */
  getDonationSummary: async (_id: string): Promise<any[]> => {
    return []; 
  }
};