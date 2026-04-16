'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Helper to get IST time-based theme
  const getISTTheme = useCallback((): Theme => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const h = ist.getHours();
    const m = ist.getMinutes();
    
    // 19:30 to 05:59 is dark
    if (h > 19 || (h === 19 && m >= 30) || h < 6) {
      return 'dark';
    }
    return 'light';
  }, []);

  useEffect(() => {
    // Read override or calculate
    const manual = localStorage.getItem('theme-override') as Theme | null;
    const initial = manual || getISTTheme();
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
    setMounted(true);

    // Remove no-transitions class after initial paint
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transitions');
    });

    // Setup minute-by-minute interval to check time if no override
    const interval = setInterval(() => {
      const currentManual = localStorage.getItem('theme-override');
      if (!currentManual) {
        const calculated = getISTTheme();
        setTheme((prev) => {
          if (prev !== calculated) {
            document.documentElement.setAttribute('data-theme', calculated);
            return calculated;
          }
          return prev;
        });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [getISTTheme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-override', next);
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  // During SSR or before hydration, render children but with default theme
  // The inline script in layout.tsx handles preventing flash

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
