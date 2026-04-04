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
import type { Politician, Donor } from '../types/api';

type SearchType = 'politician' | 'donor' | 'flowchart';

export default function UnifiedSearch() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL
  const activeTab: SearchType = location.pathname.startsWith('/donor')
    ? 'donor'
    : 'politician';

  // Politician search state
  const politicianSearch = usePoliticianSearch();
  const {
    query: politicianQuery,
    setQuery: setPoliticianQuery,
    politicians,
    selectedPolitician,
    isLoading: isPoliticianLoading,
    error: politicianError,
    search: searchPoliticians,
    selectPolitician,
    clearSelection: clearPoliticianSelection,
  } = politicianSearch;

  // Donor search state
  const donorSearch = useDonorSearch();
  const {
    query: donorQuery,
    setQuery: setDonorQuery,
    donors,
    selectedDonor,
    isSearching: isDonorSearching,
    searchError: donorSearchError,
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

  // Local input state
  const [politicianInput, setPoliticianInput] = useState(politicianQuery);
  const [donorInput, setDonorInput] = useState(donorQuery);

  useEffect(() => setPoliticianInput(politicianQuery), [politicianQuery]);
  useEffect(() => setDonorInput(donorQuery), [donorQuery]);

  // Handle tab changes including navigation to standalone pages
  const handleTabChange = (value: string) => {
    if (value === 'flowchart') {
      void navigate('/money-flowchart');
      return;
    }
    void navigate(`/${value}`);
  };

  // Clear alternate results when switching tabs
  useEffect(() => {
    if (activeTab === 'politician') {
      if (selectedDonor) clearDonorSelection();
    } else {
      if (selectedPolitician) clearPoliticianSelection();
    }
  }, [activeTab]);

  // Hydrate state from URL
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
      } else {
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

  // Handlers
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

  // View logic: Details view vs Search view
  if (activeTab === 'politician' && selectedPolitician) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PoliticianDetails politician={selectedPolitician} onClose={() => { clearPoliticianSelection(); navigateBack(); }} />
      </div>
    );
  }

  if (activeTab === 'donor' && selectedDonor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DonorDetails donor={selectedDonor} onClose={() => { clearDonorSelection(); navigateBack(); }} />
        <ContributionHistory donorId={selectedDonor.donor_id} />
      </div>
    );
  }

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
            <TabsContent value="politician" className="mt-0 space-y-4">
              <p className="text-muted-foreground text-sm">
                Find politicians and explore their voting records and campaign donations.
              </p>
              <form onSubmit={handlePoliticianSearch} className="flex gap-2">
                <Input 
                  placeholder="Enter politician name..." 
                  value={politicianInput} 
                  onChange={(e) => setPoliticianInput(e.target.value)} 
                />
                <Button type="submit" disabled={isPoliticianLoading || politicianInput.length < 2}>
                  {isPoliticianLoading ? 'Searching...' : 'Search'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="donor" className="mt-0 space-y-4">
              <p className="text-muted-foreground text-sm">
                Find donors and explore their contribution history to politicians.
              </p>
              <form onSubmit={handleDonorSearch} className="flex gap-2">
                <Input 
                  placeholder="Enter donor name..." 
                  value={donorInput} 
                  onChange={(e) => setDonorInput(e.target.value)} 
                />
                <Button type="submit" disabled={isDonorSearching || donorInput.length < 3}>
                  {isDonorSearching ? 'Searching...' : 'Search'}
                </Button>
              </form>
            </TabsContent>
          </CardContent>
        </Card>

        <TabsContent value="politician">
          {politicianQuery.length >= 2 && (
            <Suspense fallback={<div className="text-center py-8">Loading politicians...</div>}>
              <PoliticianSearchResults 
                searchQuery={politicianQuery} 
                onSelectPolitician={(p) => navigateToEntity(p.canonical_id, 'politician')} 
              />
            </Suspense>
          )}
        </TabsContent>

        <TabsContent value="donor">
          {donorQuery.length >= 3 && (
            <Suspense fallback={<div className="text-center py-8">Loading donors...</div>}>
              <DonorSearchResults 
                searchQuery={donorQuery} 
                onSelectDonor={(d) => navigateToEntity(d.donor_id, 'donor')} 
              />
            </Suspense>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}