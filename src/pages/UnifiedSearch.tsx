import { useNavigate } from 'react-router-dom';
// 🎯 FIXED: Changed from named import to default import to resolve TS2614
import PoliticianSearchResults from '../components/PoliticianSearchResults';
import { useState, Suspense } from 'react';
import { Politician } from '../types/api';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';

export default function UnifiedSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSelect = (politician: Politician) => {
    if (politician.id) {
      navigate(`/politician/${politician.id}`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-zinc-950 text-white selection:bg-[#4A90E2]/30">
      <main className="px-4 md:px-8" id="main-content" aria-label="Main Search Hub">
        <div className="mx-auto max-w-4xl space-y-10 pt-12 animate-in fade-in duration-500">
          
          <div className="space-y-2 text-center">
            <h1 className="text-6xl font-black tracking-tighter text-white uppercase">
              Corruption <span className="text-[#4A90E2]">Watch</span>
            </h1>
          </div>

          <div className="relative mx-auto max-w-2xl">
            <label htmlFor="politician-search-input" className="sr-only">
              Search for a sitting U.S. Senator or Representative
            </label>
            <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <Input
              id="politician-search-input"
              type="search"
              className="bg-card focus-visible:ring-primary/20 h-14 rounded-2xl border-white/10 pl-12 text-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
              placeholder="Search for a sitting U.S. Senator or Representative ..."
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
              aria-controls="search-results-region"
              aria-expanded={searchQuery.length > 0}
            />
          </div>

          {searchQuery && (
            <div id="search-results-region" className="space-y-4 pb-12" role="region" aria-live="polite">
              <h2 className="px-2 text-[10px] font-black tracking-[0.3em] text-zinc-500 uppercase">
                Search Results
              </h2>
              <Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center py-20 opacity-40" role="status">
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
          <footer className="mt-16 border-t border-white/5 pt-8 text-xs text-zinc-500 space-y-4 max-w-3xl mx-auto">
  <p className="font-bold uppercase tracking-wider text-zinc-400">Legal Disclosures & Compliance Statement</p>
  
  <p>
    <strong>1. Purpose and Data Sources:</strong> Corruption Watch is an independent, non-partisan, open-source data visualization platform compiled strictly for educational, journalism, and research transparency purposes. All legislative metrics and campaign contribution records displayed on this platform are gathered from third-party, public domain repositories, including the <em>UCLA VoteView archive</em> and the <em>Stanford DIME dataset</em>. This platform is not affiliated with, funded by, or endorsed by any government entity, political party, or candidate.
  </p>
  
  <p>
    <strong>2. Disclaimer of Implication (No Statement of Corruption):</strong> The name "Corruption Watch" is a title intended to reflect the public interest in tracking money in politics. <strong>The correlation or proximity of a campaign contribution to a legislative vote displayed on this site is purely mathematical and algorithmic. It does not constitute a statement, accusation, or implication of legal conflict of interest, bribery, illicit political behavior, or actual corruption by any individual senator, representative, or donor.</strong> Many contributions and votes occur close together naturally due to the standard calendar of the legislative cycle.
  </p>
  
  <p>
    <strong>3. "As-Is" Data & Limitation of Liability:</strong> Data is aggregated dynamically via client-side processing structures and provided strictly "as-is" and "as-available" without explicit or implied warranties of precision, completeness, merchantability, or real-time parity. The creators of this platform disclaim all liability for any errors, omissions, or inaccuracies in the data, or for any actions taken in reliance on the information provided herein. 
  </p>

  <p>
<p>
  <strong>4. Fair Use & Takedown Requests:</strong> This website displays public records under Fair Use principles for the purposes of public criticism, comment, and news reporting. If you believe any data is displayed in error due to an algorithmic pipeline mismatch, please submit an official correction request to <a href="mailto:corruptionwatch@tyt.com" className="text-[#4A90E2] underline hover:text-white">our corrections team</a> with the corresponding Vote ID and Donor Name.
</p> </p>
</footer>
        </div>
      </main>
    </div>
  );
}