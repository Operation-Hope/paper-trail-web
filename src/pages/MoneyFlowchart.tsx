import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
import {
  ArrowRight,
  AlertTriangle,
  Eye,
  EyeOff,
  DollarSign,
  Building,
  Users,
  Briefcase,
  ShieldAlert,
  AlertOctagon,
  Info,
  Keyboard,
  X,
} from 'lucide-react';
import { useTheme } from '../components/providers/theme-provider';

// --- DATA MODEL ---
const moneyFlows = [
  {
    id: 'direct',
    title: 'Direct Campaign Contributions',
    icon: Users,
    sources: ['Everyday Citizens', 'PACs', 'Candidate Themselves'],
    destinations: ["Candidate's Official Campaign", 'Party Committees'],
    risk: 'Medium',
    disclosure: 'Yes',
    limits: 'Yes (Strict Limits)',
    definition:
      'Money donated directly by private individuals or standard PACs to a campaign.',
    example: "A donor giving $3,300 directly to a House candidate's campaign.",
    flowDescription:
      'This is the most straightforward and transparent way money enters politics.',
    dataTracked: [
      'Individual Contributions',
      'Candidate Loans',
      'In-Kind Contributions',
    ],
  },
  {
    id: 'bundling',
    title: 'Lobbyist Bundling',
    icon: Briefcase,
    sources: ['Wealthy Individuals', 'Corporate Executives'],
    destinations: ["Candidate's Official Campaign"],
    risk: 'High',
    disclosure: 'Yes (Bundler disclosed)',
    limits: 'Yes (Per individual, no limit on total bundle)',
    definition:
      'When a lobbyist gathers many legally-limited checks and hands them to a candidate as one massive "bundle".',
    example:
      'A pharma lobbyist collects $500,000 in separate checks and delivers them to a Senator.',
    flowDescription:
      'The bundler gets credit for delivering massive sums, buying significant influence.',
    dataTracked: ['Conduit/Intermediary Bundling', 'Earmarked Funds'],
  },
  {
    id: 'super_pac',
    title: 'Super PACs (Independent Expenditures)',
    icon: DollarSign,
    sources: ['Mega-Donors', 'Corporations', 'Unions', 'Dark Money Groups'],
    destinations: [
      'TV & Digital Attack Ads',
      'Mailers (Independent of Campaign)',
    ],
    risk: 'EXTREME',
    disclosure: 'Yes (But often funded by dark money)',
    limits: 'No Limits',
    definition:
      'PACs that can raise unlimited money, as long as they don\'t "coordinate" with the candidate.',
    example:
      'A Super PAC spends $10 million on ads attacking a rival candidate.',
    flowDescription:
      'Because there are no limits, a single billionaire can entirely fund a Super PAC.',
    dataTracked: [
      'Super PAC contributions',
      'Independent expenditures',
      'Pop-up PACs',
    ],
  },
  {
    id: 'dark_money',
    title: 'Dark Money (501c4 & Shell LLCs)',
    icon: EyeOff,
    sources: [
      'Anonymous Mega-Donors',
      'Corporations',
      'Foreign Actors (Illegally)',
    ],
    destinations: ['Issue Ads', 'Super PACs', 'Political Influence Campaigns'],
    risk: 'EXTREME',
    disclosure: 'No (Donors hidden)',
    limits: 'No Limits',
    definition:
      'Nonprofits that spend money to influence elections without having to legally disclose donors.',
    example:
      '"Patriot Partners LLC" spends $5M on election ads without disclosing donors.',
    flowDescription:
      'Wealthy individuals funnel unlimited money through these groups to hide their identity.',
    dataTracked: [
      'Dark money (501c4)',
      'LLC shell donors',
      'Pass-Through Organizations',
    ],
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
    definition:
      'Personal PACs set up by politicians to fund allies, often used to buy loyalty.',
    example:
      'A Senator uses their Leadership PAC to fund campaigns of junior lawmakers to secure leadership votes.',
    flowDescription:
      'Politicians use these funds to build massive networks of influence among peers.',
    dataTracked: ['Leadership PAC spending', 'Party-to-candidate support'],
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
    definition:
      'Money funneled illegally into U.S. elections using straw donors or shell companies.',
    example: 'A foreign billionaire funnels $1M through a shell LLC.',
    flowDescription:
      'Loopholes in corporate transparency allow illicit money to quietly influence elections.',
    dataTracked: [
      'Straw Donor Schemes',
      'Foreign Influence Money',
      'Crypto Wash Donations',
    ],
  },
];

// --- SUB-COMPONENTS ---

