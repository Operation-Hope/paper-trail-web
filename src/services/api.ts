import { Politician, Donor } from '../types/api';

export const api = {
  searchPoliticians: async (query: string): Promise<Politician[]> => {
    const response = await fetch(
      `/api/politicians/search?name=${encodeURIComponent(query)}`
    );
    if (!response.ok) return [];
    return response.json() as Promise<Politician[]>; // Explicitly cast the return
  },

  searchDonors: async (query: string): Promise<Donor[]> => {
    const response = await fetch(
      `/api/donors/search?name=${encodeURIComponent(query)}`
    );
    if (!response.ok) return [];
    return response.json() as Promise<Donor[]>; // Explicitly cast the return
  },

  getPolitician: async (id: string): Promise<Politician> => {
    const response = await fetch(`/api/politician/${id}`);
    if (!response.ok) throw new Error('Politician not found');
    return response.json() as Promise<Politician>; // Explicitly cast the return
  },
};
