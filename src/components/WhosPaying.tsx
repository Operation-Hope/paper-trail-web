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
  if (!data || data.sectors.length === 0) return null;

  const R = 92;
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
      aria-label="PAC money by industry sector"
      className="space-y-4 rounded-3xl border border-white/10 !bg-zinc-900/90 p-6 shadow-2xl shadow-black/80"
    >
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Who&apos;s Paying
        </h2>
        <p className="text-sm text-white/50">
          Direct PAC contributions this cycle, by industry sector.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-10 py-4">
        <svg
          width="230"
          height="230"
          viewBox="0 0 230 230"
          role="img"
          aria-label={`Donut chart: PAC contributions by sector, total ${fmtMoney(data.total)}`}
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
            {fmtMoney(data.total)}
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
            PAC TOTAL
          </text>
        </svg>

        <ul className="min-w-[230px] space-y-2 text-sm">
          {segments.map((s) => (
            <li key={s.name} className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 flex-none rounded-sm"
                style={{ backgroundColor: sectorColor(s.name) }}
                aria-hidden="true"
              />
              <span className="text-white/75">{s.name}</span>
              <span className="ml-auto pl-4 font-mono text-white/90">
                {Math.round(s.frac * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
