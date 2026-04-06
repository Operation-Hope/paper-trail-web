import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Wallet, AlertCircle } from 'lucide-react';

interface DonationChartProps { politicianId: number; }

export function DonationChart({ politicianId }: DonationChartProps) {
  const { data: donations, isLoading, error } = useQuery({
    queryKey: ['donations', politicianId],
    queryFn: () => politicianId ? api.getDonationSummary(politicianId) : [],
    enabled: !!politicianId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Loading Top Donors...</p>
      </div>
    );
  }

  if (error || !donations || donations.length === 0) {
    return <div className="flex flex-col items-center justify-center h-64 text-center opacity-50"><AlertCircle className="mb-2"/><p className="text-xs uppercase font-bold">No 2024 Data Found</p></div>;
  }

  const maxAmount = Math.max(...donations.map(d => d.value));

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {donations.map((donor, index) => (
        <div key={index} className="group">
          <div className="flex justify-between text-xs font-black uppercase mb-1">
            <span>{donor.name}</span>
            <span className="text-primary">${donor.value.toLocaleString()}</span>
          </div>
          <div className="h-3 w-full bg-secondary/30 rounded-full overflow-hidden border">
            <div className="h-full bg-primary" style={{ width: `${(donor.value / maxAmount) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}