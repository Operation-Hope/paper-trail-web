import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Gavel } from 'lucide-react';
import type { Vote } from '../types/api';

export default function VoteRecord({ icpsrId }: { icpsrId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['votes', icpsrId],
    queryFn: () => (icpsrId ? api.getPoliticianVotes(icpsrId) : null),
    enabled: !!icpsrId,
  });

  if (isLoading) return <div className="p-10 text-center animate-pulse text-xs font-mono uppercase tracking-widest opacity-40">Syncing Record...</div>;

  return (
    <div className="p-4 space-y-4">
      {data?.votes.map((vote: Vote) => (
        <div key={vote.vote_id} className="p-5 border-2 rounded-xl bg-card hover:border-primary/40 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-black px-2 py-0.5 bg-primary/10 text-primary rounded-sm uppercase tracking-tighter">
                  {vote.bill_number}
                </span>
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  {vote.vote_date}
                </span>
              </div>
              <h3 className="text-sm font-bold leading-tight mt-1">{vote.bill_title}</h3>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <div className={`text-[10px] font-black px-3 py-1 rounded-sm border-2 ${
                vote.vote_value === 'Yea' ? 'border-emerald-500/30 text-emerald-600' : 'border-rose-500/30 text-rose-600'
              }`}>
                {vote.vote_value.toUpperCase()}
              </div>
              <p className="text-xs font-bold text-muted-foreground/80 uppercase tracking-tighter text-right leading-none">
                {vote.action_type}
              </p>
            </div>
          </div>
          
          {vote.bill_description && vote.bill_description !== vote.bill_title && (
            <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/20 pl-3 mt-3">
              {vote.bill_description}
            </p>
          )}
        </div>
      ))}
      <div className="text-center opacity-30 mt-8 py-4 border-t border-dashed border-muted">
        <Gavel size={14} className="inline mr-2 mb-1"/> 
        <span className="text-[10px] font-mono tracking-widest uppercase italic">End of Log</span>
      </div>
    </div>
  );
}