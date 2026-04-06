import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Landmark, FileText } from 'lucide-react';

/**
 * ⚖️ VoteRecord Component
 * Displays a paginated list of legislative actions for a specific ICPSR ID.
 */
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

  // 🧱 STATE 1: LOADING (Now matched to DonationChart style)
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        {/* 🔄 THE SPINNER: Matches the Funding Chart exactly */}
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Loading Legislative History...
        </p>
      </div>
    );
  }

  // 🧱 STATE 2: ERROR OR EMPTY
  if (error || !data || data.votes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground p-8 text-center border-2 border-dashed rounded-xl m-2">
        <FileText className="mb-2 opacity-20" size={32} />
        <p className="text-sm font-medium">No recent voting records found.</p>
        <p className="text-xs opacity-50 mt-1 uppercase tracking-tighter">Verified by DuckDB Engine</p>
      </div>
    );
  }

  // 🧱 STATE 3: SUCCESS (VOTING CARDS)
  return (
    <div className="space-y-3 p-2 animate-in fade-in duration-500">
      {data.votes.map((vote) => (
        <div 
          key={vote.vote_id} 
          className="group p-4 border-2 rounded-lg bg-card hover:border-primary/40 hover:bg-accent/10 transition-all duration-200"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-secondary text-secondary-foreground rounded uppercase tracking-tighter">
                {vote.bill_number}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                {vote.vote_date}
              </span>
            </div>
            
            <span className={`text-[10px] font-black px-3 py-1 rounded-sm uppercase tracking-widest border-2 ${
              vote.vote_value === 'Yea' ? 'border-green-600/30 bg-green-600/10 text-green-500' : 
              vote.vote_value === 'Nay' ? 'border-red-600/30 bg-red-600/10 text-red-500' : 
              'border-zinc-700 bg-zinc-800 text-zinc-400'
            }`}>
              {vote.vote_value}
            </span>
          </div>
          
          <p className="text-sm font-medium leading-snug line-clamp-2 text-foreground/90">
            {vote.bill_description}
          </p>
        </div>
      ))}
      
      <div className="text-center pt-4 opacity-40">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em]">
          End of Recent Records
        </p>
      </div>
    </div>
  );
}