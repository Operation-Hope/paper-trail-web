# Paper Trail - Campaign Finance Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/Operation-Hope/paper-trail-web/actions/workflows/ci.yml/badge.svg)](https://github.com/Operation-Hope/paper-trail-web/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Operation-Hope/paper-trail-web/branch/main/graph/badge.svg)](https://codecov.io/gh/Operation-Hope/paper-trail-web)

Part of [CorruptionWatch.us](https://corruptionwatch.us) - An Operation-Hope initiative for political transparency.

## About This Project

Paper Trail empowers citizens to track the influence of money in politics. We combine campaign contribution data with congressional voting records to reveal potential conflicts of interest and promote accountability.

This is the web frontend for the Paper Trail system, built with React 19.2 + TypeScript 5.9 + Tailwind CSS 4 + Vite. A standalone React application for exploring political campaign finance data.

> **Note:** The backend API is currently under development. See the [paper-trail-api](https://github.com/Operation-Hope/paper-trail-api) repository for progress.

## Development Setup

1. Ensure Node.js 24+ is installed
2. Install dependencies: `pnpm install`
3. Start development server: `pnpm run dev`

## Development Workflow

Start the frontend development server:

```bash
pnpm run dev
```

This starts Vite at http://localhost:5173 with hot module replacement.

### Backend Integration

The backend API is under active development. When available:

1. Clone and run the [paper-trail-api](https://github.com/Operation-Hope/paper-trail-api) on port 5001
2. The Vite dev server proxies `/api/*` requests to `localhost:5001` (configured in `vite.config.ts`)

For now, you can explore the UI components without a running backend.

## Project Structure

```
src/
├── types/
│   └── api.ts              # TypeScript type definitions
├── services/
│   └── api.ts              # API service layer
├── pages/
│   ├── UnifiedSearch.tsx   # Main search page
│   └── NotFound.tsx        # 404 page
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and query configuration
├── utils/                  # Formatting and routing utilities
├── mocks/                  # MSW mock handlers for development
├── test/                   # Test utilities and setup
├── App.tsx                 # Main app with routing
└── index.css               # Tailwind CSS imports
```

## Code Patterns

### Using API Services

```typescript
import { api } from '../services/api';
import type { Politician } from '../types/api';

// In your component
const [politicians, setPoliticians] = useState<Politician[]>([]);

const searchPoliticians = async (query: string) => {
  try {
    const results = await api.searchPoliticians(query);
    setPoliticians(results);
  } catch (error) {
    console.error('Search failed:', error);
  }
};
```

### TypeScript Strict Mode

- All components must have proper types
- No `any` types allowed
- Props interfaces required for all components

### Tailwind CSS

- Use Tailwind classes exclusively
- No inline styles or CSS modules
- Tailwind 4 uses CSS-first configuration

## Building for Production

```bash
pnpm run build
```

Build output goes to `dist/` directory containing static assets ready for deployment.

## Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run dev:mocks` - Start with MSW mock data (no backend needed)
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build locally
- `pnpm run lint` - Run ESLint
- `pnpm run test` - Run tests in watch mode
- `pnpm run test:run` - Run tests once
- `pnpm run test:coverage` - Run tests with coverage report
- `pnpm run type-check` - TypeScript type checking
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check code formatting
- `pnpm run knip` - Check for unused exports/dependencies

## API Endpoints (10 total)

All endpoints are available through the typed `api` service object:

1. `api.searchPoliticians(query)` - Search politicians by name
2. `api.getPolitician(politicianId)` - Get a single politician by ID
3. `api.searchDonors(query)` - Search donors by name
4. `api.getDonor(donorId)` - Get a single donor by ID
5. `api.getDonorDonations(donorId, params)` - Get donations by donor
6. `api.getPoliticianVotes(politicianId, params)` - Get politician voting record
7. `api.getPoliticianVotesDateRange(politicianId)` - Get date range for politician's votes
8. `api.getDonationSummary(politicianId)` - Get donation summary by industry
9. `api.getFilteredDonationSummary(politicianId, topic)` - Get filtered donation summary
10. `api.getBillSubjects()` - Get all bill subjects

See `src/services/api.ts` for detailed documentation of each endpoint.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and code standards.

Before submitting a PR:

- Ensure build passes: `pnpm run build`
- Verify types: `pnpm run type-check`
- Run linter: `pnpm run lint`
- Format code: `pnpm run format`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## About CorruptionWatch.us

CorruptionWatch.us is an Operation-Hope initiative dedicated to political transparency and accountability. We believe that democracy works best when citizens have access to clear, comprehensive information about how money influences politics.

### Our Mission

- **Transparency**: Make campaign finance data accessible and understandable
- **Accountability**: Connect political donations to legislative actions
- **Empowerment**: Give citizens tools to make informed decisions

## Documentation

- [Testing Guide](docs/TESTING.md) - Testing approach and patterns
- [Contributing Guide](CONTRIBUTING.md) - Development workflow and standards
- [Security Policy](SECURITY.md) - Vulnerability reporting process
- [Changelog](CHANGELOG.md) - Version history and release notes

## Support

- **Report Issues**: [GitHub Issues](https://github.com/Operation-Hope/paper-trail-web/issues)
- **Questions**: Open a GitHub issue with the `question` label
- **Security**: See [SECURITY.md](SECURITY.md) for reporting vulnerabilities
