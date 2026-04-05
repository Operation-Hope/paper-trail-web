// Removed 'React' as it is unused in modern JSX
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
import {
  AlertTriangle,
  EyeOff, // Removed 'Eye'
  DollarSign,
  Building,
  Users,
  Briefcase,
  ShieldAlert,
  AlertOctagon, // Removed 'Info'
  Keyboard,
  X,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
      'This is the most straightforward and transparent way money enters politics. Because limits are strict and donors are disclosed, the risk of massive, untraceable corruption is lower.',
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
      'When a lobbyist or fundraiser gathers many individual, legally-limited checks and hands them to a candidate as one massive "bundle".',
    example:
      'A pharma lobbyist collects $500,000 in separate checks and delivers them to a Senator.',
    flowDescription:
      'While individual checks are within legal limits, the bundler gets credit for delivering massive sums of money, buying them significant influence and access.',
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
      'Political action committees that can raise and spend unlimited amounts of money, as long as they don\'t "coordinate" with the candidate.',
    example:
      'A Super PAC spends $10 million on ads attacking a rival candidate.',
    flowDescription:
      'Because there are no contribution limits, a single billionaire can entirely fund a Super PAC. They often act as shadow campaigns.',
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
      'Nonprofits or shell companies that spend money to influence elections without having to legally disclose who gave them the money.',
    example:
      '"Patriot Partners LLC" spends $5M on election ads without disclosing donors.',
    flowDescription:
      'Wealthy individuals or corporations funnel unlimited money through these groups to hide their identity, making it impossible to know who is really buying influence.',
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
      'Personal PACs set up by politicians to fund other politicians or allies, often used to buy loyalty within a political party.',
    example:
      'A Senator uses their Leadership PAC to fund campaigns of junior lawmakers to secure leadership votes.',
    flowDescription:
      'Politicians use these funds to build massive networks of influence among their peers. It acts as a legal slush fund for political power brokering.',
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
      'Money funneled illegally into U.S. elections using fake names (straw donors), foreign entities, or untraceable transactions.',
    example:
      'A foreign billionaire funnels $1M through a shell LLC to a candidate.',
    flowDescription:
      'Despite laws against it, loopholes in corporate transparency allow illicit money to quietly influence elections.',
  },
];

// --- COMPONENTS ---

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
      className={`${sizeClasses} flex w-max items-center gap-1 rounded-full border ${styles[risk] || ''}`}
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
        x: rect[side === 'left' ? 'left' : 'right'] - containerRect.left,
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
    const isActive =
      line.vehicleId === hoveredNode ||
      line.sourceId === hoveredNode ||
      line.destId === hoveredNode;
    return isActive
      ? 'stroke-blue-500 dark:stroke-blue-400 opacity-100 stroke-[3] drop-shadow-md z-50'
      : 'stroke-slate-200 dark:stroke-slate-800 opacity-10 stroke-[1]';
  };

  return (
    <div
      className="bg-card relative w-full overflow-hidden rounded-2xl border p-4 shadow-xl md:p-8"
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

      <div className="relative z-10 grid grid-cols-1 gap-12 md:grid-cols-3">
        <div className="space-y-3">
          <h3 className="text-muted-foreground mb-4 text-center text-xs font-bold tracking-widest uppercase">
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
              className="bg-background rounded-lg border p-3 text-center text-sm transition-all hover:border-blue-400"
            >
              {s}
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center space-y-6">
          <h3 className="mb-2 text-center text-xs font-bold tracking-widest text-blue-600 uppercase">
            Money Vehicles
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
              className="bg-background flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-4 shadow transition-all hover:border-blue-500"
            >
              <span className="text-center text-sm font-bold">
                {flow.title}
              </span>
              <RiskBadge risk={flow.risk} size="small" />
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center space-y-3">
          <h3 className="text-muted-foreground mb-4 text-center text-xs font-bold tracking-widest uppercase">
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
              className="bg-background rounded-lg border p-3 text-center text-sm transition-all hover:border-blue-400"
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
  const [showHotkeys, setShowHotkeys] = useState(false);
  const activeFlow = moneyFlows.find((f) => f.id === activeModalId);

  // Global Keyboard listener for the 1-6 shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        setActiveModalId(moneyFlows[parseInt(e.key) - 1].id);
      } else if (e.key === 'Escape') {
        setActiveModalId(null);
        setShowHotkeys(false);
      } else if (e.key === '?') {
        setShowHotkeys((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-4">
      {/* Header Section with Integrated Back Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Money Flowchart
          </h1>
          <p className="text-muted-foreground">
            Trace the path of influence in American politics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHotkeys(true)}
            className="hover:bg-muted rounded-full p-2 transition-colors"
            title="View Hotkeys"
          >
            <Keyboard className="text-muted-foreground h-6 w-6" />
          </button>

          {/* Consistent Back Button */}
          <Link
            to="/"
            className="focus-visible:ring-ring bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Link>
        </div>
      </div>

      <EcosystemMap onVehicleClick={(id) => setActiveModalId(id)} />

      {/* Details Modal */}
      {activeModalId && activeFlow && (
        <div
          className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
          onClick={() => setActiveModalId(null)}
        >
          <div
            className="bg-card animate-in fade-in zoom-in w-full max-w-2xl space-y-6 rounded-2xl border p-8 shadow-2xl duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30">
                    <activeFlow.icon size={24} />
                  </div>
                  <h2 className="text-2xl font-bold">{activeFlow.title}</h2>
                </div>
                <RiskBadge risk={activeFlow.risk} />
              </div>
              <button
                onClick={() => setActiveModalId(null)}
                className="hover:bg-muted rounded-md p-1"
              >
                <X />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-lg leading-relaxed font-medium">
                {activeFlow.definition}
              </p>
              <div className="bg-muted rounded-xl border p-4 text-sm italic">
                "Example: {activeFlow.example}"
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-muted/50 rounded-xl border p-4">
                <span className="mb-1 block font-bold text-blue-600">
                  Public Disclosure?
                </span>
                {activeFlow.disclosure}
              </div>
              <div className="bg-muted/50 rounded-xl border p-4">
                <span className="mb-1 block font-bold text-blue-600">
                  Donation Limits?
                </span>
                {activeFlow.limits}
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              {activeFlow.flowDescription}
            </p>
          </div>
        </div>
      )}

      {/* Hotkeys Help Modal */}
      {showHotkeys && (
        <div
          className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
          onClick={() => setShowHotkeys(false)}
        >
          <div
            className="bg-card w-full max-w-sm space-y-4 rounded-2xl border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Keyboard /> Shortcuts
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Open Help</span>{' '}
                <kbd className="bg-muted rounded border px-2">?</kbd>
              </div>
              <div className="flex justify-between">
                <span>Select Vehicle</span>{' '}
                <kbd className="bg-muted rounded border px-2">1-6</kbd>
              </div>
              <div className="flex justify-between">
                <span>Close Menu</span>{' '}
                <kbd className="bg-muted rounded border px-2">Esc</kbd>
              </div>
            </div>
            <button
              onClick={() => setShowHotkeys(false)}
              className="bg-primary text-primary-foreground mt-4 w-full rounded-lg py-2 font-bold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
