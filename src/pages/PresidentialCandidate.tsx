import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PRESIDENTIAL_2028 } from '../data/presidential2028';
import { MapPin, Landmark, CalendarClock } from 'lucide-react';

// Page for a potential 2028 presidential candidate who is not a sitting
// member of Congress. The FEC publishes 2028-cycle bulk data starting in
// 2027; until then there is nothing itemized to chart, and this page says so
// plainly rather than showing empty visualizations.
export default function PresidentialCandidate() {
  const { slug } = useParams<{ slug: string }>();
  const candidate = PRESIDENTIAL_2028.find((c) => c.slug === slug);

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

  return (
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-8 px-4 py-8 duration-700">
      <header className="border-primary/5 bg-card rounded-3xl border p-8 shadow-sm md:p-10">
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

      <div className="mx-auto w-full max-w-5xl px-4">
        <section
          aria-label="Campaign finance data status"
          className="space-y-4 rounded-3xl border border-white/10 !bg-zinc-900/90 p-6 shadow-2xl shadow-black/80"
        >
          <h2 className="text-xl font-bold tracking-tight text-white">
            Campaign Finance Data
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-white/70">
            The Federal Election Commission has not yet published bulk
            campaign-finance data for the 2028 presidential cycle — those files
            begin appearing in 2027, once 2028 committees start filing itemized
            reports. This page tracks a potential candidate on the public watch
            list; when 2028-cycle filings are published, this site&apos;s daily
            data pipeline will pick them up and money profiles will appear here.
          </p>
          <p className="max-w-3xl text-sm leading-relaxed text-white/70">
            Because {candidate.name} is not a sitting member of Congress, there
            are no congressional votes or 2026-cycle committee filings to show.
            Sitting senators and representatives who are also potential 2028
            candidates already have full money-and-votes profiles — search their
            names from the{' '}
            <Link
              to="/"
              className="text-[#4A90E2] underline focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none"
            >
              home page
            </Link>
            .
          </p>
          <p className="text-xs text-white/50">
            Candidate watch list source: TrackAIPAC&apos;s 2028 page, as of July
            2026.
          </p>
        </section>
      </div>
    </div>
  );
}
