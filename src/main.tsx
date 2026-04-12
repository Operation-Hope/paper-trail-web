import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { initializeDatabase } from './lib/duckdb';

const queryClient = new QueryClient();

async function prepareApp() {
  initializeDatabase().catch((err) => console.error('Database Init Failed:', err));
}

const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
  void prepareApp();
}