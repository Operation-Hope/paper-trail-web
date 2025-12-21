# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-01-XX

### Added

- **Politician Search**: Search for politicians by name and view their profiles
- **Donor Search**: Search for donors and see their contribution history
- **Voting Records**: View politician voting records with filtering by:
  - Bill subjects/topics
  - Vote outcomes (Yea, Nay, Present, Not Voting)
  - Date ranges
  - Free text search
- **Donation Analysis**: View campaign donations grouped by industry
- **Filtered Donations**: See donations filtered by bill topic to identify potential conflicts of interest
- **Command Palette**: Quick navigation with keyboard shortcuts (Cmd/Ctrl + K)
- **Dark Mode**: Full dark mode support with system preference detection
- **Responsive Design**: Mobile-first responsive layout

### Technical

- React 19.2 with TypeScript 5.9
- Vite 7 build system
- Tailwind CSS 4 with shadcn/ui components
- React Query for server state management
- React Router 7 for client-side routing
- Chart.js for data visualization
- Express proxy server for production deployment
- Railway deployment configuration

### Documentation

- Comprehensive README with setup instructions
- CONTRIBUTING guide with code standards
- DEPLOYMENT guide for Railway
- CODE_OF_CONDUCT (Contributor Covenant v2.1)
- SECURITY policy for vulnerability reporting
