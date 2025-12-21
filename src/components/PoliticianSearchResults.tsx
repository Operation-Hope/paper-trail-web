/**
 * Politician search results component using React 19 Suspense
 * Fetches and displays politician search results with useSuspenseQuery
 */
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { queryKeys } from '../lib/query/keys';
import { PoliticianCard } from './PoliticianCard';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import type { Politician } from '../types/api';

interface PoliticianSearchResultsProps {
  searchQuery: string;
  comparisonPoliticians: Politician[];
  onSelectPolitician: (politician: Politician) => void;
  onToggleComparison: (politician: Politician) => void;
  onClearComparison: () => void;
}

export function PoliticianSearchResults({
  searchQuery,
  comparisonPoliticians,
  onSelectPolitician,
  onToggleComparison,
  onClearComparison,
}: PoliticianSearchResultsProps) {
  // useSuspenseQuery will suspend while loading, showing Suspense fallback
  const { data: politicians } = useSuspenseQuery({
    queryKey: queryKeys.politicians.search(searchQuery),
    queryFn: () => api.searchPoliticians(searchQuery),
    staleTime: 5 * 60 * 1000,
  });

  if (politicians.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-muted-foreground py-8 text-center">
            No politicians found matching "{searchQuery}"
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Found {politicians.length} politician
          {politicians.length !== 1 ? 's' : ''}
        </h2>
        <Button
          variant="outline"
          onClick={() => {
            if (comparisonPoliticians.length > 0) {
              onClearComparison();
            }
          }}
        >
          {comparisonPoliticians.length > 0
            ? `Compare (${comparisonPoliticians.length})`
            : 'Compare Mode'}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {politicians.map((politician) => (
          <PoliticianCard
            key={politician.canonical_id}
            politician={politician}
            onSelect={onSelectPolitician}
            onToggleComparison={onToggleComparison}
            isSelectedForComparison={comparisonPoliticians.some(
              (p) => p.canonical_id === politician.canonical_id
            )}
            comparisonMode={comparisonPoliticians.length > 0}
          />
        ))}
      </div>
    </div>
  );
}
