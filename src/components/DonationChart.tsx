import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Loader2, LayoutGrid, Users } from 'lucide-react';
import { useState } from 'react';

export function DonationChart({ icpsrId, politicianName, state }: any) {
  const [view, setView] = useState<'sectors' | 'donors'>('donors');

  const { data: donorData, isLoading: loadingDonors } = useQuery({
    queryKey: ['donations', icpsrId],
    queryFn: () => api.getDonationSummary(icpsrId, politicianName, state),
    enabled: !!icpsrId,
  });

  const { data: sectorData, isLoading: loadingSectors } = useQuery({
    queryKey: ['sectors', icpsrId],
    queryFn: () => api.getDonationBySector(icpsrId, politicianName, state),
    enabled: !!icpsrId && view === 'sectors',
  });

  const activeData = view === 'sectors' ? sectorData : donorData;
  const maxValue = activeData?.length ? Math.max(...activeData.map((d: any) => d.value)) : 1;

  if (loadingDonors || loadingSectors) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4 h-full min-h-[300px]">
      <Loader2 className="h-10 w-10 animate-spin text-white" />
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Loading...</p>
    </div>
  );

  return (
    <div className="rounded-xl border border-primary/5 bg-card overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-primary/5 bg-secondary/10 flex justify-between items-center">
        <h3 className="text-xs font-black uppercase tracking-widest opacity-70">Contributions</h3>
        <div className="flex bg-background/50 rounded-lg p-1 border border-primary/5">
          <button onClick={() => setView('donors')} className={`px-3 py-1 text-[9px] font-black uppercase rounded-md flex items-center gap-1.5 transition-all ${view === 'donors' ? 'bg-primary text-primary-foreground' : 'opacity-40'}`}>
            <Users className="h-3 w-3" /> Top 5
          </button>
          <button onClick={() => setView('sectors')} className={`px-3 py-1 text-[9px] font-black uppercase rounded-md flex items-center gap-1.5 transition-all ${view === 'sectors' ? 'bg-primary text-primary-foreground' : 'opacity-40'}`}>
            <LayoutGrid className="h-3 w-3" /> Sectors
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeData?.map((item: any, i: number) => (
          <div key={i} className="space-y-2 group">
            <div className="flex justify-between items-end text-[10px] font-black uppercase">
              <span className="truncate max-w-[70%] group-hover:text-primary transition-colors">{item.name}</span>
              <span className="font-mono text-primary">${item.value.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full transition-all duration-1000" style={{ width: `${(item.value / maxValue) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}