/**
 * Vote filtering UI component
 * Provides search, date range, vote outcome, bill type, and sort order filtering
 * Optimized with memoized sub-components to prevent unnecessary re-renders
 */
import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { format, parseISO, subYears, startOfYear } from 'date-fns';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import type { VoteValue } from '../types/api';

interface VoteFiltersProps {
  // Existing filters
  billType: string;
  setBillType: (type: string) => void;
  sortOrder: 'ASC' | 'DESC';
  setSortOrder: (order: 'ASC' | 'DESC') => void;
  // New filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateFrom: string | null;
  setDateFrom: (date: string | null) => void;
  dateTo: string | null;
  setDateTo: (date: string | null) => void;
  voteValues: VoteValue[];
  setVoteValues: (values: VoteValue[]) => void;
  clearAllFilters: () => void;
  // Date range boundaries from API
  earliestVoteDate?: string | null;
  latestVoteDate?: string | null;
}

const VOTE_OPTIONS: { value: VoteValue; label: string }[] = [
  { value: 'Yea', label: 'Yea' },
  { value: 'Nay', label: 'Nay' },
  { value: 'Present', label: 'Present' },
  { value: 'Not Voting', label: 'Not Voting' },
];

const BILL_TYPES = [
  { id: 'hr', label: 'House (HR)' },
  { id: 's', label: 'Senate (S)' },
  { id: 'hjres', label: 'HJRes' },
  { id: 'sjres', label: 'SJRes' },
];

// =============================================================================
// Memoized Sub-Components
// These components only re-render when their specific props change
// =============================================================================

interface SearchFilterProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
}

const SearchFilter = memo(function SearchFilter({
  searchInput,
  onSearchChange,
  onClearSearch,
}: SearchFilterProps) {
  const hasSearch = searchInput.length > 0;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Search</Label>
      <div className="relative">
        <Search className={cn(
          'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
          hasSearch ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'
        )} />
        <Input
          type="text"
          placeholder="Search bills, descriptions, topics..."
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            'pl-9 transition-all',
            'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700',
            hasSearch && 'border-cyan-400 bg-cyan-50 ring-2 ring-cyan-200 dark:border-cyan-500 dark:bg-cyan-950/30 dark:ring-cyan-800'
          )}
        />
        {searchInput && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 cursor-pointer p-0 text-slate-500 hover:bg-red-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
            onClick={onClearSearch}
            title="Clear search"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
});

interface DateRangeFilterProps {
  dateFrom: string | null;
  dateTo: string | null;
  earliestVoteDate?: string | null;
  latestVoteDate?: string | null;
  onDateRangeSelect: (range: DateRange | undefined) => void;
  onClearDateRange: () => void;
  onApplyDatePreset: (preset: { label: string; from: string | null; to: string | null }) => void;
}

