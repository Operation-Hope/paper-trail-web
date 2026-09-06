import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, PresidentialMoney } from '../services/api';
import { PRESIDENTIAL_2028 } from '../data/presidential2028';
import { WhosPaying } from '../components/WhosPaying';
import { VotesMoneyTimeline } from '../components/VotesMoneyTimeline';
import { VoteSpotlights } from '../components/VoteSpotlights';
import { fmtMoney, sectorColor } from '../utils/moneyViz';
import { MapPin, Landmark, CalendarClock, Loader2 } from 'lucide-react';

// Page for a potential 2028 presidential candidate who is not a sitting
// member of Congress. Money = itemized individual donations (net of refunds)
// to the federal committees they control, from FEC bulk filings. Votes: none
// exist federally for non-members, and the page says so plainly instead of
// showing empty charts.
export default function PresidentialCandidate() {
  const { slug } = useParams<{ slug: string }>();
  const candidate = PRESIDENTIAL_2028.find((c) => c.slug === slug);

  const { data: money, isLoading: moneyLoading } =
    useQuery<PresidentialMoney | null>({
      queryKey: ['presidentialMoney', slug],
      queryFn: () => api.getPresidentialMoney(slug ?? ''),
      enabled: !!candidate,
    });
  const { data: freshness } = useQuery({
    queryKey: ['dataFreshness'],
    queryFn: () => api.getDataFreshness(),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (candidate) {
      document.title = `Corruption Watch | ${candidate.name}`;
    }
  }, [candidate]);

  if (!candidate) {
    return (
      <div className="space-y-4 p-20 text-center">
        <p className="text-2xl font-black tracking-tighter text-white uppercase opacity-70">
          Candidate Not Found
        </p>
        <Link
          to="/"
          className="text-[#4A90E2] underline focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none"
        >
          Back to search
        </Link>
      </div>
    );
  }

  const isGovernor = candidate.title.includes('Governor');
  const hasMoney = !!money && money.total !== 0;
  const R = 92;
  const CIRC = 2 * Math.PI * R;
  const sectorTotal = money?.sectors.reduce((s, x) => s + x.value, 0) ?? 0;
  const fracs = (money?.sectors ?? []).map((s) =>
    sectorTotal > 0 ? s.value / sectorTotal : 0
  );
  const segments = (money?.sectors ?? []).map((s, i) => ({
    ...s,
    frac: fracs[i],
    offset: fracs.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  return (
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-8 px-4 py-8 duration-700">
      <header className="border-primary/5 bg-card rounded-3xl border p-6 shadow-sm md:p-10">
        <div className="space-y-4">
          <div className="bg-primary/5 border-primary/10 inline-flex items-center gap-3 rounded-full border px-4 py-1.5">
            <span className="text-sm font-black tracking-[0.2em] text-[#4A90E2] uppercase">
              {candidate.party} • 2028 Presidential Candidate
            </span>
          </div>

          <h1 className="text-4xl leading-none font-black tracking-tighter sm:text-5xl md:text-6xl">
            {candidate.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm font-black tracking-widest text-zinc-400 uppercase">
            <div className="flex items-center gap-2">
              <Landmark
                className="text-primary h-4 w-4 opacity-70"
                aria-hidden="true"
              />
              <span>{candidate.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin
                className="text-primary h-4 w-4 opacity-70"
                aria-hidden="true"
              />
              <span>{candidate.state}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarClock
                className="text-primary h-4 w-4 opacity-70"
                aria-hidden="true"
              />
              <span>Election: Nov 7, 2028</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl space-y-6 px-0 md:px-4">
        {/* ---- Money ---- */}
        <section
          aria-label="Federal money raised by this candidate"
          className="space-y-4 rounded-3xl border border-white/10 !bg-zinc-900/90 p-6 shadow-2xl shadow-black/80"
        >
          <div className="flex flex-col justify-between gap-1 border-b border-white/5 pb-4 md:flex-row md:items-baseline">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Where Their Money Comes From
            </h2>
            <p className="text-xs text-white/60">
              2026 cycle · individual donations to their federal committees
              {freshness?.filingsThrough && (
                <> · FEC filings through {freshness.filingsThrough}</>
              )}
            </p>
          </div>

          {moneyLoading ? (
            <div
              className="flex items-center justify-center gap-3 py-10"
              role="status"
            >
              <Loader2
                className="text-primary h-5 w-5 animate-spin"
                aria-hidden="true"
              />
              <span className="text-xs font-black tracking-widest text-white/60 uppercase">
                Loading FEC filings...
              </span>
            </div>
          ) : !money ? (
            <p className="max-w-3xl py-4 text-sm leading-relaxed text-white/70">
              This dataset hasn&apos;t been published yet — the site&apos;s
              daily data pipeline will populate this section automatically.
            </p>
          ) : !hasMoney ? (
            <p className="max-w-3xl py-4 text-sm leading-relaxed text-white/70">
              No itemized individual contributions to federal committees
              affiliated with {candidate.name} have been reported to the FEC
              this cycle.
              {isGovernor &&
                ' Governors mostly raise through state campaign accounts, which are regulated by state law and do not appear in federal data.'}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <h3 className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
                    Raised This Cycle
                  </h3>
                  <p className="mt-1 font-mono text-2xl font-black text-emerald-400">
                    {fmtMoney(money.total)}
                  </p>
                  <p className="mt-1 text-[11px] text-white/60">
                    net individual donations, per FEC filings
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <h3 className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
                    Donors
                  </h3>
                  <p className="mt-1 font-mono text-2xl font-black text-white">
                    {money.donorCount.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[11px] text-white/60">
                    itemized contributors
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <h3 className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
                    Their Federal Committees
                  </h3>
                  <ul className="mt-1.5 space-y-1.5">
                    {money.committees.map((c) => (
                      <li key={c.id} className="text-xs text-white/80">
                        <span className="font-semibold">{c.name}</span>{' '}
                        <span className="font-mono text-emerald-400">
                          {fmtMoney(c.total)}
                        </span>{' '}
                        <a
                          href={`https://www.fec.gov/data/committee/${c.id}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-semibold tracking-wide text-[#4A90E2] uppercase hover:underline focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none"
                          aria-label={`Verify ${c.name} at FEC.gov (opens in new tab)`}
                        >
                          Verify ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 pt-2 lg:grid-cols-2">
                {/* Donor sectors donut */}
                <div>
                  <h3 className="mb-4 text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
                    Donations by Donor Sector
                  </h3>
                  <div className="flex flex-wrap items-center gap-6">
                    <svg
                      width="200"
                      height="200"
                      viewBox="0 0 230 230"
                      role="img"
                      aria-label={`Donut chart: donations by donor sector, total ${fmtMoney(sectorTotal)}`}
                    >
                      {segments.map((s) => (
                        <circle
                          key={s.name}
                          cx="115"
                          cy="115"
                          r={R}
                          fill="none"
                          stroke={sectorColor(s.name)}
                          strokeWidth="28"
                          strokeDasharray={`${String(Math.max(0, s.frac * CIRC - 2))} ${String(CIRC)}`}
                          transform={`rotate(${String(s.offset * 360 - 90)} 115 115)`}
                        />
                      ))}
                      <text
                        x="115"
                        y="112"
                        textAnchor="middle"
                        className="fill-white font-mono text-2xl font-black"
                      >
                        {fmtMoney(sectorTotal)}
                      </text>
                      <text
                        x="115"
                        y="134"
                        textAnchor="middle"
                        style={{
                          fill: 'rgba(255,255,255,0.5)',
                          fontSize: '11px',
                          fontWeight: 900,
                          letterSpacing: '0.15em',
                        }}
                      >
                        TOTAL
                      </text>
                    </svg>
                    <ul className="min-w-[180px] flex-1 space-y-1.5 text-xs">
                      {segments.map((s) => (
                        <li key={s.name} className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 flex-none rounded-sm"
                            style={{ backgroundColor: sectorColor(s.name) }}
                            aria-hidden="true"
                          />
                          <span className="text-white/70">{s.name}</span>
                          <span className="ml-auto pl-3 font-mono text-white/90">
                            {Math.round(s.frac * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Top donors */}
                <div>
                  <h3 className="mb-4 text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
                    Top Donors
                  </h3>
                  <ol className="space-y-2.5">
                    {money.topDonors.map((d, i) => (
                      <li
                        key={`${d.name}-${String(i)}`}
                        className="flex items-baseline gap-2 text-xs"
                      >
                        <span
                          className="h-2 w-2 flex-none self-center rounded-full"
                          style={{ backgroundColor: sectorColor(d.sector) }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-white/85">
                            {d.name}
                          </span>
                          {d.detail && (
                            <span className="block truncate text-[10px] text-white/60">
                              {d.detail}
                            </span>
                          )}
                        </span>
                        <span className="ml-auto flex-none font-mono text-emerald-400">
                          {fmtMoney(d.total)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <p className="border-t border-white/5 pt-3 text-[11px] leading-relaxed text-white/50">
                Figures are net of refunds, from FEC bulk filings, and cover
                federal committees only.
                {isGovernor &&
                  ' State campaign accounts are regulated by state law and are not part of federal data.'}
              </p>
            </>
          )}
        </section>

        {/* ---- Congressional record (only for those who actually served) ---- */}
        {candidate.icpsr ? (
          <>
            <section
              aria-label="Congressional service summary"
              className="space-y-3 rounded-3xl border border-white/10 !bg-zinc-900/90 p-6 shadow-2xl shadow-black/80"
            >
              <h2 className="text-xl font-bold tracking-tight text-white">
                Their Record in Congress
              </h2>
              <p className="max-w-3xl text-sm leading-relaxed text-white/70">
                {candidate.name} served as{' '}
                <strong className="text-white/90">
                  {candidate.formerCongress}
                </strong>
                . Everything below covers that service: every roll-call vote
                they cast, and the PAC money their campaign committee received
                over the same period — the same money-and-votes view this site
                shows for sitting members.
              </p>
              <p className="max-w-3xl text-xs leading-relaxed text-white/50">
                Money shown is PAC contributions to their congressional campaign
                committee. Money raised later for other offices (including
                presidential campaigns) is not included here, because pairing it
                with votes cast years earlier would be misleading.
              </p>
            </section>

            <WhosPaying
              politicianName={candidate.name}
              formerFederalSlug={candidate.slug}
            />
            <VotesMoneyTimeline
              icpsr={candidate.icpsr}
              politicianName={candidate.name}
              formerFederalSlug={candidate.slug}
            />
            <VoteSpotlights
              icpsr={candidate.icpsr}
              politicianName={candidate.name}
              formerFederalSlug={candidate.slug}
            />
          </>
        ) : (
          <section
            aria-label="Congressional voting record"
            className="space-y-3 rounded-3xl border border-white/10 !bg-zinc-900/90 p-6 shadow-2xl shadow-black/80"
          >
            <h2 className="text-xl font-bold tracking-tight text-white">
              Congressional Votes
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-white/70">
              <strong className="text-white/90">None.</strong> {candidate.name}{' '}
              is {candidate.title.startsWith('Former') ? '' : 'currently '}
              {candidate.title} and has never served in Congress, so there are
              no federal roll-call votes to show.
              {isGovernor &&
                ' Bills they sign or veto are state legislation, which is not part of any federal voting record.'}
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-white/70">
              Sitting senators and representatives who are also potential 2028
              candidates have full money-and-votes profiles — search their names
              from the{' '}
              <Link
                to="/"
                className="text-[#4A90E2] underline focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none"
              >
                home page
              </Link>
              .
            </p>
          </section>
        )}

        <p className="px-2 text-xs text-white/50">
          Candidate watch list sources: TrackAIPAC&apos;s 2028 page, widened
          with names carried in general 2028 coverage. Verified September 2026.
          Data updates daily.
        </p>
      </div>
    </div>
  );
}
