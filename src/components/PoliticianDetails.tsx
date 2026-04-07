import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import VoteRecord from './VoteRecord';
import { DonationChart } from './DonationChart';
import { Button } from './ui/button';
import { ArrowLeft, Landmark, Wallet } from 'lucide-react';

export function PoliticianDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: politician, isLoading } = useQuery({
    queryKey: ['politician', id],
    queryFn: () => (id ? api.getPoliticianById(id) : null),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-20 text-center animate-pulse font-mono uppercase tracking-widest">Initializing Profile...</div>;
  if (!politician) return <div className="p-20 text-center"><Button onClick={() => navigate('/')}>Return to Search</Button></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-10 px-4 animate-in fade-in duration-700 pb-20">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 p-0 text-muted-foreground hover:text-foreground">
        <ArrowLeft size={18} /> Back
      </Button>

      <header className="border-b-2 border-primary/10 pb-8">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">{politician.full_name}</h1>
        <p className="text-2xl font-light text-muted-foreground mt-2 font-mono">
          {politician.party} — {politician.state} {politician.district}
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-10">
        <section className="space-y-6">
          <h2 className="text-xl font-bold uppercase tracking-tight border-b border-primary/20 pb-3 flex items-center gap-2">
            <Landmark size={20} className="text-primary" /> Voting Record
          </h2>
          <div className="bg-card rounded-xl border-2 shadow-sm">
            <VoteRecord icpsrId={politician.icpsr_id} />
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-bold uppercase tracking-tight border-b border-primary/20 pb-3 flex items-center gap-2">
            <Wallet size={20} className="text-primary" /> Top Funding Sources
          </h2>
          <div className="bg-card rounded-xl border-2 p-6 min-h-[400px] shadow-sm">
{/* Find where you display the politician info and add this */}
{politician && (
  <DonationChart 
    icpsrId={politician.icpsr_id} 
    politicianName={politician.full_name} 
  />
)}          </div>
        </section>
      </div>
    </div>
  );
}