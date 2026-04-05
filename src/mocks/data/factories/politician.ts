import { Politician } from '@/types/api';

export function createPolitician(
  overrides: Partial<Politician> = {}
): Politician {
  return {
    canonical_id: `test-${Math.random().toString(36).substring(7)}`,
    first_name: 'Test',
    last_name: 'User',
    full_name: 'Test User',
    party: 'I',
    state: 'DC',
    district: 'Senate',
    is_active: true,
    bioguide_id: 'T000000',
    icpsr_id: 0,
    nominate_dim1: 0,
    nominate_dim2: 0,
    chamber: 'Senate',
    ...overrides,
  };
}

export function createPoliticians(
  count: number,
  overrides: Partial<Politician> = {}
): Politician[] {
  return Array.from({ length: count }, () => createPolitician(overrides));
}