const RiskBadge = ({
  risk,
  size = 'normal',
}: {
  risk: string;
  size?: string;
}) => {
  const styles: Record<string, string> = {
    Low: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-800',
    Medium:
      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800',
    High: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-300 dark:border-orange-800',
    EXTREME:
      'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-400 border-purple-500 dark:border-purple-800 animate-pulse font-bold',
  };

  const sizeClasses =
    size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  const iconSize = size === 'small' ? 12 : 14;

  return (
    <span
      className={`${sizeClasses} flex w-max items-center gap-1 rounded-full border ${styles[risk] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}
    >
      {risk === 'EXTREME' ? (
        <AlertOctagon size={iconSize} />
      ) : (
        <AlertTriangle size={iconSize} />
      )}
      {risk} Risk
    </span>
  );
};

const EcosystemMap = ({
  onVehicleClick,
}: {
  onVehicleClick: (id: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLElement>>({});
  const [lines, setLines] = useState<any[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const uniqueSources = Array.from(
    new Set(moneyFlows.flatMap((f) => f.sources))
  );
  const uniqueDests = Array.from(
    new Set(moneyFlows.flatMap((f) => f.destinations))
  );

  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: any[] = [];

    const getCoords = (id: string, side: 'left' | 'right') => {
      const el = nodeRefs.current[id];
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect[side] - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top,
      };
    };

    moneyFlows.forEach((flow) => {
      const vId = `v-${flow.id}`;
      const vLeft = getCoords(vId, 'left');
      const vRight = getCoords(vId, 'right');

      flow.sources.forEach((s) => {
        const sId = `s-${s}`;
        const sCoords = getCoords(sId, 'right');
        if (sCoords && vLeft)
          newLines.push({
            id: `${sId}-${vId}`,
            from: sCoords,
            to: vLeft,
            sourceId: sId,
            vehicleId: vId,
          });
      });

      flow.destinations.forEach((d) => {
        const dId = `d-${d}`;
        const dCoords = getCoords(dId, 'left');
        if (vRight && dCoords)
          newLines.push({
            id: `${vId}-${dId}`,
            from: vRight,
            to: dCoords,
            vehicleId: vId,
            destId: dId,
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
  }, [updateLines]);

  const getLineStyles = (line: any) => {
    if (!hoveredNode)
      return 'stroke-slate-300 dark:stroke-slate-600 opacity-40 stroke-[2]';
    let isActive =
      line.vehicleId === hoveredNode ||
      line.sourceId === hoveredNode ||
      line.destId === hoveredNode;
    return isActive
      ? 'stroke-blue-500 dark:stroke-blue-400 opacity-100 stroke-[3] drop-shadow-md z-50'
      : 'stroke-slate-200 dark:stroke-slate-800 opacity-10 stroke-[1]';
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:p-8 dark:border-slate-700 dark:bg-slate-800"
      ref={containerRef}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {lines.map((line) => (
          <path
            key={line.id}
            d={`M ${line.from.x} ${line.from.y} C ${line.from.x + 40} ${line.from.y}, ${line.to.x - 40} ${line.to.y}, ${line.to.x} ${line.to.y}`}
            fill="none"
            className={`transition-all duration-300 ${getLineStyles(line)}`}
          />
        ))}
      </svg>

      <div className="relative z-10 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="flex flex-col gap-3">
          <h3 className="text-center text-xs font-bold tracking-widest text-slate-500 uppercase">
            Sources
          </h3>
          {uniqueSources.map((s) => (
            <div
              key={s}
              ref={(el) => {
                if (el) nodeRefs.current[`s-${s}`] = el;
              }}
              onMouseEnter={() => setHoveredNode(`s-${s}`)}
              onMouseLeave={() => setHoveredNode(null)}
              className="rounded-lg border p-3 text-center text-sm dark:border-slate-600"
            >
              {s}
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center gap-6">
          <h3 className="text-center text-xs font-bold tracking-widest text-blue-600 uppercase">
            Vehicles
          </h3>
          {moneyFlows.map((flow) => (
            <div
              key={flow.id}
              ref={(el) => {
                if (el) nodeRefs.current[`v-${flow.id}`] = el;
              }}
              onClick={() => onVehicleClick(flow.id)}
              onMouseEnter={() => setHoveredNode(`v-${flow.id}`)}
              onMouseLeave={() => setHoveredNode(null)}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-4 shadow dark:bg-slate-800"
            >
              <span className="text-center text-sm font-bold">
                {flow.title}
              </span>
              <RiskBadge risk={flow.risk} size="small" />
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center gap-3">
          <h3 className="text-center text-xs font-bold tracking-widest text-slate-500 uppercase">
            Impacts
          </h3>
          {uniqueDests.map((d) => (
            <div
              key={d}
              ref={(el) => {
                if (el) nodeRefs.current[`d-${d}`] = el;
              }}
              onMouseEnter={() => setHoveredNode(`d-${d}`)}
              onMouseLeave={() => setHoveredNode(null)}
              className="rounded-lg border p-3 text-center text-sm dark:border-slate-600"
            >
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
  const activeFlow = moneyFlows.find((f) => f.id === activeModalId);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight">
          The Flow of Political Money
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
          Hover over a vehicle to see its sources and what the vehicle impacts.
          Click on a vehicle to learn more.
        </p>
      </div>

      <EcosystemMap onVehicleClick={(id) => setActiveModalId(id)} />

      {activeModalId && activeFlow && (
        <div
          className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
          onClick={() => setActiveModalId(null)}
        >
          <div
            className="bg-card w-full max-w-2xl space-y-6 rounded-2xl border p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{activeFlow.title}</h2>
                <RiskBadge risk={activeFlow.risk} />
              </div>
              <button onClick={() => setActiveModalId(null)}>
                <X />
              </button>
            </div>
            <p className="text-lg leading-relaxed italic">
              "{activeFlow.example}"
            </p>
            <div className="bg-muted grid grid-cols-2 gap-4 rounded-xl p-4 text-sm">
              <div>
                <span className="block font-bold">Public Disclosure?</span>
                {activeFlow.disclosure}
              </div>
              <div>
                <span className="block font-bold">Donation Limits?</span>
                {activeFlow.limits}
              </div>
            </div>
            <p className="text-muted-foreground">
              {activeFlow.flowDescription}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
