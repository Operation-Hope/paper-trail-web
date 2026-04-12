import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Politician } from '../types/api'; 
import { DonationChart } from './DonationChart';
import { VoteHistory } from './VoteHistory';
import { Loader2, MapPin, GraduationCap, Building2 } from 'lucide-react';
import { useEffect } from 'react';

export default function PoliticianDetails() {
  const { id } = useParams<{ id: string }>();

  const { data: politician, isLoading: loadingMeta, isError } = useQuery<Politician>({
    queryKey: ['politician', id],
    queryFn: async () => {
      const data = await api.getPoliticianById(id || '');
      if (!data) throw new Error("Politician not found");
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (politician?.name) {
      document.title = `Project Paper Trail | ${politician.name}`;
    }
  }, [politician?.name]);

  if (loadingMeta) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-white" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white">
        Loading...
      </p>
    </div>
  );

  if (isError || !politician) return (
    <div className="p-20 text-center space-y-4">
      <p className="opacity-40 uppercase font-black text-2xl tracking-tighter text-white">Politician Not Found</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700">
      <header className="p-10 rounded-3xl border border-primary/5 bg-card shadow-sm">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              {politician.party} • {politician.role}
            </span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter leading-none">{politician.name}</h1>
          <div className="flex flex-wrap items-center gap-8 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary opacity-70" /><span>{politician.state}</span></div>
            <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary opacity-70" /><span>District {politician.district}</span></div>
            <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary opacity-70" /><span>ICPSR: {politician.icpsr}</span></div>
          </div>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-5 h-full">
          <DonationChart icpsrId={politician.icpsr} politicianName={politician.name} state={politician.state} />
        </section>
        <section className="lg:col-span-7 h-full">
          <VoteHistory icpsrId={politician.icpsr} />
        </section>
      </div>
    </div>
  );
}