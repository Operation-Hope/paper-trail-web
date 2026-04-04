import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // 1. Import the Query tools
import Header from './components/Header';
import UnifiedSearch from './pages/UnifiedSearch';
import NotFound from './pages/NotFound';
import { CommandPalette } from './components/CommandPalette';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/providers';
import './index.css';
import MoneyFlowchart from './pages/MoneyFlowchart'; // Import the new page

// 2. Create the "engine" for your data fetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Prevents excessive reloading during development
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <CommandPalette />
      <Toaster />
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<UnifiedSearch />} />
          <Route path="/politician" element={<UnifiedSearch />} />
          <Route path="/politician/:id" element={<UnifiedSearch />} />
          <Route path="/donor" element={<UnifiedSearch />} />
          <Route path="/donor/:id" element={<UnifiedSearch />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/" element={<UnifiedSearch />} />
          <Route path="/politician" element={<UnifiedSearch />} />
          <Route path="/donor" element={<UnifiedSearch />} />
          <Route path="/money-flowchart" element={<MoneyFlowchart />} />{' '}
          {/* ADD THIS */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    // 3. Wrap everything in the QueryClientProvider
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="paper-trail-theme">
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
