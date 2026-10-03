'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ThemeId,
  ThemeMode,
  ColorPaletteId,
  PaletteOption,
  ThemeOption,
} from '@datachan/shared-types';

export const CURATED_PALETTES: PaletteOption[] = [
  {
    id: 'neutral',
    name: 'Neutral',
    description: 'Clean monochrome slate with pure high-contrast editorial hierarchy',
    swatches: {
      light: {
        background: '#f8fafc',
        surface: '#ffffff',
        accent: '#334155',
        text: '#0f172a',
      },
      dark: {
        background: '#090a0f',
        surface: '#12131a',
        accent: '#cbd5e1',
        text: '#f1f5f9',
      },
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep abyssal navy paired with electric cyan and sapphire nodes',
    swatches: {
      light: {
        background: '#f0f7ff',
        surface: '#ffffff',
        accent: '#0284c7',
        text: '#0c2738',
      },
      dark: {
        background: '#091124',
        surface: '#101c3b',
        accent: '#38bdf8',
        text: '#e2eeff',
      },
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'Sophisticated royal lavender with cosmic violet computational tones',
    swatches: {
      light: {
        background: '#faf8ff',
        surface: '#ffffff',
        accent: '#5b44ca',
        text: '#191b25',
      },
      dark: {
        background: '#111218',
        surface: '#191b24',
        accent: '#9b87f5',
        text: '#eef0fc',
      },
    },
  },
  {
    id: 'mint',
    name: 'Mint',
    description: 'Crisp botanical emerald with luminous jade and mint telemetry',
    swatches: {
      light: {
        background: '#f2fbf7',
        surface: '#ffffff',
        accent: '#059669',
        text: '#13241d',
      },
      dark: {
        background: '#091712',
        surface: '#0f241d',
        accent: '#10b981',
        text: '#ecfdf5',
      },
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    description: 'Warm obsidian and espresso infused with sunlit gold database accents',
    swatches: {
      light: {
        background: '#fffbf5',
        surface: '#ffffff',
        accent: '#d97706',
        text: '#2c1a11',
      },
      dark: {
        background: '#161109',
        surface: '#221a0f',
        accent: '#f59e0b',
        text: '#fef3c7',
      },
    },
  },
];

// Flat theme options maintained for backward compatibility
export const AVAILABLE_THEMES: ThemeOption[] = [
  { id: 'dark-violet', name: 'Dark · Violet', category: 'dark', primaryHex: '#9b87f5', backgroundHex: '#111218', surfaceHex: '#191b24' },
  { id: 'dark-ocean', name: 'Dark · Ocean', category: 'dark', primaryHex: '#38bdf8', backgroundHex: '#091124', surfaceHex: '#101c3b' },
  { id: 'dark-neutral', name: 'Dark · Neutral', category: 'dark', primaryHex: '#cbd5e1', backgroundHex: '#090a0f', surfaceHex: '#12131a' },
  { id: 'dark-mint', name: 'Dark · Mint', category: 'dark', primaryHex: '#10b981', backgroundHex: '#091712', surfaceHex: '#0f241d' },
  { id: 'dark-amber', name: 'Dark · Amber', category: 'dark', primaryHex: '#f59e0b', backgroundHex: '#161109', surfaceHex: '#221a0f' },
  { id: 'light-violet', name: 'Light · Violet', category: 'light', primaryHex: '#5b44ca', backgroundHex: '#faf8ff', surfaceHex: '#ffffff' },
  { id: 'light-ocean', name: 'Light · Ocean', category: 'light', primaryHex: '#0284c7', backgroundHex: '#f0f7ff', surfaceHex: '#ffffff' },
  { id: 'light-neutral', name: 'Light · Neutral', category: 'light', primaryHex: '#334155', backgroundHex: '#f8fafc', surfaceHex: '#ffffff' },
  { id: 'light-mint', name: 'Light · Mint', category: 'light', primaryHex: '#059669', backgroundHex: '#f2fbf7', surfaceHex: '#ffffff' },
  { id: 'light-amber', name: 'Light · Amber', category: 'light', primaryHex: '#d97706', backgroundHex: '#fffbf5', surfaceHex: '#ffffff' },
  // Legacy aliases
  { id: 'midnight-dark', name: 'Midnight Dark', category: 'dark', primaryHex: '#9b87f5', backgroundHex: '#111218', surfaceHex: '#191b24' },
  { id: 'lavender-light', name: 'Lavender Light', category: 'light', primaryHex: '#5b44ca', backgroundHex: '#faf8ff', surfaceHex: '#ffffff' },
  { id: 'ocean-blue', name: 'Ocean Blue', category: 'dark', primaryHex: '#38bdf8', backgroundHex: '#091124', surfaceHex: '#101c3b' },
  { id: 'mint-lab', name: 'Mint Lab', category: 'light', primaryHex: '#059669', backgroundHex: '#f2fbf7', surfaceHex: '#ffffff' },
  { id: 'sunset-amber', name: 'Sunset Amber', category: 'light', primaryHex: '#d97706', backgroundHex: '#fffbf5', surfaceHex: '#ffffff' },
];

export interface CustomThemeColors {
  primary?: string;
  secondary?: string;
  surface?: string;
}

export type NavPosition = 'bottom' | 'top' | 'left' | 'right';

interface ThemeContextType {
  // Level 1: Mode
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // Level 2: Color Palette
  colorPalette: ColorPaletteId;
  setColorPalette: (palette: ColorPaletteId) => void;

  // Complete combination setter
  setThemeCombination: (mode: ThemeMode, palette: ColorPaletteId) => void;

  // Curated palettes list
  palettes: PaletteOption[];

  // Legacy ThemeId compatibility
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  availableThemes: ThemeOption[];

  // Custom accent mixer
  customColors: CustomThemeColors;
  setCustomColor: (key: keyof CustomThemeColors, value: string | null) => void;
  resetCustomColors: () => void;

  // Nav position
  navPosition: NavPosition;
  setNavPosition: (pos: NavPosition) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'dark',
  setThemeMode: () => {},
  colorPalette: 'violet',
  setColorPalette: () => {},
  setThemeCombination: () => {},
  palettes: CURATED_PALETTES,
  theme: 'dark-violet',
  setTheme: () => {},
  availableThemes: AVAILABLE_THEMES,
  customColors: {},
  setCustomColor: () => {},
  resetCustomColors: () => {},
  navPosition: 'bottom',
  setNavPosition: () => {},
});

/**
 * Normalizes legacy theme IDs to 2-level (mode, palette)
 */
function parseThemeId(id: string): { mode: ThemeMode; palette: ColorPaletteId } {
  if (id === 'lavender-light') return { mode: 'light', palette: 'violet' };
  if (id === 'midnight-dark') return { mode: 'dark', palette: 'violet' };
  if (id === 'ocean-blue') return { mode: 'dark', palette: 'ocean' };
  if (id === 'mint-lab') return { mode: 'light', palette: 'mint' };
  if (id === 'sunset-amber') return { mode: 'light', palette: 'amber' };

  const parts = id.split('-');
  if (parts.length === 2 && (parts[0] === 'light' || parts[0] === 'dark')) {
    const mode = parts[0] as ThemeMode;
    const palette = (['neutral', 'ocean', 'violet', 'mint', 'amber'].includes(parts[1])
      ? parts[1]
      : 'violet') as ColorPaletteId;
    return { mode, palette };
  }

  return { mode: 'dark', palette: 'violet' };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [colorPalette, setColorPaletteState] = useState<ColorPaletteId>('violet');
  const [customColors, setCustomColorsState] = useState<CustomThemeColors>({});
  const [navPosition, setNavPositionState] = useState<NavPosition>('bottom');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Load persisted theme preferences
    const savedMode = localStorage.getItem('datachan_theme_mode') as ThemeMode;
    const savedPalette = localStorage.getItem('datachan_color_palette') as ColorPaletteId;
    const legacySavedTheme = localStorage.getItem('datachan_theme') as ThemeId;

    let initialMode: ThemeMode = 'dark';
    let initialPalette: ColorPaletteId = 'violet';

    if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
      initialMode = savedMode;
    } else if (legacySavedTheme) {
      initialMode = parseThemeId(legacySavedTheme).mode;
    }

    if (savedPalette && CURATED_PALETTES.some((p) => p.id === savedPalette)) {
      initialPalette = savedPalette;
    } else if (legacySavedTheme) {
      initialPalette = parseThemeId(legacySavedTheme).palette;
    }

    setThemeModeState(initialMode);
    setColorPaletteState(initialPalette);

    const themeKey = `${initialMode}-${initialPalette}` as ThemeId;
    document.documentElement.setAttribute('data-theme', themeKey);

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

    // Load nav position preference
    const savedNavPos = localStorage.getItem('datachan_nav_pos') as NavPosition;
    if (savedNavPos && ['bottom', 'top', 'left', 'right'].includes(savedNavPos)) {
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

  const applyThemeCombination = (mode: ThemeMode, palette: ColorPaletteId) => {
    setThemeModeState(mode);
    setColorPaletteState(palette);

    const themeKey = `${mode}-${palette}` as ThemeId;
    localStorage.setItem('datachan_theme_mode', mode);
    localStorage.setItem('datachan_color_palette', palette);
    localStorage.setItem('datachan_theme', themeKey);

    document.documentElement.setAttribute('data-theme', themeKey);
    applyColorOverrides(customColors);
  };

  const setThemeMode = (mode: ThemeMode) => {
    applyThemeCombination(mode, colorPalette);
  };

  const setColorPalette = (palette: ColorPaletteId) => {
    applyThemeCombination(themeMode, palette);
  };

  const setThemeCombination = (mode: ThemeMode, palette: ColorPaletteId) => {
    applyThemeCombination(mode, palette);
  };

  const setTheme = (newTheme: ThemeId) => {
    const { mode, palette } = parseThemeId(newTheme);
    applyThemeCombination(mode, palette);
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

  const activeThemeId = `${themeMode}-${colorPalette}` as ThemeId;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
        colorPalette,
        setColorPalette,
        setThemeCombination,
        palettes: CURATED_PALETTES,
        theme: activeThemeId,
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
