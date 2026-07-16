import { useState, useRef, useCallback, useLayoutEffect } from 'react';
import {
  Users,
  Briefcase,
  DollarSign,
  EyeOff,
  Building,
  ShieldAlert,
  X,
} from 'lucide-react';

// --- DATA MODEL ---
const moneyFlows = [
  {
    id: 'direct',
    title: 'Direct Contributions',
    icon: Users,
    sources: ['Everyday Citizens', 'Standard PACs'],
    destinations: ['Candidate Campaign', 'Party Committees'],
    risk: 'Medium',
    disclosure: 'Yes',
    limits: 'Strict Limits',
    definition:
      'Money donated directly by private individuals or standard PACs to a campaign.',
    example: "A donor giving $3,300 directly to a House candidate's campaign.",
    flowDescription:
      'The most transparent way money enters politics. Risk is lower due to strict limits.',
  },
  {
    id: 'bundling',
    title: 'Lobbyist Bundling',
    icon: Briefcase,
    sources: ['Wealthy Individuals', 'Corporate Executives'],
    destinations: ['Candidate Campaign'],
    risk: 'High',
    disclosure: 'Yes (Bundler disclosed)',
    limits: 'No limit on total bundle',
    definition:
      'When a lobbyist gathers many individual checks and hands them over as one massive "bundle".',
    example:
      'A pharma lobbyist collects $500,000 in separate checks for a Senator.',
    flowDescription:
      'Bundlers get credit for delivering massive sums, buying significant influence.',
  },
  {
    id: 'super_pac',
    title: 'Super PACs',
    icon: DollarSign,
    sources: ['Mega-Donors', 'Corporations', 'Unions'],
    destinations: ['Attack Ads', 'Digital Influence'],
    risk: 'EXTREME',
    disclosure: 'Yes (But often Dark Money funded)',
    limits: 'No Limits',
    definition:
      'Committees that can raise/spend unlimited amounts if they don\'t "coordinate" with the candidate.',
    example: 'A Super PAC spends $10 million on ads attacking a rival.',
    flowDescription:
      'Allows single billionaires to fund entire shadow campaigns.',
  },
  {
    id: 'dark_money',
    title: 'Dark Money',
    icon: EyeOff,
    sources: ['Anonymous Donors', 'Shell LLCs'],
    destinations: ['Issue Ads', 'Super PACs'],
    risk: 'EXTREME',
    disclosure: 'No (Donors hidden)',
    limits: 'No Limits',
    definition:
      'Nonprofits or shell companies that spend money without disclosing the original donor.',
    example: '"Patriot Partners LLC" spends $5M without disclosing donors.',
    flowDescription:
      'Makes it impossible to know who is really buying influence.',
  },
  {
    id: 'leadership_pac',
    title: 'Leadership PACs',
    icon: Building,
    sources: ['Other Politicians', 'PACs'],
    destinations: ['Allied Politicians', 'Loyalty Building'],
    risk: 'High',
    disclosure: 'Yes',
    limits: 'Highly Flexible',
    definition:
      'Personal PACs set up by politicians to fund allies and buy loyalty within the party.',
    example:
      'A Senator uses their PAC to fund junior lawmakers to secure leadership votes.',
    flowDescription:
      'Acts as a legal slush fund for political power brokering.',
  },
  {
    id: 'illicit',
    title: 'Illicit Money',
    icon: ShieldAlert,
    sources: ['Foreign Nationals', 'Criminal Actors'],
    destinations: ['Straw Donors', 'Hidden Ads'],
    risk: 'EXTREME',
    disclosure: 'Hidden / Illegal',
    limits: 'Illegal',
    definition:
      'Money funneled illegally into U.S. elections using fake names (straw donors), foreign entities, or untraceable transactions.',
    example: 'A foreign billionaire funnels $1M through a shell LLC.',
    flowDescription:
      'Loopholes in corporate transparency allow illicit money to quietly influence elections.',
  },
];

interface Point {
  x: number;
  y: number;
}

interface Line {
  id: string;
  from: Point;
  to: Point;
  vehicleId: string;
}

