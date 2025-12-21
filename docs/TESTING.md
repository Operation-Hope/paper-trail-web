# Testing Guide

This document describes the testing approach for the Paper Trail Web application.

## Testing Stack

| Tool | Purpose |
|------|---------|
| [Vitest](https://vitest.dev/) | Test runner and assertion library |
| [React Testing Library](https://testing-library.com/react) | Component testing utilities |
| [jsdom](https://github.com/jsdom/jsdom) | DOM simulation for Node.js |
| [@testing-library/user-event](https://testing-library.com/user-event) | User interaction simulation |
| [@testing-library/jest-dom](https://github.com/testing-library/jest-dom) | Custom DOM matchers |

## Running Tests

```bash
# Run tests in watch mode (development)
pnpm test

# Run tests once (CI)
pnpm test:run

# Run tests with UI
pnpm test:ui
```

## Test File Organization

Tests are co-located with the code they test:

```
src/
├── components/
│   ├── Header.tsx
│   └── Header.test.tsx       # Co-located test
├── utils/
│   ├── formatters.ts
│   └── formatters.test.ts    # Co-located test
└── test/
    └── setup.ts              # Global test setup
```

## Writing Tests

### Component Tests

Use React Testing Library to test components:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(/* assertion */).toBe(/* expected */);
  });
});
```

### Testing with React Query

Wrap components that use React Query:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}
```

### Testing with React Router

Wrap components that use routing:

```typescript
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
}
```

### Mocking API Calls

Mock the API service for isolated testing:

```typescript
import { vi } from 'vitest';
import { api } from '../services/api';

vi.mock('../services/api');

describe('ComponentWithAPI', () => {
  it('displays data from API', async () => {
    vi.mocked(api.searchPoliticians).mockResolvedValue([
      { id: '1', name: 'Test Politician' },
    ]);

    render(<ComponentWithAPI />);

    await waitFor(() => {
      expect(screen.getByText('Test Politician')).toBeInTheDocument();
    });
  });
});
```

## Testing Patterns

### Query by Role (Preferred)

Prefer accessible queries that reflect how users interact with the UI:

```typescript
// Good - queries by accessible role
screen.getByRole('button', { name: /submit/i });
screen.getByRole('textbox', { name: /search/i });
screen.getByRole('heading', { level: 1 });

// Avoid - queries by implementation details
screen.getByTestId('submit-button');
screen.getByClassName('btn-primary');
```

### Async Operations

Use `waitFor` or `findBy` queries for async operations:

```typescript
// Option 1: waitFor
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Option 2: findBy (combines getBy + waitFor)
const element = await screen.findByText('Loaded');
expect(element).toBeInTheDocument();
```

### User Events

Use `userEvent` over `fireEvent` for realistic interactions:

```typescript
const user = userEvent.setup();

// Typing
await user.type(input, 'hello');

// Clicking
await user.click(button);

// Keyboard navigation
await user.keyboard('{Enter}');
await user.tab();
```

## Test Configuration

### Vitest Config (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
```

### Test Setup (`src/test/setup.ts`)

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

## What to Test

### Component Testing Priorities

1. **User interactions**: Clicks, typing, form submissions
2. **Conditional rendering**: Show/hide logic based on state
3. **Data display**: Correct rendering of fetched data
4. **Error states**: Error messages and fallbacks
5. **Loading states**: Loading indicators
6. **Accessibility**: Keyboard navigation, ARIA attributes

### Skip Testing

- Implementation details (internal state, private methods)
- Third-party library behavior
- Styling/CSS (use visual regression tests if needed)

## Example Tests

### Testing a Search Component

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    mockOnSearch.mockClear();
  });

  it('calls onSearch when user types and submits', async () => {
    const user = userEvent.setup();
    render(<SearchInput onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox', { name: /search/i });
    await user.type(input, 'test query');
    await user.keyboard('{Enter}');

    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('debounces search calls', async () => {
    const user = userEvent.setup();
    render(<SearchInput onSearch={mockOnSearch} debounceMs={100} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'abc');

    // Should not call immediately
    expect(mockOnSearch).not.toHaveBeenCalled();

    // Wait for debounce
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('abc');
    });
  });
});
```

### Testing Error States

```typescript
describe('PoliticianProfile', () => {
  it('displays error message when API fails', async () => {
    vi.mocked(api.getPolitician).mockRejectedValue(new Error('Not found'));

    renderWithQuery(<PoliticianProfile id="invalid" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## CI Integration

Tests run automatically on every PR and push to main:

```yaml
# .github/workflows/ci.yml
- name: Run tests
  run: pnpm run test:run
```

## Debugging Tests

### Vitest UI

Run `pnpm test:ui` for an interactive test dashboard.

### Debug Output

Use `screen.debug()` to print the current DOM:

```typescript
it('debugging example', () => {
  render(<MyComponent />);
  screen.debug(); // Prints current DOM to console
});
```

### Playground

Use Testing Library's `screen.logTestingPlaygroundURL()` to generate a URL for the Testing Playground tool.
