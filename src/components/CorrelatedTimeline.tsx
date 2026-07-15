import { useState, useEffect } from 'react';
import {
  api,
  CorrelatedDonation as BaseCorrelatedDonation,
  TimelineFilters,
} from '../services/api';
import {
  Loader2,
  Calendar,
  ArrowRightLeft,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
interface CorrelatedDonation extends BaseCorrelatedDonation {
  timeline_direction: 'before' | 'after' | 'same_day';
}

interface CorrelatedTimelineProps {
  icpsr: number;
  politicianName: string;
}

const SECTORS = [
  'Political Committees',
  'Energy & Resources',
  'Finance & Real Estate',
  'Technology & Media',
  'Health & Pharma',
  'Lawyers & Lobbyists',
  'Business & Ideological',
  'Defense & Aerospace',
  'Labor & Education',
  'Other / Misc',
];

const getProximityLabel = (item: CorrelatedDonation) => {
  if (item.days_difference === 0 || item.timeline_direction === 'same_day') {
    return 'Same Day';
  }
  const directionLabel =
    item.timeline_direction === 'before' ? 'Before' : 'After';
  return `${item.days_difference}d ${directionLabel}`;
};

const getProximityStyles = (item: CorrelatedDonation) => {
  if (item.days_difference === 0 || item.timeline_direction === 'same_day') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
  }
  if (item.timeline_direction === 'before') {
    return 'border-orange-500/20 bg-orange-500/10 text-orange-400';
  }
  return 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400';
};

