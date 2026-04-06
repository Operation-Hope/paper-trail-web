import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Header';
import UnifiedSearch from './pages/UnifiedSearch';
import NotFound from './pages/NotFound';
import { CommandPalette } from './components/CommandPalette';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/providers';
import MoneyFlowchart from './pages/MoneyFlowchart';
import './index.css';

// 🚀 IMPORT FIX: Using the curly braces for the Named Export from components
import { PoliticianDetails } from './components/PoliticianDetails';

/**
 * ⚙️ QueryClient Configuration
 * 'retry: false' is crucial for development to prevent 
 * infinite loops when DuckDB is still warming up.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Global UI Elements */}
      <CommandPalette />
      <Toaster />
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Routes>
          {/* 🔍 Search Routes: All lead to the Unified Search hub */}
          <Route path="/" element={<UnifiedSearch />} />
          <Route path="/politician" element={<UnifiedSearch />} />
          <Route path="/donor" element={<UnifiedSearch />} />

          {/* 👤 Details Route: Captures the ID from the URL for the Scorecard */}
          <Route path="/politician/:id" element={<PoliticianDetails />} />
          
          {/* 💰 Special Feature: The Money Flow Chart */}
          <Route path="/money-flowchart" element={<MoneyFlowchart />} />

          {/* 🚫 404 Catch-All: Must be at the very bottom */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="paper-trail-theme">
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}