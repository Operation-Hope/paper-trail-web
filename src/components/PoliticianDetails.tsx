import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Politician } from '../types/api';
import { DonationChart } from './DonationChart';
import { VoteHistory } from './VoteHistory';
import { CorrelatedTimeline } from '../components/CorrelatedTimeline'; // 🚀 Added import
import { Loader2, MapPin, GraduationCap, Building2 } from 'lucide-react';
import { useEffect } from 'react';

export default function PoliticianDetails() {
  const { id } = useParams<{ id: string }>();

  const {
    data: politician,
    isLoading: loadingMeta,
    isError,
  } = useQuery<Politician>({
    queryKey: ['politician', id],
    queryFn: async () => {
      const data = await api.getPoliticianById(id || '');
      if (!data) throw new Error('Politician not found');
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (politician?.name) {
      document.title = `Project Paper Trail | ${politician.name}`;
    }
  }, [politician?.name]);

  if (loadingMeta)
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="text-[10px] font-black tracking-[0.4em] text-white uppercase">
          Need about a minute to load...
        </p>
      </div>
    );

  if (isError || !politician)
    return (
      <div className="space-y-4 p-20 text-center">
        <p className="text-2xl font-black tracking-tighter text-white uppercase opacity-40">
          Politician Not Found
        </p>
      </div>
    );

  return (
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-8 px-4 py-8 duration-700">
      <header className="border-primary/5 bg-card rounded-3xl border p-10 shadow-sm">
        <div className="space-y-6">
          <div className="bg-primary/5 border-primary/10 inline-flex items-center gap-3 rounded-full border px-4 py-1.5">
            <span className="text-primary text-[10px] font-black tracking-[0.2em] uppercase">
              {politician.party} • {politician.role}
            </span>
          </div>
          <h1 className="text-6xl leading-none font-black tracking-tighter">
            {politician.name}
          </h1>
          <div className="text-muted-foreground/60 flex flex-wrap items-center gap-8 text-[11px] font-black tracking-widest uppercase">
            <div className="flex items-center gap-2">
              <MapPin className="text-primary h-4 w-4 opacity-70" />
              <span>{politician.state}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="text-primary h-4 w-4 opacity-70" />
              <span>District {politician.district}</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="text-primary h-4 w-4 opacity-70" />
              <span>ICPSR: {politician.icpsr}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Structured Max-Width Layout Area */}
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4">
        {/* Analytics Section Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DonationChart
            icpsr={politician.icpsr}
            politicianName={politician.full_name}
          />
          <VoteHistory icpsr={politician.icpsr} />
        </div>

        {/* 🚀 NEW: Vote-Donation Proximity Tracker Flow */}
        <CorrelatedTimeline
          icpsr={politician.icpsr}
          politicianName={politician.full_name}
        />
      </div>
    </div>
  );
}
