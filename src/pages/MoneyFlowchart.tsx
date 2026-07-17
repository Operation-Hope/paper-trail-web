import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  ArrowRight,
  ArrowRightLeft,
  Briefcase,
  DollarSign,
  EyeOff,
  Building,
  ShieldAlert,
  X,
  CheckCircle2,
  CircleDashed,
  CircleOff,
} from 'lucide-react';
import { api } from '../services/api';

// --- DATA MODEL ---
// Each vehicle is described by legal facts (disclosure, limits, coordination)
// rather than editorial risk ratings: the site's legal posture is that it
// presents public-record facts and lets readers judge. "tracked" tells
// readers honestly which flows this site can and cannot show them.
type TrackedState = 'yes' | 'partial' | 'no';

interface MoneyFlow {
  id: string;
  title: string;
  icon: typeof Users;
  sources: string[];
  destinations: string[];
  definition: string;
  example: string;
  disclosure: string;
  limits: string;
  coordination: string;
  tracked: TrackedState;
  trackedNote: string;
  statKey?: 'contributions' | 'earmarked' | 'ie';
}

const moneyFlows: MoneyFlow[] = [
  {
    id: 'direct',
    title: 'Direct Contributions',
    icon: Users,
    sources: ['Individual Donors', 'PACs'],
    destinations: ['Candidate Campaigns', 'Party Committees'],
    definition:
      'Money given directly to a campaign by individuals or PACs, subject to strict per-election limits.',
    example:
      "A trade association's PAC gives $5,000 to a House candidate's campaign committee.",
    disclosure: 'Full — donor, amount, and date are public',
    limits: 'Capped per election by law',
    coordination: 'N/A — it is the campaign’s own money',
    tracked: 'yes',
    trackedNote:
      'Shown on every politician’s page as Direct PAC Money and in the Vote-Donation Proximity Tracker.',
    statKey: 'contributions',
  },
  {
    id: 'earmarked',
    title: 'Earmarked via Conduits',
    icon: ArrowRightLeft,
    sources: ['Individual Donors'],
    destinations: ['Candidate Campaigns'],
    definition:
      'Individual donations routed through a conduit committee (ActBlue, WinRed, AIPAC PAC, and others) that collects checks and passes them to the campaign. The conduit chooses whom to solicit for — which is why attribution matters.',
    example:
      'A donor gives through AIPAC’s portal; the money arrives at the campaign earmarked, reported with the conduit’s name attached.',
    disclosure: 'Full — both the original donor and the conduit are reported',
    limits: 'Capped — same individual limits apply',
    coordination: 'N/A — it is the campaign’s own money',
    tracked: 'yes',
    trackedNote:
      'Shown on every politician’s page as Earmarked via Conduits, attributed to the conduit it passed through.',
    statKey: 'earmarked',
  },
  {
    id: 'super_pac',
    title: 'Super PACs (Independent Expenditures)',
    icon: DollarSign,
    sources: ['Mega-Donors', 'Corporations', 'Unions'],
    destinations: ['Ads Supporting a Candidate', 'Ads Opposing a Candidate'],
    definition:
      'Committees that may raise and spend unlimited amounts advocating for or against candidates, provided they do not coordinate with any campaign. The money never enters the candidate’s account.',
    example:
      'A super PAC spends $3M on ads opposing a candidate in a contested primary.',
    disclosure:
      'Spending and direct donors are public; donors may include nonprofits that hide their own funders',
    limits: 'Unlimited',
    coordination: 'Prohibited by law',
    tracked: 'yes',
    trackedNote:
      'Shown on every politician’s page as Super PAC Spending, labeled “supporting” or “opposing” — never “donated.”',
    statKey: 'ie',
  },
  {
    id: 'bundling',
    title: 'Lobbyist Bundling',
    icon: Briefcase,
    sources: ['Wealthy Individuals', 'Corporate Executives'],
    destinations: ['Candidate Campaigns'],
    definition:
      'A lobbyist or fundraiser gathers many individual checks and delivers them together, earning credit for the combined sum.',
    example:
      'A lobbyist collects $500,000 in individual checks for a Senator’s campaign.',
    disclosure:
      'Partial — only registered-lobbyist bundlers above a threshold are reported',
    limits: 'Each check is capped; the combined bundle is not',
    coordination: 'N/A — it is the campaign’s own money',
    tracked: 'no',
    trackedNote:
      'Not separately visible: the individual checks appear in FEC data, but who gathered them mostly does not.',
  },
  {
    id: 'leadership_pac',
    title: 'Leadership PACs',
    icon: Building,
    sources: ['PACs', 'Individual Donors'],
    destinations: ['Allied Politicians’ Campaigns'],
    definition:
      'A separate PAC controlled by a politician, used mainly to donate to colleagues’ campaigns.',
    example:
      'A committee chair’s leadership PAC gives $10,000 to junior members’ campaigns.',
    disclosure: 'Full — donations in and out are public',
    limits: 'Capped per recipient',
    coordination: 'N/A',
    tracked: 'partial',
    trackedNote:
      'Their donations to candidates appear in Direct PAC Money; their own fundraising and other spending is not broken out.',
  },
  {
    id: 'dark_money',
    title: 'Dark Money',
    icon: EyeOff,
    sources: ['Anonymous Donors', 'Shell Companies'],
    destinations: ['Issue Ads', 'Super PACs'],
    definition:
      'Spending by nonprofits and shell companies that are not required to disclose their donors, often routed onward to super PACs.',
    example:
      'A 501(c)(4) nonprofit funds $5M of issue ads without naming its donors.',
    disclosure: 'None — original donors are not reported',
    limits: 'Unlimited',
    coordination: 'Prohibited for candidate advocacy',
    tracked: 'no',
    trackedNote:
      'Invisible in public data by design — no website can trace it. When dark money funds a super PAC, only the nonprofit’s name appears.',
  },
  {
    id: 'illicit',
    title: 'Illicit Money',
    icon: ShieldAlert,
    sources: ['Foreign Nationals', 'Straw Donors'],
    destinations: ['Campaigns (disguised)', 'Hidden Ads'],
    definition:
      'Illegal funding: foreign money, contributions in someone else’s name, or deliberately unreported spending.',
    example:
      'A foreign national reimburses U.S. “straw donors” for contributions made in their names.',
    disclosure: 'Hidden — appears in filings only under false identities',
    limits: 'Illegal in any amount',
    coordination: 'Illegal',
    tracked: 'no',
    trackedNote:
      'By definition absent from honest public data; it surfaces only through enforcement actions and prosecutions.',
  },
];

