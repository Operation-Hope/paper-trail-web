import { useSuspenseQuery } from '@tanstack/react-query';
import { Users, ChevronRight, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import type { Politician } from '../types/api'; // 🌟 Reverted to your strict types interface file

interface PoliticianSearchResultsProps {
  searchQuery: string;
  onSelectPolitician: (politician: Politician) => void;
}

export function PoliticianSearchResults({
  searchQuery,
  onSelectPolitician,
}: PoliticianSearchResultsProps) {
  const { data: politicians } = useSuspenseQuery({
    queryKey: ['politicians', 'search', searchQuery],
    queryFn: async () => {
      const rawResults = await api.searchPoliticians(searchQuery);

      // 🌟 FIXED: Map our DuckDB layout fields to satisfy your project's strict type rules
      return rawResults.map((p) => ({
        ...p,
        canonical_id: String(p.id), // Satisfies the strict required 'canonical_id' constraint
        chamber: p.role === 'Senator' ? 'Senate' : 'House',
      })) as Politician[];
    },
  });

  const getPartyInfo = (party: string = '') => {
    const p = party.trim().toUpperCase();
    if (p === 'R' || p.startsWith('REP'))
      return { label: 'R', variant: 'destructive' as const };
    if (p === 'D' || p.startsWith('DEM'))
      return { label: 'D', variant: 'default' as const };
    return { label: p.charAt(0) || 'I', variant: 'outline' as const };
  };

  if (!politicians || politicians.length === 0)
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 pt-6 text-center">
          No results found.
        </CardContent>
      </Card>
    );

  return (
    <div className="grid gap-4">
      {politicians.map((politician: Politician) => (
        <Card
          key={politician.id}
          className="hover:border-primary/50 group cursor-pointer transition-all"
          onClick={() => onSelectPolitician(politician)}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="bg-muted group-hover:bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full transition-colors">
              <Users className="text-muted-foreground group-hover:text-primary h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="truncate text-lg font-bold">
                  {politician.full_name}
                </h3>
                <Badge
                  variant={getPartyInfo(politician.party).variant}
                  className="font-mono text-[10px]"
                >
                  {getPartyInfo(politician.party).label}
                </Badge>
              </div>
              <div className="text-muted-foreground flex items-center gap-3 text-sm font-bold tracking-tighter uppercase opacity-60">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {politician.state}
                </span>
                <span>•</span>
                <span>{politician.chamber || politician.role}</span>
              </div>
            </div>
            <ChevronRight className="text-muted-foreground h-5 w-5 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
