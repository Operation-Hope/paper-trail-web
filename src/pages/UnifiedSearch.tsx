import { useNavigate } from 'react-router-dom';
import { PoliticianSearchResults } from '../components/PoliticianSearchResults';
import { useState } from 'react';
import { Politician } from '../types/api';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Suspense } from 'react';

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
      <main className="px-4 md:px-8">
        {/* 🚀 Changed pt-16 to pt-12 to bring the header up slightly */}
        <div className="animate-in fade-in mx-auto max-w-4xl space-y-10 pt-12 duration-500">
          <div className="space-y-2 text-center">
            <h1 className="text-6xl font-black tracking-tighter text-white uppercase">
              Corruption <span className="text-[#4A90E2]">Watch</span>
            </h1>
          </div>

          <div className="relative mx-auto max-w-2xl">
            <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <Input
              /* 🚀 Lightened border to white/10 and background to zinc-900/40 */
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
    </div>
  );
}
