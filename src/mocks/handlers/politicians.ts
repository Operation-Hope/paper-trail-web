import { http, HttpResponse, delay } from 'msw';
import {
  getLivePoliticians,
  getLivePoliticianById,
  getVotesForPolitician,
} from '../data/factories/vote';
import { mockDelay } from '../utils/delay';

/**
 * MSW Handlers for Politician-related API calls.
 * These are now thin wrappers around the DuckDB-Wasm engine.
 */
export const politicianHandlers = [
  /**
   * LIVE SEARCH: Queries the Parquet file via DuckDB
   * GET /api/politicians/search?name=...
   */
  http.get('*/api/politicians/search', async ({ request }) => {
    await delay(mockDelay());
    const url = new URL(request.url);
    const name = url.searchParams.get('name') ?? '';

    // Return empty if search term is too short
    if (name.length < 2) return HttpResponse.json([]);

    try {
      const results = await getLivePoliticians(name);
      return HttpResponse.json(results);
    } catch {
      return new HttpResponse(null, { status: 500 });
    }
  }),

  /**
   * LIVE DETAIL: Gets a single member from the Parquet file
   * GET /api/politician/:id
   */
  http.get('*/api/politician/:id', async ({ params }) => {
    await delay(mockDelay());
    const id = params.id as string;

    try {
      const politician = await getLivePoliticianById(id);
      return politician
        ? HttpResponse.json(politician)
        : new HttpResponse(null, { status: 404 });
    } catch {
      return new HttpResponse(null, { status: 500 });
    }
  }),

  /**
   * LIVE VOTES: Fetches voting history for a politician
   * GET /api/politician/:id/votes
   */
  http.get('*/api/politician/:id/votes', async ({ params, request }) => {
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '1';
    const search = url.searchParams.get('search') || '';

    try {
      // First find the member to get their numeric ICPSR ID
      const politician = await getLivePoliticianById(params.id as string);
      if (!politician) return new HttpResponse(null, { status: 404 });

      const data = await getVotesForPolitician(politician.icpsr_id, {
        page,
        search,
      });
      return HttpResponse.json(data);
    } catch {
      return new HttpResponse(null, { status: 500 });
    }
  }),
];
