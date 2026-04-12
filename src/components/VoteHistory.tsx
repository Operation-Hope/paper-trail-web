import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function VoteHistory({ icpsr }: { icpsr: number }) {
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['votes', icpsr],
    queryFn: () => api.getVoteHistory(icpsr),
    enabled: !!icpsr,
  });

  if (!icpsr) return <div className="text-zinc-600 italic text-sm">Waiting for profile ID...</div>;
  if (isLoading) return <div className="h-64 bg-zinc-900/20 animate-pulse rounded-3xl" />;
  if (isError) return <div className="text-red-500/50 italic text-sm">Error connecting to database.</div>;

  const votes = response?.data || [];

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-black italic uppercase text-white">
        Voting <span className="text-[#4A90E2]">Record</span>
      </h3>
      {votes.length === 0 ? (
        <div className="p-10 border border-dashed border-zinc-800 rounded-3xl text-center">
          <p className="text-zinc-600 text-sm italic">No records found for ID: {icpsr}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {votes.map((v: any) => (
            <div key={`${v.id}-${v.date}`} className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex justify-between items-center group hover:border-[#4A90E2]/40 transition-all">
              <div className="flex flex-col gap-1 truncate pr-4">
                <span className="text-sm font-bold text-zinc-300 truncate group-hover:text-white">{v.title}</span>
                <span className="text-[9px] font-mono text-zinc-600 uppercase">{v.date} — Roll #{v.id}</span>
              </div>
              <div className={`px-4 py-2 rounded-lg font-black text-xs uppercase shrink-0 ${
                v.position === 'Yea' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
              }`}>
                {v.position}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}