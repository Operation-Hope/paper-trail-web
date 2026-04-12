import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function VoteHistory({ icpsr }: { icpsr: number }) {
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['votes', icpsr],
    queryFn: () => api.getVoteHistory(icpsr),
    enabled: !!icpsr,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // 🚀 SMART TAG LOGIC: Identifies Bill types and Procedural votes
  const getBillPrefix = (title: string, id: string) => {
    if (!title) return 'VOTE';
    
    const t = title.toUpperCase();
    
    // Joint & Concurrent Resolutions
    if (t.includes('H.J.RES') || t.includes('H J RES')) return 'HJRES';
    if (t.includes('S.J.RES') || t.includes('S J RES')) return 'SJRES';
    if (t.includes('H.CON.RES') || t.includes('H CON RES')) return 'HCONRES';
    if (t.includes('S.CON.RES') || t.includes('S CON RES')) return 'SCONRES';
    
    // Standard Resolutions & Bills
    if (t.includes('H.RES') || t.includes('H RES')) return 'HRES';
    if (t.includes('S.RES') || t.includes('S RES')) return 'SRES';
    if (t.includes('H.R.') || t.includes('H R ')) return 'HR';
    if (t.includes('S.') || t.startsWith('S ')) return 'S';

    // Procedural (The "Roll Call" Killers)
    if (
      t.includes('MOTION') || 
      t.includes('ADJOURN') || 
      t.includes('JOURNAL') || 
      t.includes('PREVIOUS QUESTION') || 
      t.includes('SUSPEND THE RULES') ||
      t.includes('TABLE') ||
      t.includes('QUORUM')
    ) return 'PROC';

    // Amendments & Nominations
    if (t.includes('AMENDMENT') || t.includes('AMDT')) return 'AMDT';
    if (t.includes('NOMINATION') || t.includes('PN') || t.includes('CONFIRMATION')) return 'NOM';
    if (t.includes('CLOTURE')) return 'CLOT';

    // Fallback
    return 'VOTE'; 
  };

  // 🦴 Loading State: Unified White Spinner
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 min-h-[400px]">
        <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
        <span className="text-zinc-500 text-[10px] font-bold tracking-[0.2em] uppercase animate-pulse">
          Loading..
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-[400px] flex items-center justify-center border border-dashed border-zinc-800 rounded-3xl">
        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest italic">
          Error Loading Records
        </p>
      </div>
    );
  }

  const votes = response?.data || [];

  return (
    <div className="rounded-3xl border border-white/5 bg-zinc-950 overflow-hidden h-full flex flex-col max-h-[600px]">
      {/* 🚀 Header: Matched to 2024 Contributions Style */}
      <div className="p-5 border-b border-white/5 bg-zinc-900/20">
        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-zinc-400">
          2024 Voting Record
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
        {votes.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-zinc-600 text-[10px] uppercase font-bold italic tracking-widest">
              No records found for 2024
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {votes.map((v: any, index: number) => {
              const prefix = getBillPrefix(v.title, v.id);
              return (
                <div 
                  key={`${v.id}-${index}`} 
                  className="group p-4 flex justify-between items-center hover:bg-white/[0.01] transition-colors"
                >
                  <div className="flex flex-col gap-1 truncate pr-4">
                    {/* Title: Muted Zinc, highlight on hover */}
                    <span className="text-[11px] font-bold text-zinc-400 truncate group-hover:text-white transition-colors duration-200">
                      {v.title}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {/* 🚀 Prefix Tag */}
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${
                        prefix === 'VOTE' ? 'text-zinc-600' : 'text-[#4A90E2]'
                      }`}>
                        {prefix}
                      </span>
                      {/* Date: Monospace for technical feel */}
                      <span className="text-[9px] font-mono text-zinc-600 uppercase">
                        {v.date}
                      </span>
                    </div>
                  </div>
                  
                  {/* 🎨 Neutral Status Badges: Muted Slate-Teal and Slate-Rose */}
                  <div className={`px-3 py-1.5 rounded-md font-black text-[9px] uppercase tracking-tighter border transition-all ${
                    v.position === 'Yea' 
                      ? 'bg-slate-800/40 text-teal-500/90 border-teal-500/20' 
                      : 'bg-slate-800/40 text-rose-400/80 border-rose-400/20'
                  }`}>
                    {v.position}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}