function fmtTotal(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  return `$${Math.round(n / 1_000_000)}M`;
}

const FactChip = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/5 bg-zinc-900 p-5">
    <span className="mb-2 block text-[11px] font-black tracking-widest text-[#4A90E2] uppercase">
      {label}
    </span>
    <span className="text-sm text-zinc-300">{value}</span>
  </div>
);

const TrackedBadge = ({ tracked }: { tracked: TrackedState }) => {
  if (tracked === 'yes')
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        Tracked on this site
      </span>
    );
  if (tracked === 'partial')
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-400 uppercase">
        <CircleDashed className="h-3 w-3" aria-hidden="true" />
        Partially tracked
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
      <CircleOff className="h-3 w-3" aria-hidden="true" />
      Not visible in public data
    </span>
  );
};

export default function MoneyFlowchart() {
  const [activeModalId, setActiveModalId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const { data: freshness } = useQuery({
    queryKey: ['dataFreshness'],
    queryFn: () => api.getDataFreshness(),
    staleTime: Infinity,
  });

  const statFor = (flow: MoneyFlow): string | null => {
    if (!flow.statKey || !freshness) return null;
    const t = freshness.totals;
    if (flow.statKey === 'ie') {
      const total = (t.ie_support ?? 0) + (t.ie_oppose ?? 0);
      return total > 0 ? fmtTotal(total) : null;
    }
    const total = t[flow.statKey];
    return total ? fmtTotal(total) : null;
  };

  const activeFlow = moneyFlows.find((f) => f.id === activeModalId);

  // Escape closes the modal; focus moves to the close button when it opens.
  useEffect(() => {
    if (!activeModalId) return;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModalId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [activeModalId]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#4A90E2]/30">
      <main className="min-h-[calc(100vh-80px)] bg-zinc-950/50 pt-16">
        {/* Hero Slogan - Kept within padding */}
        <div className="mx-auto mb-10 max-w-6xl space-y-4 px-4 text-center">
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase md:text-5xl">
            LEARN HOW MONEY <span className="text-zinc-400 italic">FLOWS</span>{' '}
            IN POLITICS
          </h1>
          <div className="mx-auto h-1 w-24 rounded-full bg-[#4A90E2]" />
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-400">
            Each channel below is described by three legal facts — what gets
            disclosed, what is limited, and whether coordination with the
            candidate is allowed — and marked by whether this site can show it
            to you. Select any channel for details.
            {freshness?.filingsThrough && (
              <span className="mt-1 block text-xs text-zinc-400">
                Cycle totals from FEC filings through {freshness.filingsThrough}
                .
              </span>
            )}
          </p>
        </div>

        {/* 🚀 FULL WIDTH STICKY HEADER */}
        <div className="sticky top-20 z-50 w-full border-b border-white/5 bg-black/95 py-8 backdrop-blur-xl">
          <div className="mx-auto grid max-w-6xl grid-cols-3 px-4">
            <h2 className="text-left text-lg font-black tracking-widest text-zinc-400 uppercase">
              Sources
            </h2>
            <h2 className="text-center text-lg font-black tracking-widest text-[#4A90E2] uppercase">
              Money Vehicles
            </h2>
            <h2 className="text-right text-lg font-black tracking-widest text-zinc-400 uppercase">
              Impacts
            </h2>
          </div>
        </div>

        {/* Flowchart: static three-column rows, money always flowing left to
            right — no absolute positioning, so labels can never overlap. */}
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-3xl border border-white/5 bg-zinc-950/50 p-6 md:p-12">
            <div className="space-y-12">
              {moneyFlows.map((flow) => (
                <div
                  key={flow.id}
                  className="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-6"
                >
                  {/* Sources -> */}
                  <ul
                    className="flex flex-col gap-2.5 md:items-end"
                    aria-label={`Where ${flow.title} comes from`}
                  >
                    {flow.sources.map((s) => (
                      <li key={s} className="flex items-center gap-3">
                        <span className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-xs font-black tracking-tight text-zinc-300 uppercase md:text-sm">
                          {s}
                        </span>
                        <ArrowRight
                          className="h-5 w-5 flex-none text-[#4A90E2]"
                          aria-hidden="true"
                        />
                      </li>
                    ))}
                  </ul>

                  {/* Vehicle */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModalId(flow.id);
                    }}
                    aria-haspopup="dialog"
                    className="flex w-full max-w-xs cursor-pointer flex-col items-center gap-3 justify-self-center rounded-2xl border border-white/10 bg-zinc-900 p-6 transition-all duration-200 hover:border-[#4A90E2] hover:shadow-[0_0_40px_rgba(74,144,226,0.15)] focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none md:w-80"
                  >
                    <span className="text-center text-sm leading-tight font-black tracking-tight text-white uppercase">
                      {flow.title}
                    </span>
                    <TrackedBadge tracked={flow.tracked} />
                    {statFor(flow) && (
                      <span className="font-mono text-xs text-emerald-400">
                        {statFor(flow)} filed this cycle
                      </span>
                    )}
                  </button>

                  {/* -> Impacts */}
                  <ul
                    className="flex flex-col items-start gap-2.5"
                    aria-label={`Where ${flow.title} goes`}
                  >
                    {flow.destinations.map((d) => (
                      <li key={d} className="flex items-center gap-3">
                        <ArrowRight
                          className="h-5 w-5 flex-none text-[#4A90E2]"
                          aria-hidden="true"
                        />
                        <span className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-xs font-black tracking-tight text-zinc-300 uppercase md:text-sm">
                          {d}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-zinc-400">
            Transparency varies by design: some channels are fully public,
            others are structured so the original source of money cannot be
            traced. This site shows you everything the public record contains —
            and tells you plainly when a channel is invisible.{' '}
            <Link
              to="/"
              className="text-[#4A90E2] underline focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none"
            >
              Search a politician
            </Link>{' '}
            to see the tracked channels for a real member of Congress.
          </p>
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="flow-modal-title"
            className="max-h-[85vh] w-full max-w-2xl space-y-6 overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-10 shadow-2xl"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div
                    className="rounded-xl border border-[#4A90E2]/20 bg-[#4A90E2]/10 p-3 text-[#4A90E2]"
                    aria-hidden="true"
                  >
                    <activeFlow.icon size={28} />
                  </div>
                  <h2
                    id="flow-modal-title"
                    className="text-2xl font-black tracking-tighter uppercase"
                  >
                    {activeFlow.title}
                  </h2>
                </div>
                <TrackedBadge tracked={activeFlow.tracked} />
              </div>
              <button
                ref={closeButtonRef}
                aria-label="Close dialog"
                onClick={() => {
                  setActiveModalId(null);
                }}
                className="rounded-full border border-white/5 p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-6">
              <p className="text-xl leading-relaxed font-bold text-zinc-200">
                {activeFlow.definition}
              </p>
              <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 text-sm text-zinc-400 italic">
                &quot;Example: {activeFlow.example}&quot;
              </div>
              <div className="grid grid-cols-1 gap-3 text-xs text-zinc-400 sm:grid-cols-2">
                <div>
                  <span className="mb-1 block text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                    Where it comes from
                  </span>
                  {activeFlow.sources.join(' · ')}
                </div>
                <div>
                  <span className="mb-1 block text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                    Where it goes
                  </span>
                  {activeFlow.destinations.join(' · ')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FactChip label="Disclosure" value={activeFlow.disclosure} />
              <FactChip label="Limits" value={activeFlow.limits} />
              <FactChip label="Coordination" value={activeFlow.coordination} />
            </div>

            <div className="rounded-2xl border border-white/5 bg-zinc-900 p-5 text-sm text-zinc-300">
              <span className="mb-2 block text-[11px] font-black tracking-widest text-[#4A90E2] uppercase">
                On this site
              </span>
              {activeFlow.trackedNote}
              {activeFlow.tracked !== 'no' && (
                <>
                  {' '}
                  <Link
                    to="/"
                    className="text-[#4A90E2] underline focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none"
                    onClick={() => {
                      setActiveModalId(null);
                    }}
                  >
                    Search a politician →
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
