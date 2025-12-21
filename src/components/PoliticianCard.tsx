/**
 * Politician card component for displaying a politician in search results
 * Shows name, party, state, role, and active status with clickable interaction
 * Supports comparison mode with checkbox selection
 */
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { GitCompare } from 'lucide-react';
import type { Politician } from '../types/api';

interface PoliticianCardProps {
  politician: Politician;
  onSelect: (politician: Politician) => void;
  onToggleComparison?: (politician: Politician) => void;
  isSelectedForComparison?: boolean;
  comparisonMode?: boolean;
}

export function PoliticianCard({
  politician,
  onSelect,
  onToggleComparison,
  isSelectedForComparison = false,
  comparisonMode = false,
}: PoliticianCardProps) {
  const getPartyColor = (party: string): string => {
    // Muted but recognizable party colors
    if (party === 'Republican')
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900';
    if (party === 'Democratic')
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getAvatarColor = (party: string): string => {
    // Softer, desaturated avatar colors
    if (party === 'Republican')
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (party === 'Democratic')
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    return 'bg-muted text-muted-foreground';
  };

  const getInitials = (first_name: string, last_name: string): string => {
    return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
  };

  const handleCardClick = () => {
    if (comparisonMode && onToggleComparison) {
      onToggleComparison(politician);
    } else {
      onSelect(politician);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleComparison) {
      onToggleComparison(politician);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      className={`transition-all hover:shadow-md focus:ring-2 focus:ring-ring focus:outline-none ${
        isSelectedForComparison
          ? 'border-primary bg-primary/5 border-2'
          : 'hover:border-primary/50 cursor-pointer'
      }`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      <CardContent className="pt-6">
        <div className="flex gap-3">
          {onToggleComparison && comparisonMode && (
            <div
              className="flex items-start pt-1"
              onClick={handleCheckboxClick}
            >
              <Checkbox
                checked={isSelectedForComparison}
                onCheckedChange={() => onToggleComparison(politician)}
              />
            </div>
          )}

          <Avatar className={`size-12 ${getAvatarColor(politician.party)}`}>
            <AvatarFallback className={getAvatarColor(politician.party)}>
              {getInitials(politician.first_name, politician.last_name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold">
                {politician.first_name} {politician.last_name}
              </h3>
              {!politician.is_active && (
                <Badge
                  variant="outline"
                  className="text-muted-foreground text-xs"
                >
                  Inactive
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={getPartyColor(politician.party)}>
                {politician.party}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                {politician.state}
              </Badge>
              {politician.seat && (
                <Badge
                  variant="outline"
                  className="border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-400"
                >
                  {politician.seat}
                </Badge>
              )}
            </div>

            {onToggleComparison && (
              <Button
                variant={isSelectedForComparison ? 'default' : 'outline'}
                size="sm"
                className="mt-2 w-fit"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleComparison(politician);
                }}
              >
                <GitCompare className="size-4" />
                {isSelectedForComparison ? 'Selected' : 'Compare'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
