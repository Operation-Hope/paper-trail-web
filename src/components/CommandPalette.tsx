import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, DollarSign, Moon, Sun, Home, Activity } from 'lucide-react'; // Added Activity icon
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './ui/command';
import { api } from '../services/api';
import type { Politician } from '../types/api';
import { useTheme } from './providers/theme-provider';
import { buildPoliticianUrl } from '../utils/routing';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();

  // Toggle command palette with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => {
      document.removeEventListener('keydown', down);
    };
  }, []);

  // Search politicians and donors when search term changes
  useEffect(() => {
    const searchData = async () => {
      if (search.length < 2) {
        setPoliticians([]);
        return;
      }

      setIsLoading(true);
      try {
        const [politicianResults] = await Promise.all([
          api.searchPoliticians(search).catch(() => []),
          search.length >= 3
            ? api.searchDonors(search).catch(() => [])
            : Promise.resolve([]),
        ]);

        setPoliticians(politicianResults.slice(0, 5));
      } catch (error) {
        console.error('Command palette search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      void searchData();
    }, 200);
    return () => {
      clearTimeout(debounce);
    };
  }, [search]);

  const handleSelectPolitician = useCallback(
    (politician: Politician) => {
      setOpen(false);
      setSearch('');
      void navigate(buildPoliticianUrl(politician.canonical_id), {
        replace: true,
      });
    },
    [navigate]
  );

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    setOpen(false);
  }, [theme, setTheme]);

  const handleNavigateHome = useCallback(() => {
    setOpen(false);
    void navigate('/politician');
  }, [navigate]);

  const handleNavigateDonorSearch = useCallback(() => {
    setOpen(false);
    void navigate('/donor');
  }, [navigate]);

  // Added handler for the flowchart
  const handleNavigateMoneyFlowchart = useCallback(() => {
    setOpen(false);
    void navigate('/money-flowchart');
  }, [navigate]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search politicians, donors, or type a command..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? 'Searching...' : 'No results found.'}
        </CommandEmpty>

        {!search && (
          <>
            <CommandGroup heading="Navigation">
              <CommandItem onSelect={handleNavigateHome}>
                <Home className="mr-2 h-4 w-4" />
                <span>Politician Search</span>
              </CommandItem>
              <CommandItem onSelect={handleNavigateDonorSearch}>
                <DollarSign className="mr-2 h-4 w-4" />
                <span>Donor Search</span>
              </CommandItem>
              {/* Added Flowchart Navigation Item */}
              <CommandItem onSelect={handleNavigateMoneyFlowchart}>
                <Activity className="mr-2 h-4 w-4" />
                <span>Money Flowchart</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Actions">
              <CommandItem onSelect={handleToggleTheme}>
                {theme === 'dark' ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" />
                )}
                <span>Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {politicians.length > 0 && (
          <CommandGroup heading="Politicians">
            {politicians.map((politician) => (
              <CommandItem
                key={politician.canonical_id}
                value={`${politician.first_name} ${politician.last_name}`}
                onSelect={() => handleSelectPolitician(politician)}
              >
                <Users className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>
                    {politician.first_name} {politician.last_name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {politician.party} • {politician.state}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