const DateRangeFilter = memo(function DateRangeFilter({
  dateFrom,
  dateTo,
  earliestVoteDate,
  latestVoteDate,
  onDateRangeSelect,
  onClearDateRange,
  onApplyDatePreset,
}: DateRangeFilterProps) {
  // Parse date strings to Date objects for the calendar
  const selectedDateRange: DateRange | undefined =
    dateFrom || dateTo
      ? {
          from: dateFrom ? parseISO(dateFrom) : undefined,
          to: dateTo ? parseISO(dateTo) : undefined,
        }
      : undefined;

  // Parse boundary dates for calendar disabled dates
  const minDate = earliestVoteDate ? parseISO(earliestVoteDate) : undefined;
  const maxDate = latestVoteDate ? parseISO(latestVoteDate) : undefined;

  // Calculate date presets
  const datePresets = useMemo(() => {
    const today = new Date();
    
    // Use latestVoteDate as the end date boundary when available, otherwise use today
    const endDate = latestVoteDate ? parseISO(latestVoteDate) : today;
    const endDateFormatted = format(endDate, 'yyyy-MM-dd');
    
    // Congress sessions start in January of odd years
    // Calculate based on endDate to ensure the congress start is before the end date
    const endYear = endDate.getFullYear();
    const congressStartYear = endYear % 2 === 1 ? endYear : endYear - 1;
    const congressStart = startOfYear(new Date(congressStartYear, 0, 1));

    return [
      {
        label: 'This Congress',
        from: format(congressStart, 'yyyy-MM-dd'),
        to: endDateFormatted,
      },
      {
        label: 'Last 2 Years',
        from: format(subYears(endDate, 2), 'yyyy-MM-dd'),
        to: endDateFormatted,
      },
      {
        label: 'Last 5 Years',
        from: format(subYears(endDate, 5), 'yyyy-MM-dd'),
        to: endDateFormatted,
      },
      {
        label: 'All Time',
        from: earliestVoteDate || null,
        to: latestVoteDate || null,
      },
    ];
  }, [earliestVoteDate, latestVoteDate]);

  // Check if a preset matches the current date range - memoized for performance
  const isPresetActive = useCallback((preset: { label: string; from: string | null; to: string | null }) => {
    if (preset.label === 'All Time') {
      return !dateFrom && !dateTo;
    }
    return dateFrom === preset.from && dateTo === preset.to;
  }, [dateFrom, dateTo]);

  const formatDateDisplay = () => {
    if (!dateFrom && !dateTo) return 'Select date range';
    if (dateFrom && dateTo) {
      return `${format(parseISO(dateFrom), 'MMM d, yyyy')} - ${format(parseISO(dateTo), 'MMM d, yyyy')}`;
    }
    if (dateFrom) return `From ${format(parseISO(dateFrom), 'MMM d, yyyy')}`;
    if (dateTo) return `To ${format(parseISO(dateTo), 'MMM d, yyyy')}`;
    return 'Select date range';
  };

  const hasDateFilter = dateFrom || dateTo;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Date Range</Label>
      {/* Quick preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {datePresets.map((preset) => {
          const isActive = isPresetActive(preset);
          return (
            <Button
              key={preset.label}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              aria-label={`Filter by ${preset.label}${isActive ? ' (active)' : ''}`}
              aria-pressed={isActive}
              className={cn(
                'h-7 cursor-pointer text-xs transition-all',
                isActive 
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              )}
              onClick={() => onApplyDatePreset(preset)}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>
      {/* Calendar picker */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full cursor-pointer justify-start text-left font-normal transition-all',
                'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700',
                !selectedDateRange && 'text-slate-500 dark:text-slate-400',
                hasDateFilter && 'border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800'
              )}
            >
              <CalendarIcon className={cn(
                'mr-2 h-4 w-4',
                hasDateFilter && 'text-blue-600 dark:text-blue-400'
              )} />
              {formatDateDisplay()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              captionLayout="dropdown"
              selected={selectedDateRange}
              onSelect={onDateRangeSelect}
              defaultMonth={maxDate}
              startMonth={minDate}
              endMonth={maxDate}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        {selectedDateRange && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 cursor-pointer p-0 text-slate-500 hover:bg-red-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
            onClick={onClearDateRange}
            title="Clear date range"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {earliestVoteDate && latestVoteDate && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Available: {format(parseISO(earliestVoteDate), 'MMM yyyy')} -{' '}
          {format(parseISO(latestVoteDate), 'MMM yyyy')}
        </p>
      )}
    </div>
  );
});

interface VoteOutcomeFilterProps {
  voteValues: VoteValue[];
  onVoteValueToggle: (values: VoteValue[]) => void;
}

