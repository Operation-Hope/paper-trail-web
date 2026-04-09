import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Progress } from './ui/progress';
import { Loader2, Info, ExternalLink, HelpCircle } from 'lucide-react'; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface DonorRecord {
  name: string;
  value: number;
  employer?: string;
  occupation?: string;
}

/**
 * 🕵️ HEURISTIC SECTOR ENGINE
 */
const determineSector = (donor: DonorRecord): string => {
  const name = (donor.name || '').toUpperCase();
  const emp = (donor.employer || '').toUpperCase();
  const occ = (donor.occupation || '').toUpperCase();
  const search = `${name} | ${emp} | ${occ}`;

  if (['NORTHROP', 'LOCKHEED', 'BOEING', 'RAYTHEON', 'RTX', 'L3HARRIS', 'GENERAL DYNAMICS', 'BAE', 'HONEYWELL', 'TEXTRON', 'DEFENSE', 'AEROSPACE', 'NAVISTAR', 'HUNTINGTON', 'PALANTIR', 'MISSILE', 'AEROJET', 'LEIDOS'].some(k => search.includes(k))) return 'Defense & Aerospace';
  if (['BANK', 'GOLDMAN', 'CITI', 'CHASE', 'JPMORGAN', 'CAPITAL', 'INVEST', 'INSURANCE', 'REALTOR', 'FINANCE', 'PROPERTY', 'BLACKROCK', 'WELLS FARGO', 'MORGAN STANLEY'].some(k => search.includes(k))) return 'Finance & Real Estate';
  if (['VICTORY FUND', 'LEADERSHIP', 'MAJORITY', 'DCCC', 'NRCC', 'DSCC', 'NRSC', 'CONGRESSIONAL', 'SENATORIAL', 'PAC TO THE FUTURE', 'COMMITTEE', 'REPUBLICAN', 'DEMOCRAT', 'ACTBLUE', 'WINRED'].some(k => search.includes(k))) return 'Leadership & Joint Fundraising';
  if (['AIPAC', 'CLUB FOR GROWTH', 'EMILY\'S LIST', 'NRA', 'PLANNED PARENTHOOD', 'FREEDOM', 'AMERICANS FOR'].some(k => search.includes(k))) return 'Ideological / Single-Issue';
  if (['EXXON', 'CHEVRON', 'SHELL', 'BP ', 'ENERGY', 'OIL', 'GAS', 'MINING', 'COAL', 'PIPELINE', 'CONOCO', 'VALERO', 'NEXTERA', 'SOUTHERN CO'].some(k => search.includes(k))) return 'Energy & Natural Resources';
  if (['PFIZER', 'PHARMA', 'AETNA', 'HUMANA', 'BLUE CROSS', 'HOSPITAL', 'MEDICAL', 'HEALTHCARE', 'PHYSICIAN', 'MERCK', 'ELI LILLY', 'MODERNA'].some(k => search.includes(k))) return 'Healthcare & Pharma';
  if (['GOOGLE', 'ALPHABET', 'AMAZON', 'META', 'APPLE', 'TECH', 'COMCAST', 'TELECOM', 'SOFTWARE', 'MICROSOFT', 'AT&T', 'VERIZON'].some(k => search.includes(k))) return 'Technology & Comm';

  return 'Unclassified / Other';
};

/**
 * ⚖️ CONSTITUENCY CONTEXT MAPPING
 * Provides non-financial reasons for sector alignment based on state economic profiles.
 */
const getConstituencyNote = (state: string, sector: string) => {
  const mapping: Record<string, Record<string, string>> = {
    'AL': { 'Defense & Aerospace': 'State houses Redstone Arsenal & major aerospace hubs.' },
    'NY': { 'Finance & Real Estate': 'State is a global hub for financial services.' },
    'CA': { 'Technology & Comm': 'State is a primary driver of the global tech economy.' },
    'TX': { 'Energy & Natural Resources': 'State is a leading producer of oil and natural gas.' },
  };
  return mapping[state.toUpperCase()]?.[sector] || null;
};

export function DonationChart({ icpsrId, politicianName, state }: { icpsrId: number, politicianName: string, state: string }) {
  const [view, setView] = useState<'donors' | 'sectors'>('donors');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['donations', icpsrId, state],
    queryFn: () => api.getDonationSummary(icpsrId, politicianName, state),
    enabled: !!icpsrId && !!state,
  });

  const sectorData = useMemo(() => {
    if (!data) return [];
    const totals: Record<string, number> = {};
    data.forEach(donor => {
      const sector = determineSector(donor);
      totals[sector] = (totals[sector] || 0) + donor.value;
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); 
  }, [data]);

  const activeData = (view === 'donors' ? data?.slice(0, 5) : sectorData) || [];

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[400px] space-y-6">
      <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Scanning DIME Database</p>
    </div>
  );

  if (isError || !data || data.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[400px] border border-dashed rounded-xl border-primary/10">
      <p className="text-[10px] font-black uppercase opacity-20">No Organizational Data Available</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div className="inline-flex rounded-lg bg-secondary/30 p-1 border border-primary/5 backdrop-blur-sm">
          <button
            onClick={() => setView('donors')}
            className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
              view === 'donors' ? 'bg-primary text-primary-foreground rounded-md shadow-md' : 'text-muted-foreground opacity-60'
            }`}
          >
            Top Donors
          </button>
          <button
            onClick={() => setView('sectors')}
            className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
              view === 'sectors' ? 'bg-primary text-primary-foreground rounded-md shadow-md' : 'text-muted-foreground opacity-60'
            }`}
          >
            Financial Alignment
          </button>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="outline-none">
                <HelpCircle className="h-4 w-4 opacity-20 hover:opacity-100 transition-opacity" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[250px] text-[10px] leading-relaxed">
              Sectors are mapped via a standardized keyword engine. "Unclassified" primarily represents individual grassroots donors (ActBlue/WinRed) and non-industrial entities.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-6">
        {activeData.map((item: any) => {
          const constituencyNote = view === 'sectors' ? getConstituencyNote(state, item.name) : null;
          
          return (
            <div key={item.name} className="space-y-1.5">
              <div className="flex justify-between items-end gap-4">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold uppercase tracking-tight text-foreground/70 truncate">
                    {item.name}
                  </span>
                  {constituencyNote && (
                    <span className="text-[9px] font-medium text-primary/50 italic leading-none">
                      {constituencyNote}
                    </span>
                  )}
                </div>
                <span className="font-mono text-lg font-black text-primary tabular-nums">
                  ${item.value.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={activeData[0] ? (item.value / activeData[0].value) * 100 : 0} 
                className="h-1.5 rounded-none bg-primary/5"
              />
            </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-primary/5 space-y-3">
        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-tighter opacity-30">
          <div className="flex items-center gap-2">
            <Info className="h-3 w-3" />
            <span>2024 Cycle • Organizational Funding Profile</span>
          </div>
          <a 
            href="https://data.stanford.edu/dime" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <span>DIME Data Source</span>
            <ExternalLink className="h-2 w-2" />
          </a>
        </div>
      </div>
    </div>
  );
}