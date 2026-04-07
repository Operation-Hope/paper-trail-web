import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Loader2 } from 'lucide-react';

export function DonationChart({ politicianId }: { politicianId: number }) {
  const { data: donations, isLoading } = useQuery({
    queryKey: ['donations', politicianId],
    queryFn: () => api.getDonationSummary(politicianId),
    enabled: !!politicianId,
  });

  if (isLoading) return <Loader2 className="mx-auto my-20 animate-spin" />;
  if (!donations || donations.length === 0)
    return <div className="py-20 text-center opacity-50">No Data</div>;

  const max = Math.max(...donations.map((d) => d.value));

  return (
    <div className="space-y-4">
      {donations.map((donor, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-[10px] font-black tracking-tighter uppercase">
            <span>{donor.name}</span>
            <span className="text-primary">
              ${donor.value.toLocaleString()}
            </span>
          </div>
          <div className="bg-secondary/30 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-all duration-1000"
              style={{ width: `${(donor.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
