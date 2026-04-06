// src/mocks/data/factories/donor.ts

/**
 * Dummy exports to satisfy all named imports in the data index 
 * while we focus on the corruption tracker and voting logic.
 */

// Basic Search/Lookup
export const searchDonors = async () => [];
export const getDonorById = async () => null;
export const getDonors = async () => [];

// Creation/Mocks (Singular and Plural)
export const createDonor = () => ({
  donor_id: 'dummy',
  name: 'Removed',
  total_contributions: 0
});

export const createDonors = (count: number = 0) => [];

// Other potential missing exports
export const updateDonor = async () => null;
export const deleteDonor = async () => null;