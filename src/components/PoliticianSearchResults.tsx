import { useSuspenseQuery } from '@tanstack/react-query';
import { Users, ChevronRight, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import type { Politician } from '../types/api';

interface PoliticianSearchResultsProps {
  searchQuery: string;
  onSelectPolitician: (politician: Politician) => void;
}

export default function PoliticianSearchResults({
  searchQuery,
  onSelectPolitician,
}: PoliticianSearchResultsProps) {
  const { data: response } = useSuspenseQuery({
    queryKey: ['politicians', 'search', searchQuery],
    queryFn: () => api.searchPoliticians(searchQuery),
  });

  const politicians = Array.isArray(response) ? response : [];

  const getPartyInfo = (party: string = '') => {
    const p = party.trim().toUpperCase();
    if (p === 'R' || p.startsWith('REP'))
      return { label: 'R', variant: 'destructive' as const };
    if (p === 'D' || p.startsWith('DEM'))
      return { label: 'D', variant: 'default' as const };
    return { label: p.charAt(0) || 'I', variant: 'outline' as const };
  };

  if (politicians.length === 0)
    return (
      <Card role="status">
        <CardContent className="text-muted-foreground py-8 pt-6 text-center">
          No sitting politicians found matching &quot;{searchQuery}&quot;
        </CardContent>
      </Card>
    );

  return (
    <ul
      className="grid gap-4"
      role="list"
      aria-label="Politician search results matches"
    >
      {politicians.map((politician) => {
        const partyInfo = getPartyInfo(politician.party);
        return (
          <li key={politician.id}>
            <button
              className="hover:border-primary/50 group block w-full cursor-pointer rounded-xl border border-white/5 bg-zinc-900/40 text-left transition-all focus:bg-white/[0.04] focus:ring-2 focus:ring-[#4A90E2] focus:outline-none"
              onClick={() => {
                onSelectPolitician(politician);
              }}
              aria-label={`View legislative profile summary for ${politician.full_name}, ${politician.party} representative from ${politician.state}`}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className="bg-muted group-hover:bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full transition-colors"
                  aria-hidden="true"
                >
                  <Users className="text-muted-foreground group-hover:text-primary h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate text-lg font-bold text-white">
                      {politician.full_name}
                    </h3>
                    <Badge
                      variant={partyInfo.variant}
                      className="font-mono text-[10px]"
                    >
                      {partyInfo.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold tracking-tighter text-zinc-400 uppercase">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {politician.state}
                    </span>
                    <span aria-hidden="true">•</span>
                    <span>{politician.chamber}</span>
                  </div>
                </div>
                <ChevronRight
                  className="text-muted-foreground h-5 w-5 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </CardContent>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
