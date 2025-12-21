import { useContext } from 'react';
import { ThemeCtx } from './theme-context';

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

