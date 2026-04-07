import React, { useState } from 'react';
import { Search, User, Landmark, Loader2 } from 'lucide-react';
import { usePoliticianSearch } from '../hooks/usePoliticianSearch';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function UnifiedSearch() {
  const [query, setQuery] = useState('');
  const { politicians = [], isLoading, search } = usePoliticianSearch(); // 🛡️ Default to empty array
  const navigate = useNavigate();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    search(val);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <header className="text-center space-y-4">
        <h1 className="text-6xl font-black tracking-tighter uppercase italic">Paper Trail</h1>
        <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm">
          Follow the money. Track the votes.
        </p>
      </header>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
        <Input 
          className="pl-12 h-16 text-xl font-bold rounded-2xl border-2 shadow-lg focus-visible:ring-primary"
          placeholder="Search by Politician Name (e.g. Jeffries)..."
          value={query}
          onChange={handleSearch}
        />
        {isLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-primary" size={20} />}
      </div>

      <div className="grid gap-4">
        {/* 🛡️ Line 200 Fix: Optional chaining ensures no crash if data is missing */}
        {politicians?.length > 0 ? (
          politicians.map((p) => (
            <Card 
              key={p.canonical_id}
              className="p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group rounded-2xl border-2"
              onClick={() => navigate(`/politician/${p.bioguide_id || p.icpsr_id}`)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">{p.full_name}</h3>
                    <p className="font-mono text-sm text-muted-foreground uppercase">
                      {p.party} — {p.state} {p.district}
                    </p>
                  </div>
                </div>
                <Landmark className="opacity-10 group-hover:opacity-100 transition-opacity" />
              </div>
            </Card>
          ))
        ) : query.length > 2 && !isLoading ? (
          <div className="text-center py-20 border-2 border-dashed rounded-3xl opacity-50">
            <p className="font-mono uppercase tracking-widest text-sm">No matching records found</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}