/**
 * Site-wide navigation header
 * Displays app branding, navigation links, and disclaimer
 */
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const DISCLAIMER_DISMISSED_KEY = 'paper-trail-disclaimer-dismissed';

export default function Header() {
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return localStorage.getItem(DISCLAIMER_DISMISSED_KEY) === 'true';
  });

  const handleDismissDisclaimer = () => {
    setDisclaimerDismissed(true);
    localStorage.setItem(DISCLAIMER_DISMISSED_KEY, 'true');
  };

  return (
    <header className="bg-gradient-to-r from-blue-900 to-blue-950 text-white shadow-lg transition-colors dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/The_Young_Turks_logo.svg/200px-The_Young_Turks_logo.svg.png"
                alt="TYT Logo"
                className="h-10 w-10"
                onError={(e) => {
                  e.currentTarget.style.visibility = 'hidden';
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Paper Trail</h1>
              <p className="text-xs text-blue-100 dark:text-gray-400">
                by The People
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex gap-6">
              <NavLink
                to="/politician"
                className={({ isActive }) =>
                  isActive
                    ? 'font-bold underline underline-offset-4'
                    : 'underline-offset-4 hover:underline'
                }
              >
                Politicians
              </NavLink>
              <NavLink
                to="/donor"
                className={({ isActive }) =>
                  isActive
                    ? 'font-bold underline underline-offset-4'
                    : 'underline-offset-4 hover:underline'
                }
              >
                Donors
              </NavLink>
            </nav>
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', {
                  key: 'k',
                  metaKey: true,
                  bubbles: true,
                });
                document.dispatchEvent(event);
              }}
              className="hidden items-center gap-2 rounded-md border border-white/20 px-3 py-1.5 text-xs transition-colors hover:bg-white/10 sm:flex"
              title="Search (Cmd+K or Ctrl+K)"
            >
              <span>Search</span>
              <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px]">
                ⌘K
              </kbd>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>
      {!disclaimerDismissed && (
        <div className="relative border-t border-yellow-700 bg-yellow-900/50 px-4 py-2 transition-colors dark:border-yellow-700 dark:bg-yellow-900/50">
          <p className="text-center text-sm text-yellow-300 dark:text-yellow-300 pr-8">
            Disclaimer: This data is for informational purposes only. Data
            accuracy is not guaranteed. Please verify all information with
            official sources.
          </p>
          <button
            onClick={handleDismissDisclaimer}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-yellow-300 transition-colors hover:bg-yellow-800/50 hover:text-yellow-100"
            aria-label="Dismiss disclaimer"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </header>
  );
}