export function CorrelatedTimeline({
  icpsr,
  politicianName,
}: CorrelatedTimelineProps) {
  const [data, setData] = useState<CorrelatedDonation[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // 🛠 Active State Tracker Filters
  const [search, setSearch] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [direction, setDirection] =
    useState<TimelineFilters['direction']>('all');
  const [sortBy, setSortBy] = useState<TimelineFilters['sortBy']>('proximity');
  const [hidePacs, setHidePacs] = useState<boolean>(true);

  const pageSize = 15;

  // Reset pagination indexes whenever core search queries change
  useEffect(() => {
    setPage(1);
  }, [icpsr, search, selectedSector, direction, sortBy, hidePacs]);

  useEffect(() => {
    async function fetchCorrelations() {
      setLoading(true);
      try {
        const result = await api.getVoteCorrelatedDonations(
          icpsr,
          politicianName,
          page,
          pageSize,
          { search, sector: selectedSector, direction, sortBy, hidePacs }
        );
        setData(result.items as CorrelatedDonation[]);
        setTotalCount(result.total);
      } catch (error) {
        console.error('Failed to load timeline correlations:', error);
      } finally {
        setLoading(false);
      }
    }

    // Small bounce fallback timer to stop database flickering while typing
    const delayDebounce = setTimeout(() => {
      fetchCorrelations();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [
    icpsr,
    politicianName,
    page,
    search,
    selectedSector,
    direction,
    sortBy,
    hidePacs,
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 !bg-zinc-900/90 p-6 shadow-2xl shadow-black/80">
      {' '}
      <div className="flex flex-col justify-between gap-4 border-b border-white/5 pb-4 md:flex-row md:items-center">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-white">
            Vote-Donation Proximity Tracker
          </h3>
          <p className="text-sm text-white/50">
            Showing campaign contributions within 30 days of legislative votes.
            ({totalCount.toLocaleString()} matches found)
          </p>
        </div>
      </div>
      {/* 🌟 FILTER CONTROL PANELS BAR */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-white/5 bg-white/[0.01] p-4 lg:grid-cols-12">
        {/* Text Keyword Search Box */}
        <div className="relative lg:col-span-5">
          <Search className="absolute top-3 left-3 h-4 w-4 text-white/30" />
          <input
            type="text"
            placeholder="Search bills, corporate donors, PAC names... THEN PRESS ENTER"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus:border-primary/50 w-full rounded-xl border border-white/10 bg-zinc-950 py-2.5 pr-4 pl-10 text-sm text-white placeholder-white/30 transition outline-none"
          />
        </div>

        {/* Sector Group Categorization Selection */}
        <div className="lg:col-span-3">
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="focus:border-primary/50 w-full rounded-xl border border-white/10 bg-zinc-950 p-2.5 text-sm text-white transition outline-none"
          >
            <option value="all">All Industry Sectors</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Window Priority Ordering */}
        <div className="lg:col-span-2">
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as TimelineFilters['sortBy'])
            }
            className="focus:border-primary/50 w-full rounded-xl border border-white/10 bg-zinc-950 p-2.5 text-sm text-white transition outline-none"
          >
            <option value="proximity">Sort by Days</option>
            <option value="amount">Sort by Amount</option>
          </select>
        </div>

        {/* Direction Context Actions */}
        <div className="lg:col-span-2">
          <select
            value={direction}
            onChange={(e) =>
              setDirection(e.target.value as TimelineFilters['direction'])
            }
            className="focus:border-primary/50 w-full rounded-xl border border-white/10 bg-zinc-950 p-2.5 text-sm text-white transition outline-none"
          >
            <option value="all">All Proximity</option>
            <option value="before">Paid Before Vote</option>
            <option value="after">Paid After Vote</option>
            <option value="same_day">Paid Same Day</option>
          </select>
        </div>

        {/* Dynamic Optimization Toggle Switch: Suppresses Large Institutional Blurs */}
        <div className="flex items-center gap-3 pt-1 lg:col-span-12">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={hidePacs}
              onChange={(e) => setHidePacs(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer aftermarket h-5 w-9 rounded-full bg-zinc-800 peer-checked:bg-emerald-500 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-zinc-400 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:bg-white"></div>
          </label>
          <span className="text-xs font-medium text-white/60">
            Hide major party leadership transfers (Excludes DCCC, ActBlue,
            WinRed pipelines)
          </span>
        </div>
      </div>
      {/* Main Content Render Core Block */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="text-primary mb-2 h-8 w-8 animate-spin" />
          <p className="font-mono text-xs tracking-widest text-white/40 uppercase">
            Loading...
          </p>
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/5 py-12 text-center">
          <p className="text-sm text-white/40">
            No matching donation alignments found matching your structural
            search entries.
          </p>
        </div>
      ) : (
        <>
          <div className="custom-scrollbar max-h-[600px] space-y-4 overflow-y-auto pr-2">
            {data.map((item, index) => (
              <div
                key={`${item.vote_id}-${index}`}
                className="group relative grid grid-cols-1 items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-200 hover:bg-white/[0.04] lg:grid-cols-12"
              >
                {/* Left Side Layout: Legislation details */}
                <div className="space-y-1.5 lg:col-span-5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
                      Vote #{item.vote_id}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        item.position === 'Yea'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : item.position === 'Nay'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-white/10 text-white/60'
                      }`}
                    >
                      Voted {item.position}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm font-semibold text-white/90 transition-all duration-300 group-hover:line-clamp-none">
                    {item.vote_desc}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Voted on {item.vote_date}</span>
                  </div>
                </div>

                {/* Center Timing Grid Column Layout Badge */}
                <div className="flex justify-start lg:col-span-2 lg:justify-center">
                  <span
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold ${getProximityStyles(
                      item
                    )}`}
                  >
                    <ArrowRightLeft className="h-3 w-3" />
                    {getProximityLabel(item)}
                  </span>
                </div>

                {/* Right Profile Grid Column: Corporate Donor and Monetary Scale */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold tracking-tight text-white">
                      {item.donor_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-primary/80 text-[10px] font-semibold tracking-wider uppercase">
                        {item.sector}
                      </span>
                      <span className="text-xs text-white/20">•</span>
                      <span className="font-mono text-xs text-white/40">
                        Paid {item.donation_date}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="flex items-center justify-end font-mono text-base font-black text-emerald-400">
                      <DollarSign className="-mr-0.5 h-4 w-4" />
                      {item.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Grid Navigation Controls */}
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="font-mono text-xs text-white/40">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] p-2 text-white/80 transition hover:bg-white/[0.08] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={page === totalPages}
                className="flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] p-2 text-white/80 transition hover:bg-white/[0.08] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
