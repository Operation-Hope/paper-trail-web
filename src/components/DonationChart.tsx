import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { LayoutGrid, Users } from 'lucide-react';
import { useState } from 'react';

export function DonationChart({ icpsr, politicianName }: { icpsr: number, politicianName: string }) {
  const [view, setView] = useState<'sectors' | 'donors'>('donors');

  const { data: donorData, isLoading: loadingDonors } = useQuery({
    queryKey: ['donations', icpsr],
    queryFn: () => api.getDonationSummary(icpsr, politicianName),
    enabled: !!icpsr,
  });

  const { data: sectorData, isLoading: loadingSectors } = useQuery({
    queryKey: ['sectors', icpsr],
    queryFn: () => api.getDonationBySector(icpsr, politicianName),
    enabled: !!icpsr && view === 'sectors',
  });

  const activeData = view === 'sectors' ? sectorData : donorData;
  const maxValue = activeData?.length ? Math.max(...activeData.map((d: any) => d.value)) : 1;

  if (loadingDonors || (loadingSectors && view === 'sectors')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 min-h-[300px]">
        <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
        <span className="text-zinc-500 text-[10px] font-bold tracking-[0.2em] uppercase animate-pulse">
          Loading..
        </span>
      </div>
    );
  }

  // Inside DonationChart.tsx

return (
  <div className="rounded-3xl border border-white/5 bg-zinc-950 overflow-hidden h-full flex flex-col">
    <div className="p-5 border-b border-white/5 bg-zinc-900/20 flex justify-between items-center">
      <h3 className="text-xs font-black uppercase tracking-[0.15em] text-zinc-400">
        2024 Contributions
      </h3>
      <div className="flex bg-black/50 rounded-xl p-1 border border-white/5">
        <button 
          onClick={() => setView('donors')} 
          className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg flex items-center gap-1.5 transition-all ${view === 'donors' ? 'bg-[#4A90E2] text-white' : 'text-zinc-600'}`}
        >
          <Users className="h-3.5 w-3.5" /> Top 5
        </button>
        <button 
          onClick={() => setView('sectors')} 
          className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg flex items-center gap-1.5 transition-all ${view === 'sectors' ? 'bg-[#4A90E2] text-white' : 'text-zinc-600'}`}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Sectors
        </button>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {activeData?.map((item: any, i: number) => (
        <div key={i} className="space-y-3 group">
          <div className="flex justify-between items-end text-[11px] font-black uppercase tracking-tight">
            <span className="text-zinc-400 group-hover:text-white">{item.name}</span>
            <span className="font-mono text-[#4A90E2]">${item.value.toLocaleString()}</span>
          </div>
          <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#4A90E2] rounded-full" 
              style={{ width: `${(item.value / maxValue) * 100}%` }} 
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);}