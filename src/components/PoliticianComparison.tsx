/**
 * Politician comparison view component
 * Displays two politicians side-by-side for direct comparison
 * Shows headers, donation charts, and voting records in parallel columns
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';
import { VoteRecord } from './VoteRecord';
import DonationChart from './DonationChart';
import type { Politician } from '../types/api';

interface PoliticianComparisonProps {
  politicians: [Politician, Politician];
  onClose: () => void;
}

export function PoliticianComparison({
  politicians,
  onClose,
}: PoliticianComparisonProps) {
  const [politician1, politician2] = politicians;
  const [selectedSubject1, setSelectedSubject1] = useState<string | null>(null);
  const [selectedSubject2, setSelectedSubject2] = useState<string | null>(null);

  const getPartyColor = (party: string): string => {
    if (party === 'Republican') return 'bg-red-100 text-red-800 border-red-300';
    if (party === 'Democratic')
      return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getAvatarColor = (party: string): string => {
    if (party === 'Republican') return 'bg-red-500 text-white';
    if (party === 'Democratic') return 'bg-blue-500 text-white';
    return 'bg-gray-500 text-white';
  };

  const getInitials = (first_name: string, last_name: string): string => {
    return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
  };

  const renderPoliticianHeader = (politician: Politician) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar className={`size-16 ${getAvatarColor(politician.party)}`}>
            <AvatarFallback
              className={`text-xl ${getAvatarColor(politician.party)}`}
            >
              {getInitials(politician.first_name, politician.last_name)}
            </AvatarFallback>
          </Avatar>

          <div className="w-full space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h2 className="text-2xl font-bold">
                {politician.first_name} {politician.last_name}
              </h2>
              {!politician.is_active && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Badge className={getPartyColor(politician.party)}>
                {politician.party}
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                {politician.state}
              </Badge>
              {politician.seat && (
                <Badge variant="secondary" className="px-3 py-1">
                  {politician.seat}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/politician">Politicians</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              Compare: {politician1.last_name} vs {politician2.last_name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header with close button */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Compare Politicians</h1>
        <Button onClick={onClose} variant="outline">
          Back to Search
        </Button>
      </div>

      {/* Side-by-side politician headers */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {renderPoliticianHeader(politician1)}
        {renderPoliticianHeader(politician2)}
      </div>

      {/* Donation Charts - Side by Side */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Campaign Donations</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DonationChart
            politicianId={politician1.canonical_id}
            selectedTopic={selectedSubject1 || undefined}
            onTopicChange={(topic) => setSelectedSubject1(topic || null)}
            onTitleClick={
              selectedSubject1 ? () => setSelectedSubject1(null) : undefined
            }
          />
          <DonationChart
            politicianId={politician2.canonical_id}
            selectedTopic={selectedSubject2 || undefined}
            onTopicChange={(topic) => setSelectedSubject2(topic || null)}
            onTitleClick={
              selectedSubject2 ? () => setSelectedSubject2(null) : undefined
            }
          />
        </div>
      </div>

      {/* Vote Records - Side by Side */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Voting Records</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <VoteRecord
            politicianId={politician1.canonical_id}
            selectedSubjectForDonations={selectedSubject1}
            onSubjectClick={(subject) => setSelectedSubject1(subject)}
          />
          <VoteRecord
            politicianId={politician2.canonical_id}
            selectedSubjectForDonations={selectedSubject2}
            onSubjectClick={(subject) => setSelectedSubject2(subject)}
          />
        </div>
      </div>
    </div>
  );
}
