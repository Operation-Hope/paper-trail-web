import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, TimelineData, TimelineVote } from '../services/api';
import {
  DAY,
  daysLabel,
  fmtMoney,
  inWindow,
  sectorColor,
  shortDate,
  topVotesByNearbyMoney,
} from '../utils/moneyViz';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface VotesMoneyTimelineProps {
  icpsr: number;
  politicianName: string;
}

// SVG plot geometry (viewBox units)
const X0 = 50;
const X1 = 985;
const BASE = 210;
const Y_TOP = 40;
const Y_BOT = 185;
const AMOUNT_CAP = 10000;

const T0 = Date.parse('2025-01-03');

export function VotesMoneyTimeline({
  icpsr,
  politicianName,
}: VotesMoneyTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [windowDays, setWindowDays] = useState<number>(30);
  const [selectedRoll, setSelectedRoll] = useState<number | null>(null);

  const { data, isLoading } = useQuery<TimelineData>({
    queryKey: ['timelineData', icpsr, politicianName],
    queryFn: () => api.getTimelineData(icpsr, politicianName),
    enabled: !!icpsr,
  });

  const T1 = useMemo(() => Date.now(), []);
  const xOf = (iso: string): number =>
    X0 + ((Date.parse(iso) - T0) / (T1 - T0)) * (X1 - X0);
  const yOf = (amount: number): number =>
    Y_BOT - (Math.min(amount, AMOUNT_CAP) / AMOUNT_CAP) * (Y_BOT - Y_TOP);

  const defaultRoll = useMemo(() => {
    if (!data || data.votes.length === 0) return null;
    const top = topVotesByNearbyMoney(data, 1);
    return top.length > 0 ? top[0].vote.rollnumber : data.votes[0].rollnumber;
  }, [data]);

  const selected = useMemo(() => {
    if (!data) return null;
    const roll = selectedRoll ?? defaultRoll;
    return data.votes.find((v) => v.rollnumber === roll) ?? null;
  }, [data, selectedRoll, defaultRoll]);

  const hits = useMemo(() => {
    if (!data || !selected) return [];
    return data.donations
      .filter((d) => inWindow(d, selected, windowDays))
      .sort(
        (a, b) =>
          Math.abs(Date.parse(a.date) - Date.parse(selected.date)) -
          Math.abs(Date.parse(b.date) - Date.parse(selected.date))
      );
  }, [data, selected, windowDays]);

  const months = useMemo(() => {
    const out: { t: number; label: string | null }[] = [];
    for (let year = 2025; year <= 2100; year++) {
      for (let month = 0; month < 12; month++) {
        const t = Date.UTC(year, month, 1);
        if (t < T0) continue;
        if (t > T1) return out;
        const labels: Record<number, string> = {
          0: `Jan '${String(year % 100)}`,
          3: 'Apr',
          6: 'Jul',
          9: 'Oct',
        };
        out.push({ t, label: labels[month] ?? null });
      }
    }
    return out;
  }, [T1]);

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
          Loading timeline...
        </span>
      </div>
    );
  }
  if (!data || data.votes.length === 0 || !selected) return null;

  const selectedIndex = data.votes.findIndex(
    (v) => v.rollnumber === selected.rollnumber
  );

  const stepVote = (delta: number) => {
    const nextIndex = selectedIndex + delta;
    if (nextIndex < 0 || nextIndex >= data.votes.length) return;
    setSelectedRoll(data.votes[nextIndex].rollnumber);
  };

  const snapToNearestVote = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xSvg = ((clientX - rect.left) / rect.width) * 1000;
    const t = T0 + ((xSvg - X0) / (X1 - X0)) * (T1 - T0);
    let best: TimelineVote | null = null;
    let bestDist = Infinity;
    for (const v of data.votes) {
      const dist = Math.abs(Date.parse(v.date) - t);
      if (dist < bestDist) {
        bestDist = dist;
        best = v;
      }
    }
    if (best) setSelectedRoll(best.rollnumber);
  };

  const windowX0 = Math.max(
    X0 - 6,
    xOf(new Date(Date.parse(selected.date) - windowDays * DAY).toISOString())
  );
  const windowX1 = Math.min(
    X1 + 6,
    xOf(new Date(Date.parse(selected.date) + windowDays * DAY).toISOString())
  );
  const total = hits.reduce((s, d) => s + d.amount, 0);
  const voteTally =
    selected.yea !== null && selected.nay !== null
      ? `${String(selected.yea)}–${String(selected.nay)}`
      : null;

  return (
    <section
      aria-label="Votes and money timeline"
      className="space-y-4 rounded-3xl border border-white/10 !bg-zinc-900/90 p-6 shadow-2xl shadow-black/80"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-white/5 pb-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Votes &amp; Money Timeline
          </h2>
          <p className="text-sm text-white/50">
            Every contribution is a dot (height &amp; size = amount, color =
            sector); every roll-call vote is a tick on the baseline. Click the
            chart to select the nearest vote.
          </p>
        </div>
        <div
          className="inline-flex flex-none shrink-0 self-start overflow-visible rounded-lg border border-white/10"
          role="group"
          aria-label="Money window size"
        >
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={windowDays === d}
              onClick={() => {
                setWindowDays(d);
              }}
              className={`px-4 py-1.5 font-mono text-sm font-bold whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none ${
                windowDays === d
                  ? 'bg-[#4A90E2]/20 text-[#8ab8ec]'
                  : 'text-white/60 hover:text-white/85'
              } ${d !== 30 ? 'border-l border-white/10' : ''} ${d === 30 ? 'rounded-l-lg' : ''} ${d === 90 ? 'rounded-r-lg' : ''}`}
            >
              ±{d}d
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-white/70">
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full bg-[#3987e5]"
            aria-hidden="true"
          />
          contribution (size = amount)
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3.5 w-[2px] rounded bg-white/70"
            aria-hidden="true"
          />
          roll-call vote
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-5 rounded-sm border border-[#4A90E2]/50 bg-[#4A90E2]/20"
            aria-hidden="true"
          />
          money window
        </span>
      </div>

      <div
        className="overflow-x-auto focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none"
        role="region"
        aria-label="Timeline chart (scrolls horizontally on small screens)"
        tabIndex={0}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1000 250"
          role="img"
          aria-label={`Timeline of ${String(data.donations.length)} contributions and ${String(data.votes.length)} votes this cycle. Selected: vote ${String(selected.rollnumber)} on ${selected.date}. Use the previous and next vote buttons below to navigate.`}
          className="block h-auto w-full min-w-[720px] cursor-pointer"
          onClick={(e) => {
            snapToNearestVote(e.clientX);
          }}
        >
          {/* month grid + quarter labels */}
          {months.map((m) => {
            const x = X0 + ((m.t - T0) / (T1 - T0)) * (X1 - X0);
            return (
              <g key={m.t}>
                <line
                  x1={x}
                  y1={28}
                  x2={x}
                  y2={BASE}
                  stroke="rgba(255,255,255,0.04)"
                />
                {m.label && (
                  <text
                    x={x}
                    y={240}
                    textAnchor="middle"
                    style={{
                      fill: 'rgba(255,255,255,0.45)',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {m.label}
                  </text>
                )}
              </g>
            );
          })}
          {/* amount scale */}
          {[
            [10000, '$10K+'],
            [5000, '$5K'],
            [1000, '$1K'],
          ].map(([amt, label]) => (
            <g key={amt}>
              <line
                x1={X0}
                y1={yOf(amt as number)}
                x2={X1}
                y2={yOf(amt as number)}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="2 5"
              />
              <text
                x={X0 - 8}
                y={yOf(amt as number) + 3}
                textAnchor="end"
                style={{
                  fill: 'rgba(255,255,255,0.4)',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                }}
              >
                {label}
              </text>
            </g>
          ))}
          {/* baseline */}
          <line
            x1={X0 - 6}
            y1={BASE}
            x2={X1 + 6}
            y2={BASE}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.5}
          />
          {/* money window band */}
          <rect
            x={windowX0}
            y={30}
            width={Math.max(0, windowX1 - windowX0)}
            height={BASE - 30}
            rx={5}
            fill="rgba(74,144,226,0.12)"
            stroke="rgba(74,144,226,0.35)"
            className="motion-safe:transition-all motion-safe:duration-200"
          />
          {/* vote density strip */}
          {data.votes.map((v) => (
            <line
              key={v.rollnumber}
              x1={xOf(v.date)}
              y1={BASE - (v.contested ? 9 : 5)}
              x2={xOf(v.date)}
              y2={BASE + (v.contested ? 9 : 5)}
              stroke={
                v.rollnumber === selected.rollnumber
                  ? '#4A90E2'
                  : v.contested
                    ? 'rgba(255,255,255,0.45)'
                    : 'rgba(255,255,255,0.16)'
              }
              strokeWidth={v.rollnumber === selected.rollnumber ? 3.5 : 1}
              strokeLinecap="round"
            />
          ))}
          {/* donation dots */}
          {data.donations.map((d, i) => {
            const hit = inWindow(d, selected, windowDays);
            return (
              <circle
                key={`${d.date}-${String(i)}`}
                cx={xOf(d.date)}
                cy={yOf(d.amount)}
                r={3 + (Math.min(d.amount, AMOUNT_CAP) / AMOUNT_CAP) * 4}
                fill={sectorColor(d.sector)}
                fillOpacity={hit ? 1 : 0.3}
                stroke={hit ? 'rgba(255,255,255,0.7)' : 'none'}
                strokeWidth={hit ? 1 : 0}
              >
                <title>{`${d.donor} · ${fmtMoney(d.amount)} · ${shortDate(d.date)}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-1 gap-5 border-t border-white/5 pt-4 md:grid-cols-2">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label="Previous vote"
              disabled={selectedIndex <= 0}
              onClick={() => {
                stepVote(-1);
              }}
              className="flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] p-1.5 text-white/80 transition hover:bg-white/[0.08] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next vote"
              disabled={selectedIndex >= data.votes.length - 1}
              onClick={() => {
                stepVote(1);
              }}
              className="flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] p-1.5 text-white/80 transition hover:bg-white/[0.08] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-sm text-white/80">
              Vote #{selected.rollnumber}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-sm font-bold ${
                selected.position === 'Yea'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : selected.position === 'Nay'
                    ? 'bg-rose-500/10 text-rose-400'
                    : 'bg-white/10 text-white/60'
              }`}
            >
              Voted {selected.position}
            </span>
            {voteTally && (
              <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-sm text-white/70">
                {voteTally}
              </span>
            )}
            {!selected.contested && (
              <span className="rounded border border-white/10 px-2 py-0.5 text-sm font-semibold text-white/60">
                Near-unanimous
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-white/90">{selected.desc}</p>
          <p className="mt-1 text-xs text-white/60">
            Roll call on {shortDate(selected.date)}
          </p>
        </div>
        <div>
          <h3 className="mb-2 text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
            Contributions within ±{windowDays} days
          </h3>
          {hits.length === 0 ? (
            <p className="text-xs text-white/60">
              No PAC contributions in this window.
            </p>
          ) : (
            <>
              <div
                className="max-h-64 overflow-y-auto pr-1.5 focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none"
                role="region"
                aria-label="All contributions in the selected window"
                tabIndex={0}
              >
                <ul className="space-y-1.5 text-xs">
                  {hits.map((d, i) => (
                    <li
                      key={`${d.date}-${d.donor}-${String(i)}`}
                      className="flex items-baseline gap-2"
                    >
                      <span
                        className="h-2 w-2 flex-none self-center rounded-full"
                        style={{ backgroundColor: sectorColor(d.sector) }}
                        aria-hidden="true"
                      />
                      <span className="truncate font-semibold text-white/85">
                        {d.donor}
                      </span>
                      {d.cmte_id && (
                        <a
                          href={`https://www.fec.gov/data/committee/${d.cmte_id}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-none text-[10px] font-semibold tracking-wide text-[#4A90E2] uppercase hover:underline focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none"
                          aria-label={`Verify ${d.donor} at FEC.gov (opens in new tab)`}
                        >
                          Verify at FEC.gov ↗
                        </a>
                      )}
                      <span className="flex-none text-[11px] text-white/60">
                        {daysLabel(d, selected)}
                      </span>
                      <span className="ml-auto flex-none font-mono text-emerald-400">
                        {fmtMoney(d.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-1.5 flex border-t border-white/5 pt-1.5 text-xs text-white/70">
                {hits.length} contributions in window
                <span className="ml-auto font-mono font-bold text-emerald-400">
                  {fmtMoney(total)}
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
