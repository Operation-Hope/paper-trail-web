# Architecture Overview

This document describes the architecture of the Paper Trail Web application.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTPS
                            │
                ┌───────────▼──────────┐
                │   Paper Trail Web    │
                │  (React SPA + Proxy) │
                │                      │
                │  - Static assets     │
                │  - Express proxy     │
                │  - Client routing    │
                └───────────┬──────────┘
                            │
                            │ HTTPS/Internal
                            │ (Proxied via Express)
                            │
                ┌───────────▼──────────┐
                │   Paper Trail API    │
                │    (Flask Backend)   │
                │                      │
                │  - REST API          │
                │  - Business logic    │
                │  - Data aggregation  │
                └───────────┬──────────┘
                            │
                            │ PostgreSQL
                            │
                ┌───────────▼──────────┐
                │  PostgreSQL Database │
                │                      │
                │  - Politicians       │
                │  - Donors            │
                │  - Donations         │
                │  - Votes             │
                └──────────────────────┘
```

## Frontend Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI Framework | React 19 | Component-based UI |
| Type System | TypeScript 5.9 | Type safety |
| Build Tool | Vite 7 | Fast development and builds |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| Components | shadcn/ui + Radix | Accessible UI primitives |
| State | React Query | Server state management |
| Routing | React Router 7 | Client-side routing |
| Charts | Chart.js | Data visualization |

### Directory Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui primitives (Button, Card, etc.)
│   ├── Header.tsx       # App header with navigation
│   ├── CommandPalette.tsx # Quick navigation (Cmd+K)
│   ├── VoteFilters.tsx  # Vote filtering controls
│   └── VoteRecord.tsx   # Individual vote display
│
├── pages/               # Route-level components
│   ├── UnifiedSearch.tsx # Main search interface
│   └── NotFound.tsx     # 404 page
│
├── services/            # API integration layer
│   └── api.ts           # Typed API client
│
├── types/               # TypeScript definitions
│   └── api.ts           # API response types
│
├── hooks/               # Custom React hooks
│   └── [custom hooks]
│
├── lib/                 # Utilities and configuration
│   ├── query/           # React Query setup
│   ├── charting/        # Chart.js theming
│   └── utils.ts         # General utilities
│
├── utils/               # Helper functions
│   ├── formatters.ts    # Data formatting
│   └── routing.ts       # Route utilities
│
├── config/              # Configuration
│   └── env.ts           # Environment variables
│
└── test/                # Test setup
    └── setup.ts         # Vitest configuration
```

## Component Hierarchy

```
App
├── ThemeProvider (next-themes)
├── QueryClientProvider (React Query)
└── RouterProvider
    └── Layout
        ├── Header
        │   └── CommandPalette
        └── Routes
            ├── UnifiedSearch (/)
            │   ├── SearchInput
            │   ├── PoliticianResults
            │   │   ├── PoliticianCard
            │   │   ├── DonationChart
            │   │   └── VoteList
            │   │       ├── VoteFilters
            │   │       └── VoteRecord
            │   └── DonorResults
            │       ├── DonorCard
            │       └── DonationList
            └── NotFound (*)
```

## State Management

### Server State (React Query)

All API data is managed through React Query:

```typescript
// Example: Fetching politician votes
const { data, isLoading, error } = useQuery({
  queryKey: ['politician', id, 'votes', filters],
  queryFn: () => api.getPoliticianVotes(id, filters),
});
```

**Query Key Structure:**
- `['politicians', 'search', query]` - Politician search results
- `['politician', id]` - Single politician
- `['politician', id, 'votes', filters]` - Politician votes
- `['politician', id, 'donations']` - Donation summary
- `['donors', 'search', query]` - Donor search results
- `['donor', id]` - Single donor
- `['donor', id, 'donations']` - Donor donations
- `['bills', 'subjects']` - Bill subject list

### Client State

- **Theme**: Managed by `next-themes` (persisted to localStorage)
- **UI State**: Local component state (useState)
- **Route State**: React Router URL parameters

## Data Flow

### Search Flow

```
User Input → SearchInput → api.searchPoliticians()
                                    │
                                    ▼
                            React Query Cache
                                    │
                                    ▼
                            PoliticianResults → Render
```

### Vote Filtering Flow

```
User selects filter → VoteFilters → URL params update
                                          │
                                          ▼
                               React Router re-render
                                          │
                                          ▼
                               useQuery invalidation
                                          │
                                          ▼
                               api.getPoliticianVotes()
                                          │
                                          ▼
                               VoteList re-render
```

## API Integration

### API Client (`src/services/api.ts`)

The API client provides typed methods for all backend endpoints:

```typescript
export const api = {
  searchPoliticians: (query: string) => Promise<Politician[]>,
  getPolitician: (id: string) => Promise<Politician>,
  searchDonors: (query: string) => Promise<Donor[]>,
  getDonor: (id: string) => Promise<Donor>,
  getDonorDonations: (id: string) => Promise<Donation[]>,
  getPoliticianVotes: (id: string, params?) => Promise<VoteResponse>,
  getDonationSummary: (id: string) => Promise<DonationSummary[]>,
  getFilteredDonationSummary: (id: string, topic: string) => Promise<FilteredResponse>,
  getBillSubjects: () => Promise<BillSubjectsResponse>,
};
```

### Request Flow

**Development:**
```
Frontend (5173) → Vite Proxy → Backend (5001)
```

**Production:**
```
Frontend → Express Proxy (server.js) → Backend (Railway internal)
```

## Theming

### Theme Configuration

Themes are implemented using CSS variables and Tailwind:

```css
/* Light theme */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  /* ... */
}

/* Dark theme */
.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... */
}
```

### Chart Theming

Chart.js colors sync with the application theme:

```typescript
// src/lib/charting/theme.ts
export function getChartThemeColors(isDark: boolean) {
  return {
    text: isDark ? '#fafafa' : '#09090b',
    grid: isDark ? '#27272a' : '#e4e4e7',
    // ...
  };
}
```

## Performance Considerations

### Code Splitting

- Route-based code splitting via React Router
- Dynamic imports for heavy components (charts)

### Caching

- React Query caches API responses
- Stale-while-revalidate pattern
- Configurable cache times per query

### Optimizations

- Debounced search input
- Pagination for large result sets
- Memoized expensive computations

## Security

### Frontend Security

- No sensitive data stored client-side
- All API calls through proxy (no direct backend exposure)
- React's built-in XSS protection
- HTTPS in production

### API Security

- Input validation before API calls
- URL parameter encoding
- Error boundaries for graceful failures

## Deployment

### Build Process

```bash
pnpm install          # Install dependencies
pnpm run build        # TypeScript check + Vite build
```

Output: `dist/` directory with static assets

### Production Server

`server.js` provides:
- Static file serving from `dist/`
- API proxy to backend
- SPA routing (serves `index.html` for all routes)
- Health check endpoint (`/health`)

### Railway Configuration

```json
{
  "build": {
    "builder": "nixpacks",
    "buildCommand": "pnpm install && pnpm run build"
  },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/"
  }
}
```
