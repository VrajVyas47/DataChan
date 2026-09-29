'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  PanelRight,
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [popupPlacement, setPopupPlacement] = useState<'up' | 'down' | 'left' | 'right'>('up');

  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getMe()
      .then((data) => setProfile(data))
      .catch(() => {});
  }, [pathname]);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        themeMenuRef.current &&
        !themeMenuRef.current.contains(target) &&
        themeButtonRef.current &&
        !themeButtonRef.current.contains(target)
      ) {
        setThemeMenuOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(target) &&
        userButtonRef.current &&
        !userButtonRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute collision-aware popover placement
  const calculatePlacement = (buttonEl: HTMLElement | null): 'up' | 'down' | 'left' | 'right' => {
    if (navPosition === 'left') return 'right';
    if (navPosition === 'right') return 'left';
    if (navPosition === 'top') return 'down';
    if (navPosition === 'bottom') return 'up';

    if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      return spaceBelow < 400 && spaceAbove > spaceBelow ? 'up' : 'down';
    }
    return 'up';
  };

  const handleToggleThemeMenu = () => {
    if (!themeMenuOpen) {
      setPopupPlacement(calculatePlacement(themeButtonRef.current));
      setUserMenuOpen(false);
    }
    setThemeMenuOpen(!themeMenuOpen);
  };

  const handleToggleUserMenu = () => {
    if (!userMenuOpen) {
      setPopupPlacement(calculatePlacement(userButtonRef.current));
      setThemeMenuOpen(false);
    }
    setUserMenuOpen(!userMenuOpen);
  };

  const handleLogout = () => {
    api.logout();
    setUserMenuOpen(false);
    router.push('/login');
  };

  // Cycle through all 4 dock orientations: bottom -> top -> right -> left -> bottom
  const cycleDockPosition = () => {
    const sequence: NavPosition[] = ['bottom', 'top', 'right', 'left'];
    const currentIndex = sequence.indexOf(navPosition);
    const nextIndex = (currentIndex + 1) % sequence.length;
    setNavPosition(sequence[nextIndex]);
    setThemeMenuOpen(false);
    setUserMenuOpen(false);
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Workspace', href: '/workspace', icon: Database },
    { label: 'Mongo Playground', href: '/playground', icon: Terminal },
    { label: 'Learn', href: '/learn', icon: BookOpen },
    { label: 'Challenges', href: '/challenges', icon: Trophy },
    { label: 'Data Modeler', href: '/modeler', icon: Boxes },
  ];

  const colorPresets = [
    { name: 'Royal Violet', hex: '#7c3aed' },
    { name: 'Cyber Emerald', hex: '#059669' },
    { name: 'Deep Azure', hex: '#2563eb' },
    { name: 'Sunset Tangerine', hex: '#ea580c' },
    { name: 'Neon Rose', hex: '#e11d48' },
    { name: 'Golden Amber', hex: '#d97706' },
    { name: 'Teal Lagoon', hex: '#0d9488' },
  ];

  // Container styling for all 4 positions
  const positionClasses = {
    top: 'fixed top-0 left-0 right-0 z-50 p-2 sm:p-4 pointer-events-none',
    bottom: 'fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4 pointer-events-none',
    left: 'fixed top-0 bottom-0 left-0 z-50 p-2 sm:p-3 pointer-events-none flex flex-col justify-center',
    right: 'fixed top-0 bottom-0 right-0 z-50 p-2 sm:p-3 pointer-events-none flex flex-col justify-center',
  };

  const barClasses = {
    top: 'h-16 md:h-18 w-full max-w-[1720px] mx-auto bg-surface-elevated/95 backdrop-blur-xl text-text rounded-full px-3 sm:px-6 flex items-center justify-between border border-border/80 shadow-floating pointer-events-auto transition-all',
    bottom:
      'h-16 md:h-18 w-full max-w-[1600px] mx-auto bg-surface-elevated/95 backdrop-blur-xl text-text rounded-full px-3 sm:px-6 flex items-center justify-between border border-border/80 shadow-floating pointer-events-auto transition-all',
    left: 'w-18 md:w-20 bg-surface-elevated/95 backdrop-blur-xl text-text rounded-3xl p-2.5 flex flex-col items-center justify-between border border-border/80 shadow-floating pointer-events-auto transition-all max-h-[92vh] gap-2',
    right:
      'w-18 md:w-20 bg-surface-elevated/95 backdrop-blur-xl text-text rounded-3xl p-2.5 flex flex-col items-center justify-between border border-border/80 shadow-floating pointer-events-auto transition-all max-h-[92vh] gap-2',
  };

  if (pathname === '/login') {
    return null;
  }

  // --- REUSABLE THEME POPOVER ---
  const renderThemePopover = (extraClasses: string) => (
    <div
      ref={themeMenuRef}
      className={`absolute ${extraClasses} w-80 max-h-[82vh] overflow-y-auto bg-surface border border-border rounded-2xl shadow-popover p-4 z-[100] flex flex-col gap-3.5 backdrop-blur-md text-text`}
    >
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

      {/* Appearance: Mode */}
      <div>
        <div className="text-[10px] font-bold text-text-muted uppercase mb-1.5">Appearance</div>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-high rounded-xl">
          <button
            onClick={() => setThemeMode('light')}
            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              themeMode === 'light' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Light</span>
          </button>
          <button
            onClick={() => setThemeMode('dark')}
            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              themeMode === 'dark' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* Color Combinations (Palettes) */}
      <div>
        <div className="text-[10px] font-bold text-text-muted uppercase mb-1.5">
          Color Combination ({themeMode === 'light' ? 'Light' : 'Dark'})
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {palettes.map((p) => {
            const isSelected = colorPalette === p.id;
            const swatch = p.swatches[themeMode] || p.swatches.dark;
            return (
              <button
                key={p.id}
                onClick={() => setColorPalette(p.id)}
                className={`p-2 rounded-xl border flex flex-col gap-1.5 transition-all text-left ${
                  isSelected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border/60 bg-surface-high/60 hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-text">{p.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-primary" />}
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10"
                    style={{ backgroundColor: swatch.accent }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10"
                    style={{ backgroundColor: swatch.surface }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10"
                    style={{ backgroundColor: swatch.background }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Primary Color Picker */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-text-muted uppercase">Custom Accent Color</span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-4 h-4 rounded-full border border-border inline-block"
              style={{ backgroundColor: customColors.primary || '#7c3aed' }}
            />
            <input
              type="color"
              value={customColors.primary || '#7c3aed'}
              onChange={(e) => setCustomColor('primary', e.target.value)}
              className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
              title="Pick custom hex color"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {colorPresets.map((c) => (
            <button
              key={c.hex}
              onClick={() => setCustomColor('primary', c.hex)}
              className="w-5 h-5 rounded-full border border-border/80 hover:scale-110 transition-transform"
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // --- REUSABLE PROFILE / USER POPOVER ---
  const renderProfilePopover = (extraClasses: string) => (
    <div
      ref={userMenuRef}
      className={`absolute ${extraClasses} w-60 max-h-[82vh] overflow-y-auto bg-surface border border-border rounded-2xl shadow-popover p-2 z-[100] flex flex-col gap-1 text-text backdrop-blur-md`}
    >
      <div className="px-3 py-2 border-b border-border">
        <div className="font-bold text-xs text-text truncate">
          {profile?.displayName || 'Vraj (Demo Student)'}
        </div>
        <div className="text-[11px] text-text-muted truncate">
          {profile?.email || 'vraj@data-chan.edu'}
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-primary font-mono font-bold">
          <span>Level {profile?.level || 1}</span>
          <span>·</span>
          <span>{profile?.xp || 0} XP</span>
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
  );

  // --- VERTICAL DOCK (LEFT OR RIGHT) ---
  if (navPosition === 'left' || navPosition === 'right') {
    const isLeft = navPosition === 'left';
    // Tooltips and popovers open inward toward the page
    const popoverPositionClass = isLeft
      ? 'left-full ml-3 bottom-0'
      : 'right-full mr-3 bottom-0';

    return (
      <header className={positionClasses[navPosition]}>
        <div className={barClasses[navPosition]}>
          {/* Logo / Brand */}
          <Link
            href="/dashboard"
            className="flex flex-col items-center group my-1"
            title="DATA-CHAN Virtual Lab"
          >
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <AnimatedIcon icon={Database} size={20} className="text-white" animation="bounce" />
            </div>
            <span className="text-[9px] font-black tracking-tight text-primary mt-1">DC-LAB</span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-col items-center gap-1.5 my-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-primary text-white shadow-md scale-105'
                        : 'text-text-muted hover:bg-surface-high hover:text-text'
                    }`}
                  >
                    <AnimatedIcon
                      icon={Icon}
                      size={18}
                      className={isActive ? 'text-white' : ''}
                      animation="scale"
                    />
                  </Link>

                  {/* Viewport-aware inward tooltip */}
                  <div
                    className={`absolute ${
                      isLeft ? 'left-full ml-2.5' : 'right-full mr-2.5'
                    } top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-surface border border-border shadow-lg text-[11px] font-bold text-text whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50`}
                  >
                    {item.label}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Dock Controls */}
          <div className="flex flex-col items-center gap-1.5 my-1">
            {/* Dock Position Switcher Toggle */}
            <button
              onClick={cycleDockPosition}
              className="p-2 rounded-xl text-text-muted hover:bg-surface-high hover:text-text transition-colors relative group"
              title={`Dock Position: ${navPosition} (Click to switch)`}
            >
              {isLeft ? (
                <PanelLeft className="w-4 h-4 text-primary" />
              ) : (
                <PanelRight className="w-4 h-4 text-primary" />
              )}
              <div
                className={`absolute ${
                  isLeft ? 'left-full ml-2.5' : 'right-full mr-2.5'
                } top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-surface border border-border shadow-lg text-[11px] font-medium text-text whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50`}
              >
                Dock: {navPosition} (Click to cycle)
              </div>
            </button>

            {/* Theme Toggle Popover */}
            <div className="relative">
              <button
                ref={themeButtonRef}
                onClick={handleToggleThemeMenu}
                className="p-2 rounded-xl text-text-muted hover:bg-surface-high hover:text-text transition-colors relative group"
                title="Change Theme & Palette"
              >
                <AnimatedIcon icon={Palette} size={16} className="text-primary" animation="wiggle" />
                <div
                  className={`absolute ${
                    isLeft ? 'left-full ml-2.5' : 'right-full mr-2.5'
                  } top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-surface border border-border shadow-lg text-[11px] font-medium text-text whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50`}
                >
                  Theme Palette
                </div>
              </button>
              {themeMenuOpen && renderThemePopover(popoverPositionClass)}
            </div>

            {/* Settings Link */}
            <Link
              href="/settings"
              className="p-2 rounded-xl text-text-muted hover:bg-surface-high hover:text-text transition-colors relative group"
              title="Settings"
            >
              <AnimatedIcon icon={Settings} size={16} animation="spin" />
              <div
                className={`absolute ${
                  isLeft ? 'left-full ml-2.5' : 'right-full mr-2.5'
                } top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-surface border border-border shadow-lg text-[11px] font-medium text-text whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50`}
              >
                Lab Settings
              </div>
            </Link>

            {/* Profile Popover */}
            <div className="relative">
              <button
                ref={userButtonRef}
                onClick={handleToggleUserMenu}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white ring-1 ring-border hover:scale-105 transition-transform"
                title="User Profile"
              >
                <User className="w-3.5 h-3.5" />
              </button>
              {userMenuOpen && renderProfilePopover(popoverPositionClass)}
            </div>
          </div>
        </div>
      </header>
    );
  }

  // --- HORIZONTAL DOCK (TOP OR BOTTOM) ---
  const isBottom = navPosition === 'bottom';
  const popoverPositionClass = isBottom ? 'bottom-full mb-3' : 'top-full mt-3';

  return (
    <header className={positionClasses[navPosition]}>
      <div className={barClasses[navPosition]}>
        {/* Brand / Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <AnimatedIcon icon={Database} size={18} className="text-white" animation="bounce" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base md:text-lg tracking-tight text-text">
                DATA-CHAN
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider hidden lg:inline-flex items-center gap-1 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                MongoDB Connected
              </span>
            </div>
            <span className="text-[10px] text-text-muted hidden md:inline-block">
              Virtual Database Lab
            </span>
          </div>
        </Link>

        {/* Center Navigation Links (Responsive: full labels on desktop, icons with active highlights on small screens) */}
        <nav className="flex items-center gap-0.5 sm:gap-1 bg-surface-high/60 p-1 sm:p-1.5 rounded-full border border-border/60 mx-1 sm:mx-2 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'bg-primary text-white shadow-sm font-bold scale-[1.02]'
                    : 'text-text-muted hover:bg-surface-high hover:text-text'
                }`}
                title={item.label}
              >
                <AnimatedIcon
                  icon={Icon}
                  size={15}
                  className={isActive ? 'text-white' : 'text-text-muted'}
                  animation="scale"
                />
                <span className="hidden xl:inline">{item.label}</span>
                <span className="hidden md:inline xl:hidden text-[11px]">
                  {item.label.split(' ')[0]}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right Status / User / Theme Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* User Progress Pill */}
          <div className="hidden 2xl:flex items-center gap-2 bg-surface-high/80 px-3 py-1.5 rounded-full border border-border/60">
            <span className="text-xs text-text font-medium">
              {profile?.displayName || 'Explorer'}
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
            onClick={cycleDockPosition}
            className="p-2 rounded-full bg-surface-high hover:bg-surface text-text border border-border/60 transition-colors"
            title={`Dock Position: ${navPosition} (Click to cycle)`}
          >
            {isBottom ? (
              <PanelBottom className="w-4 h-4 text-primary" />
            ) : (
              <PanelTop className="w-4 h-4 text-primary" />
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

            {themeMenuOpen && renderThemePopover(`${popoverPositionClass} right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2`)}
          </div>

          {/* Settings Link */}
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
              ref={userButtonRef}
              onClick={handleToggleUserMenu}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary flex items-center justify-center text-white ring-2 ring-border hover:scale-105 transition-transform"
              title="User Account"
            >
              <User className="w-4 h-4" />
            </button>

            {userMenuOpen && renderProfilePopover(`${popoverPositionClass} right-0`)}
          </div>
        </div>
      </div>
    </header>
  );
}
