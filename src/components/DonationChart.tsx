/**
 * Donation chart component
 * Displays donation breakdown by industry using Chart.js
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

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonationChartProps {
  politicianId: string;
  selectedTopic?: string;
  onTopicChange?: (topic: string) => void;
  onTitleClick?: () => void;
}

const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E91E63', '#4CAF50', '#795548', '#607D8B'];
const TOPICS = ['Health', 'Finance', 'Technology', 'Defense', 'Energy', 'Environment', 'Education', 'Agriculture', 'Transportation'];

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

  if (!donations || donations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Donation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 py-12 text-center">
            <PieChart className="text-muted-foreground/50 mx-auto h-16 w-16" />
            <h3 className="text-lg font-semibold">No Donation Data Found</h3>
            <p className="text-muted-foreground text-sm">No reportable DIME records found for this politician.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // UPDATED: Mapping 'name' to labels and 'value' to data
  const chartData = {
    labels: donations.map((d: any) => d.name || 'Unknown'),
    datasets: [
      {
        data: donations.map((d: any) => d.value),
        backgroundColor: COLORS,
        borderWidth: 1,
      },
    ],
  };

  const handleChartClick = (_event: ChartEvent, elements: ActiveElement[]) => {
    if (!onTopicChange || elements.length === 0) return;
    const clickedIndex = elements[0].index;
    const clickedIndustry = donations[clickedIndex]?.name;
    if (clickedIndustry) {
      onTopicChange(selectedTopic === clickedIndustry ? '' : clickedIndustry);
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
            return `${label}: $${value.toLocaleString()}`;
          },
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle 
          className={`text-xl ${onTitleClick ? 'cursor-pointer hover:opacity-70' : ''}`}
          onClick={onTitleClick}
        >
          {selectedTopic ? `Donations: ${selectedTopic}` : 'Top Industry Funding'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {onTopicChange && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">Quick Filter:</label>
            <Select
              value={selectedTopic || 'all'}
              onValueChange={(value) => onTopicChange(value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {TOPICS.map((topic) => (
                  <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="mx-auto mb-4 max-w-md">
          <Doughnut key={theme} data={chartData} options={chartOptions} />
        </div>

        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-semibold">Funding Breakdown:</h4>
          {donations.map((d: any, index: number) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                {d.name}
              </span>
              <span className="font-mono font-medium">${d.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DonationChartSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <Skeleton className="h-64 w-64 rounded-full" />
      </CardContent>
    </Card>
  );
}

export default function DonationChart(props: DonationChartProps) {
  return (
    <ErrorBoundary fallbackTitle="Error loading donation chart">
      <Suspense fallback={<DonationChartSkeleton />}>
        <DonationChartContent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}