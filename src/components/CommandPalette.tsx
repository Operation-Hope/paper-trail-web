/**
 * Global command palette for quick search and navigation
 * Triggered by Cmd+K (Mac) or Ctrl+K (Windows/Linux)
 * Searches politicians and donors, with navigation actions
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, DollarSign, Moon, Sun, Home } from 'lucide-react';
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
import type { Politician, Donor } from '../types/api';
import { useTheme } from './providers';
import { buildPoliticianUrl, buildDonorUrl } from '../utils/routing';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
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
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search politicians and donors when search term changes
  useEffect(() => {
    const searchData = async () => {
      if (search.length < 2) {
        setPoliticians([]);
        setDonors([]);
        return;
      }

      setIsLoading(true);
      try {
        const [politicianResults, donorResults] = await Promise.all([
          api.searchPoliticians(search).catch(() => []),
          search.length >= 3
            ? api.searchDonors(search).catch(() => [])
            : Promise.resolve([]),
        ]);

        setPoliticians(politicianResults.slice(0, 5));
        setDonors(donorResults.slice(0, 5));
      } catch (error) {
        console.error('Command palette search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 200);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleSelectPolitician = useCallback(
    (politician: Politician) => {
      setOpen(false);
      setSearch('');

      // Navigate to politician detail URL with minimal history
      navigate(buildPoliticianUrl(politician.canonical_id), { replace: true });
    },
    [navigate]
  );

  const handleSelectDonor = useCallback(
    (donor: Donor) => {
      setOpen(false);
      setSearch('');

      // Navigate to donor detail URL with minimal history
      navigate(buildDonorUrl(donor.donor_id), { replace: true });
    },
    [navigate]
  );

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    setOpen(false);
  }, [theme, setTheme]);

  const handleNavigateHome = useCallback(() => {
    setOpen(false);
    navigate('/politician');
  }, [navigate]);

  const handleNavigateDonorSearch = useCallback(() => {
    setOpen(false);
    navigate('/donor');
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

        {/* Navigation Actions */}
        {!search && (
          <>
            <CommandGroup heading="Navigation">
              <CommandItem onSelect={handleNavigateHome}>
                <Home />
                <span>Politician Search</span>
              </CommandItem>
              <CommandItem onSelect={handleNavigateDonorSearch}>
                <DollarSign />
                <span>Donor Search</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Actions">
              <CommandItem onSelect={handleToggleTheme}>
                {theme === 'dark' ? <Sun /> : <Moon />}
                <span>Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {/* Politicians */}
        {politicians.length > 0 && (
          <>
            <CommandGroup heading="Politicians">
              {politicians.map((politician) => (
                <CommandItem
                  key={politician.canonical_id}
                  value={`${politician.first_name} ${politician.last_name}`}
                  onSelect={() => handleSelectPolitician(politician)}
                >
                  <Users />
                  <div className="flex flex-col">
                    <span>
                      {politician.first_name} {politician.last_name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {politician.party} • {politician.state}
                      {politician.seat && ` • ${politician.seat}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Donors */}
        {donors.length > 0 && (
          <>
            {politicians.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Donors">
              {donors.map((donor) => (
                <CommandItem
                  key={donor.donor_id}
                  value={donor.name}
                  onSelect={() => handleSelectDonor(donor)}
                >
                  <DollarSign />
                  <div className="flex flex-col">
                    <span>{donor.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {donor.donor_type}
                      {donor.employer && ` • ${donor.employer}`}
                      {donor.state && ` • ${donor.state}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
