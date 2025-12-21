/**
 * Main application component with React Router setup
 * Defines routes for Unified Search
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import UnifiedSearch from './pages/UnifiedSearch';
import NotFound from './pages/NotFound';
import { CommandPalette } from './components/CommandPalette';
import { Toaster } from './components/ui/sonner';
import './index.css';

function AppContent() {
  return (
    <>
      <CommandPalette />
      <Toaster />
      <div className="bg-background text-foreground min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            {/* Unified search routes */}
            <Route path="/" element={<UnifiedSearch />} />
            <Route path="/politician" element={<UnifiedSearch />} />
            <Route path="/politician/:id" element={<UnifiedSearch />} />
            <Route path="/politician/compare" element={<UnifiedSearch />} />
            <Route path="/donor" element={<UnifiedSearch />} />
            <Route path="/donor/:id" element={<UnifiedSearch />} />

            {/* Catch-all for 404 - must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
