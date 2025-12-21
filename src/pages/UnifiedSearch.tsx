/**
 * Unified Search page with tabs for Politicians and Donors
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
import { PoliticianComparison } from '../components/PoliticianComparison';
import { DonorDetails } from '../components/DonorDetails';
import { ContributionHistory } from '../components/ContributionHistory';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { api } from '../services/api';
import type { Politician, Donor } from '../types/api';

type SearchType = 'politician' | 'donor';

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
    comparisonPoliticians,
    isComparing,
    isLoading: isPoliticianLoading,
    error: politicianError,
    search: searchPoliticians,
    selectPolitician,
    toggleComparison,
    setComparisonPoliticians,
    clearSelection: clearPoliticianSelection,
    clearComparison,
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
    comparisonIds,
    navigateToEntity,
    navigateToComparison,
    navigateToSearch,
    navigateBack,
  } = useRouteState();

  // Local input state for each search type
  const [politicianInput, setPoliticianInput] = useState(politicianQuery);
  const [donorInput, setDonorInput] = useState(donorQuery);

  // Sync input with query when query changes
  useEffect(() => {
    setPoliticianInput(politicianQuery);
  }, [politicianQuery]);

  useEffect(() => {
    setDonorInput(donorQuery);
  }, [donorQuery]);

  // Handle tab changes - clear results and navigate to appropriate URL
  const handleTabChange = (value: string) => {
    const newTab = value as SearchType;

    // Navigate to the new tab's URL
    if (newTab === 'politician') {
      navigate('/politician');
    } else {
      navigate('/donor');
    }
  };

  // Clear results when switching tabs
  useEffect(() => {
    if (activeTab === 'politician') {
      // Clear donor results when switching to politician
      if (selectedDonor) {
        clearDonorSelection();
      }
    } else {
      // Clear politician results when switching to donor
      if (selectedPolitician) {
        clearPoliticianSelection();
      }
      if (isComparing) {
        clearComparison();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Hydrate politician state from URL
  useEffect(() => {
    if (activeTab !== 'politician') return;

    const loadFromUrl = async () => {
      // Handle comparison IDs from URL first
      if (comparisonIds.length >= 2) {
        const currentIds = comparisonPoliticians
          .map((p) => p.canonical_id)
          .sort();
        const urlIds = [...comparisonIds].sort();
        // Only hydrate if the IDs don't match to avoid infinite loops
        if (
          currentIds.length !== urlIds.length ||
          !currentIds.every((id, idx) => id === urlIds[idx])
        ) {
          try {
            const fetchedPoliticians = await Promise.all(
              comparisonIds.map((id) => api.getPolitician(id))
            );
            setComparisonPoliticians(fetchedPoliticians);
          } catch (err) {
            console.error('Failed to load comparison from URL:', err);
            toast.error('Comparison not found', {
              description:
                'The requested comparison could not be loaded. Please try searching again.',
            });
            navigate('/politician');
          }
        }
        return;
      }

      if (entityId) {
        const politicianId = entityId;
        if (selectedPolitician?.canonical_id === politicianId) {
          return;
        }
        const politician = politicians.find(
          (p) => p.canonical_id === politicianId
        );
        if (politician) {
          selectPolitician(politician);
          return;
        }
        try {
          const fetchedPolitician = await api.getPolitician(politicianId);
          selectPolitician(fetchedPolitician);
        } catch (err) {
          console.error('Failed to load politician from URL:', err);
          toast.error('Politician not found', {
            description:
              'The requested politician could not be loaded. Please try searching again.',
          });
          navigate('/politician');
        }
      } else {
        // No entityId or comparisonIds in URL - clear selection/comparison if one exists (back button case)
        if (selectedPolitician) {
          clearPoliticianSelection();
        }
        if (isComparing) {
          clearComparison();
        }
        // Handle search query
        if (searchQuery && searchQuery !== politicianQuery) {
          setPoliticianInput(searchQuery);
          setPoliticianQuery(searchQuery);
          if (searchQuery.length >= 2) {
            searchPoliticians(searchQuery);
          }
        }
      }
    };

    loadFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, searchQuery, comparisonIds, activeTab]);

  // Hydrate donor state from URL
  useEffect(() => {
    if (activeTab !== 'donor') return;

    const loadFromUrl = async () => {
      if (entityId) {
        const donorId = entityId;
        if (selectedDonor?.donor_id === donorId) {
          return;
        }
        const donor = donors.find((d) => d.donor_id === donorId);
        if (donor) {
          selectDonor(donor);
          return;
        }
        try {
          const fetchedDonor = await api.getDonor(donorId);
          selectDonor(fetchedDonor);
        } catch (err) {
          console.error('Failed to load donor from URL:', err);
          toast.error('Donor not found', {
            description:
              'The requested donor could not be loaded. Please try searching again.',
          });
          navigate('/donor');
        }
      } else {
        // No entityId in URL - clear selection if one exists (back button case)
        if (selectedDonor) {
          clearDonorSelection();
        }
        // Handle search query
        if (searchQuery && searchQuery !== donorQuery) {
          setDonorInput(searchQuery);
          setDonorQuery(searchQuery);
          if (searchQuery.length >= 3) {
            searchDonors(searchQuery);
          }
        }
      }
    };

    loadFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, searchQuery, activeTab]);


  // Politician search handlers
  const handlePoliticianSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setPoliticianQuery(politicianInput);
    if (politicianInput.length >= 2) {
      await searchPoliticians(politicianInput);
      navigateToSearch('politician', politicianInput);
    } else if (politicianInput.length === 0) {
      navigateToSearch('politician');
    }
  };

  const handlePoliticianInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPoliticianInput(e.target.value);
  };

  const handlePoliticianKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePoliticianSearch();
    }
  };

  const handleClearPoliticianSelection = () => {
    clearPoliticianSelection();
    navigateBack();
  };

  const handleClearComparison = () => {
    clearComparison();
    navigateToSearch('politician', politicianQuery || undefined);
  };

  // Donor search handlers
  const handleDonorSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setDonorQuery(donorInput);
    if (donorInput.length >= 3) {
      await searchDonors(donorInput);
      navigateToSearch('donor', donorInput);
    } else if (donorInput.length === 0) {
      navigateToSearch('donor');
    }
  };

  const handleDonorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDonorInput(e.target.value);
  };

  const handleDonorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDonorSearch();
    }
  };

  const handleClearDonorSelection = () => {
    clearDonorSelection();
    navigateBack();
  };

  // Wrapper to navigate to politician URL (let hydration useEffect handle selection)
  const handleSelectPolitician = (politician: Politician) => {
    navigateToEntity(politician.canonical_id, 'politician');
  };

  // Wrapper to navigate to donor URL (let hydration useEffect handle selection)
  const handleSelectDonor = (donor: Donor) => {
    navigateToEntity(donor.donor_id, 'donor');
  };

  // Wrapper for toggleComparison that updates URL when comparison becomes active
  const handleToggleComparison = (politician: Politician) => {
    toggleComparison(politician);
    // Navigate to comparison URL after state update
    // Use setTimeout to ensure state has updated
    setTimeout(() => {
      if (comparisonPoliticians.length === 1) {
        // User just selected second politician, navigate to comparison URL
        const newComparison = [...comparisonPoliticians, politician];
        const ids = newComparison.map((p) => p.canonical_id);
        navigateToComparison(ids);
      } else if (comparisonPoliticians.length === 2) {
        // User is replacing one politician or deselecting
        const isDeselecting = comparisonPoliticians.some(
          (p) => p.canonical_id === politician.canonical_id
        );
        if (!isDeselecting) {
          // Replacing - update URL with new IDs
          const newComparison = [comparisonPoliticians[1], politician];
          const ids = newComparison.map((p) => p.canonical_id);
          navigateToComparison(ids);
        } else {
          // Deselecting - stay on search page
          navigateToSearch('politician', politicianQuery || undefined);
        }
      }
    }, 0);
  };

  // If comparing politicians, show comparison view
  if (isComparing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorBoundary
          fallbackTitle="Error loading comparison"
          onReset={handleClearComparison}
        >
          <PoliticianComparison
            politicians={comparisonPoliticians as [Politician, Politician]}
            onClose={handleClearComparison}
          />
        </ErrorBoundary>
      </div>
    );
  }

  // If politician is selected, show politician details
  if (activeTab === 'politician' && selectedPolitician) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorBoundary
          fallbackTitle="Error loading politician details"
          onReset={handleClearPoliticianSelection}
        >
          <PoliticianDetails
            politician={selectedPolitician}
            onClose={handleClearPoliticianSelection}
          />
        </ErrorBoundary>
      </div>
    );
  }

  // If donor is selected, show donor details
  if (activeTab === 'donor' && selectedDonor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorBoundary
          fallbackTitle="Error loading donor details"
          onReset={handleClearDonorSelection}
        >
          <DonorDetails
            donor={selectedDonor}
            onClose={handleClearDonorSelection}
          />
        </ErrorBoundary>
        <ContributionHistory donorId={selectedDonor.donor_id} />
      </div>
    );
  }

  // Main search interface with tabs
  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-4">
              <TabsList>
                <TabsTrigger value="politician">Search Politicians</TabsTrigger>
                <TabsTrigger value="donor">Search Donors</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="politician" className="mt-0">
              <p className="text-muted-foreground mb-4 text-sm">
                Find politicians and explore their voting records and campaign
                donations
              </p>
              <form onSubmit={handlePoliticianSearch} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter politician name (minimum 2 characters)"
                  value={politicianInput}
                  onChange={handlePoliticianInputChange}
                  onKeyDown={handlePoliticianKeyDown}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={isPoliticianLoading || politicianInput.length < 2}
                >
                  {isPoliticianLoading ? 'Searching...' : 'Search'}
                </Button>
              </form>

              {politicianInput.length > 0 && politicianInput.length < 2 && (
                <p className="mt-2 text-sm text-amber-600">
                  Please enter at least 2 characters to search
                </p>
              )}

              {politicianError && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-800">{politicianError}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="donor" className="mt-0">
              <p className="text-muted-foreground mb-4 text-sm">
                Find donors and explore their contribution history to
                politicians
              </p>
              <form onSubmit={handleDonorSearch} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter donor name (minimum 3 characters, e.g., Boeing, AT&T)"
                  value={donorInput}
                  onChange={handleDonorInputChange}
                  onKeyDown={handleDonorKeyDown}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={isDonorSearching || donorInput.length < 3}
                >
                  {isDonorSearching ? 'Searching...' : 'Search'}
                </Button>
              </form>

              {donorInput.length > 0 && donorInput.length < 3 && (
                <p className="mt-2 text-sm text-amber-600">
                  Please enter at least 3 characters to search
                </p>
              )}

              {donorSearchError && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-800">{donorSearchError}</p>
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Card>

        {/* Politician Search Results with Suspense */}
        <TabsContent value="politician">
          {politicianQuery.length >= 2 ? (
            <ErrorBoundary fallbackTitle="Error loading search results">
              <Suspense
                fallback={
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-muted-foreground py-8 text-center">
                        Searching for politicians...
                      </div>
                    </CardContent>
                  </Card>
                }
              >
                <PoliticianSearchResults
                  searchQuery={politicianQuery}
                  comparisonPoliticians={comparisonPoliticians}
                  onSelectPolitician={handleSelectPolitician}
                  onToggleComparison={handleToggleComparison}
                  onClearComparison={handleClearComparison}
                />
              </Suspense>
            </ErrorBoundary>
          ) : null}
        </TabsContent>

        {/* Donor Search Results with Suspense */}
        <TabsContent value="donor">
          {donorQuery.length >= 3 ? (
            <ErrorBoundary fallbackTitle="Error loading search results">
              <Suspense
                fallback={
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-muted-foreground py-8 text-center">
                        Searching for donors...
                      </div>
                    </CardContent>
                  </Card>
                }
              >
                <DonorSearchResults
                  searchQuery={donorQuery}
                  onSelectDonor={handleSelectDonor}
                />
              </Suspense>
            </ErrorBoundary>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
