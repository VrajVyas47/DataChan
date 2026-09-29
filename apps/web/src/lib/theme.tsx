'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeId, ThemeOption } from '@datachan/shared-types';

export const AVAILABLE_THEMES: ThemeOption[] = [
  {
    id: 'lavender-light',
    name: 'Lavender Light',
    category: 'light',
    primaryHex: '#5b44ca',
    backgroundHex: '#faf8ff',
    surfaceHex: '#ffffff',
  },
  {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    category: 'dark',
    primaryHex: '#9b87f5',
    backgroundHex: '#111218',
    surfaceHex: '#191b24',
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    category: 'dark',
    primaryHex: '#3b82f6',
    backgroundHex: '#091124',
    surfaceHex: '#101c3b',
  },
  {
    id: 'mint-lab',
    name: 'Mint Lab',
    category: 'light',
    primaryHex: '#059669',
    backgroundHex: '#f2fbf7',
    surfaceHex: '#ffffff',
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    category: 'light',
    primaryHex: '#d97706',
    backgroundHex: '#fffbf5',
    surfaceHex: '#ffffff',
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  availableThemes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'lavender-light',
  setTheme: () => {},
  availableThemes: AVAILABLE_THEMES,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('lavender-light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('datachan_theme') as ThemeId;
    if (saved && AVAILABLE_THEMES.some((t) => t.id === saved)) {
      setThemeState(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'lavender-light');
    }
  }, []);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem('datachan_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes: AVAILABLE_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
