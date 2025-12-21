/**
 * Politician details view component
 * Displays comprehensive information including header, donation chart, and voting record
 */
import { useState } from 'react';
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

interface PoliticianDetailsProps {
  politician: Politician;
  onClose: () => void;
}

export function PoliticianDetails({
  politician,
  onClose,
}: PoliticianDetailsProps) {
  const [selectedSubjectForDonations, setSelectedSubjectForDonations] =
    useState<string | null>(null);

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

  const handleSubjectClick = (subject: string | null) => {
    setSelectedSubjectForDonations(subject);
  };

  const handleDonationTitleClick = () => {
    if (selectedSubjectForDonations) {
      setSelectedSubjectForDonations(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={onClose} className="cursor-pointer">
              Politicians
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {politician.first_name} {politician.last_name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex flex-1 items-center gap-4">
              <Avatar className={`size-20 ${getAvatarColor(politician.party)}`}>
                <AvatarFallback
                  className={`text-2xl ${getAvatarColor(politician.party)}`}
                >
                  {getInitials(politician.first_name, politician.last_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <h1 className="text-3xl font-bold">
                    {politician.first_name} {politician.last_name}
                  </h1>
                  {!politician.is_active && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={getPartyColor(politician.party)}>
                    {politician.party}
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1 text-base">
                    {politician.state}
                  </Badge>
                  {politician.seat && (
                    <Badge variant="secondary" className="px-3 py-1 text-base">
                      {politician.seat}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button onClick={onClose} variant="outline">
              Back to Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout: Donation Chart (left) and Vote Record (right) on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Donation Chart Section */}
        <DonationChart
          politicianId={politician.canonical_id}
          selectedTopic={selectedSubjectForDonations || undefined}
          onTopicChange={(topic) =>
            setSelectedSubjectForDonations(topic || null)
          }
          onTitleClick={
            selectedSubjectForDonations ? handleDonationTitleClick : undefined
          }
        />

        {/* Vote Record Section */}
        <VoteRecord
          politicianId={politician.canonical_id}
          selectedSubjectForDonations={selectedSubjectForDonations}
          onSubjectClick={handleSubjectClick}
        />
      </div>
    </div>
  );
}