const RiskBadge = ({ risk }: { risk: string }) => {
  const styles: Record<string, string> = {
    Medium: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
    High: 'bg-orange-900/30 text-orange-400 border-orange-800',
    EXTREME:
      'bg-purple-900/30 text-purple-400 border-purple-800 animate-pulse font-bold',
  };
  return (
    <span
      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] tracking-tighter uppercase ${styles[risk] || ''}`}
    >
      {risk} Risk
    </span>
  );
};

export default function MoneyFlowchart() {
  const [activeModalId, setActiveModalId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLElement | undefined>>({});
  const [lines, setLines] = useState<Line[]>([]);

  const activeFlow = moneyFlows.find((f) => f.id === activeModalId);

  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: Line[] = [];
    const getCoords = (id: string, side: 'left' | 'right'): Point | null => {
      const el = nodeRefs.current[id];
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect[side === 'left' ? 'left' : 'right'] - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top,
      };
    };

    moneyFlows.forEach((flow) => {
      const vId = `v-${flow.id}`,
        vLeft = getCoords(vId, 'left'),
        vRight = getCoords(vId, 'right');
      flow.sources.forEach((s) => {
        const sId = `s-${flow.id}-${s}`,
          sCoords = getCoords(sId, 'right');
        if (sCoords && vLeft)
          newLines.push({
            id: `${sId}-${vId}`,
            from: sCoords,
            to: vLeft,
            vehicleId: flow.id,
          });
      });
      flow.destinations.forEach((d) => {
        const dId = `d-${flow.id}-${d}`,
          dCoords = getCoords(dId, 'left');
        if (vRight && dCoords)
          newLines.push({
            id: `${vId}-${dId}`,
            from: vRight,
            to: dCoords,
            vehicleId: flow.id,
          });
      });
    });
    setLines(newLines);
  }, []);

  useLayoutEffect(() => {
    const timer = setTimeout(updateLines, 100);
    window.addEventListener('resize', updateLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateLines);
    };
  }, [updateLines, hoveredId]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#4A90E2]/30">
      <main className="min-h-[calc(100vh-80px)] bg-zinc-950/50 pt-16">
        {/* Hero Slogan - Kept within padding */}
        <div className="mx-auto mb-24 max-w-6xl space-y-4 px-4 text-center">
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase md:text-5xl">
            LEARN HOW MONEY <span className="text-zinc-500 italic">FLOWS</span>{' '}
            IN POLITICS
          </h2>
          <div className="mx-auto h-1 w-24 rounded-full bg-[#4A90E2]" />
        </div>

        {/* 🚀 FULL WIDTH STICKY HEADER */}
        <div className="sticky top-20 z-50 w-full border-b border-white/5 bg-black/95 py-8 backdrop-blur-xl">
          <div className="mx-auto grid max-w-6xl grid-cols-3 px-4">
            <h3 className="text-left text-lg font-black tracking-widest text-zinc-600 uppercase">
              Sources
            </h3>
            <h3 className="text-center text-lg font-black tracking-widest text-[#4A90E2] uppercase">
              Money Vehicles
            </h3>
            <h3 className="text-right text-lg font-black tracking-widest text-zinc-600 uppercase">
              Impacts
            </h3>
          </div>
        </div>

        {/* Flowchart Container */}
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div
            className="relative rounded-3xl border border-white/5 bg-zinc-950/50 p-12"
            ref={containerRef}
          >
            <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full">
              {lines.map((line) => (
                <path
                  key={line.id}
                  d={`M ${line.from.x} ${line.from.y} C ${line.from.x + 60} ${line.from.y}, ${line.to.x - 60} ${line.to.y}, ${line.to.x} ${line.to.y}`}
                  fill="none"
                  className={`transition-all duration-500 ${hoveredId === line.vehicleId ? 'stroke-[#4A90E2] stroke-[3] opacity-100 drop-shadow-[0_0_8px_rgba(74,144,226,0.8)]' : 'stroke-transparent opacity-0'}`}
                />
              ))}
            </svg>

            <div className="relative z-10 space-y-12">
              {moneyFlows.map((flow) => (
                <div
                  key={flow.id}
                  className="relative flex min-h-[140px] items-center justify-center"
                  onMouseEnter={() => {
                    setHoveredId(flow.id);
                  }}
                  onMouseLeave={() => {
                    setHoveredId(null);
                  }}
                >
                  <div
                    className={`absolute left-0 flex transform flex-col items-end gap-3 transition-all duration-300 ${hoveredId === flow.id ? 'translate-x-0 scale-100 opacity-100' : 'pointer-events-none translate-x-8 scale-90 opacity-0'}`}
                  >
                    {flow.sources.map((s) => (
                      <div
                        key={s}
                        ref={(el) => {
                          if (el) nodeRefs.current[`s-${flow.id}-${s}`] = el;
                        }}
                        className="rounded-xl border border-white/10 bg-zinc-900 px-5 py-2.5 text-sm font-black tracking-tight whitespace-nowrap text-zinc-300 uppercase shadow-2xl"
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                  <div
                    ref={(el) => {
                      if (el) nodeRefs.current[`v-${flow.id}`] = el;
                    }}
                    onClick={() => {
                      setActiveModalId(flow.id);
                    }}
                    className={`z-20 flex w-80 cursor-pointer flex-col items-center gap-4 rounded-2xl border p-7 transition-all duration-300 ${hoveredId === flow.id ? 'scale-110 border-[#4A90E2] bg-zinc-900 shadow-[0_0_50px_rgba(74,144,226,0.2)]' : 'border-white/5 bg-zinc-950 opacity-30 grayscale'}`}
                  >
                    <span className="text-center text-sm leading-tight font-black tracking-tight text-white uppercase">
                      {flow.title}
                    </span>
                    <RiskBadge risk={flow.risk} />
                  </div>
                  <div
                    className={`absolute right-0 flex transform flex-col items-start gap-3 transition-all duration-300 ${hoveredId === flow.id ? 'translate-x-0 scale-100 opacity-100' : 'pointer-events-none -translate-x-8 scale-90 opacity-0'}`}
                  >
                    {flow.destinations.map((d) => (
                      <div
                        key={d}
                        ref={(el) => {
                          if (el) nodeRefs.current[`d-${flow.id}-${d}`] = el;
                        }}
                        className="rounded-xl border border-white/10 bg-zinc-900 px-5 py-2.5 text-sm font-black tracking-tight whitespace-nowrap text-zinc-300 uppercase shadow-2xl"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {activeModalId && activeFlow && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-md"
          onClick={() => {
            setActiveModalId(null);
          }}
        >
          <div
            className="w-full max-w-2xl space-y-6 rounded-3xl border border-white/10 bg-zinc-950 p-10 shadow-2xl"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl border border-[#4A90E2]/20 bg-[#4A90E2]/10 p-3 text-[#4A90E2]">
                    <activeFlow.icon size={28} />
                  </div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase">
                    {activeFlow.title}
                  </h2>
                </div>
                <RiskBadge risk={activeFlow.risk} />
              </div>
              <button
                onClick={() => {
                  setActiveModalId(null);
                }}
                className="rounded-full border border-white/5 p-2 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-6">
              <p className="text-xl leading-relaxed font-bold text-zinc-200">
                {activeFlow.definition}
              </p>
              <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 text-sm text-zinc-400 italic">
                &quot;Example: {activeFlow.example}&quot;
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 text-[11px] font-black tracking-widest uppercase">
              <div className="rounded-2xl border border-white/5 bg-zinc-900 p-5">
                <span className="mb-2 block text-[#4A90E2]">
                  Public Disclosure?
                </span>
                <span className="text-zinc-300">{activeFlow.disclosure}</span>
              </div>
              <div className="rounded-2xl border border-white/5 bg-zinc-900 p-5">
                <span className="mb-2 block text-[#4A90E2]">
                  Donation Limits?
                </span>
                <span className="text-zinc-300">{activeFlow.limits}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
