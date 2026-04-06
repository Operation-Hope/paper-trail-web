import { http, HttpResponse } from 'msw';

/**
 * Politician Handlers (Live Data Mode)
 * * As a CS teacher, you'll recognize this as "Decoupling." 
 * By keeping this array empty, we tell MSW: "Do not intercept politician routes."
 * This allows our live 'api.ts' service to handle the logic directly 
 * using DuckDB-Wasm and Parquet files from Hugging Face.
 */

export const politicianHandlers: any[] = [
  // 🚀 KEEP EMPTY FOR LIVE DATA
  // If you add a handler here, like: http.get('/api/politicians/:id', ...),
  // it will BLOCK your DuckDB query from ever running.
];