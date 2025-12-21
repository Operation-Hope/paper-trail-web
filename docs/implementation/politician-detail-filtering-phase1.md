# Politician Detail UX - Phase 1: Filtering Enhancements

## Overview

Implement enhanced filtering for the politician detail view, focusing on voting record and donation filters. This requires coordinated changes to both `paper-trail-api` (backend) and `paper-trail-client` (frontend).

---

## Libraries & Components (Already Installed)

| Component | Library | Notes |
|-----------|---------|-------|
| Date Picker | `react-day-picker` v9.11.2 | shadcn Calendar component exists at `src/components/ui/calendar.tsx` |
| Date Utils | `date-fns` v4.1.0 | For date formatting and manipulation |
| Toggle Chips | `@radix-ui/react-toggle-group` v1.1.11 | For vote outcome filter (Yea/Nay/etc.) |
| Search Input | shadcn `Input` + `lucide-react` icons | Debounce with native `setTimeout` or add `use-debounce` |
| Popover | `@radix-ui/react-popover` v1.1.15 | For date picker dropdown |

**No new dependencies required** - all components can be built with existing libraries.

---

## Phase 1A: Backend API Changes (`paper-trail-api`)

### 1. Add Vote Date Range Filter

**File:** `paper-trail-api/app/main.py`

Add query parameters to `/api/politician/{canonical_id}/votes`:
- `date_from` (optional): ISO date string (YYYY-MM-DD)
- `date_to` (optional): ISO date string (YYYY-MM-DD)

SQL modification:
```sql
-- Add to WHERE clause
AND (%(date_from)s IS NULL OR vote_date >= %(date_from)s)
AND (%(date_to)s IS NULL OR vote_date <= %(date_to)s)
```

### 2. Add Vote Outcome Filter

Add query parameter:
- `vote_value` (optional, repeatable): Filter by vote outcome (Yea, Nay, Present, Not Voting)

SQL modification:
```sql
-- Add to WHERE clause
AND (%(vote_values)s IS NULL OR vote_value = ANY(%(vote_values)s))
```

### 3. Add Bill Text Search

Add query parameter:
- `search` (optional): Search term for bill number, title, and subjects

SQL modification:
```sql
-- Add to WHERE clause (case-insensitive)
AND (
  %(search)s IS NULL
  OR bill_number ILIKE '%' || %(search)s || '%'
  OR bill_description ILIKE '%' || %(search)s || '%'
  OR EXISTS (
    SELECT 1 FROM bill_topics bt
    WHERE bt.rollcall_id = r.rollcall_id
    AND bt.topic_label ILIKE '%' || %(search)s || '%'
  )
)
```

### 4. Add Vote Date Range Metadata Endpoint

**New Endpoint:** `GET /api/politician/{canonical_id}/votes/date-range`

Returns:
```json
{
  "earliest_vote": "2003-01-07",
  "latest_vote": "2024-11-15",
  "congress_sessions": [
    {"congress": 118, "start": "2023-01-03", "end": "2024-12-31"},
    {"congress": 117, "start": "2021-01-03", "end": "2023-01-02"}
  ]
}
```

### 5. Add Donation Filters (Bonus - if time permits)

Add to `/api/politician/{canonical_id}/donations/summary`:
- `amount_min` (optional): Minimum donation amount
- `amount_max` (optional): Maximum donation amount
- `cycle` (optional, repeatable): Election cycle year (2024, 2022, etc.)

---

## Phase 1B: Frontend Changes (`paper-trail-client`)

### 1. Update API Types

**File:** `src/types/api.ts`

```typescript
// Add new filter params
export interface VoteParams {
  page?: number;
  sort?: 'ASC' | 'DESC';
  type?: string | string[];
  subject?: string | string[];
  date_from?: string;      // NEW
  date_to?: string;        // NEW
  vote_value?: string[];   // NEW
  search?: string;         // NEW
}

// Add date range response type
export interface VoteDateRangeResponse {
  earliest_vote: string;
  latest_vote: string;
  congress_sessions: Array<{
    congress: number;
    start: string;
    end: string;
  }>;
}
```

### 2. Update API Service

**File:** `src/services/api.ts`

- Add `date_from`, `date_to`, `vote_value`, `search` params to `getPoliticianVotes()`
- Add new method `getPoliticianVoteDateRange(politicianId)`

### 3. Update Query Keys

