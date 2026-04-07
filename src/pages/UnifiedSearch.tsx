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
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12">
      <header className="space-y-4 text-center">
        <h1 className="text-6xl font-black tracking-tighter uppercase italic">
          Paper Trail
        </h1>
        <p className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
          Follow the money. Track the votes.
        </p>
      </header>

      <div className="group relative">
        <Search
          className="text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-4 -translate-y-1/2 transition-colors"
          size={20}
        />
        <Input
          className="focus-visible:ring-primary h-16 rounded-2xl border-2 pl-12 text-xl font-bold shadow-lg"
          placeholder="Search for a current U.S. Senator or Congressman..."
          value={query}
          onChange={handleSearch}
        />
        {isLoading && (
          <Loader2
            className="text-primary absolute top-1/2 right-4 -translate-y-1/2 animate-spin"
            size={20}
          />
        )}
      </div>

      <div className="grid gap-4">
        {/* 🛡️ Line 200 Fix: Optional chaining ensures no crash if data is missing */}
        {politicians?.length > 0 ? (
          politicians.map((p) => (
            <Card
              key={p.canonical_id}
              className="hover:border-primary/50 hover:bg-primary/5 group cursor-pointer rounded-2xl border-2 p-6 transition-all"
              onClick={() =>
                navigate(`/politician/${p.bioguide_id || p.icpsr_id}`)
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 text-primary group-hover:bg-primary rounded-full p-3 transition-colors group-hover:text-white">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight uppercase">
                      {p.full_name}
                    </h3>
                    <p className="text-muted-foreground font-mono text-sm uppercase">
                      {p.party} — {p.state} {p.district}
                    </p>
                  </div>
                </div>
                <Landmark className="opacity-10 transition-opacity group-hover:opacity-100" />
              </div>
            </Card>
          ))
        ) : query.length > 2 && !isLoading ? (
          <div className="rounded-3xl border-2 border-dashed py-20 text-center opacity-50">
            <p className="font-mono text-sm tracking-widest uppercase">
              No matching records found
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
