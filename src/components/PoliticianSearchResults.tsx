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

export function PoliticianSearchResults({
  searchQuery,
  onSelectPolitician,
}: PoliticianSearchResultsProps) {
  const { data: politicians } = useSuspenseQuery({
    queryKey: ['politicians', 'search', searchQuery],
    queryFn: () => api.searchPoliticians(searchQuery),
  });

  const getPartyInfo = (party: string = "") => {
    const p = party.trim().toUpperCase();
    if (p === 'R' || p === 'GOP' || p.startsWith('REP')) {
      return { label: "R", variant: "destructive" as const };
    }
    if (p === 'D' || p.startsWith('DEM')) {
      return { label: "D", variant: "default" as const };
    }
    return { label: p.charAt(0) || "I", variant: "outline" as const };
  };

  if (!politicians || politicians.length === 0) {
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
    <div className="grid gap-4">
      {politicians.map((politician) => {
        const partyInfo = getPartyInfo(politician.party);

        return (
          <Card 
            key={politician.canonical_id} 
            className="hover:border-primary/50 transition-colors cursor-pointer overflow-hidden group"
            onClick={() => onSelectPolitician(politician)}
          >
            <CardContent className="p-0">
              <div className="flex items-center p-4 gap-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <Users className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg truncate">
                      {politician.full_name}
                    </h3>
                    <Badge variant={partyInfo.variant} className="text-[10px] h-4 font-mono px-1.5">
                      {partyInfo.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground gap-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {politician.state}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{politician.chamber}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}