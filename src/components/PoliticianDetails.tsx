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

  if (isLoading)
    return (
      <div className="animate-pulse p-20 text-center font-mono tracking-widest uppercase">
        Initializing Profile...
      </div>
    );
  if (!politician)
    return (
      <div className="p-20 text-center">
        <Button onClick={() => navigate('/')}>Return to Search</Button>
      </div>
    );

  return (
    <div className="animate-in fade-in mx-auto max-w-6xl space-y-8 px-4 py-10 pb-20 duration-700">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="text-muted-foreground hover:text-foreground gap-2 p-0"
      >
        <ArrowLeft size={18} /> Back
      </Button>

      <header className="border-primary/10 border-b-2 pb-8">
        <h1 className="text-5xl leading-none font-black tracking-tighter uppercase md:text-7xl">
          {politician.full_name}
        </h1>
        <p className="text-muted-foreground mt-2 font-mono text-2xl font-light">
          {politician.party} — {politician.state} {politician.district}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="space-y-6">
          <h2 className="border-primary/20 flex items-center gap-2 border-b pb-3 text-xl font-bold tracking-tight uppercase">
            <Landmark size={20} className="text-primary" /> Voting Record
          </h2>
          <div className="bg-card rounded-xl border-2 shadow-sm">
            <VoteRecord icpsrId={politician.icpsr_id} />
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="border-primary/20 flex items-center gap-2 border-b pb-3 text-xl font-bold tracking-tight uppercase">
            <Wallet size={20} className="text-primary" /> Top Funding Sources
            2024 Cycle
          </h2>
          <div className="bg-card min-h-[400px] rounded-xl border-2 p-6 shadow-sm">
            {/* Find where you display the politician info and add this */}
            {politician && (
              <DonationChart
                icpsrId={politician.icpsr_id}
                politicianName={politician.full_name}
              />
            )}{' '}
          </div>
        </section>
      </div>
    </div>
  );
}
