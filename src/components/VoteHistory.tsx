import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function VoteHistory({ icpsr }: { icpsr: number }) {
  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
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
    )
      return 'PROC';

    // Amendments & Nominations
    if (t.includes('AMENDMENT') || t.includes('AMDT')) return 'AMDT';
    if (
      t.includes('NOMINATION') ||
      t.includes('PN') ||
      t.includes('CONFIRMATION')
    )
      return 'NOM';
    if (t.includes('CLOTURE')) return 'CLOT';

    // Fallback
    return 'VOTE';
  };

  // 🦴 Loading State: Unified White Spinner
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white" />
        <span className="animate-pulse text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
          Need about a minute to load...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-3xl border border-dashed border-zinc-800">
        <p className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase italic">
          Error Loading Records
        </p>
      </div>
    );
  }

  const votes = response?.data || [];

  return (
    <div className="flex h-full max-h-[600px] flex-col overflow-hidden rounded-3xl border border-white/5 bg-zinc-950">
      {/* 🚀 Header: Matched to 2024 Contributions Style */}
      <div className="border-b border-white/5 bg-zinc-900/20 p-5">
        <h3 className="text-xs font-black tracking-[0.15em] text-zinc-400 uppercase">
          2024 Voting Record
        </h3>
      </div>

      <div className="scrollbar-hide flex-1 overflow-y-auto p-2">
        {votes.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase italic">
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
                  className="group flex items-center justify-between p-4 transition-colors hover:bg-white/[0.01]"
                >
                  <div className="flex flex-col gap-1 truncate pr-4">
                    {/* Title: Muted Zinc, highlight on hover */}
                    <span className="truncate text-[11px] font-bold text-zinc-400 transition-colors duration-200 group-hover:text-white">
                      {v.title}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* 🚀 Prefix Tag */}
                      <span
                        className={`text-[10px] font-black tracking-tighter uppercase ${
                          prefix === 'VOTE' ? 'text-zinc-600' : 'text-[#4A90E2]'
                        }`}
                      >
                        {prefix}
                      </span>
                      {/* Date: Monospace for technical feel */}
                      <span className="font-mono text-[9px] text-zinc-600 uppercase">
                        {v.date}
                      </span>
                    </div>
                  </div>

                  {/* 🎨 Neutral Status Badges: Muted Slate-Teal and Slate-Rose */}
                  <div
                    className={`rounded-md border px-3 py-1.5 text-[9px] font-black tracking-tighter uppercase transition-all ${
                      v.position === 'Yea'
                        ? 'border-teal-500/20 bg-slate-800/40 text-teal-500/90'
                        : 'border-rose-400/20 bg-slate-800/40 text-rose-400/80'
                    }`}
                  >
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
