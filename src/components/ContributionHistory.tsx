/**
 * Contribution history component
 * Displays a list of donations made by a donor using React 19 Suspense
 * Fetches and displays donation data with useSuspenseQuery
 */
import { Suspense } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { queryKeys } from '../lib/query/keys';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { ErrorBoundary } from './ErrorBoundary';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ContributionHistoryProps {
  donorId: string;
  threshold?: number;
}

function ContributionHistoryContent({
  donorId,
  threshold = 2000,
}: ContributionHistoryProps) {
  const { data: donations } = useSuspenseQuery({
    queryKey: queryKeys.donors.donations(donorId),
    queryFn: () => api.getDonorDonations(donorId),
    staleTime: 5 * 60 * 1000,
  });

  const thresholdDisplay = threshold
    ? `(> $${threshold.toLocaleString()})`
    : '';

  if (donations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            Contribution History {thresholdDisplay}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground space-y-2 py-8 text-center">
            <p className="font-medium">
              No large contributions found {thresholdDisplay} to politicians in
              our database.
            </p>
            <p className="text-sm">This donor may have:</p>
            <ul className="inline-block text-left text-sm">
              <li>
                • Made smaller contributions (under $
                {threshold.toLocaleString()})
              </li>
              <li>• Not contributed to politicians we track</li>
              <li>• Contributed only to state/local politicians</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">
          Contribution History {thresholdDisplay}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
          {donations.map((donation, index) => (
            <div
              key={index}
              className="border-border border-t pt-3 pb-1 first:border-t-0 first:pt-0"
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="text-foreground font-semibold">
                  {donation.first_name} {donation.last_name} ({donation.party}-
                  {donation.state})
                </p>
                <p className="font-bold text-green-600">
                  {formatCurrency(donation.amount)}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                Date: {formatDate(donation.transaction_date)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Loading fallback component
function ContributionHistorySkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">
          <Skeleton className="mx-auto h-7 w-64" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="border-border border-t pt-3 pb-1 first:border-t-0 first:pt-0"
            >
              <div className="mb-1 flex items-center justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Wrapper component with Suspense boundary
export function ContributionHistory(props: ContributionHistoryProps) {
  return (
    <ErrorBoundary fallbackTitle="Error loading contribution history">
      <Suspense fallback={<ContributionHistorySkeleton />}>
        <ContributionHistoryContent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
