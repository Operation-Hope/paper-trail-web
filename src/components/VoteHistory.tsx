import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export function VoteHistory({ icpsrId }: { icpsrId: number }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ 
    queryKey: ['votes', icpsrId, page], 
    queryFn: () => api.getVoteHistory(icpsrId, page), 
    enabled: !!icpsrId 
  });
  const totalPages = Math.ceil((data?.total || 0) / 20);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4 h-full min-h-[400px]">
      <Loader2 className="h-10 w-10 animate-spin text-white" />
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Loading...</p>
    </div>
  );

  return (
    <div className="rounded-xl border border-primary/5 bg-card overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-primary/5 bg-secondary/10 flex justify-between items-center">
        <h3 className="text-xs font-black uppercase tracking-widest opacity-70 text-foreground">2024 Legislative Record ({data?.total})</h3>
      </div>

      <div className="p-4 bg-secondary/5 border-b border-primary/5 flex justify-center items-center gap-6">
        <button 
          disabled={page === 1} 
          onClick={() => setPage(p => p - 1)} 
          className="text-[10px] font-black uppercase tracking-widest hover:text-primary disabled:opacity-20 flex items-center gap-1 transition-all"
        >
          <ChevronLeft className="h-3 w-3" /> Prev
        </button>
        <span className="text-[10px] font-mono font-bold text-white/60">{page} / {totalPages || 1}</span>
        <button 
          disabled={page >= totalPages} 
          onClick={() => setPage(p => p + 1)} 
          className="text-[10px] font-black uppercase tracking-widest hover:text-primary disabled:opacity-20 flex items-center gap-1 transition-all"
        >
          Next <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="divide-y divide-primary/5 flex-1 overflow-y-auto max-h-[600px]">
        {data?.data.map((vote: any) => (
          <div key={vote.billId} className="p-4 hover:bg-primary/[0.02] transition-colors">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="font-bold text-primary/60">{vote.displayId}</span>
                  <span className="opacity-40">{vote.date}</span>
                </div>
                <p className="text-sm font-bold leading-snug">{vote.title}</p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border shrink-0 ${
                vote.position === 'Yea' 
                  ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
              }`}>
                {vote.position === 'Yea' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                <span className="text-[10px] font-black uppercase tracking-tight">{vote.position}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}