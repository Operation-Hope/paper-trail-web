import { useQuery } from '@tanstack/react-query';
import { api, TimelineData } from '../services/api';
import { fmtMoney, shortDate, topVotesByNearbyMoney } from '../utils/moneyViz';

interface VoteSpotlightsProps {
  icpsr: number;
  politicianName: string;
}

// The three contested votes with the most PAC money within ±30 days, each
// summarized by the same fixed formula for every member — no editorial
// selection, and near-unanimous votes are excluded because timing around
// them carries no signal.
export function VoteSpotlights({ icpsr, politicianName }: VoteSpotlightsProps) {
  const { data } = useQuery<TimelineData>({
    queryKey: ['timelineData', icpsr, politicianName],
    queryFn: () => api.getTimelineData(icpsr, politicianName),
    enabled: !!icpsr,
  });

  if (!data || data.votes.length === 0) return null;
  const spotlights = topVotesByNearbyMoney(data, 3).filter((s) => s.total > 0);
  if (spotlights.length === 0) return null;

  return (
    <section
      aria-label="Vote spotlights"
      className="space-y-4 rounded-3xl border border-white/10 !bg-zinc-900/90 p-6 shadow-2xl shadow-black/80"
    >
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Vote Spotlights
        </h2>
        <p className="text-sm text-white/50">
          The contested votes with the most PAC money nearby (fixed ±30-day
          window) — computed the same way for every member. Proximity is not
          proof of influence.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {spotlights.map(({ vote, total, hits }) => {
          const lead = [...hits].sort((a, b) => b.amount - a.amount)[0];
          return (
            <article
              key={vote.rollnumber}
              className="space-y-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-sm text-white/80">
                  Vote #{vote.rollnumber}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-sm font-bold ${
                    vote.position === 'Yea'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : vote.position === 'Nay'
                        ? 'bg-rose-500/10 text-rose-400'
                        : 'bg-white/10 text-white/60'
                  }`}
                >
                  Voted {vote.position}
                </span>
                {vote.yea !== null && vote.nay !== null && (
                  <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-sm text-white/70">
                    {vote.yea}–{vote.nay}
                  </span>
                )}
                <span className="text-sm text-white/60">
                  {shortDate(vote.date)}
                </span>
              </div>
              <h3 className="text-[13px] leading-snug font-bold text-white/90">
                {vote.desc}
              </h3>
              <p className="text-xs leading-relaxed text-white/60">
                Within ±30 days of this vote:{' '}
                <strong className="font-mono text-emerald-400">
                  {fmtMoney(total)}
                </strong>{' '}
                from{' '}
                <strong className="text-white/85">
                  {hits.length} contributions
                </strong>{' '}
                — largest: <span className="text-white/85">{lead.donor}</span> (
                {fmtMoney(lead.amount)}).
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
