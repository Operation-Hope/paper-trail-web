/**
 * Donor search results component using React 19 Suspense
 * Fetches and displays donor search results with useSuspenseQuery
 */
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { queryKeys } from '../lib/query/keys';
import { DonorCard } from './DonorCard';
import { Card, CardContent } from './ui/card';
import type { Donor } from '../types/api';

interface DonorSearchResultsProps {
  searchQuery: string;
  onSelectDonor: (donor: Donor) => void;
}

export function DonorSearchResults({
  searchQuery,
  onSelectDonor,
}: DonorSearchResultsProps) {
  // useSuspenseQuery will suspend while loading, showing Suspense fallback
  const { data: donors } = useSuspenseQuery({
    queryKey: queryKeys.donors.search(searchQuery),
    queryFn: () => api.searchDonors(searchQuery),
    staleTime: 5 * 60 * 1000,
  });

  if (donors.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-muted-foreground py-8 text-center">
            No donors found matching "{searchQuery}"
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Found {donors.length} donor{donors.length !== 1 ? 's' : ''}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {donors.map((donor) => (
          <DonorCard
            key={donor.donor_id}
            donor={donor}
            onSelect={onSelectDonor}
          />
        ))}
      </div>
    </div>
  );
}
