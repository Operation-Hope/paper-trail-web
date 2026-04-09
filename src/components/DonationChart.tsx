// components/DonationChart.tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Progress } from './ui/progress';
import { Loader2 } from 'lucide-react'; 

interface DonorRecord {
  name: string;
  value: number;
  employer?: string;
  occupation?: string;
}

const determineSector = (donor: DonorRecord): string => {
  const name = (donor.name || '').toUpperCase();
  const emp = (donor.employer || '').toUpperCase();
  const occ = (donor.occupation || '').toUpperCase();
  const search = `${name} | ${emp} | ${occ}`;

  // 🛡️ DEFENSE (Chairman Mike Rogers' primary specialty)
  if (['NORTHROP', 'LOCKHEED', 'BOEING', 'RAYTHEON', 'RTX', 'L3HARRIS', 'GENERAL DYNAMICS', 'BAE', 'HONEYWELL', 'TEXTRON', 'DEFENSE', 'AEROSPACE', 'NAVISTAR', 'HUNTINGTON', 'PALANTIR', 'MISSILE', 'AEROJET', 'LEIDOS', 'ARMED SERVICES'].some(k => search.includes(k))) return 'Defense & Aerospace';
  
  // 💰 FINANCE / REAL ESTATE (Ted Cruz specialty)
  if (['BANK', 'GOLDMAN', 'CITI', 'CHASE', 'JPMORGAN', 'CAPITAL', 'INVEST', 'INSURANCE', 'REALTOR', 'FINANCE', 'PROPERTY', 'BLACKROCK', 'WELLS FARGO', 'MORGAN STANLEY', 'PRUDENTIAL', 'APOLLO', 'VISA', 'MASTERCARD'].some(k => search.includes(k))) return 'Finance & Real Estate';
  
  // ⚡ ENERGY & RESOURCES
  if (['EXXON', 'CHEVRON', 'SHELL', 'BP ', 'ENERGY', 'OIL', 'GAS', 'MINING', 'COAL', 'PIPELINE', 'CONOCO', 'VALERO', 'NEXTERA', 'DUKE', 'SOUTHERN CO', 'EDISON', 'KOCH'].some(k => search.includes(k))) return 'Energy & Natural Resources';

  // 🏥 HEALTHCARE & PHARMA
  if (['PFIZER', 'PHARMA', 'AETNA', 'HUMANA', 'BLUE CROSS', 'HOSPITAL', 'MEDICAL', 'HEALTHCARE', 'PHYSICIAN', 'MERCK', 'ELI LILLY', 'MODERNA', 'CVS', 'AMGEN', 'UNITEDHEALTH', 'CIGNA', 'ABBVIE'].some(k => search.includes(k))) return 'Healthcare & Pharma';

  // 🏛️ LEADERSHIP & POLITICS (Pass-throughs)
  if (['VICTORY FUND', 'LEADERSHIP', 'MAJORITY', 'DCCC', 'NRCC', 'DSCC', 'NRSC', 'CONGRESSIONAL', 'SENATORIAL', 'PAC TO THE FUTURE', 'COMMITTEE', 'REPUBLICAN', 'DEMOCRAT', 'ACTBLUE', 'WINRED'].some(k => search.includes(k))) return 'Leadership & Joint Fundraising';

  // 🛰️ TECH & COMMS
  if (['GOOGLE', 'ALPHABET', 'AMAZON', 'META', 'APPLE', 'TECH', 'COMCAST', 'TELECOM', 'SOFTWARE', 'MICROSOFT', 'AT&T', 'VERIZON', 'DISNEY', 'NVIDIA', 'INTEL'].some(k => search.includes(k))) return 'Technology & Comm';

  return 'Unclassified / Other';
};

export function DonationChart({ icpsrId, politicianName, state }: { icpsrId: number, politicianName: string, state: string }) {
  const [percent, setPercent] = useState(0);
  const [view, setView] = useState<'donors' | 'sectors'>('donors');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['donations', icpsrId, state],
    queryFn: () => api.getDonationSummary(icpsrId, politicianName, state, (p: number) => setPercent(p)),
    enabled: !!icpsrId && !!state,
  });

  const sectorData = useMemo(() => {
    if (!data) return [];
    const totals: Record<string, number> = {};
    data.forEach(donor => {
      const sector = determineSector(donor);
      totals[sector] = (totals[sector] || 0) + donor.value;
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5); 
  }, [data]);

  const activeData = (view === 'donors' ? data?.slice(0, 5) : sectorData) || [];

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[350px] space-y-6">
      <Loader2 className="h-12 w-12 animate-spin text-primary stroke-[3px]" />
      <div className="text-center space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Scanning Paper Trails</p>
        <p className="text-[9px] font-mono opacity-40 uppercase">Aggregating 2024 DIME Committees...</p>
      </div>
    </div>
  );

  if (isError || !data || data.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[350px] border-2 border-dashed rounded-xl border-primary/5">
      <p className="text-[10px] font-black uppercase opacity-20">No Organizational Data Found</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-center mb-2">
        <div className="inline-flex rounded-lg bg-secondary/30 p-1 border border-primary/5 backdrop-blur-sm">
          {(['donors', 'sectors'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                view === v ? 'bg-primary text-primary-foreground rounded-md shadow-lg scale-105' : 'text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100'
              }`}
            >
              {v === 'donors' ? 'Top 5 Donors' : 'Sector Impact'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {activeData.map((item: any) => (
          <div key={item.name} className="group space-y-2">
            <div className="flex justify-between items-end gap-4">
              <span className="text-sm font-bold uppercase tracking-tight text-foreground/80 truncate group-hover:text-primary transition-colors" title={item.name}>
                {item.name}
              </span>
              <span className="font-mono text-xl font-black text-primary tabular-nums shrink-0">
                ${item.value.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={activeData[0] && activeData[0].value > 0 ? (item.value / activeData[0].value) * 100 : 0} 
              className="h-2.5 rounded-full bg-primary/10 transition-all duration-500"
            />
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-primary/5">
        <p className="text-[9px] text-center uppercase opacity-30 font-mono flex items-center justify-center gap-2">
          <span>2024 Election Cycle</span>
          <span className="w-1 h-1 rounded-full bg-primary/40" />
          <span>DIME Unified Aggregation</span>
        </p>
      </div>
    </div>
  );
}