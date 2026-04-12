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
    // 🎯 FIX: This ensures the Bioguide ID is appended to the URL
    // This resolves the 'Searching for ID: undefined' error
    if (politician.id) {
      navigate(`/politician/${politician.id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-black tracking-tighter uppercase">
          Corruption <span className="text-primary">Watch</span>
        </h1>
       
      </div>

      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          className="pl-12 h-14 text-lg bg-card border-primary/10 rounded-2xl focus-visible:ring-primary/20"
          placeholder="Search for a sitting U.S. Senator or Representative ..."
          onChange={(e) => setSearchQuery(e.target.value)}
          value={searchQuery}
        />
      </div>

      {searchQuery && (
        <div className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 px-2">
            Search Results
          </h2>
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Querying VoteView</p>
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
  );
}