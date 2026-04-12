import { Home, Workflow } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  // 🛠️ Updated for Steel Gray background: Machined Obsidian Style
  const baseButtonStyle = "p-4 rounded-xl border border-white/10 bg-zinc-950/40 hover:bg-zinc-950/60 hover:border-white/20 hover:opacity-100 transition-all flex items-center justify-center cursor-pointer";

  return (
    <header className="border-b border-white/5 bg-zinc-800/75 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-28 flex items-center justify-center">
        
        {/* CENTERED TOOLBAR */}
        <div className="flex items-center gap-12 md:gap-16">
          
          {/* Home Icon Container */}
          <Link to="/">
            <div className={`${baseButtonStyle} ${
              location.pathname === '/' 
                ? 'border-zinc-400/50 bg-zinc-950/80 opacity-100 shadow-lg' 
                : 'opacity-50'
            }`}>
              <Home className="h-6 w-6 opacity-80 text-zinc-300" />
            </div>
          </Link>
          
          {/* Money Flow Icon Container */}
          <Link to="/flowcharts">
            <div className={`${baseButtonStyle} ${
              location.pathname === '/flowcharts' 
                ? 'border-zinc-400/50 bg-zinc-950/80 opacity-100 shadow-lg' 
                : 'opacity-50'
            }`}>
              <Workflow className="h-6 w-6 opacity-80 text-zinc-300" />
            </div>
          </Link>
          
        </div>
      </div>
    </header>
  );
}