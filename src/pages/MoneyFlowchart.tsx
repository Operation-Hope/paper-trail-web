import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { 
  AlertTriangle, Eye, EyeOff, 
  DollarSign, Building, Users, Briefcase, 
  ShieldAlert, AlertOctagon, Info,
  Keyboard, X
} from 'lucide-react';
import { useTheme } from '../components/providers/theme-provider';

// --- DATA MODEL ---
const moneyFlows = [
  {
    id: 'direct',
    title: 'Direct Campaign Contributions',
    icon: Users,
    sources: ['Everyday Citizens', 'PACs', 'Candidate Themselves'],
    destinations: ['Candidate\'s Official Campaign', 'Party Committees'],
    risk: 'Medium',
    disclosure: 'Yes',
    limits: 'Yes (Strict Limits)',
    definition: 'Money donated directly by private individuals or standard PACs to a campaign.',
    example: 'A donor giving $3,300 directly to a House candidate\'s campaign.',
    flowDescription: 'This is the most straightforward and transparent way money enters politics. Because limits are strict and donors are disclosed, the risk of massive, untraceable corruption is lower.',
  },
  {
    id: 'bundling',
    title: 'Lobbyist Bundling',
    icon: Briefcase,
    sources: ['Wealthy Individuals', 'Corporate Executives'],
    destinations: ['Candidate\'s Official Campaign'],
    risk: 'High',
    disclosure: 'Yes (Bundler disclosed)',
    limits: 'Yes (Per individual, no limit on total bundle)',
    definition: 'When a lobbyist or fundraiser gathers many individual, legally-limited checks and hands them to a candidate as one massive "bundle".',
    example: 'A pharma lobbyist collects $500,000 in separate checks and delivers them to a Senator.',
    flowDescription: 'While individual checks are within legal limits, the bundler gets credit for delivering massive sums of money, buying them significant influence and access.',
  },
  {
    id: 'super_pac',
    title: 'Super PACs (Independent Expenditures)',
    icon: DollarSign,
    sources: ['Mega-Donors', 'Corporations', 'Unions', 'Dark Money Groups'],
    destinations: ['TV & Digital Attack Ads', 'Mailers (Independent of Campaign)'],
    risk: 'EXTREME',
    disclosure: 'Yes (But often funded by dark money)',
    limits: 'No Limits',
    definition: 'Political action committees that can raise and spend unlimited amounts of money, as long as they don\'t "coordinate" with the candidate.',
    example: 'A Super PAC spends $10 million on ads attacking a rival candidate.',
    flowDescription: 'Because there are no contribution limits, a single billionaire can entirely fund a Super PAC. They often act as shadow campaigns.',
  },
  {
    id: 'dark_money',
    title: 'Dark Money (501c4 & Shell LLCs)',
    icon: EyeOff,
    sources: ['Anonymous Mega-Donors', 'Corporations', 'Foreign Actors (Illegally)'],
    destinations: ['Issue Ads', 'Super PACs', 'Political Influence Campaigns'],
    risk: 'EXTREME',
    disclosure: 'No (Donors hidden)',
    limits: 'No Limits',
    definition: 'Nonprofits or shell companies that spend money to influence elections without having to legally disclose who gave them the money.',
    example: '"Patriot Partners LLC" spends $5M on election ads without disclosing donors.',
    flowDescription: 'Wealthy individuals or corporations funnel unlimited money through these groups to hide their identity, making it impossible to know who is really buying influence.',
  },
  {
    id: 'leadership_pac',
    title: 'Leadership PACs & Party Transfers',
    icon: Building,
    sources: ['PACs', 'Other Politicians', 'Wealthy Donors'],
    destinations: ['Allied Politicians', 'State Parties', 'Influence Building'],
    risk: 'High',
    disclosure: 'Yes',
    limits: 'Yes (But highly flexible)',
    definition: 'Personal PACs set up by politicians to fund other politicians or allies, often used to buy loyalty within a political party.',
    example: 'A Senator uses their Leadership PAC to fund campaigns of junior lawmakers to secure leadership votes.',
    flowDescription: 'Politicians use these funds to build massive networks of influence among their peers. It acts as a legal slush fund for political power brokering.',
  },
  {
    id: 'illicit',
    title: 'Illicit & Grey-Area Money',
    icon: ShieldAlert,
    sources: ['Foreign Nationals', 'Criminal Enterprises', 'Hidden Actors'],
    destinations: ['Campaigns (via Straw Donors)', 'Dark Money Ads'],
    risk: 'EXTREME',
    disclosure: 'Hidden / Illegal',
    limits: 'Illegal (No effective limit)',
    definition: 'Money funneled illegally into U.S. elections using fake names (straw donors), foreign entities, or untraceable transactions.',
    example: 'A foreign billionaire funnels $1M through a shell LLC to a candidate.',
    flowDescription: 'Despite laws against it, loopholes in corporate transparency allow illicit money to quietly influence elections.',
  }
];

