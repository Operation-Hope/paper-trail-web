import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, WhosPaying as WhosPayingData } from '../services/api';
import { fmtMoney, sectorColor } from '../utils/moneyViz';
import { Loader2 } from 'lucide-react';

interface WhosPayingProps {
  politicianName: string;
}

// Canvas is larger than the visible ring so the enlarged/popped selected
// slice (plus its glow) never gets clipped by the SVG's implicit
// overflow:hidden — the ring itself is unchanged, there's just more margin
// around it now.
const CX = 160;
const CY = 160;
const CANVAS = 320;
const BASE_R = 92;
const POP_R = 100;
const POP_DIST = 9;

export function WhosPaying({ politicianName }: WhosPayingProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const glowId = useId();

  const { data, isLoading } = useQuery<WhosPayingData>({
    queryKey: ['whosPaying', politicianName],
    queryFn: () => api.getWhosPaying(politicianName),
    enabled: !!politicianName,
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
          Loading donors...
        </span>
      </div>
    );
  }
  if (!data || data.sectors.length === 0) return null;

  const fracs = data.sectors.map((s) =>
    data.total > 0 ? s.value / data.total : 0
  );
  const segments = data.sectors.map((s, i) => ({
    ...s,
    frac: fracs[i],
    offset: fracs.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  const selectedSector = segments.find((s) => s.name === selected) ?? null;

  const toggleSector = (name: string) => {
    setSelected((prev) => (prev === name ? null : name));
  };
  const onSliceKeyDown = (
    e: React.KeyboardEvent<SVGGElement>,
    name: string
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleSector(name);
    }
  };

  return (
    <section
      aria-label="PAC money by industry sector"
      className="space-y-4 rounded-3xl border border-white/10 !bg-zinc-900/90 p-6 shadow-2xl shadow-black/80"
    >
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Who&apos;s Paying
        </h2>
        <p className="text-sm text-white/50">
          Direct PAC contributions this cycle, by industry sector. Click a slice
          to see its top donors.
        </p>
      </div>

      {/* Fixed two-column layout from `sm` up so the donor panel always sits
          to the right of the chart — a flex-wrap layout here would
          occasionally wrap it below depending on content width. Phones
          (below `sm`) still stack, which is unavoidable at that width. */}
      <div className="grid grid-cols-1 items-center gap-8 py-4 sm:grid-cols-[auto_minmax(0,1fr)]">
        <svg
          viewBox={`0 0 ${String(CANVAS)} ${String(CANVAS)}`}
          role="group"
          className="mx-auto block aspect-square w-full max-w-[320px] sm:mx-0 sm:w-[320px] sm:max-w-none"
          aria-label={`Donut chart: PAC contributions by sector, total ${fmtMoney(data.total)}. Each slice is a button.`}
        >
          <defs>
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4.5" />
            </filter>
          </defs>
          {segments.map((s) => {
            const isSelected = s.name === selected;
            const isHovered = s.name === hovered;
            const r = isSelected ? POP_R : BASE_R;
            const circ = 2 * Math.PI * r;
            const rotateDeg = s.offset * 360 - 90;
            const midDeg = (s.offset + s.frac / 2) * 360 - 90;
            const midRad = (midDeg * Math.PI) / 180;
            const dx = isSelected ? Math.cos(midRad) * POP_DIST : 0;
            const dy = isSelected ? Math.sin(midRad) * POP_DIST : 0;
            const strokeWidth = isSelected ? 30 : 28;
            const dasharray = `${String(Math.max(0, s.frac * circ - 2))} ${String(circ)}`;
            const transform = `translate(${String(dx)} ${String(dy)}) rotate(${String(rotateDeg)} ${String(CX)} ${String(CY)})`;
            return (
              <g
                key={s.name}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${s.name}: ${fmtMoney(s.value)}, ${String(Math.round(s.frac * 100))}% of total. ${isSelected ? 'Selected — showing top donors. Activate again to return to sector view.' : 'Activate to see its top donors.'}`}
                className="cursor-pointer outline-none motion-safe:transition-transform motion-safe:duration-200"
                onClick={() => {
                  toggleSector(s.name);
                }}
                onKeyDown={(e) => {
                  onSliceKeyDown(e, s.name);
                }}
                onMouseEnter={() => {
                  setHovered(s.name);
                }}
                onMouseLeave={() => {
                  setHovered(null);
                }}
                onFocus={() => {
                  setHovered(s.name);
                }}
                onBlur={() => {
                  setHovered(null);
                }}
              >
                {/* Wider invisible stroke so thin slices stay easy to hit
                    on touch screens; painted-but-transparent still receives
                    pointer events per the SVG spec. */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={r}
                  fill="none"
                  stroke="#000"
                  strokeOpacity={0}
                  strokeWidth={44}
                  strokeDasharray={dasharray}
                  transform={transform}
                />
                {/* Soft glow along the slice's curved edges (inner + outer
                    rim): a blurred, wider stroke sitting behind the crisp
                    band, rather than a bright line through its center. */}
                {(isHovered || isSelected) && (
                  <circle
                    cx={CX}
                    cy={CY}
                    r={r}
                    fill="none"
                    stroke="white"
                    strokeOpacity={isSelected ? 0.85 : 0.6}
                    strokeWidth={strokeWidth + 16}
                    strokeDasharray={dasharray}
                    transform={transform}
                    filter={`url(#${glowId})`}
                    className="pointer-events-none"
                  />
                )}
                <circle
                  cx={CX}
                  cy={CY}
                  r={r}
                  fill="none"
                  stroke={sectorColor(s.name)}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dasharray}
                  transform={transform}
                  className="pointer-events-none motion-safe:transition-all motion-safe:duration-200"
                />
              </g>
            );
          })}
          <text
            x={CX}
            y={selectedSector ? CY - 9 : CY - 3}
            textAnchor="middle"
            className="fill-white font-mono text-2xl font-black"
          >
            {fmtMoney(selectedSector ? selectedSector.value : data.total)}
          </text>
          {selectedSector ? (
            <text
              x={CX}
              y={CY + 13}
              textAnchor="middle"
              style={{
                fill: 'rgba(255,255,255,0.6)',
                fontSize: '9px',
                fontWeight: 900,
                letterSpacing: '0.08em',
              }}
            >
              {selectedSector.name.length > 22
                ? `${selectedSector.name.slice(0, 21)}…`
                : selectedSector.name}
            </text>
          ) : (
            <text
              x={CX}
              y={CY + 19}
              textAnchor="middle"
              style={{
                fill: 'rgba(255,255,255,0.5)',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '0.15em',
              }}
            >
              PAC TOTAL
            </text>
          )}
        </svg>

        {selectedSector ? (
          <div className="min-w-0" aria-live="polite">
            <div className="mb-2 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <h3 className="text-xs font-black tracking-wider text-white/85 uppercase">
                Top Donors — {selectedSector.name}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                }}
                className="flex-none text-[10px] font-semibold tracking-wide text-[#4A90E2] uppercase hover:underline focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none"
              >
                Back to sectors
              </button>
            </div>
            {/* Horizontally scrollable on phones so the full donor name is
                reachable by swipe instead of being truncated; sm+ reverts to
                a fixed-width, truncated, non-scrolling list since there's
                room to show everything. */}
            <div
              className="overflow-x-auto focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none sm:overflow-visible"
              role="region"
              aria-label="Top donors for this sector (scrolls horizontally on small screens)"
              tabIndex={0}
            >
              <ol className="w-max min-w-full space-y-2 text-sm sm:w-auto">
                {selectedSector.topDonors.map((d, i) => (
                  <li
                    key={`${d.name}-${String(i)}`}
                    className="flex items-baseline gap-2 whitespace-nowrap sm:whitespace-normal"
                  >
                    <span className="w-4 flex-none font-mono text-[11px] text-white/60">
                      {i + 1}
                    </span>
                    <span className="flex-none text-white/85 sm:min-w-0 sm:flex-1 sm:truncate">
                      {d.name}
                    </span>
                    {d.cmte_id && (
                      <a
                        href={`https://www.fec.gov/data/committee/${d.cmte_id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-none text-[10px] font-semibold tracking-wide text-[#4A90E2] uppercase hover:underline focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none"
                        aria-label={`Verify ${d.name} at FEC.gov (opens in new tab)`}
                      >
                        <span className="sm:hidden">Verify ↗</span>
                        <span className="hidden sm:inline">
                          Verify at FEC.gov ↗
                        </span>
                      </a>
                    )}
                    <span className="flex-none pl-2 font-mono text-white/90 sm:ml-auto sm:pl-0">
                      {fmtMoney(d.total)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <ul className="min-w-0 space-y-2 text-sm">
            {segments.map((s) => (
              <li key={s.name}>
                <button
                  type="button"
                  onClick={() => {
                    toggleSector(s.name);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md text-left transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none"
                >
                  <span
                    className="h-2.5 w-2.5 flex-none rounded-sm"
                    style={{ backgroundColor: sectorColor(s.name) }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-white/75">
                    {s.name}
                  </span>
                  <span className="flex-none pl-4 font-mono text-white/90">
                    {Math.round(s.frac * 100)}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
