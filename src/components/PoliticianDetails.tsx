import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import VoteRecord from './VoteRecord';
import { DonationChart } from './DonationChart';
import { Button } from './ui/button';
import { ArrowLeft, Landmark, Wallet } from 'lucide-react';

export function PoliticianDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: politician, isLoading, error } = useQuery({
    queryKey: ['politician', id],
    queryFn: () => id ? api.getPoliticianById(id) : null,
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xl font-medium animate-pulse text-muted-foreground font-mono uppercase">Initializing...</p>
      </div>
    );
  }

  if (error || !politician) {
    return <div className="p-12 text-center"><Button onClick={() => navigate('/')}>Return to Search</Button></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <nav className="py-2">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} /> Back to Results
        </Button>
      </nav>

      <header className="border-b-2 border-primary/10 pb-8">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase">{politician.full_name}</h1>
        <p className="text-2xl font-light text-muted-foreground">{politician.state} — {politician.chamber}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-6">
          <h2 className="text-xl font-bold uppercase tracking-tight border-b border-primary/20 pb-3 flex items-center gap-2"><Landmark size={20}/> Voting Record</h2>
          <div className="bg-card rounded-xl border-2 p-1"><VoteRecord icpsrId={politician.icpsr_id || 0} /></div>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-bold uppercase tracking-tight border-b border-primary/20 pb-3 flex items-center gap-2"><Wallet size={20}/> Top Funding (2024)</h2>
          <div className="bg-card rounded-xl border-2 p-6 min-h-[400px]"><DonationChart politicianId={politician.icpsr_id || 0} /></div>
        </section>
      </div>
    </div>
  );
}