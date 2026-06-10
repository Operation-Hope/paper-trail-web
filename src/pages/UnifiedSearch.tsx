import { useNavigate } from 'react-router-dom';
import { PoliticianSearchResults } from '../components/PoliticianSearchResults';
import { useState } from 'react';
import { Politician } from '../types/api';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Suspense } from 'react';

// 🌟 NEW: Legal Disclaimer & Data Source Component
function LegalFooter() {
  return (
    <footer className="mt-20 border-t border-white/5 bg-zinc-950 px-6 py-12 text-zinc-400">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* DATA SOURCES & METHODOLOGY */}
        <div className="space-y-3">
          <h4 className="font-mono text-xs font-bold tracking-widest text-white uppercase">
            Data Sources & Transparency Declarations
          </h4>
          <p className="text-xs leading-relaxed text-zinc-400">
            Project Paper Trail aggregates, cross-references, and visualizes
            unmodified public record datasets provided by third-party
            institutional repositories. This platform processes information
            directly from the following endpoints:
          </p>
          <ul className="grid grid-cols-1 gap-2 font-mono text-[11px] text-zinc-500 sm:grid-cols-3">
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4A90E2]" />
              Legislative History: Voteview (UCLA)
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4A90E2]" />
              Campaign Finance: DIME Dataset (Stanford University)
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4A90E2]" />
              Federal Logs: Database on Ideology, Money in Elections
            </li>
          </ul>
        </div>

        <hr className="border-white/5" />

        {/* LAWYER-APPROVED DISCLAIMER & PROTECTIONS */}
        <div className="space-y-4 text-[11px] leading-relaxed text-zinc-500">
          <h4 className="font-mono text-xs font-bold tracking-widest text-zinc-400 uppercase">
            Legal Disclaimers & Terms of Use
          </h4>

          <p>
            <strong className="text-zinc-300">
              1. No Expression of Fact or Implication of Impropriety:
            </strong>{' '}
            This application is strictly an educational data-visualization tool
            designed to show chronological proximity between public campaign
            contributions and public congressional roll call votes. The
            proximity of a contribution to a legislative vote{' '}
            <strong className="text-zinc-400">
              does not imply, evidence, or constitute a quid-pro-quo
              relationship, political corruption, bribery, or illegal activity
            </strong>{' '}
            of any kind by any listed politician, donor, campaign, or committee.
          </p>

          <p>
            <strong className="text-zinc-300">
              2. Warranty Disclaimer & Potential Data Inaccuracies:
            </strong>{' '}
            All data is provided &ldquo;as is&rdquo; without warranties of any
            kind, either express or implied. Due to the inherent nature of
            processing large-scale historical datasets, automated algorithmic
            name-matching filters, and dependency on third-party repositories,{' '}
            <strong className="text-zinc-400">
              Project Paper Trail cannot and does not guarantee 100% accuracy,
              completeness, or timeliness of the data.
            </strong>{' '}
            Data may contain typographical errors, historical discrepancies, lag
            times, or matching anomalies. Users are strongly encouraged to
            cross-reference entries with official records at FEC.gov and
            Congress.gov.
          </p>

          <p>
            <strong className="text-zinc-300">
              3. Limitation of Liability:
            </strong>{' '}
            Under no circumstances—including negligence—shall the creators,
            developers, or affiliates of Project Paper Trail be held liable for
            any direct, indirect, incidental, special, or consequential damages,
            legal disputes, or reputational harm arising out of the use, misuse,
            or reliance upon the information visualized on this platform.
          </p>

          <p>
            <strong className="text-zinc-300">
              4. Safe Harbor Notice (Section 230):
            </strong>{' '}
            To the extent that any context, titles, or descriptions are pulled
            dynamically from open-source external databases, this site acts
            strictly as an interactive computer service provider under 47 U.S.C.
            &sect; 230 and is immune from liability regarding third-party source
            data transmissions.
          </p>
        </div>

        {/* COPYRIGHT NOTICE */}
        <div className="pt-4 text-center font-mono text-[10px] text-zinc-600">
          &copy; {new Date().getFullYear()} Project Paper Trail. All rights
          reserved. Distributed strictly for non-commercial educational and
          research purposes.
          <br />
          This site is not affiliated with, endorsed by, or representative of
          the United States Government or any political campaign.
        </div>
      </div>
    </footer>
  );
}

export default function UnifiedSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSelect = (politician: Politician) => {
    if (politician.id) {
      navigate(`/politician/${politician.id}`);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col justify-between bg-zinc-950 text-white selection:bg-[#4A90E2]/30">
      <main className="flex-grow px-4 md:px-8">
        <div className="animate-in fade-in mx-auto max-w-4xl space-y-10 pt-12 duration-500">
          <div className="space-y-2 text-center">
            <h1 className="text-6xl font-black tracking-tighter text-white uppercase">
              Corruption <span className="text-[#4A90E2]">Watch</span>
            </h1>
          </div>

          <div className="relative mx-auto max-w-2xl">
            <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <Input
              className="bg-card focus-visible:ring-primary/20 h-14 rounded-2xl border-white/10 pl-12 text-lg text-white placeholder-white"
              placeholder="Search for a sitting U.S. Senator or Representative ..."
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
            />
          </div>

          {searchQuery && (
            <div className="space-y-4 pb-12">
              <h2 className="px-2 text-[10px] font-black tracking-[0.3em] text-zinc-500 uppercase">
                Search Results
              </h2>
              <Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <Loader2 className="mb-4 h-8 w-8 animate-spin text-[#4A90E2]" />
                    <p className="text-[10px] font-black tracking-widest text-white uppercase">
                      Querying VoteView
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
        </div>
      </main>

      {/* 🌟 NEW: Rendered right here at the very bottom of the page container */}
      <LegalFooter />
    </div>
  );
}
