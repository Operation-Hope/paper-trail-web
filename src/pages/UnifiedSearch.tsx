/**
 * Unified Search page with tabs for Politicians, Donors, and Money Flowchart
 * Uses React 19 Suspense for declarative loading states
 */
import { useEffect, useState, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../components/ui/tabs';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { usePoliticianSearch } from '../hooks/usePoliticianSearch';
import { useDonorSearch } from '../hooks/useDonorSearch';
import { useRouteState } from '../utils/routing';
import { PoliticianSearchResults } from '../components/PoliticianSearchResults';
import { DonorSearchResults } from '../components/DonorSearchResults';
import { PoliticianDetails } from '../components/PoliticianDetails';
import { DonorDetails } from '../components/DonorDetails';
import { ContributionHistory } from '../components/ContributionHistory';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { api } from '../services/api';

type SearchType = 'politician' | 'donor' | 'flowchart';

export default function UnifiedSearch() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path
  const activeTab: SearchType = location.pathname.startsWith('/donor')
    ? 'donor'
    : location.pathname.startsWith('/money-flowchart')
      ? 'flowchart'
      : 'politician';

  // Politician search state hook
  const politicianSearch = usePoliticianSearch();
  const {
    query: politicianQuery,
    setQuery: setPoliticianQuery,
    selectedPolitician,
    isLoading: isPoliticianLoading,
    search: searchPoliticians,
    selectPolitician,
    clearSelection: clearPoliticianSelection,
  } = politicianSearch;

  // Donor search state hook
  const donorSearch = useDonorSearch();
  const {
    query: donorQuery,
    setQuery: setDonorQuery,
    selectedDonor,
    isSearching: isDonorSearching,
    search: searchDonors,
    selectDonor,
    clearSelection: clearDonorSelection,
  } = donorSearch;

  const {
    entityId,
    searchQuery,
    navigateToEntity,
    navigateToSearch,
    navigateBack,
  } = useRouteState();

  // Local input state (debounced sync via useEffect below)
  const [politicianInput, setPoliticianInput] = useState(politicianQuery);
  const [donorInput, setDonorInput] = useState(donorQuery);

  useEffect(() => setPoliticianInput(politicianQuery), [politicianQuery]);
  useEffect(() => setDonorInput(donorQuery), [donorQuery]);

  // Handle tab changes with explicit navigation
  const handleTabChange = (value: string) => {
    if (value === 'flowchart') {
      void navigate('/money-flowchart');
    } else {
      void navigate(`/${value}`);
    }
  };

  // Clear selections when switching context
  useEffect(() => {
    if (activeTab === 'politician' && selectedDonor) clearDonorSelection();
    if (activeTab === 'donor' && selectedPolitician) clearPoliticianSelection();
  }, [
    activeTab,
    selectedDonor,
    selectedPolitician,
    clearDonorSelection,
    clearPoliticianSelection,
  ]);

  // Hydrate state from URL on load or path change
  useEffect(() => {
    const loadFromUrl = async () => {
      if (activeTab === 'politician') {
        if (entityId) {
          try {
            const fetched = await api.getPolitician(entityId);
            selectPolitician(fetched);
          } catch (err) {
            toast.error('Politician not found');
            void navigate('/politician');
          }
        } else if (searchQuery && searchQuery !== politicianQuery) {
          setPoliticianQuery(searchQuery);
          void searchPoliticians(searchQuery);
        }
      } else if (activeTab === 'donor') {
        if (entityId) {
          try {
            const fetched = await api.getDonor(entityId);
            selectDonor(fetched);
          } catch (err) {
            toast.error('Donor not found');
            void navigate('/donor');
          }
        } else if (searchQuery && searchQuery !== donorQuery) {
          setDonorQuery(searchQuery);
          void searchDonors(searchQuery);
        }
      }
    };
    void loadFromUrl();
  }, [entityId, searchQuery, activeTab]);

  const handlePoliticianSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (politicianInput.length >= 2) {
      await searchPoliticians(politicianInput);
      void navigateToSearch('politician', politicianInput);
    }
  };

  const handleDonorSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (donorInput.length >= 3) {
      await searchDonors(donorInput);
      void navigateToSearch('donor', donorInput);
    }
  };

  // --- RENDERING LOGIC ---

  // 1. Details View (Politician)
  if (activeTab === 'politician' && selectedPolitician) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorBoundary>
          <PoliticianDetails
            politician={selectedPolitician}
            onClose={() => {
              clearPoliticianSelection();
              navigateBack();
            }}
          />
        </ErrorBoundary>
      </div>
    );
  }

  // 2. Details View (Donor)
  if (activeTab === 'donor' && selectedDonor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorBoundary>
          <DonorDetails
            donor={selectedDonor}
            onClose={() => {
              clearDonorSelection();
              navigateBack();
            }}
          />
          <ContributionHistory donorId={selectedDonor.donor_id} />
        </ErrorBoundary>
      </div>
    );
  }

  // 3. Search/Tabs View
  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <Card className="mb-8">
          <CardHeader>
            <TabsList className="grid w-full max-w-[600px] grid-cols-3">
              <TabsTrigger value="politician">Search Politicians</TabsTrigger>
              <TabsTrigger value="donor">Search Donors</TabsTrigger>
              <TabsTrigger value="flowchart">Money Flowchart</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            {/* Politician Search Bar */}
            <TabsContent value="politician" className="mt-0 space-y-4">
              <p className="text-muted-foreground text-sm">
                Search for a politician by first or last name...
              </p>
              <form onSubmit={handlePoliticianSearch} className="flex gap-2">
                <Input
                  placeholder="Enter politician name..."
                  value={politicianInput}
                  onChange={(e) => setPoliticianInput(e.target.value)}
                />
                <Button
                  type="submit"
                  disabled={isPoliticianLoading || politicianInput.length < 2}
                >
                  {isPoliticianLoading ? 'Searching...' : 'Search'}
                </Button>
              </form>
            </TabsContent>

            {/* Donor Search Bar */}
            <TabsContent value="donor" className="mt-0 space-y-4">
              <p className="text-muted-foreground text-sm">
                Find donors and explore their contribution history to
                politicians.
              </p>
              <form onSubmit={handleDonorSearch} className="flex gap-2">
                <Input
                  placeholder="Enter donor name..."
                  value={donorInput}
                  onChange={(e) => setDonorInput(e.target.value)}
                />
                <Button
                  type="submit"
                  disabled={isDonorSearching || donorInput.length < 3}
                >
                  {isDonorSearching ? 'Searching...' : 'Search'}
                </Button>
              </form>
            </TabsContent>
          </CardContent>
        </Card>

        {/* Search Results Display Area */}
        <TabsContent value="politician">
          {politicianQuery.length >= 2 && (
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="py-8 text-center">Loading politicians...</div>
                }
              >
                <PoliticianSearchResults
                  searchQuery={politicianQuery}
                  onSelectPolitician={(p) =>
                    navigateToEntity(p.canonical_id, 'politician')
                  }
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </TabsContent>

        <TabsContent value="donor">
          {donorQuery.length >= 3 && (
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="py-8 text-center">Loading donors...</div>
                }
              >
                <DonorSearchResults
                  searchQuery={donorQuery}
                  onSelectDonor={(d) => navigateToEntity(d.donor_id, 'donor')}
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
