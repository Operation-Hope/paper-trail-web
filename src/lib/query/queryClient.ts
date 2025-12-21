/**
 * TanStack Query client configuration
 * Centralizes query caching, retry logic, and default options
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh (5 minutes)
      staleTime: 5 * 60 * 1000,

      // Cache time: how long unused data stays in cache (10 minutes)
      gcTime: 10 * 60 * 1000,

      // Retry failed requests 1 time (not 3, to fail faster)
      retry: 1,

      // Retry delay: exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus (good for returning to tab)
      refetchOnWindowFocus: true,

      // Don't refetch on reconnect (avoid unnecessary requests)
      refetchOnReconnect: false,

      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
  },
});
