import { Home, Workflow } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  // 🛠️ Updated for Steel Gray background: Machined Obsidian Style
  const baseButtonStyle =
    'p-4 rounded-xl border border-white/10 bg-zinc-950/40 hover:bg-zinc-950/60 hover:border-white/20 hover:opacity-100 transition-all flex items-center justify-center cursor-pointer';

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-800/75 backdrop-blur-md">
      <div className="mx-auto flex h-28 max-w-7xl items-center justify-center px-6">
        {/* CENTERED TOOLBAR */}
        <div className="flex items-center gap-12 md:gap-16">
          {/* Home Icon Container */}
          <Link to="/" aria-label="Home — politician search">
            <div
              className={`${baseButtonStyle} ${
                location.pathname === '/'
                  ? 'border-zinc-400/50 bg-zinc-950/80 opacity-100 shadow-lg'
                  : 'opacity-50'
              }`}
            >
              <Home
                className="h-6 w-6 text-zinc-300 opacity-80"
                aria-hidden="true"
              />
            </div>
          </Link>

          {/* Money Flow Icon Container */}
          <Link to="/flowcharts" aria-label="Money flow charts">
            <div
              className={`${baseButtonStyle} ${
                location.pathname === '/flowcharts'
                  ? 'border-zinc-400/50 bg-zinc-950/80 opacity-100 shadow-lg'
                  : 'opacity-50'
              }`}
            >
              <Workflow
                className="h-6 w-6 text-zinc-300 opacity-80"
                aria-hidden="true"
              />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
