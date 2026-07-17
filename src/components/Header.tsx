import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Search' },
  { to: '/flowcharts', label: 'Learn' },
  { to: '/contact', label: 'Contact' },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-800/75 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-center px-3 md:h-28 md:px-6">
        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-2.5 sm:gap-6 md:gap-12">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-xl border px-4 py-2.5 text-base font-black tracking-tighter uppercase transition-all focus-visible:ring-2 focus-visible:ring-[#4A90E2] focus-visible:outline-none md:px-6 md:py-3 md:text-xl ${
                      active
                        ? 'border-zinc-400/50 bg-zinc-950/80 text-white shadow-lg'
                        : 'border-white/10 bg-zinc-950/40 text-zinc-400 hover:border-white/20 hover:bg-zinc-950/60 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
