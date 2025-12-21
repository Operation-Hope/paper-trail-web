/**
 * Donation chart component
 * Displays donation breakdown by industry using Chart.js
 * Supports optional topic filtering for industry-specific analysis
 */
import { Suspense } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type TooltipItem,
  type ChartEvent,
  type ActiveElement,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { api } from '../services/api';
import { queryKeys } from '../lib/query/keys';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { PieChart } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { useTheme } from '../components/providers';

// CRITICAL: Register Chart.js components before use
ChartJS.register(ArcElement, Tooltip, Legend);

interface DonationChartProps {
  politicianId: string;
  selectedTopic?: string;
  onTopicChange?: (topic: string) => void;
  onTitleClick?: () => void;
}

const COLORS = [
  '#FF6384', // Pink
  '#36A2EB', // Blue
  '#FFCE56', // Yellow
  '#4BC0C0', // Teal
  '#9966FF', // Purple
  '#FF9F40', // Orange
  '#E91E63', // Magenta
  '#4CAF50', // Green
  '#795548', // Brown
  '#607D8B', // Blue Grey
];

const TOPICS = [
  'Health',
  'Finance',
  'Technology',
  'Defense',
  'Energy',
  'Environment',
  'Education',
  'Agriculture',
  'Transportation',
];

function DonationChartContent({
  politicianId,
  selectedTopic,
  onTopicChange,
  onTitleClick,
}: DonationChartProps) {
  const { theme } = useTheme();
  const { data: donations } = useSuspenseQuery({
    queryKey: selectedTopic
      ? queryKeys.politicians.donationsFiltered(politicianId, selectedTopic)
      : queryKeys.politicians.donations(politicianId),
    queryFn: async () => {
      if (selectedTopic) {
        const response = await api.getFilteredDonationSummary(politicianId, selectedTopic);
        return response.data;
      }
      return api.getDonationSummary(politicianId);
    },
  });

  if (donations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {selectedTopic
              ? `Donation Summary (Filtered by: ${selectedTopic})`
              : 'Donation Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 py-12 text-center">
            <PieChart className="text-muted-foreground/50 mx-auto h-16 w-16" />
            <div>
              <h3 className="mb-2 text-lg font-semibold">No Donation Data</h3>
              <p className="text-muted-foreground mx-auto max-w-md text-sm">
                {selectedTopic
                  ? `No large donations found for "${selectedTopic}" related industries. Try selecting a different topic to explore other donation patterns.`
                  : 'No large donation records found for this politician in our database. This may indicate no reportable donations over the minimum threshold.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = {
    labels: donations.map((d) => d.industry || 'Unknown'),
    datasets: [
      {
        data: donations.map((d) => d.total_amount),
        backgroundColor: COLORS,
        borderWidth: 1,
      },
    ],
  };

  const handleChartClick = (_event: ChartEvent, elements: ActiveElement[]) => {
    if (!onTopicChange) return;

    if (elements.length > 0) {
      const clickedIndex = elements[0].index;
      const clickedIndustry = donations[clickedIndex]?.industry;

      if (clickedIndustry) {
        // If clicking the currently selected industry, deselect it
        if (selectedTopic === clickedIndustry) {
          onTopicChange('');
        } else {
          // Find the topic that corresponds to this industry
          onTopicChange(clickedIndustry);
        }
      }
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    onClick: handleChartClick,
    plugins: {
      legend: { position: 'bottom' as const },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  const titleText = selectedTopic
    ? `Donation Summary (Filtered by: ${selectedTopic})`
    : 'Donation Summary';

  return (
    <Card>
      <CardHeader>
        <CardTitle
          className={`text-xl ${onTitleClick ? 'cursor-pointer hover:opacity-70' : ''}`}
          onClick={onTitleClick}
          title={onTitleClick ? 'Click to show all donors' : undefined}
        >
          {titleText}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {onTopicChange && (
          <div className="mb-6">
            <label
              htmlFor="topic-filter"
              className="mb-2 block text-sm font-medium"
            >
              Filter by Topic:
            </label>
            <Select
              value={selectedTopic || 'all'}
              onValueChange={(value) =>
                onTopicChange(value === 'all' ? '' : value)
              }
            >
              <SelectTrigger
                id="topic-filter"
                className="w-full md:w-64"
                aria-label="Filter donations by topic"
              >
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {TOPICS.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div
          className="mx-auto mb-2 max-w-md cursor-pointer"
          role="img"
          aria-label="Doughnut chart showing donation breakdown by industry. Click on a segment to filter."
        >
          <Doughnut key={theme} data={chartData} options={chartOptions} />
        </div>

        {onTopicChange && (
          <p className="text-muted-foreground mb-4 text-center text-xs">
            💡 Click on a chart segment to filter by industry
          </p>
        )}

        <div className="mt-6">
          <h4 className="mb-3 text-sm font-semibold">Total by Industry:</h4>
          <div className="space-y-2">
            {donations.map((d, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></span>
                  {d.industry || 'Unknown'}
                </span>
                <span className="font-medium">
                  ${d.total_amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading fallback component
function DonationChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="mx-auto h-7 w-64" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <Skeleton className="h-64 w-64 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// Wrapper component with Suspense boundary
export default function DonationChart(props: DonationChartProps) {
  return (
    <ErrorBoundary fallbackTitle="Error loading donation chart">
      <Suspense fallback={<DonationChartSkeleton />}>
        <DonationChartContent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