const VoteOutcomeFilter = memo(function VoteOutcomeFilter({
  voteValues,
  onVoteValueToggle,
}: VoteOutcomeFilterProps) {
  // Color mapping for vote types
  const getVoteColors = (value: string, isActive: boolean) => {
    if (!isActive) {
      return 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600';
    }
    switch (value) {
      case 'Yea':
        return 'border-emerald-400 bg-emerald-500 text-white shadow-md hover:bg-emerald-600 data-[state=on]:bg-emerald-500 data-[state=on]:text-white dark:bg-emerald-600 dark:hover:bg-emerald-700';
      case 'Nay':
        return 'border-rose-400 bg-rose-500 text-white shadow-md hover:bg-rose-600 data-[state=on]:bg-rose-500 data-[state=on]:text-white dark:bg-rose-600 dark:hover:bg-rose-700';
      case 'Present':
        return 'border-amber-400 bg-amber-500 text-white shadow-md hover:bg-amber-600 data-[state=on]:bg-amber-500 data-[state=on]:text-white dark:bg-amber-600 dark:hover:bg-amber-700';
      case 'Not Voting':
        return 'border-slate-400 bg-slate-500 text-white shadow-md hover:bg-slate-600 data-[state=on]:bg-slate-500 data-[state=on]:text-white dark:bg-slate-600 dark:hover:bg-slate-700';
      default:
        return 'border-blue-400 bg-blue-500 text-white shadow-md hover:bg-blue-600 data-[state=on]:bg-blue-500 data-[state=on]:text-white';
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Vote Outcome</Label>
      <ToggleGroup
        type="multiple"
        value={voteValues}
        onValueChange={onVoteValueToggle}
        variant="outline"
        className="flex-wrap justify-start gap-1.5"
      >
        {VOTE_OPTIONS.map((option) => {
          const isActive = voteValues.includes(option.value);
          return (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={`Filter by ${option.label}`}
              className={cn(
                'cursor-pointer text-xs transition-all',
                getVoteColors(option.value, isActive)
              )}
            >
              {option.label}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
});

interface BillTypeFilterProps {
  billType: string;
  onBillTypeChange: (type: string, checked: boolean) => void;
}

const BillTypeFilter = memo(function BillTypeFilter({
  billType,
  onBillTypeChange,
}: BillTypeFilterProps) {
  const isBillTypeChecked = (type: string): boolean => {
    return billType.split(',').includes(type);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bill Type</Label>
      <div className="flex flex-wrap gap-2">
        {BILL_TYPES.map((type) => {
          const isChecked = isBillTypeChecked(type.id);
          return (
            <div
              key={type.id}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 transition-all',
                isChecked
                  ? 'border-violet-500 bg-violet-100 text-violet-800 shadow-md ring-1 ring-violet-300 dark:border-violet-400 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              )}
              onClick={() => onBillTypeChange(type.id, !isChecked)}
            >
              <Checkbox
                id={`bill-type-${type.id}`}
                checked={isChecked}
                onCheckedChange={(checked) =>
                  onBillTypeChange(type.id, checked === true)
                }
                className={cn(
                  'cursor-pointer transition-colors',
                  isChecked 
                    ? 'border-violet-600 bg-violet-600 text-white data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600' 
                    : 'border-slate-400'
                )}
              />
              <Label
                htmlFor={`bill-type-${type.id}`}
                className="cursor-pointer text-sm font-normal"
              >
                {type.label}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
});

interface SortOrderFilterProps {
  sortOrder: 'ASC' | 'DESC';
  onSortOrderChange: (order: 'ASC' | 'DESC') => void;
}

const SortOrderFilter = memo(function SortOrderFilter({
  sortOrder,
  onSortOrderChange,
}: SortOrderFilterProps) {
  const isNonDefault = sortOrder !== 'DESC';

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sort Order</Label>
      <Select
        value={sortOrder}
        onValueChange={(value) => onSortOrderChange(value as 'ASC' | 'DESC')}
      >
        <SelectTrigger
          className={cn(
            'w-full cursor-pointer transition-all',
            'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700',
            isNonDefault && 'border-orange-400 bg-orange-50 text-orange-700 ring-2 ring-orange-200 dark:border-orange-500 dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-800'
          )}
        >
          <SelectValue placeholder="Select sort order" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="DESC" className="cursor-pointer">Newest First</SelectItem>
          <SelectItem value="ASC" className="cursor-pointer">Oldest First</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
});

// =============================================================================
// Main Component
// =============================================================================

export function VoteFilters({
  billType,
  setBillType,
  sortOrder,
  setSortOrder,
  searchQuery,
  setSearchQuery,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  voteValues,
  setVoteValues,
  clearAllFilters,
  earliestVoteDate,
  latestVoteDate,
}: VoteFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local searchInput when searchQuery prop changes (e.g., clearAllFilters from parent)
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Cancel any pending debounce timeout
  const cancelDebounce = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);

  // Clear search and cancel pending debounce
  const clearSearch = useCallback(() => {
    cancelDebounce();
    setSearchInput('');
    setSearchQuery('');
  }, [cancelDebounce, setSearchQuery]);

  // Debounced search handler
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      // Cancel previous timeout before creating new one
      cancelDebounce();
      // Debounce: apply search after typing stops
      debounceTimeoutRef.current = setTimeout(() => {
        setSearchQuery(value);
      }, 300);
    },
    [cancelDebounce, setSearchQuery]
  );

  // Memoized handler for bill type changes
  const handleBillTypeChange = useCallback((type: string, checked: boolean) => {
    const currentTypes = billType.split(',').filter(Boolean);
    if (checked) {
      const newTypes = [...currentTypes, type];
      setBillType(newTypes.join(','));
    } else {
      const newTypes = currentTypes.filter((t) => t !== type);
      setBillType(newTypes.join(','));
    }
  }, [billType, setBillType]);

  // Memoized handler for date range selection
  const handleDateRangeSelect = useCallback((range: DateRange | undefined) => {
    if (range?.from) {
      setDateFrom(format(range.from, 'yyyy-MM-dd'));
    } else {
      setDateFrom(null);
    }
    if (range?.to) {
      setDateTo(format(range.to, 'yyyy-MM-dd'));
    } else {
      setDateTo(null);
    }
  }, [setDateFrom, setDateTo]);

  // Memoized handler for clearing date range
  const clearDateRange = useCallback(() => {
    setDateFrom(null);
    setDateTo(null);
  }, [setDateFrom, setDateTo]);

  // Memoized handler for date presets
  const applyDatePreset = useCallback((preset: { label: string; from: string | null; to: string | null }) => {
    if (preset.label === 'All Time') {
      // Clear the date filter to show all votes
      setDateFrom(null);
      setDateTo(null);
    } else {
      setDateFrom(preset.from);
      setDateTo(preset.to);
    }
  }, [setDateFrom, setDateTo]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count += 1;
    if (billType) count += billType.split(',').filter(Boolean).length;
    if (dateFrom || dateTo) count += 1;
    if (voteValues.length > 0) count += voteValues.length;
    if (sortOrder !== 'DESC') count += 1;
    return count;
  }, [searchQuery, billType, dateFrom, dateTo, voteValues, sortOrder]);

  // Memoized clear all handler
  const handleClearAll = useCallback(() => {
    cancelDebounce();
    clearAllFilters();
  }, [cancelDebounce, clearAllFilters]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full cursor-pointer items-center justify-between rounded-lg border p-3 transition-all',
            'bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-150',
            'dark:from-slate-900 dark:to-slate-800 dark:hover:from-slate-800 dark:hover:to-slate-700',
            'border-slate-200 dark:border-slate-700',
            activeFilterCount > 0 && 'ring-2 ring-primary/20 ring-offset-1'
          )}
        >
          <div className="flex items-center gap-2">
            <Filter className={cn(
              'h-4 w-4 transition-colors',
              activeFilterCount > 0 ? 'text-primary' : 'text-muted-foreground'
            )} />
            <h3 className="text-sm font-semibold">Filter Votes</h3>
            {activeFilterCount > 0 && (
              <Badge className="ml-2 bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex h-8 w-8 items-center justify-center">
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle filters</span>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className={cn(
        'space-y-4 rounded-lg border p-4',
        'bg-gradient-to-br from-slate-50 via-white to-slate-50',
        'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900',
        'border-slate-200 dark:border-slate-700'
      )}>
        {/* Search Section */}
        <div className="rounded-md bg-white p-3 shadow-sm dark:bg-slate-800/50">
          <SearchFilter
            searchInput={searchInput}
            onSearchChange={handleSearchChange}
            onClearSearch={clearSearch}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600" />
        </div>

        {/* Date Range Section */}
        <div className="rounded-md bg-white p-3 shadow-sm dark:bg-slate-800/50">
          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            earliestVoteDate={earliestVoteDate}
            latestVoteDate={latestVoteDate}
            onDateRangeSelect={handleDateRangeSelect}
            onClearDateRange={clearDateRange}
            onApplyDatePreset={applyDatePreset}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600" />
        </div>

        {/* Vote Outcome Section */}
        <div className="rounded-md bg-white p-3 shadow-sm dark:bg-slate-800/50">
          <VoteOutcomeFilter
            voteValues={voteValues}
            onVoteValueToggle={setVoteValues}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600" />
        </div>

        {/* Bill Type Section */}
        <div className="rounded-md bg-white p-3 shadow-sm dark:bg-slate-800/50">
          <BillTypeFilter
            billType={billType}
            onBillTypeChange={handleBillTypeChange}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600" />
        </div>

        {/* Sort Order Section */}
        <div className="rounded-md bg-white p-3 shadow-sm dark:bg-slate-800/50">
          <SortOrderFilter
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
          />
        </div>

        {/* Clear Filters Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className={cn(
            'w-full cursor-pointer transition-all',
            activeFilterCount > 0
              ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50'
              : 'text-muted-foreground'
          )}
          disabled={activeFilterCount === 0}
        >
          Clear All Filters
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
