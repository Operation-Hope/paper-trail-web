import * as React from 'react';
import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Info,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { VoteResponse, Vote } from '@/types/api';

interface VoteRecordProps {
  politicianId: string;
  onSubjectClick?: (subject: string | null) => void;
}

// --- SUB-COMPONENT: VOTE TABLE ---
// Includes the "Defensive" checks to prevent .length crashes
const VoteTable = ({
  data,
  isLoading,
}: {
  data?: VoteResponse;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
        <p className="text-muted-foreground animate-pulse">
          Querying 3 million records via DuckDB...
        </p>
      </div>
    );
  }

  // Defensive: Use optional chaining and fallback to empty array
  const votes = data?.votes || [];

  if (votes.length === 0) {
    return (
      <div className="bg-muted/20 flex flex-col items-center justify-center rounded-lg border p-12 text-center">
        <Info className="text-muted-foreground mb-2 h-8 w-8" />
        <p className="text-muted-foreground">
          No voting records found for this criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 border-b text-xs uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Bill</th>
            <th className="px-4 py-3 text-center font-medium">Vote</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {votes.map((vote: Vote) => (
            <tr
              key={vote.vote_id}
              className="hover:bg-muted/30 transition-colors"
            >
              <td className="text-muted-foreground px-4 py-4 whitespace-nowrap">
                {vote.vote_date}
              </td>
              <td className="text-primary px-4 py-4 font-mono font-bold">
                {vote.bill_number}
              </td>
              <td className="px-4 py-4 text-center">
                <VoteBadge value={vote.vote_value} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- SUB-COMPONENT: VOTE BADGE ---
const VoteBadge = ({ value }: { value: string }) => {
  switch (value) {
    case 'Yea':
      return (
        <Badge className="border-emerald-200 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Yea
        </Badge>
      );
    case 'Nay':
  return (
    <Badge
      /* Changed bg-red-500/10 to bg-red-200 and text to red-900 for high contrast */
      className="border-red-300 bg-red-200 text-red-900 hover:bg-red-300 transition-colors"
    >
      <XCircle className="mr-1 h-3 w-3" /> Nay
    </Badge>
  );
    default:
      return (
        <Badge variant="secondary">
          <MinusCircle className="mr-1 h-3 w-3" /> {value}
        </Badge>
      );
  }
};

// --- MAIN COMPONENT ---
export function VoteRecord({ politicianId }: VoteRecordProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search to avoid hammering DuckDB on every keystroke
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  // Fetch data from your MSW/DuckDB endpoint
  const { data, isLoading, isError } = useQuery<VoteResponse>({
    queryKey: ['votes', politicianId, page, debouncedSearch],
    queryFn: async () => {
      const url = new URL(
        `${window.location.origin}/api/politician/${politicianId}/votes`
      );
      url.searchParams.set('page', page.toString());
      if (debouncedSearch) url.searchParams.set('search', debouncedSearch);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch votes');

      // FIX: Cast the result here
      return (await res.json()) as VoteResponse;
    },
  });

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="bg-muted/10 border-b">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calendar className="text-primary h-5 w-5" />
            Voting Record
          </CardTitle>

          <div className="relative w-full md:w-72">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search bill ID..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // Reset to page 1 on new search
              }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isError ? (
          <div className="p-12 text-center text-red-500">
            <p>
              Error connecting to the database. Check console for DuckDB status.
            </p>
          </div>
        ) : (
          <>
            <VoteTable data={data} isLoading={isLoading} />

            {/* Pagination Controls */}
            {data && data.pagination.totalPages > 1 && (
              <div className="bg-muted/5 flex items-center justify-between border-t p-4">
                <p className="text-muted-foreground text-sm">
                  Showing page {page} of {data.pagination.totalPages}
                  <span className="hidden md:inline">
                    {' '}
                    ({data.pagination.totalVotes.toLocaleString()} total votes)
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1 || isLoading}
                    onClick={() => {
                      setPage((p) => p - 1);
                    }}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === data.pagination.totalPages || isLoading}
                    onClick={() => {
                      setPage((p) => p + 1);
                    }}
                  >
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
