import { useQuery } from '@tanstack/react-query';
import { api, WhosPaying as WhosPayingData } from '../services/api';
import { fmtMoney, sectorColor } from '../utils/moneyViz';
import { Loader2 } from 'lucide-react';

interface WhosPayingProps {
  politicianName: string;
}

export function WhosPaying({ politicianName }: WhosPayingProps) {
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
  if (!data || data.topDonors.length === 0) return null;

  const maxTotal = data.topDonors[0].total;
  const R = 62;
  const CIRC = 2 * Math.PI * R;
  const fracs = data.sectors.map((s) =>
    data.total > 0 ? s.value / data.total : 0
  );
  const segments = data.sectors.map((s, i) => ({
    ...s,
    frac: fracs[i],
    offset: fracs.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  return (
    <section
      aria-label="Top donors and sector breakdown"
      className="space-y-4 rounded-3xl border border-white/10 !bg-zinc-900/90 p-6 shadow-2xl shadow-black/80"
    >
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Who&apos;s Paying
        </h2>
        <p className="text-sm text-white/50">
          Direct PAC contributions this cycle, ranked — color marks the industry
          sector.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Top donors bar list */}
        <div className="lg:col-span-3">
          <h3 className="mb-4 text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
            Top PAC Donors
          </h3>
          <ol className="space-y-3">
            {data.topDonors.map((d) => (
              <li
                key={d.name}
                className="grid grid-cols-[minmax(0,11rem)_1fr_4.5rem] items-center gap-3"
              >
                <span className="truncate text-xs font-semibold text-white/85">
                  {d.name}
                  <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider text-white/60 uppercase">
                    <span
                      className="h-1.5 w-1.5 flex-none rounded-full"
                      style={{ backgroundColor: sectorColor(d.sector) }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{d.sector}</span>
                  </span>
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-white/5">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${String(Math.max(2, (d.total / maxTotal) * 100))}%`,
                      backgroundColor: sectorColor(d.sector),
                    }}
                  />
                </span>
                <span className="text-right font-mono text-xs text-emerald-400">
                  {fmtMoney(d.total)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Sector donut + legend */}
        <div className="lg:col-span-2">
          <h3 className="mb-4 text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
            Money by Sector
          </h3>
          <div className="flex flex-wrap items-center gap-5">
            <svg
              width="150"
              height="150"
              viewBox="0 0 150 150"
              role="img"
              aria-label={`Donut chart: PAC contributions by sector, total ${fmtMoney(data.total)}`}
            >
              {segments.map((s) => (
                <circle
                  key={s.name}
                  cx="75"
                  cy="75"
                  r={R}
                  fill="none"
                  stroke={sectorColor(s.name)}
                  strokeWidth="18"
                  strokeDasharray={`${String(Math.max(0, s.frac * CIRC - 2))} ${String(CIRC)}`}
                  transform={`rotate(${String(s.offset * 360 - 90)} 75 75)`}
                />
              ))}
              <text
                x="75"
                y="73"
                textAnchor="middle"
                className="fill-white font-mono text-base font-black"
              >
                {fmtMoney(data.total)}
              </text>
              <text
                x="75"
                y="89"
                textAnchor="middle"
                style={{
                  fill: 'rgba(255,255,255,0.5)',
                  fontSize: '8px',
                  fontWeight: 900,
                  letterSpacing: '0.15em',
                }}
              >
                PAC TOTAL
              </text>
            </svg>
            <ul className="min-w-[150px] flex-1 space-y-1.5 text-[11px]">
              {segments.map((s) => (
                <li key={s.name} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 flex-none rounded-sm"
                    style={{ backgroundColor: sectorColor(s.name) }}
                    aria-hidden="true"
                  />
                  <span className="text-white/70">{s.name}</span>
                  <span className="ml-auto font-mono text-white/85">
                    {Math.round(s.frac * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
