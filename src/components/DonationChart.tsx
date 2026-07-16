import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { LayoutGrid, Users } from 'lucide-react';
import { useState } from 'react';

export function DonationChart({
  icpsr,
  politicianName,
}: {
  icpsr: number;
  politicianName: string;
}) {
  const [view, setView] = useState<'sectors' | 'donors'>('donors');

  const { data: donorData, isLoading: loadingDonors } = useQuery({
    queryKey: ['donations', icpsr],
    // 🎯 FIX: Removed icpsr from the arguments so it maps strictly to (name)
    queryFn: () => api.getDonationSummary(politicianName),
    enabled: !!icpsr && !!politicianName,
  });

  const { data: sectorData, isLoading: loadingSectors } = useQuery({
    queryKey: ['sectors', icpsr],
    // 🎯 FIX: Removed icpsr from the arguments so it maps strictly to (name)
    queryFn: () => api.getDonationBySector(politicianName),
    enabled: !!icpsr && !!politicianName && view === 'sectors',
  });

  const activeData = view === 'sectors' ? sectorData : donorData;
  const maxValue = activeData?.length
    ? Math.max(...activeData.map((d) => d.value))
    : 1;

  if (loadingDonors || (loadingSectors && view === 'sectors')) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center space-y-4 py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white" />
        <span className="animate-pulse text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
          Need about a minute to load...
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/5 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-white/5 bg-zinc-900/20 p-5">
        <h3 className="text-xs font-black tracking-[0.15em] text-zinc-400 uppercase">
          2026 Cycle Contributions
        </h3>
        <div className="flex rounded-xl border border-white/5 bg-black/50 p-1">
          <button
            onClick={() => {
              setView('donors');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase transition-all ${view === 'donors' ? 'bg-[#4A90E2] text-white' : 'text-zinc-600'}`}
          >
            <Users className="h-3.5 w-3.5" /> Top 5
          </button>
          <button
            onClick={() => {
              setView('sectors');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase transition-all ${view === 'sectors' ? 'bg-[#4A90E2] text-white' : 'text-zinc-600'}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Sectors
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {activeData && activeData.length > 0 ? (
          activeData.map((item, i) => (
            <div key={i} className="group space-y-3">
              <div className="flex items-end justify-between text-[11px] font-black tracking-tight uppercase">
                <span className="text-zinc-400 group-hover:text-white">
                  {item.name}
                </span>
                <span className="font-mono text-[#4A90E2]">
                  ${item.value.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                <div
                  className="h-full rounded-full bg-[#4A90E2]"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-full items-center justify-center py-12 text-xs font-black tracking-wider text-zinc-600 uppercase">
            No donation data found
          </div>
        )}
      </div>
    </div>
  );
}