**File:** `src/lib/query/keys.ts`

- Add `voteDateRange` key under politicians
- Update `votes` key to include new filter params

### 4. Replace Subject Dropdown with Live Search

**File:** `src/components/VoteFilters.tsx`

Replace the `MultiSelectCombobox` for subjects with a debounced search input:

```
┌─────────────────────────────────────────────────────────┐
│  Search bills...                                 [×]    │
│  Searches bill titles, subjects, and bill numbers       │
└─────────────────────────────────────────────────────────┘
```

- Use shadcn `Input` with search icon
- Debounce input (300ms)
- Show clear button when text present
- Display match count in results header

### 5. Add Date Range Filter Component

**New File:** `src/components/VoteDateRangeFilter.tsx`

```
┌──────────────────────────────────────────────────────────┐
│  Date Range                                              │
│  ┌─────────────┐  to  ┌─────────────┐                   │
│  │ Jan 2020    │      │ Dec 2024    │                   │
│  └─────────────┘      └─────────────┘                   │
│  [This Congress] [Last 2 Years] [All Time]              │
└──────────────────────────────────────────────────────────┘
```

- Fetch date range dynamically from API
- Month/year picker (no need for day precision)
- Preset buttons calculated from dynamic data:
  - "This Congress" -> latest congress session dates
  - "Last 2 Years" -> calculated from today
  - "Last 5 Years" -> calculated from today
  - "All Time" -> clears filter

### 6. Add Vote Outcome Filter Component

**Update File:** `src/components/VoteFilters.tsx`

Add toggle chip group:
```
┌──────────────────────────────────────────────────────────┐
│  Vote:  [Yea] [Nay] [Abstain] [Not Voting]              │
└──────────────────────────────────────────────────────────┘
```

- Use shadcn `Toggle` or `ToggleGroup` components
- Multi-select (can filter to show Yea AND Nay)
- All selected by default (no filter)

### 7. Update useVotes Hook

**File:** `src/hooks/useVotes.ts`

Add state management for new filters:
- `searchQuery: string`
- `dateFrom: string | null`
- `dateTo: string | null`
- `voteValues: string[]`

Add helper functions:
- `setDatePreset(preset: 'this-congress' | 'last-2-years' | 'last-5-years' | 'all')`
- `clearAllFilters()`

### 8. Update VoteFilters Layout

**File:** `src/components/VoteFilters.tsx`

New layout structure:
```
┌──────────────────────────────────────────────────────────┐
│  Search bills, subjects, or numbers...           [×]    │
├──────────────────────────────────────────────────────────┤
│  Bill Type:  [x] House (HR)  [x] Senate (S)             │
│              [ ] HJRes       [ ] SJRes                   │
├──────────────────────────────────────────────────────────┤
│  Date Range: [Jan 2020] to [Dec 2024]                   │
│              [This Congress] [Last 2 Yrs] [All Time]    │
├──────────────────────────────────────────────────────────┤
│  Vote:  [Yea] [Nay] [Abstain] [Not Voting]              │
├──────────────────────────────────────────────────────────┤
│  Sort: [Newest First]                [Clear All Filters]│
└──────────────────────────────────────────────────────────┘

Showing 47 of 1,348 votes
```

---

## Critical Files to Modify

### Backend (`paper-trail-api`)
1. `app/main.py` - Add new query params and endpoint

### Frontend (`paper-trail-client`)
1. `src/types/api.ts` - Add new types
2. `src/services/api.ts` - Add new API methods and params
3. `src/lib/query/keys.ts` - Update query keys
4. `src/hooks/useVotes.ts` - Add new filter state
5. `src/components/VoteFilters.tsx` - Rebuild filter UI
6. `src/components/VoteRecord.tsx` - Update to use new filters
7. `src/components/VoteDateRangeFilter.tsx` - New component (optional, could inline)

---

## Implementation Order

1. **Backend first** - Add all new API params and endpoint
2. **API types** - Update TypeScript types to match backend
3. **API service** - Add new methods
4. **useVotes hook** - Add state management for new filters
5. **VoteFilters component** - Rebuild with new UI
6. **Testing** - Verify all filters work correctly

---

## Future Phases (Not in Scope)

- **Phase 2:** Donation filtering (amount range, date range)
- **Phase 3:** "Follow the Money" correlation panel
- **Phase 4:** Cross-filter interaction (click industry -> filter votes)
