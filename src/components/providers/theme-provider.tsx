import { useEffect, useState } from 'react';
import { ThemeCtx } from './theme-context';

type Theme = 'light' | 'dark';

export function ThemeProvider({
  defaultTheme = 'dark',
  children,
}: {
  defaultTheme?: Theme;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    return saved ?? defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