// --- COMPONENTS ---

const RiskBadge = ({ risk, size = 'normal' }: { risk: string; size?: string }) => {
  const styles: Record<string, string> = {
    'Low': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-800',
    'Medium': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800',
    'High': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-300 dark:border-orange-800',
    'EXTREME': 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-400 border-purple-500 dark:border-purple-800 animate-pulse font-bold'
  };

  const sizeClasses = size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  const iconSize = size === 'small' ? 12 : 14;

  return (
    <span className={`${sizeClasses} rounded-full border flex items-center gap-1 w-max ${styles[risk] || ''}`}>
      {risk === 'EXTREME' ? <AlertOctagon size={iconSize} /> : <AlertTriangle size={iconSize} />}
      {risk} Risk
    </span>
  );
};

const EcosystemMap = ({ onVehicleClick }: { onVehicleClick: (id: string) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLElement>>({});
  const [lines, setLines] = useState<any[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const uniqueSources = Array.from(new Set(moneyFlows.flatMap(f => f.sources)));
  const uniqueDests = Array.from(new Set(moneyFlows.flatMap(f => f.destinations)));

  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: any[] = [];

    const getCoords = (id: string, side: 'left' | 'right') => {
      const el = nodeRefs.current[id];
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect[side === 'left' ? 'left' : 'right'] - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top
      };
    };

    moneyFlows.forEach(flow => {
      const vId = `v-${flow.id}`;
      const vLeft = getCoords(vId, 'left');
      const vRight = getCoords(vId, 'right');

      flow.sources.forEach(s => {
        const sId = `s-${s}`;
        const sCoords = getCoords(sId, 'right');
        if (sCoords && vLeft) newLines.push({ id: `${sId}-${vId}`, from: sCoords, to: vLeft, sourceId: sId, vehicleId: vId });
      });

      flow.destinations.forEach(d => {
        const dId = `d-${d}`;
        const dCoords = getCoords(dId, 'left');
        if (vRight && dCoords) newLines.push({ id: `${vId}-${dId}`, from: vRight, to: dCoords, vehicleId: vId, destId: dId });
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
  }, [updateLines]);

  const getLineStyles = (line: any) => {
    if (!hoveredNode) return 'stroke-slate-300 dark:stroke-slate-600 opacity-40 stroke-[2]';
    const isActive = line.vehicleId === hoveredNode || line.sourceId === hoveredNode || line.destId === hoveredNode;
    return isActive 
      ? 'stroke-blue-500 dark:stroke-blue-400 opacity-100 stroke-[3] drop-shadow-md z-50' 
      : 'stroke-slate-200 dark:stroke-slate-800 opacity-10 stroke-[1]';
  };

  return (
    <div className="relative w-full bg-card rounded-2xl shadow-xl border p-4 md:p-8 overflow-hidden" ref={containerRef}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {lines.map((line) => (
          <path
            key={line.id}
            d={`M ${line.from.x} ${line.from.y} C ${line.from.x + 40} ${line.from.y}, ${line.to.x - 40} ${line.to.y}, ${line.to.x} ${line.to.y}`}
            fill="none"
            className={`transition-all duration-300 ${getLineStyles(line)}`}
          />
        ))}
      </svg>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-3">
          <h3 className="text-center font-bold text-muted-foreground uppercase tracking-widest text-xs mb-4">Sources</h3>
          {uniqueSources.map(s => (
            <div key={s} ref={el => { if(el) nodeRefs.current[`s-${s}`] = el; }} onMouseEnter={() => setHoveredNode(`s-${s}`)} onMouseLeave={() => setHoveredNode(null)} className="p-3 rounded-lg border bg-background text-sm text-center transition-all hover:border-blue-400">
              {s}
            </div>
          ))}
        </div>
        <div className="space-y-6 flex flex-col justify-center">
          <h3 className="text-center font-bold text-blue-600 uppercase tracking-widest text-xs mb-2">Money Vehicles</h3>
          {moneyFlows.map(flow => (
            <div key={flow.id} ref={el => { if(el) nodeRefs.current[`v-${flow.id}`] = el; }} onClick={() => onVehicleClick(flow.id)} onMouseEnter={() => setHoveredNode(`v-${flow.id}`)} onMouseLeave={() => setHoveredNode(null)} className="p-4 rounded-xl border-2 bg-background shadow cursor-pointer flex flex-col items-center gap-2 hover:border-blue-500 transition-all">
              <span className="font-bold text-sm text-center">{flow.title}</span>
              <RiskBadge risk={flow.risk} size="small" />
            </div>
          ))}
        </div>
        <div className="space-y-3 flex flex-col justify-center">
          <h3 className="text-center font-bold text-muted-foreground uppercase tracking-widest text-xs mb-4">Impacts</h3>
          {uniqueDests.map(d => (
            <div key={d} ref={el => { if(el) nodeRefs.current[`d-${d}`] = el; }} onMouseEnter={() => setHoveredNode(`d-${d}`)} onMouseLeave={() => setHoveredNode(null)} className="p-3 rounded-lg border bg-background text-sm text-center transition-all hover:border-blue-400">
              {d}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function MoneyFlowchart() {
  const [activeModalId, setActiveModalId] = useState<string | null>(null);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const activeFlow = moneyFlows.find(f => f.id === activeModalId);

  // Global Keyboard listener for the 1-6 shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1','2','3','4','5','6'].includes(e.key)) {
        setActiveModalId(moneyFlows[parseInt(e.key) - 1].id);
      } else if (e.key === 'Escape') {
        setActiveModalId(null);
        setShowHotkeys(false);
      } else if (e.key === '?') {
        setShowHotkeys(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight">Money Flowchart</h1>
          <p className="text-muted-foreground">Trace the path of influence in American politics.</p>
        </div>
        <button onClick={() => setShowHotkeys(true)} className="p-2 rounded-full hover:bg-muted" title="View Hotkeys">
          <Keyboard className="h-6 w-6 text-muted-foreground" />
        </button>
      </div>

      <EcosystemMap onVehicleClick={(id) => setActiveModalId(id)} />

      {/* Details Modal */}
      {activeModalId && activeFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm" onClick={() => setActiveModalId(null)}>
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border p-8 space-y-6 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                        <activeFlow.icon size={24} />
                    </div>
                    <h2 className="text-2xl font-bold">{activeFlow.title}</h2>
                </div>
                <RiskBadge risk={activeFlow.risk} />
              </div>
              <button onClick={() => setActiveModalId(null)} className="hover:bg-muted p-1 rounded-md"><X /></button>
            </div>
            
            <div className="space-y-4">
                <p className="text-lg font-medium leading-relaxed">{activeFlow.definition}</p>
                <div className="bg-muted p-4 rounded-xl border italic text-sm">
                    "Example: {activeFlow.example}"
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-muted/50 rounded-xl border">
                <span className="font-bold text-blue-600 block mb-1">Public Disclosure?</span>
                {activeFlow.disclosure}
              </div>
              <div className="p-4 bg-muted/50 rounded-xl border">
                <span className="font-bold text-blue-600 block mb-1">Donation Limits?</span>
                {activeFlow.limits}
              </div>
            </div>
            <p className="text-muted-foreground text-sm">{activeFlow.flowDescription}</p>
          </div>
        </div>
      )}

      {/* Hotkeys Help Modal */}
      {showHotkeys && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm" onClick={() => setShowHotkeys(false)}>
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold flex items-center gap-2"><Keyboard /> Shortcuts</h2>
            <div className="space-y-3">
              <div className="flex justify-between"><span>Open Help</span> <kbd className="bg-muted px-2 rounded border">?</kbd></div>
              <div className="flex justify-between"><span>Select Vehicle</span> <kbd className="bg-muted px-2 rounded border">1-6</kbd></div>
              <div className="flex justify-between"><span>Close Menu</span> <kbd className="bg-muted px-2 rounded border">Esc</kbd></div>
            </div>
            <button onClick={() => setShowHotkeys(false)} className="w-full py-2 bg-primary text-primary-foreground rounded-lg mt-4 font-bold">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}