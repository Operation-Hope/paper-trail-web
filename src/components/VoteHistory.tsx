import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function VoteHistory({ icpsr }: { icpsr: number }) {
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['votes', icpsr],
    queryFn: () => api.getVoteHistory(icpsr),
    enabled: !!icpsr,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 min-h-[300px]">
        <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
        <span className="text-zinc-500 text-[10px] font-bold tracking-[0.2em] uppercase animate-pulse">
          Loading..
        </span>
      </div>
    );
  }

  const votes = response?.data || [];

  const getBillPrefix = (title: string, id: string) => {
    const match = title.match(/^(H\.R\.|H\.Res\.|S\.|S\.Res\.|H\.J\.Res\.|S\.J\.Res\.)/i);
    return match ? match[0].toUpperCase().replace(/\./g, '') : `ROLL ${id}`;
  };

  // Inside VoteHistory.tsx

return (
  <div className="rounded-3xl border border-white/5 bg-zinc-950 overflow-hidden h-full flex flex-col">
    <div className="p-5 border-b border-white/5 bg-zinc-900/20">
      <h3 className="text-xs font-black uppercase tracking-[0.15em] text-zinc-400">
        2024 Voting Record
      </h3>
    </div>

    <div className="flex-1 overflow-y-auto p-2">
      <div className="divide-y divide-white/5">
        {votes.map((v: any, index: number) => (
          <div key={index} className="group p-4 flex justify-between items-center hover:bg-white/[0.02]">
            <div className="flex flex-col gap-1 truncate pr-4">
              <span className="text-[11px] font-bold text-zinc-400 truncate group-hover:text-white transition-colors">
                {v.title}
              </span>
              <span className="text-[9px] font-black text-[#4A90E2] uppercase tracking-tighter">
                {getBillPrefix(v.title, v.id)}
              </span>
            </div>
            
            {/* 🎨 NEW CALM COLORS: Muted Teal and Muted Rose-Slate */}
            <div className={`px-3 py-1.5 rounded-md font-black text-[9px] uppercase tracking-tighter border ${
              v.position === 'Yea' 
                ? 'bg-slate-800/40 text-teal-500/90 border-teal-500/20' 
                : 'bg-slate-800/40 text-rose-400/80 border-rose-400/20'
            }`}>
              {v.position}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
}