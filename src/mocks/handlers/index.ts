import { http, passthrough } from 'msw'; // Import passthrough
import { politicianHandlers } from './politicians';
import { donorHandlers } from './donors';
import { billHandlers } from './bills';

export const handlers = [
  // 1. SURGICAL BYPASS: Hugging Face (Data)
  // Tells MSW to stay away from the binary Parquet streams
  http.all('https://huggingface.co/*', () => {
    return passthrough();
  }),

  // 2. SURGICAL BYPASS: jsDelivr (WASM/Workers)
  // Tells MSW to stay away from the DuckDB engine files
  http.all('https://cdn.jsdelivr.net/*', () => {
    return passthrough();
  }),

  // 3. YOUR EXISTING HANDLERS
  ...politicianHandlers,
  ...donorHandlers,
  ...billHandlers,
];
