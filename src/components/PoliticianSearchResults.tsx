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

export default function PoliticianSearchResults({ searchQuery, onSelectPolitician }: PoliticianSearchResultsProps) {
  const { data: response } = useSuspenseQuery({
    queryKey: ['politicians', 'search', searchQuery],
    queryFn: () => api.searchPoliticians(searchQuery),
  });

  const politicians = Array.isArray(response) ? response : [];

  const getPartyInfo = (party: string = "") => {
    const p = party.trim().toUpperCase();
    if (p === 'R' || p.startsWith('REP')) return { label: "R", variant: "destructive" as const };
    if (p === 'D' || p.startsWith('DEM')) return { label: "D", variant: "default" as const };
    return { label: p.charAt(0) || "I", variant: "outline" as const };
  };

  if (politicians.length === 0) return (
    <Card role="status">
      <CardContent className="pt-6 text-center text-muted-foreground py-8">
        No sitting politicians found matching "{searchQuery}"
      </CardContent>
    </Card>
  );

  return (
    <ul className="grid gap-4" role="list" aria-label="Politician search results matches">
      {politicians.map((politician) => {
        const partyInfo = getPartyInfo(politician.party);
        return (
          <li key={politician.id}>
            <button
              className="w-full text-left rounded-xl border border-white/5 bg-zinc-900/40 hover:border-primary/50 cursor-pointer group transition-all focus:outline-none focus:ring-2 focus:ring-[#4A90E2] block focus:bg-white/[0.04]"
              onClick={() => onSelectPolitician(politician)}
              aria-label={`View legislative profile summary for ${politician.full_name}, ${politician.party} representative from ${politician.state}`}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors" aria-hidden="true">
                  <Users className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg truncate text-white">{politician.full_name}</h3>
                    <Badge variant={partyInfo.variant} className="text-[10px] font-mono">{partyInfo.label}</Badge>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground gap-3 uppercase font-bold tracking-tighter opacity-60">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {politician.state}
                    </span>
                    <span aria-hidden="true">•</span>
                    <span>{politician.chamber}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" aria-hidden="true" />
              </CardContent>
            </button>
          </li>
        );
      })}
    </ul>
  );
}