import { http, HttpResponse, delay } from 'msw';
import type { Politician } from '../../types/api';
import { MOCK_POLITICIANS } from '../data/factories/politician';
import { mockDelay } from '../utils/delay';

// Explicitly typing 'p' as Politician for the lookup map
const politicianMap = new Map<string, Politician>(
  (MOCK_POLITICIANS as Politician[]).map((p: Politician) => [p.canonical_id, p])
);

export const politicianHandlers = [
  /**
   * Handler for searching politicians by name.
   * Responds to: GET /api/politicians/search?name=...
   */
  http.get('*/api/politicians/search', async ({ request }) => {
    await delay(mockDelay());
    const url = new URL(request.url);
    const name = url.searchParams.get('name') ?? '';

    // Return empty if search term is too short
    if (name.length < 2) return HttpResponse.json([]);

    const lowerName = name.toLowerCase();
    const results = (MOCK_POLITICIANS as Politician[]).filter(
      (p: Politician) =>
        p.full_name.toLowerCase().includes(lowerName) ||
        p.last_name.toLowerCase().includes(lowerName)
    );

    return HttpResponse.json(results);
  }),

  /**
   * Handler for fetching a single politician's details.
   * Responds to: GET /api/politician/:id
   */
  http.get('*/api/politician/:id', async ({ params }) => {
    await delay(mockDelay());
    const id = params.id as string;
    const politician = politicianMap.get(id);

    return politician
      ? HttpResponse.json(politician)
      : new HttpResponse(null, { status: 404 });
  }),

  // Note: If you add handlers for votes or donations later,
  // re-import the necessary factory functions then!
];
