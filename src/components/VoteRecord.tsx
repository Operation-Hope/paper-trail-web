/**
 * Vote record component displaying paginated voting history with filtering
 * Shows votes in a table with pagination controls and comprehensive filtering
 * 
 * Architecture: Filters are kept OUTSIDE the Suspense boundary so they don't
 * reload when vote data is being fetched.
 */
import { Suspense } from 'react';
import { useVoteFilters, useVoteData, useVoteDateRange } from '../hooks/useVotes';
import { VoteFilters } from './VoteFilters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TooltipProvider } from './ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination';
import { X, Info, FileSearch } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { ErrorBoundary } from './ErrorBoundary';
import type { Vote, VoteResponse } from '../types/api';
import type { VoteFilters as VoteFiltersType } from '../lib/query/keys';

interface VoteRecordProps {
  politicianId: string;
  selectedSubjectForDonations?: string | null;
  onSubjectClick?: (subject: string | null) => void;
}

// Props for the table component that fetches and displays vote data
interface VoteTableProps {
  politicianId: string;
  currentPage: number;
  sortOrder: 'ASC' | 'DESC';
  filters: VoteFiltersType;
  selectedSubjectForDonations?: string | null;
  onSubjectClick?: (subject: string | null) => void;
  setCurrentPage: (page: number) => void;
  clearAllFilters: () => void;
}

