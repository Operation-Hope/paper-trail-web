import { createContext } from 'react';

type Theme = 'light' | 'dark';
type Ctx = { theme: Theme; setTheme: (t: Theme) => void };

export const ThemeCtx = createContext<Ctx | null>(null);

