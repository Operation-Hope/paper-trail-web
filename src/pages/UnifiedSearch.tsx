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
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pt-12">
          
          <div className="text-center space-y-2">
            <h1 className="text-6xl font-black tracking-tighter uppercase text-white">
              Corruption <span className="text-[#4A90E2]">Watch</span>
            </h1>
          </div>

          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <Input 
              /* 🚀 Lightened border to white/10 and background to zinc-900/40 */
              className="pl-12 h-16 text-lg bg-zinc-900/40 border-white/10 rounded-2xl focus-visible:ring-[#4A90E2]/20 text-white placeholder:text-zinc-600 transition-all"
              placeholder="Search for a sitting U.S. Senator or Representative ..."
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
            />
          </div>

          {searchQuery && (
            <div className="space-y-4 pb-12">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 px-2">
                Search Results
              </h2>
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-[#4A90E2]" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white">Querying VoteView</p>
                </div>
              }>
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