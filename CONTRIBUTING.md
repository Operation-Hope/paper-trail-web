# Contributing to Paper Trail

We welcome contributions to CorruptionWatch.us! This document provides guidelines for contributing to the Paper Trail project.

## Getting Started

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone git@github.com:YOUR-USERNAME/paper-trail-web.git
   cd paper-trail-web
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development server**
   ```bash
   pnpm run dev
   ```

4. **View the application**
   - Open http://localhost:5173 in your browser

## Development Workflow

1. **Create a feature branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, descriptive commit messages
   - Follow the existing code patterns and style
   - Test your changes locally

3. **Before submitting**
   - Ensure build succeeds: `pnpm run build`
   - Verify types: `pnpm run type-check`
   - Run linter: `pnpm run lint`
   - Format code: `pnpm run format`

4. **Submit a Pull Request**
   - Push to your fork
   - Open a PR against the `main` branch
   - Fill out the PR template completely
   - Request review from maintainers

## Code Standards

### TypeScript
- Use TypeScript strict mode
- No `any` types - use proper typing
- Define interfaces for all component props
- Export types from `src/types/` directory

### React
- Functional components with hooks only
- Use React 19 features where appropriate
- Prop drilling is acceptable for 2-3 levels
- Use React Query for server state
- Use context for global UI state (theme, modals)

### Styling
- Tailwind CSS only
- No inline styles or CSS modules
- Use `cn()` utility for conditional classes
- Follow mobile-first responsive design
- Use shadcn/ui components when available

### Components
- One component per file
- Co-locate types with components
- Use descriptive prop names
- Keep components focused and small
- Extract reusable logic to custom hooks

### File Organization
```
src/
├── components/      # Reusable UI components
│   ├── ui/         # shadcn/ui primitives
│   └── ...         # Feature components
├── pages/          # Route pages
├── hooks/          # Custom React hooks
├── services/       # API client and services
├── types/          # TypeScript definitions
├── lib/            # Utilities and configuration
└── utils/          # Helper functions
```

## Testing

- Add tests for new features
- Update tests when modifying existing features
- Run tests: `pnpm run test`
- Tests should be co-located with components: `Component.test.tsx`

## Commit Messages

Follow the conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(search): add politician comparison view
fix(charts): correct donation aggregation logic
docs(readme): update installation instructions
```

## Pull Request Process

1. **PR Title**: Use conventional commit format
2. **Description**: Explain what and why, not how
3. **Testing**: Describe how you tested the changes
4. **Screenshots**: Include for UI changes
5. **Breaking Changes**: Clearly document any breaking changes

### PR Checklist

Before requesting review, ensure:

- [ ] Build passes (`pnpm run build`)
- [ ] Types checked (`pnpm run type-check`)
- [ ] Linting passes (`pnpm run lint`)
- [ ] Code formatted (`pnpm run format`)
- [ ] Tests added/updated if needed
- [ ] Documentation updated if needed
- [ ] No sensitive data or credentials

## Code Review

- All PRs require at least one approval
- Address all review comments
- Keep PRs focused and reasonably sized
- Be open to feedback and suggestions
- Maintainers may request changes before merging

## API Backend

This repository is the frontend only. The backend API is a separate project. When working on features that require API changes:

1. Coordinate with the backend team
2. Document expected API changes in the PR
3. Test with mock data if backend isn't ready
4. Use proper TypeScript types for API responses

## Getting Help

- **Questions**: Open a GitHub issue with the `question` label
- **Bugs**: Open a GitHub issue with detailed reproduction steps
- **Features**: Open a GitHub issue to discuss before implementing

## License

By contributing to Paper Trail, you agree that your contributions will be licensed under the MIT License.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Thank You!

Your contributions help make political campaign finance more transparent and accessible to everyone.
