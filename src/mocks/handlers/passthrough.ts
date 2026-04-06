import { http, passthrough } from 'msw';

export const passthroughHandlers = [
  // 🛡️ 1. BROAD CLOUD BYPASS: 
  // Ignore EVERYTHING that goes to GitHub's internal domains
  http.all(/.*\.github\.dev.*/, () => passthrough()),
  http.all(/.*github\.com.*/, () => passthrough()),

  // 📦 2. BINARY & DATA BYPASS:
  // Stop MSW from even looking at these file types
  http.all(/\.(wasm|parquet|worker\.js|json)$/, () => passthrough()),
  
  // 🌐 3. EXTERNAL SERVICES:
  // Let Hugging Face and CDNs flow freely
  http.all('https://huggingface.co/*', () => passthrough()),
  http.all('https://cdn.jsdelivr.net/*', () => passthrough()),

  // 🧪 4. TELEMETRY:
  // Ignore any browser/IDE background pings
  http.all('*/_next/webpack-hmr', () => passthrough()),
  http.all('*/socket.io/*', () => passthrough()),
];