function getVoteColor(vote: Vote['vote_value']): string {
  switch (vote) {
    case 'Yea':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Nay':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'Present':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Not Voting':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Vote table component - uses useSuspenseQuery and will suspend during loading
 * This is wrapped in Suspense so the filters don't disappear during data fetching
 */
function VoteTable({
  politicianId,
  currentPage,
  sortOrder,
  filters,
  selectedSubjectForDonations,
  onSubjectClick,
  setCurrentPage,
  clearAllFilters,
}: VoteTableProps) {
  const voteData = useVoteData({ politicianId, currentPage, sortOrder, filters });

  if (!voteData || voteData.votes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4 py-12 text-center">
            <FileSearch className="text-muted-foreground/50 mx-auto h-16 w-16" />
            <div>
              <h3 className="mb-2 text-lg font-semibold">No Votes Found</h3>
              <p className="text-muted-foreground mx-auto max-w-md text-sm">
                No voting records match your current filters. Try adjusting
                the bill type, subject, or sort order to see more results.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
            >
              Clear All Filters
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Vote</TableHead>
                  <TableHead className="w-32">Bill Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-32">Date Introduced</TableHead>
                  <TableHead className="w-64">Subjects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voteData.votes.map((vote) => (
                  <TableRow key={vote.vote_id}>
                    <TableCell>
                      <Badge className={getVoteColor(vote.vote_value)}>
                        {vote.vote_value}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {vote.bill_number}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="line-clamp-2">{vote.bill_description}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(vote.vote_date)}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex flex-wrap gap-1">
                          {vote.topics && vote.topics.length > 0 ? (
                            <>
                              {vote.topics.slice(0, 3).map((topic, idx) => (
                                <Badge
                                  key={idx}
                                  variant={
                                    selectedSubjectForDonations === topic.label
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className={`cursor-pointer text-xs ${
                                    selectedSubjectForDonations === topic.label
                                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                                      : 'hover:bg-gray-200'
                                  }`}
                                  onClick={() =>
                                    onSubjectClick && onSubjectClick(topic.label)
                                  }
                                  title={`${topic.label} (${topic.source}${topic.is_primary ? ' - primary' : ''})`}
                                >
                                  {topic.label}
                                </Badge>
                              ))}
                              {vote.topics.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{vote.topics.length - 3} more
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No topic data
                            </span>
                          )}
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {voteData.pagination.totalPages > 1 && (
        <VotePagination
          voteData={voteData}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      )}
    </>
  );
}

// Extracted pagination component for cleaner code
interface VotePaginationProps {
  voteData: VoteResponse;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

function VotePagination({ voteData, currentPage, setCurrentPage }: VotePaginationProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Page {voteData.pagination.currentPage} of{' '}
            {voteData.pagination.totalPages} (
            {voteData.pagination.totalVotes} votes)
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className={
                    currentPage === 1
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>

              {/* First page */}
              {currentPage > 3 && (
                <>
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => setCurrentPage(1)}
                      isActive={currentPage === 1}
                      className="cursor-pointer"
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                  {currentPage > 4 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                </>
              )}

              {/* Page numbers around current page */}
              {Array.from(
                { length: voteData.pagination.totalPages },
                (_, i) => i + 1
              )
                .filter((pageNum) => {
                  // Show pages within 2 of current page
                  return Math.abs(pageNum - currentPage) <= 2;
                })
                .map((pageNum) => (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={pageNum === currentPage}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                ))}

              {/* Last page */}
              {currentPage < voteData.pagination.totalPages - 2 && (
                <>
                  {currentPage < voteData.pagination.totalPages - 3 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink
                      onClick={() =>
                        setCurrentPage(voteData.pagination.totalPages)
                      }
                      isActive={
                        currentPage === voteData.pagination.totalPages
                      }
                      className="cursor-pointer"
                    >
                      {voteData.pagination.totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className={
                    currentPage === voteData.pagination.totalPages
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton for the vote table only (not the filters)
function VoteTableSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Vote</TableHead>
                <TableHead className="w-32">Bill Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-32">Date Introduced</TableHead>
                <TableHead className="w-64">Subjects</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main vote record content - filter state lives here, OUTSIDE the Suspense boundary
 */
function VoteRecordContent({
  politicianId,
  selectedSubjectForDonations,
  onSubjectClick,
}: VoteRecordProps) {
  // Filter state - this never suspends
  const {
    currentPage,
    sortOrder,
    billType,
    searchQuery,
    dateFrom,
    dateTo,
    voteValues,
    filters,
    setCurrentPage,
    setSortOrder,
    setBillType,
    setSearchQuery,
    setDateFrom,
    setDateTo,
    setVoteValues,
    clearAllFilters,
  } = useVoteFilters({ politicianId });

  // Get date range boundaries for the calendar (uses regular useQuery - doesn't suspend)
  const { data: dateRangeData } = useVoteDateRange(politicianId);

  return (
    <div className="space-y-6">
      {/* Active Subject Filter Alert */}
      {selectedSubjectForDonations && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">
            Filtering donations by: {selectedSubjectForDonations}
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between text-blue-700">
            <span>
              Click on subject tags below to explore different topics, or clear
              the filter to see all donations.
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 px-2 text-blue-600 hover:bg-blue-100 hover:text-blue-900"
              onClick={() => onSubjectClick && onSubjectClick(null)}
            >
              <X className="mr-1 h-4 w-4" />
              Clear filter
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters - ALWAYS visible, never inside Suspense */}
      <Card>
        <CardHeader>
          <CardTitle>Voting Record</CardTitle>
        </CardHeader>
        <CardContent>
          <VoteFilters
            billType={billType}
            setBillType={setBillType}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            voteValues={voteValues}
            setVoteValues={setVoteValues}
            clearAllFilters={clearAllFilters}
            earliestVoteDate={dateRangeData?.earliest_vote}
            latestVoteDate={dateRangeData?.latest_vote}
          />
        </CardContent>
      </Card>

      {/* Vote table - wrapped in Suspense so only the table shows skeleton during loading */}
      <ErrorBoundary fallbackTitle="Error loading votes">
        <Suspense fallback={<VoteTableSkeleton />}>
          <VoteTable
            politicianId={politicianId}
            currentPage={currentPage}
            sortOrder={sortOrder}
            filters={filters}
            selectedSubjectForDonations={selectedSubjectForDonations}
            onSubjectClick={onSubjectClick}
            setCurrentPage={setCurrentPage}
            clearAllFilters={clearAllFilters}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

// Loading fallback for initial load (includes filter skeleton)
function VoteRecordSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Voting Record</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>

      <VoteTableSkeleton />
    </div>
  );
}

// Wrapper component with Suspense boundary for initial load only
export function VoteRecord(props: VoteRecordProps) {
  return (
    <ErrorBoundary fallbackTitle="Error loading voting record">
      <Suspense fallback={<VoteRecordSkeleton />}>
        <VoteRecordContent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
