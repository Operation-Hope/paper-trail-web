import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useLayoutEffect } from 'react';
import Header from './components/Header';
import PoliticianDetails from './components/PoliticianDetails';
import UnifiedSearch from './pages/UnifiedSearch'; 
import MoneyFlowchart from './pages/MoneyFlowchart'; 

export default function App() {
  // Force Dark Mode
  useLayoutEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
        <Header />
        
        {/* 🚀 Space Added: 'pt-16' adds that extra gap below the header */}
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<UnifiedSearch />} />
            <Route path="/politician/:id" element={<PoliticianDetails />} />
            <Route path="/flowcharts" element={<MoneyFlowchart />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}