import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { FileText, Gavel } from 'lucide-react'; // 🛡️ Cleaned up unused Landmark

interface VoteRecordProps {
  icpsrId: number;
}

export default function VoteRecord({ icpsrId }: VoteRecordProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['votes', icpsrId],
    queryFn: () => {
      if (!icpsrId) return null;
      return api.getPoliticianVotes(icpsrId, { page: '1' });
    },
    enabled: !!icpsrId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center space-y-3">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          Querying DuckDB...
        </p>
      </div>
    );
  }

  if (error || !data || data.votes.length === 0) {
    return (
      <div className="text-muted-foreground m-2 flex min-h-[300px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center">
        <FileText className="mb-2 opacity-20" size={32} />
        <p className="text-sm font-medium">No recent voting records found.</p>
        <p className="mt-1 text-xs tracking-tighter uppercase opacity-50">
          Verified by DuckDB Engine
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in space-y-4 p-2 duration-500">
      {data.votes.map((vote) => (
        <div
          key={vote.vote_id}
          className="group bg-card hover:border-primary/40 rounded-xl border-2 p-5 transition-all duration-300"
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary rounded-sm px-2 py-0.5 text-[10px] font-black tracking-tighter uppercase">
                  {vote.bill_number}
                </span>
                <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                  {vote.vote_date}
                </span>
              </div>

              {/* 🛡️ Now using bill_title from the Join */}
              <h3 className="group-hover:text-primary text-sm leading-tight font-bold transition-colors">
                {vote.bill_title}
              </h3>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span
                className={`rounded-sm border-2 px-3 py-1 text-[10px] font-black tracking-widest uppercase ${
                  vote.vote_value === 'Yea'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                    : vote.vote_value === 'Nay'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-600'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                }`}
              >
                {vote.vote_value}
              </span>
              {/* 🛡️ Now using action_type from the Join */}
              {vote.action_type && (
                <span className="text-muted-foreground font-mono text-[9px] tracking-tighter uppercase">
                  {vote.action_type}
                </span>
              )}
            </div>
          </div>

          <p className="text-muted-foreground border-muted border-l-2 pl-3 text-xs leading-relaxed">
            {vote.bill_description}
          </p>
        </div>
      ))}

      <div className="pt-6 text-center opacity-30">
        <div className="mb-1 flex items-center justify-center gap-2">
          <Gavel size={12} />
          <p className="font-mono text-[9px] tracking-[0.3em] uppercase">
            End of Active Congressional Record
          </p>
        </div>
      </div>
    </div>
  );
}
