import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Progress } from './ui/progress';

export function DonationChart({ icpsrId, politicianName }: { icpsrId: number, politicianName: string }) {
  const [percent, setPercent] = useState(0);

  // 🕵️ HEARTBEAT LOG 1: Is the component mounting?
  console.log("💓 DonationChart Mounted. Props:", { icpsrId, politicianName });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['donations', icpsrId, politicianName],
    queryFn: () => {
      // 🕵️ HEARTBEAT LOG 2: Is the query actually starting?
      console.log("🚀 Starting api.getDonationSummary for:", politicianName);
      return api.getDonationSummary(icpsrId, politicianName, (p) => setPercent(p));
    },
    // If either of these is missing, the query will NEVER run.
    enabled: !!icpsrId && !!politicianName,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] space-y-4 px-10">
        <Progress value={percent} />
        {/* Slightly larger loading text for readability */}
        <p className="text-xs font-mono uppercase animate-pulse">Mapping Funding Flow...</p>
      </div>
    );
  }

  if (isError) {
    console.error("❌ React Query Error:", error);
    return <div className="p-6 text-red-500 font-bold">Error loading 2024 data.</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed rounded-xl border-primary/10">
        <p className="text-xs font-black uppercase opacity-40 text-center">
          No itemized 2024 PAC records found
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {data.map((donor) => (
        <div key={donor.name} className="space-y-2">
          <div className="flex justify-between items-end">
            {/* Donor Name: Increased from 10px to base (16px) */}
            <span className="text-base font-bold uppercase tracking-tight text-foreground/80">
              {donor.name}
            </span>
            
            {/* Amount: Increased to XL with tabular-nums for perfect vertical alignment */}
            <span className="font-mono text-xl font-black text-primary tabular-nums">
              ${donor.value.toLocaleString()}
            </span>
          </div>
          
          {/* Progress Bar height slightly increased to match larger text weight */}
          <Progress 
            value={(donor.value / data[0].value) * 100} 
            className="h-2"
          />
        </div>
      ))}
    </div>
  );
}