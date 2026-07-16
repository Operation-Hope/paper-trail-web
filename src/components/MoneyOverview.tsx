import { useQuery } from '@tanstack/react-query';
import { api, MoneyOverview as MoneyOverviewData } from '../services/api';
import { Loader2 } from 'lucide-react';

interface MoneyOverviewProps {
  politicianName: string;
}

// Compact money format for tile values: $13.99M / $27.3K / $450 / $0
function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `$${Math.round(n / 1000).toLocaleString()}K`;
  if (abs >= 1_000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

// Every money channel is always rendered — a real $0 (e.g. no super PAC
// spending) is information a reader deciding whom to trust needs to see, and
// symmetric treatment of empty channels is what keeps the display fair.
// `null` (dataset not yet published) is labeled as such, never shown as $0.
export function MoneyOverview({ politicianName }: MoneyOverviewProps) {
  const { data: overview, isLoading } = useQuery<MoneyOverviewData>({
    queryKey: ['moneyOverview', politicianName],
    queryFn: () => api.getMoneyOverview(politicianName),
    enabled: !!politicianName,
  });
  const { data: freshness } = useQuery({
    queryKey: ['dataFreshness'],
    queryFn: () => api.getDataFreshness(),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-3 rounded-3xl border border-white/10 !bg-zinc-900/90 p-8"
        role="status"
      >
        <Loader2
          className="text-primary h-5 w-5 animate-spin"
          aria-hidden="true"
        />
        <span className="text-xs font-black tracking-widest text-white/60 uppercase">
          Loading money overview...
        </span>
      </div>
    );
  }
  if (!overview) return null;

  const pctOfTotal =
    overview.direct && overview.totalRaised && overview.totalRaised.amount > 0
      ? Math.round((overview.direct.total / overview.totalRaised.amount) * 100)
      : null;

  return (
    <section
      aria-label="Campaign money overview"
      className="space-y-4 rounded-3xl border border-white/10 !bg-zinc-900/90 p-6 shadow-2xl shadow-black/80"
    >
      <div className="flex flex-col justify-between gap-1 border-b border-white/5 pb-4 md:flex-row md:items-baseline">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Where the Money Comes From
        </h2>
        <p className="text-xs text-white/60">
          2026 election cycle
          {freshness?.filingsThrough && (
            <> · FEC filings through {freshness.filingsThrough}</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total raised — the context every other number needs */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
            Total Raised
          </h3>
          {overview.totalRaised ? (
            <>
              <p className="mt-1 font-mono text-2xl font-black text-white">
                {fmtMoney(overview.totalRaised.amount)}
              </p>
              <p className="mt-1 text-[11px] text-white/60">
                all sources, per FEC summary
                {overview.totalRaised.coverageEnd &&
                  ` through ${overview.totalRaised.coverageEnd}`}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-white/60">
              Not yet published in this dataset
            </p>
          )}
        </div>

        {/* Direct PAC money */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
            Direct PAC Money
          </h3>
          {overview.direct ? (
            <>
              <p className="mt-1 font-mono text-2xl font-black text-emerald-400">
                {fmtMoney(overview.direct.total)}
              </p>
              <p className="mt-1 text-[11px] text-white/60">
                from {overview.direct.donors.toLocaleString()} committees
                {pctOfTotal !== null && (
                  <>
                    {' '}
                    · <strong className="text-white/80">
                      {pctOfTotal}%
                    </strong>{' '}
                    of total raised
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-white/60">
              Not yet published in this dataset
            </p>
          )}
        </div>

        {/* Earmarked through conduits */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
            Earmarked via Conduits
          </h3>
          {overview.earmarked ? (
            <>
              <p className="mt-1 font-mono text-2xl font-black text-emerald-400">
                {fmtMoney(overview.earmarked.total)}
              </p>
              <p className="mt-1 text-[11px] text-white/60">
                {overview.earmarked.contributions.toLocaleString()} individual
                donations passed through
                {overview.earmarked.topConduits.length > 0 && (
                  <>
                    {' '}
                    {overview.earmarked.topConduits
                      .map((c) => `${c.name} (${fmtMoney(c.total)})`)
                      .join(', ')}
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-white/60">
              Not yet published in this dataset
            </p>
          )}
        </div>

        {/* Outside spending — zeros shown deliberately */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
            Super PAC Spending
          </h3>
          {overview.outside ? (
            <>
              {overview.outside.support === 0 &&
              overview.outside.oppose === 0 ? (
                <>
                  <p className="mt-1 font-mono text-2xl font-black text-white/70">
                    $0
                  </p>
                  <p className="mt-1 text-[11px] text-white/60">
                    no super PAC independent expenditures filed for or against
                    this politician this cycle
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 font-mono text-lg font-black">
                    <span className="text-emerald-400">
                      {fmtMoney(overview.outside.support)} for
                    </span>
                    <span className="text-white/40"> · </span>
                    <span className="text-rose-400">
                      {fmtMoney(overview.outside.oppose)} against
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-white/60">
                    by committees organized as super PACs (incl. hybrid PAC
                    accounts) — spent about their race, not given to them
                  </p>
                </>
              )}
              {(overview.outside.otherSupport > 0 ||
                overview.outside.otherOppose > 0) && (
                <p className="mt-1.5 border-t border-white/5 pt-1.5 text-[11px] text-white/60">
                  Plus {fmtMoney(overview.outside.otherSupport)} for ·{' '}
                  {fmtMoney(overview.outside.otherOppose)} against by
                  non-super-PAC committees (party, traditional PACs)
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-xs text-white/60">
              Not yet published in this dataset
            </p>
          )}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-white/50">
        Direct and earmarked money went to the campaign; super PAC money was
        spent about the race without the candidate&apos;s coordination. All
        figures are net of amendments and refunds, from FEC bulk filings.
      </p>
    </section>
  );
}
