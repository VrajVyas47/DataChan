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

export interface CustomThemeColors {
  primary?: string;
  secondary?: string;
  surface?: string;
}

export type NavPosition = 'bottom' | 'top' | 'left';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  availableThemes: ThemeOption[];
  customColors: CustomThemeColors;
  setCustomColor: (key: keyof CustomThemeColors, value: string | null) => void;
  resetCustomColors: () => void;
  navPosition: NavPosition;
  setNavPosition: (pos: NavPosition) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'lavender-light',
  setTheme: () => {},
  availableThemes: AVAILABLE_THEMES,
  customColors: {},
  setCustomColor: () => {},
  resetCustomColors: () => {},
  navPosition: 'bottom',
  setNavPosition: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('lavender-light');
  const [customColors, setCustomColorsState] = useState<CustomThemeColors>({});
  const [navPosition, setNavPositionState] = useState<NavPosition>('bottom');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Load base theme
    const savedTheme = localStorage.getItem('datachan_theme') as ThemeId;
    const initialTheme =
      savedTheme && AVAILABLE_THEMES.some((t) => t.id === savedTheme)
        ? savedTheme
        : 'lavender-light';
    setThemeState(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    // Load custom color mixer overrides
    const savedColors = localStorage.getItem('datachan_custom_colors');
    if (savedColors) {
      try {
        const parsed = JSON.parse(savedColors) as CustomThemeColors;
        setCustomColorsState(parsed);
        applyColorOverrides(parsed);
      } catch (e) {
        console.error('Failed to parse custom colors', e);
      }
    }

    // Load nav position preference (defaulting to bottom dock)
    const savedNavPos = localStorage.getItem('datachan_nav_pos') as NavPosition;
    if (savedNavPos && ['bottom', 'top', 'left'].includes(savedNavPos)) {
      setNavPositionState(savedNavPos);
    } else {
      setNavPositionState('bottom');
    }
  }, []);

  const applyColorOverrides = (colors: CustomThemeColors) => {
    const root = document.documentElement;
    if (colors.primary) {
      root.style.setProperty('--color-primary', colors.primary);
      root.style.setProperty('--color-primary-hover', colors.primary + 'dd');
    } else {
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-primary-hover');
    }

    if (colors.secondary) {
      root.style.setProperty('--color-secondary', colors.secondary);
      root.style.setProperty('--color-secondary-hover', colors.secondary + 'dd');
    } else {
      root.style.removeProperty('--color-secondary');
      root.style.removeProperty('--color-secondary-hover');
    }

    if (colors.surface) {
      root.style.setProperty('--color-surface-elevated', colors.surface);
    } else {
      root.style.removeProperty('--color-surface-elevated');
    }
  };

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem('datachan_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    // Re-apply any active custom overrides on top of new theme
    applyColorOverrides(customColors);
  };

  const setCustomColor = (key: keyof CustomThemeColors, value: string | null) => {
    const updated = { ...customColors };
    if (!value) {
      delete updated[key];
    } else {
      updated[key] = value;
    }
    setCustomColorsState(updated);
    localStorage.setItem('datachan_custom_colors', JSON.stringify(updated));
    applyColorOverrides(updated);
  };

  const resetCustomColors = () => {
    setCustomColorsState({});
    localStorage.removeItem('datachan_custom_colors');
    applyColorOverrides({});
  };

  const setNavPosition = (pos: NavPosition) => {
    setNavPositionState(pos);
    localStorage.setItem('datachan_nav_pos', pos);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        availableThemes: AVAILABLE_THEMES,
        customColors,
        setCustomColor,
        resetCustomColors,
        navPosition,
        setNavPosition,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
