/* eslint-disable */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('huggingface.co') ||
    url.pathname.endsWith('.wasm') ||
    url.pathname.endsWith('.parquet')
  ) {
    return; // Passthrough
  }
});
