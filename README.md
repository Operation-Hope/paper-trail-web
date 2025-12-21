# Paper Trail - Campaign Finance Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/Operation-Hope/paper-trail-web/actions/workflows/ci.yml/badge.svg)](https://github.com/Operation-Hope/paper-trail-web/actions/workflows/ci.yml)

Part of [CorruptionWatch.us](https://corruptionwatch.us) - An Operation-Hope initiative for political transparency.

## About This Project

Paper Trail empowers citizens to track the influence of money in politics. We combine campaign contribution data with congressional voting records to reveal potential conflicts of interest and promote accountability.

This is the web frontend for the Paper Trail system, built with React 19.2 + TypeScript 5.9 + Tailwind CSS 4 + Vite. A standalone React application for exploring political campaign finance data. This client connects to the Paper Trail API backend deployed separately on Railway.

## Development Setup

1. Ensure Node.js 24+ is installed
2. Install dependencies: `pnpm install`
3. Start development server: `pnpm run dev`

## Development Workflow

For local development, run TWO servers simultaneously:

1. **Backend (Flask)**: Run the backend API from the `paper-trail-api` repository
   - Runs on: http://localhost:5001
   - Serves: API endpoints at `/api/*`

2. **Frontend (Vite)**: `pnpm run dev`
   - Runs on: http://localhost:5173
   - Serves: React app with HMR
   - Proxies: API calls to localhost:5001 (configured in `vite.config.ts`)

### Startup Order
1. Start Flask backend first (from the `paper-trail-api` repository)
2. Then start Vite dev server
3. Open browser to http://localhost:5173

## Project Structure

```
frontend/
├── src/
│   ├── types/
│   │   └── api.ts              # All TypeScript type definitions
│   ├── services/
│   │   └── api.ts              # API service layer (all 7 endpoints)
│   ├── config/
│   │   └── env.ts              # Environment configuration
│   ├── pages/
│   │   ├── PoliticianSearch.tsx
│   │   ├── DonorSearch.tsx
│   │   └── Feedback.tsx
│   ├── components/             # Reusable components
│   ├── hooks/                  # Custom React hooks
│   ├── App.tsx                 # Main app with routing
│   └── index.css               # Tailwind CSS imports
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
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

## Deployment to Railway

This application is deployed as a standalone static site on Railway with the following architecture:

### Architecture
- **Frontend**: Static React SPA served via `serve` package (this repository)
- **Backend**: Flask API at `https://paper-trail-api.up.railway.app` (separate service)
- **Database**: PostgreSQL (managed by backend service)

### Deployment Steps

1. **Connect GitHub Repository to Railway**
   - Create new project in Railway
   - Connect this GitHub repository
   - Railway will auto-detect the `railway.json` configuration

2. **Configure Environment Variables**

   Set the following environment variable in Railway:

   ```
   VITE_API_BASE_URL=https://paper-trail-api.up.railway.app
   ```

   Replace with your actual backend Railway URL or use Railway's internal networking:

   ```
   VITE_API_BASE_URL=https://paper-trail-api.railway.internal
   ```

3. **Update Backend CORS Configuration**

   In the backend Railway service, update the `ALLOWED_ORIGINS` environment variable to include your frontend URL:

   ```
   ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend-url.up.railway.app
   ```

   This allows the frontend to make cross-origin requests to the backend API.

4. **Deploy**

   - Push to your main branch
   - Railway automatically builds and deploys
   - Build command: `pnpm install && pnpm run build`
   - Start command: `npx serve dist -s -l 3000`

### Environment Variables

**Development** (`.env.development`):
```
VITE_API_BASE_URL=http://localhost:5001
```

**Production** (Railway environment variables):
```
VITE_API_BASE_URL=https://paper-trail-api.up.railway.app
```

### How It Works

1. **Development**: Vite's dev server proxies `/api/*` requests to `localhost:5001`
2. **Production**: Frontend makes direct requests to backend Railway URL
3. **CORS**: Backend's `flask-cors` configuration allows frontend origin
4. **SPA Routing**: `serve -s` flag handles client-side routing (serves `index.html` for all routes)

## Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build locally
- `pnpm run lint` - Run ESLint

## API Endpoints (7 total)

All endpoints are available through the typed `api` service object:

1. `api.searchPoliticians(query)` - Search politicians by name
2. `api.searchDonors(query)` - Search donors by name
3. `api.getDonorDonations(donorId)` - Get donations by donor
4. `api.getPoliticianVotes(politicianId, params)` - Get politician voting record
5. `api.getDonationSummary(politicianId)` - Get donation summary by industry
6. `api.getFilteredDonationSummary(politicianId, topic)` - Get filtered donation summary
7. `api.getBillSubjects()` - Get all bill subjects

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

- [Architecture Overview](docs/ARCHITECTURE.md) - System design and component structure
- [Testing Guide](docs/TESTING.md) - Testing approach and patterns
- [Deployment Guide](DEPLOYMENT.md) - Railway deployment instructions
- [Contributing Guide](CONTRIBUTING.md) - Development workflow and standards
- [Security Policy](SECURITY.md) - Vulnerability reporting process
- [Changelog](CHANGELOG.md) - Version history and release notes

## Support

- **Report Issues**: [GitHub Issues](https://github.com/Operation-Hope/paper-trail-web/issues)
- **Questions**: Open a GitHub issue with the `question` label
- **Security**: See [SECURITY.md](SECURITY.md) for reporting vulnerabilities
