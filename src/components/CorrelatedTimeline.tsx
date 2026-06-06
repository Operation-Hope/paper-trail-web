import { useState, useEffect } from 'react';
import { api, CorrelatedDonation } from '../services/api';
import { Loader2, Calendar, ArrowRightLeft, DollarSign } from 'lucide-react';

interface CorrelatedTimelineProps {
  icpsr: number;
  politicianName: string;
}

export function CorrelatedTimeline({
  icpsr,
  politicianName,
}: CorrelatedTimelineProps) {
  const [data, setData] = useState<CorrelatedDonation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchCorrelations() {
      setLoading(true);
      try {
        // Hard-coded to exactly 30 days
        const results = await api.getVoteCorrelatedDonations(
          icpsr,
          politicianName
        );
        setData(results);
      } catch (error) {
        console.error('Failed to load timeline correlations:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCorrelations();
  }, [icpsr, politicianName]); // Runs once when the politician changes

  return (
    <div className="bg-card space-y-6 rounded-2xl border border-white/10 p-6">
      {/* Static Header Section */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/5 pb-4 md:flex-row md:items-center">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-white">
            Vote-Donation Proximity Tracker
          </h3>
          <p className="text-sm text-white/50">
            Showing campaign contributions within 30 days of legislative votes.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="text-primary mb-2 h-8 w-8 animate-spin" />
          <p className="font-mono text-xs tracking-widest text-white/40 uppercase">
            Scanning Parquet Clashes...
          </p>
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/5 py-12 text-center">
          <p className="text-sm text-white/40">
            No corporate donations found within a 30-day frame of any 2024
            votes.
          </p>
        </div>
      ) : (
        <div className="custom-scrollbar max-h-[500px] space-y-4 overflow-y-auto pr-2">
          {data.map((item, index) => {
            const isBefore =
              new Date(item.donation_date) <= new Date(item.vote_date);

            return (
              <div
                key={`${item.vote_id}-${index}`}
                className="group relative grid grid-cols-1 items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-200 hover:bg-white/[0.04] lg:grid-cols-12"
              >
                {/* Left Side: Legislative Action */}
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

                {/* Center Badge: The Time Proximity Metric */}
                <div className="flex justify-start lg:col-span-2 lg:justify-center">
                  <span
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold ${
                      isBefore
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                        : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400'
                    }`}
                  >
                    <ArrowRightLeft className="h-3 w-3" />
                    {item.days_difference === 0
                      ? 'Same Day'
                      : `${item.days_difference}d ${isBefore ? 'Before' : 'After'}`}
                  </span>
                </div>

                {/* Right Side: The Contribution Received */}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
