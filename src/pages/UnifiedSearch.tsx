import { useNavigate } from 'react-router-dom';
// 🎯 FIXED: Changed from named import to default import to resolve TS2614
import PoliticianSearchResults from '../components/PoliticianSearchResults';
import { useState, useEffect, Suspense } from 'react';
import { Politician } from '../types/api';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';

export default function UnifiedSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isNarrow, setIsNarrow] = useState(false);
  const navigate = useNavigate();

  // Placeholders can't wrap, and the full prompt physically can't fit a
  // phone-width input on one line — so phones get a shorter prompt (the
  // sr-only label keeps the full wording for screen readers).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => {
      setIsNarrow(mq.matches);
    };
    update();
    mq.addEventListener('change', update);
    return () => {
      mq.removeEventListener('change', update);
    };
  }, []);

  const handleSelect = (politician: Politician) => {
    if (!politician.id) return;
    if (politician.id.startsWith('2028-')) {
      void navigate(`/candidate/${politician.id.slice(5)}`);
    } else {
      void navigate(`/politician/${politician.id}`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-zinc-950 text-white selection:bg-[#4A90E2]/30">
      <main
        className="px-4 md:px-8"
        id="main-content"
        aria-label="Main Search Hub"
      >
        <div className="animate-in fade-in mx-auto max-w-4xl duration-500">
          <div className="flex h-32 items-center justify-center text-center md:h-40">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase sm:text-5xl md:text-6xl">
              Corruption <span className="text-[#4A90E2]">Watch</span>
            </h1>
          </div>

          <div className="relative mx-auto mt-6 max-w-2xl">
            <label htmlFor="politician-search-input" className="sr-only">
              Search for a sitting U.S. Senator, House Representative, or 2028
              presidential candidate
            </label>
            <Search
              className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-500"
              aria-hidden="true"
            />
            <Input
              id="politician-search-input"
              type="search"
              className="bg-card focus-visible:ring-primary/20 h-14 rounded-2xl border-white/10 pl-12 text-lg text-white placeholder-white/50 placeholder:text-sm focus:ring-2 focus:ring-[#4A90E2] focus:outline-none sm:placeholder:text-lg"
              placeholder={
                isNarrow
                  ? 'Search politicians & 2028 candidates ...'
                  : 'Search for a sitting U.S. Senator, House Representative, or 2028 presidential candidate ...'
              }
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              value={searchQuery}
              aria-controls={searchQuery ? 'search-results-region' : undefined}
            />
          </div>

          {searchQuery && (
            <div
              id="search-results-region"
              className="space-y-4 pb-12"
              role="region"
              aria-live="polite"
            >
              <h2 className="px-2 text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase">
                Search Results
              </h2>
              <Suspense
                fallback={
                  <div
                    className="flex flex-col items-center justify-center py-20 opacity-40"
                    role="status"
                  >
                    <Loader2 className="mb-4 h-8 w-8 animate-spin text-[#4A90E2]" />
                    <p className="text-[10px] font-black tracking-widest text-white uppercase">
                      Querying Data Cloud...
                    </p>
                  </div>
                }
              >
                <PoliticianSearchResults
                  searchQuery={searchQuery}
                  onSelectPolitician={handleSelect}
                />
              </Suspense>
            </div>
          )}

          {/* Legal Disclaimer Box */}
          <footer className="mx-auto mt-16 max-w-3xl space-y-4 pt-8 text-xs text-zinc-400">
            <p>
              <strong>* Purpose and Data Sources:</strong> Corruption Watch is
              an independent, non-partisan, open-source data visualization
              platform compiled strictly for educational, journalism, and
              research transparency purposes. Legislative voting records are
              sourced dynamically from the <em>UCLA VoteView archive</em>.
              Campaign finance data is compiled via automated daily sync
              pipelines sourcing public record filings from the{' '}
              <strong>
                Federal Election Commission (FEC) bulk data repositories for the
                active 2026 election cycle
              </strong>
              , including direct committee contributions to candidates,
              individual contributions earmarked through conduit committees, and
              independent expenditures made by super PACs and other committees.
              This platform is not affiliated with, funded by, or endorsed by
              any government entity, political party, or candidate.
            </p>

            <p>
              <strong>
                * Disclaimer of Implication (No Statement of Corruption):
              </strong>{' '}
              The name &quot;Corruption Watch&quot; is a title intended to
              reflect the public interest in tracking money in politics. The
              correlation or proximity of a campaign contribution to a
              legislative vote displayed on this site is purely mathematical and
              algorithmic. It does not constitute a statement, accusation, or
              implication of legal conflict of interest, bribery, illicit
              political behavior, or actual corruption by any individual
              senator, representative, or donor. Many contributions and votes
              occur close together naturally due to the standard calendar of the
              legislative cycle. Independent expenditures are, by law, made
              without coordination with any candidate; their display alongside a
              politician indicates only that the spending referenced that
              politician&apos;s race, not that the politician received,
              directed, or approved the funds. Contributions attributed to a
              conduit committee reflect FEC-reported pass-throughs of individual
              donations facilitated by that conduit, not the conduit&apos;s own
              treasury funds.
            </p>

            <p>
              <strong>
                * Real-Time Data Discrepancies & Limitation of Liability:
              </strong>{' '}
              Data is aggregated dynamically via client-side processing
              structures and provided strictly &quot;as-is&quot; and
              &quot;as-available&quot; without explicit or implied warranties of
              precision, completeness, or instantaneous real-time parity.{' '}
              <strong>
                Because public record filings are sourced directly from ongoing
                federal disclosures, data may contain temporary clerical
                duplicates, amendments, or submission lags inherent to the FEC
                reporting timeline.
              </strong>{' '}
              Displayed amounts are net figures: amendments and refunds reported
              by filers are summed into totals rather than shown as separate
              entries, and figures may shift as filings are amended. The
              creators of this platform disclaim all liability for any errors,
              omissions, or inaccuracies in the data, or for any actions taken
              in reliance on the information provided herein.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
