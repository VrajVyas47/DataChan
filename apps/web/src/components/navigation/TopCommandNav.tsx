'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme, NavPosition } from '@/lib/theme';
import { api } from '@/lib/api';
import { UserProfile } from '@datachan/shared-types';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import {
  Database,
  Terminal,
  BookOpen,
  Trophy,
  Boxes,
  LayoutDashboard,
  Flame,
  Palette,
  Settings,
  User,
  ChevronDown,
  LogOut,
  Sliders,
  PanelBottom,
  PanelTop,
  PanelLeft,
  Sparkles,
  RotateCcw,
  Sun,
  Moon,
  Check,
} from 'lucide-react';

export function TopCommandNav() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    themeMode,
    setThemeMode,
    colorPalette,
    setColorPalette,
    palettes,
    theme,
    setTheme,
    availableThemes,
    customColors,
    setCustomColor,
    resetCustomColors,
    navPosition,
    setNavPosition,
  } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [popupPlacement, setPopupPlacement] = useState<'up' | 'down'>('up');
  const themeButtonRef = React.useRef<HTMLButtonElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mongoConnected, setMongoConnected] = useState(true);

  useEffect(() => {
    api
      .getMe()
      .then((data) => setProfile(data))
      .catch(() => {});
  }, [pathname]);

  const handleToggleThemeMenu = () => {
    if (!themeMenuOpen && themeButtonRef.current) {
      const rect = themeButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Viewport-aware check:
      // If dock is at bottom, or space below is less than 440px and space above is larger, open UPWARD
      if (navPosition === 'bottom' || spaceBelow < 440 || spaceAbove > spaceBelow) {
        setPopupPlacement('up');
      } else {
        setPopupPlacement('down');
      }
    }
    setThemeMenuOpen(!themeMenuOpen);
  };

  const handleLogout = () => {
    api.logout();
    setUserMenuOpen(false);
    router.push('/login');
  };


  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Workspace', href: '/workspace', icon: Database },
    { label: 'Mongo Playground', href: '/playground', icon: Terminal },
    { label: 'Learn', href: '/learn', icon: BookOpen },
    { label: 'Challenges', href: '/challenges', icon: Trophy },
    { label: 'Data Modeler', href: '/modeler', icon: Boxes },
  ];

  // Quick preset palette colors for the custom color mixer
  const colorPresets = [
    { name: 'Royal Violet', hex: '#7c3aed' },
    { name: 'Cyber Emerald', hex: '#059669' },
    { name: 'Deep Azure', hex: '#2563eb' },
    { name: 'Sunset Tangerine', hex: '#ea580c' },
    { name: 'Neon Rose', hex: '#e11d48' },
    { name: 'Golden Amber', hex: '#d97706' },
    { name: 'Teal Lagoon', hex: '#0d9488' },
  ];

  // Position-specific container styles
  const positionClasses = {
    top: 'fixed top-0 left-0 right-0 z-50 p-2 sm:p-4 pointer-events-none',
    bottom: 'fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4 pointer-events-none',
    left: 'fixed top-0 bottom-0 left-0 z-50 p-2 sm:p-4 pointer-events-none flex flex-col justify-center',
  };

  const barClasses = {
    top: 'h-16 md:h-18 w-full max-w-[1720px] mx-auto bg-surface-elevated/95 backdrop-blur-xl text-text rounded-full px-4 sm:px-6 flex items-center justify-between border border-border/80 shadow-floating pointer-events-auto transition-all',
    bottom:
      'h-16 md:h-18 w-full max-w-[1600px] mx-auto bg-surface-elevated/95 backdrop-blur-xl text-text rounded-full px-4 sm:px-6 flex items-center justify-between border border-border/80 shadow-floating pointer-events-auto transition-all',
    left: 'w-20 md:w-24 bg-surface-elevated/95 backdrop-blur-xl text-text rounded-3xl p-3 flex flex-col items-center justify-between border border-border/80 shadow-floating pointer-events-auto transition-all max-h-[90vh]',
  };

  if (pathname === '/login') {
    return null; // Login page has its own dedicated minimal header
  }

  // Render left sidebar variant
  if (navPosition === 'left') {
    return (
      <header className={positionClasses.left}>
        <div className={barClasses.left}>
          {/* Logo */}
          <Link href="/dashboard" className="flex flex-col items-center group mb-4" title="DATA-CHAN Virtual Lab">
            <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
              <AnimatedIcon icon={Database} size={22} className="text-white" animation="bounce" />
            </div>
            <span className="text-[10px] font-black tracking-tight text-primary mt-1">DC-LAB</span>
          </Link>

          {/* Navigation Items */}
          <nav className="flex flex-col items-center gap-2 my-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-md scale-105'
                      : 'text-text-muted hover:bg-surface-high hover:text-text'
                  }`}
                  title={item.label}
                >
                  <AnimatedIcon icon={Icon} size={20} className={isActive ? 'text-white' : ''} animation="scale" />
                </Link>
              );
            })}
          </nav>

          {/* Bottom Dock Controls */}
          <div className="flex flex-col items-center gap-2 mt-4">
            <button
              onClick={() => setNavPosition('bottom')}
              className="p-2 rounded-xl text-text-muted hover:bg-surface-high hover:text-text transition-colors"
              title="Move Dock to Bottom"
            >
              <PanelBottom className="w-4 h-4" />
            </button>
            <Link
              href="/settings"
              className="p-2 rounded-xl text-text-muted hover:bg-surface-high hover:text-text transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Render Horizontal Bar (Top or Bottom Dock)
  return (
    <header className={positionClasses[navPosition]}>
      <div className={barClasses[navPosition]}>
        {/* Brand / Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <AnimatedIcon icon={Database} size={20} className="text-white" animation="bounce" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-text">
                DATA-CHAN
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider hidden sm:inline-flex items-center gap-1 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                MongoDB Connected
              </span>
            </div>
            <span className="text-[11px] text-text-muted hidden sm:inline-block">
              Virtual Database Lab
            </span>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1 bg-surface-high/60 p-1.5 rounded-full border border-border/60">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm font-bold scale-[1.02]'
                    : 'text-text-muted hover:bg-surface-high hover:text-text'
                }`}
              >
                <AnimatedIcon
                  icon={Icon}
                  size={15}
                  className={isActive ? 'text-white' : 'text-text-muted'}
                  animation="scale"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="h-4 w-px bg-border mx-1"></div>
          <span className="px-2.5 py-1 rounded-full bg-surface text-text-muted text-[10px] font-bold tracking-wider uppercase border border-border/50">
            SQL Soon
          </span>
        </nav>

        {/* Right Status / User / Theme Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Progress Pill */}
          <div className="hidden lg:flex items-center gap-2 bg-surface-high/80 px-3 py-1.5 rounded-full border border-border/60">
            <span className="text-xs text-text font-medium">
              Hello, {profile?.displayName || profile?.username || 'Explorer'} 👋
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-xs font-mono font-bold">
              <AnimatedIcon icon={Flame} size={14} className="text-secondary" animation="wiggle" />
              <span>{profile?.streakDays || 1}d</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-mono font-bold">
              <span className="font-bold text-[10px] bg-primary/20 px-1 py-0.2 rounded">
                LVL {profile?.level || 1}
              </span>
              <span>{profile?.xp || 0} XP</span>
            </div>
          </div>

          {/* Dock Position Switcher Toggle */}
          <button
            onClick={() => setNavPosition(navPosition === 'bottom' ? 'top' : navPosition === 'top' ? 'left' : 'bottom')}
            className="p-2 rounded-full bg-surface-high hover:bg-surface text-text border border-border/60 transition-colors"
            title={`Dock Position: ${navPosition} (Click to toggle: Bottom / Top / Left)`}
          >
            {navPosition === 'bottom' ? (
              <PanelBottom className="w-4 h-4 text-primary" />
            ) : navPosition === 'top' ? (
              <PanelTop className="w-4 h-4 text-primary" />
            ) : (
              <PanelLeft className="w-4 h-4 text-primary" />
            )}
          </button>

          {/* Theme & Color Mixer Dropdown */}
          <div className="relative">
            <button
              ref={themeButtonRef}
              onClick={handleToggleThemeMenu}
              className="p-2 rounded-full bg-surface-high hover:bg-surface text-text border border-border/60 transition-colors flex items-center gap-1"
              title="Change Theme & Color Combination"
            >
              <AnimatedIcon icon={Palette} size={16} className="text-primary" animation="wiggle" />
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {themeMenuOpen && (
              <div
                className={`absolute right-0 ${
                  popupPlacement === 'up' ? 'bottom-full mb-3' : 'top-full mt-3'
                } w-80 max-h-[82vh] overflow-y-auto bg-surface border border-border rounded-2xl shadow-popover p-4 z-[100] flex flex-col gap-3.5 backdrop-blur-md`}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Theme System</span>
                  </div>
                  {customColors.primary && (
                    <button
                      onClick={resetCustomColors}
                      className="text-[10px] text-text-muted hover:text-primary flex items-center gap-1"
                      title="Reset custom colors"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Reset
                    </button>
                  )}
                </div>

                {/* Level 1: Appearance (Mode) */}
                <div>
                  <div className="text-[10px] font-bold text-text-muted uppercase mb-1.5">
                    Appearance
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-high rounded-xl">
                    <button
                      onClick={() => setThemeMode('light')}
                      className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                        themeMode === 'light'
                          ? 'bg-surface text-text shadow-sm'
                          : 'text-text-muted hover:text-text'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => setThemeMode('dark')}
                      className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                        themeMode === 'dark'
                          ? 'bg-surface text-text shadow-sm'
                          : 'text-text-muted hover:text-text'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-violet-400" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                {/* Level 2: Color Combination */}
                <div>
                  <div className="text-[10px] font-bold text-text-muted uppercase mb-1.5 flex items-center justify-between">
                    <span>Color Combination</span>
                    <span className="text-[10px] font-mono text-primary font-semibold capitalize">
                      {colorPalette}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {palettes.map((p) => {
                      const isSelected = colorPalette === p.id;
                      const sw = p.swatches[themeMode];
                      return (
                        <button
                          key={p.id}
                          onClick={() => setColorPalette(p.id)}
                          className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-text font-bold shadow-xs'
                              : 'bg-surface-high/40 hover:bg-surface-high border-border text-text-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {/* Miniature Preview with 4 Swatches */}
                            <div className="flex items-center rounded-md overflow-hidden border border-black/15 shrink-0 shadow-xs">
                              <span
                                className="w-3 h-6 block"
                                style={{ backgroundColor: sw.background }}
                                title="Background"
                              />
                              <span
                                className="w-3 h-6 block"
                                style={{ backgroundColor: sw.surface }}
                                title="Surface"
                              />
                              <span
                                className="w-3 h-6 block"
                                style={{ backgroundColor: sw.accent }}
                                title="Accent"
                              />
                              <span
                                className="w-3 h-6 block"
                                style={{ backgroundColor: sw.text }}
                                title="Text"
                              />
                            </div>

                            <div>
                              <div className={`text-xs ${isSelected ? 'text-text font-bold' : 'text-text'}`}>
                                {p.name}
                              </div>
                              <div className="text-[10px] text-text-muted line-clamp-1">
                                {p.description}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Mixer: Accent Overrides */}
                <div className="pt-2 border-t border-border">
                  <div className="text-[10px] font-bold text-text-muted uppercase mb-1.5 flex items-center justify-between">
                    <span>Mix Accent Color</span>
                    <input
                      type="color"
                      value={customColors.primary || '#7c3aed'}
                      onChange={(e) => setCustomColor('primary', e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                      title="Custom Color Picker"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {colorPresets.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setCustomColor('primary', c.hex)}
                        className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${
                          customColors.primary === c.hex ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* Settings */}
          <Link
            href="/settings"
            className="p-2 rounded-full bg-surface-high hover:bg-surface text-text border border-border/60 transition-colors"
            title="Settings"
          >
            <AnimatedIcon icon={Settings} size={16} animation="spin" />
          </Link>

          {/* Profile & Logout Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white ring-2 ring-border hover:scale-105 transition-transform"
              title="User Account"
            >
              <User className="w-4 h-4" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 bottom-full mb-3 md:bottom-auto md:top-full md:mt-2 w-56 bg-surface border border-border rounded-2xl shadow-popover p-2 z-50 flex flex-col gap-1">
                <div className="px-3 py-2 border-b border-border">
                  <div className="font-bold text-xs text-text truncate">
                    {profile?.displayName || 'Jay (Demo Student)'}
                  </div>
                  <div className="text-[11px] text-text-muted truncate">
                    {profile?.email || 'jay@student.lab'}
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-text hover:bg-surface-high transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>My Profile & XP</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-text hover:bg-surface-high transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-text-muted" />
                  <span>Lab Settings</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
