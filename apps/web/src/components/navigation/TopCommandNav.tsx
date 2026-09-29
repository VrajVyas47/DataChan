'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme';
import { api } from '@/lib/api';
import { UserProfile } from '@datachan/shared-types';
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
} from 'lucide-react';

export function TopCommandNav() {
  const pathname = usePathname();
  const { theme, setTheme, availableThemes } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  useEffect(() => {
    api
      .getMe()
      .then((data) => setProfile(data))
      .catch(() => {});
  }, [pathname]);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Workspace', href: '/workspace', icon: Database },
    { label: 'Mongo Playground', href: '/playground', icon: Terminal },
    { label: 'Learn', href: '/learn', icon: BookOpen },
    { label: 'Challenges', href: '/challenges', icon: Trophy },
    { label: 'Data Modeler', href: '/modeler', icon: Boxes },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-2 sm:p-4 pointer-events-none">
      <div className="h-16 md:h-20 w-full max-w-[1720px] mx-auto bg-inverse-surface text-inverse-text rounded-full px-4 sm:px-6 flex items-center justify-between shadow-floating pointer-events-auto transition-all">
        {/* Brand / Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-inverse-text">
                DATA-CHAN
              </span>
              <span className="px-2 py-0.5 rounded-full bg-tertiary-container/30 text-tertiary-fixed text-[10px] font-bold uppercase tracking-wider hidden sm:inline-block border border-tertiary-container/40">
                MongoDB v6.0 Ready
              </span>
            </div>
            <span className="text-xs text-outline-variant text-text-muted hidden sm:inline-block">
              Virtual Database Lab
            </span>
          </div>
        </Link>

        {/* Floating Center Tabs */}
        <nav className="hidden xl:flex items-center gap-1 bg-surface-low/10 p-1.5 rounded-full border border-white/5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary-container text-white shadow-sm font-bold scale-[1.02]'
                    : 'text-inverse-text/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-inverse-text/60'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="h-4 w-px bg-white/20 mx-1"></div>
          <span className="px-2.5 py-1 rounded-full bg-white/5 text-text-muted text-[10px] font-bold tracking-wider uppercase">
            SQL Soon
          </span>
        </nav>

        {/* Right Status / User / Theme Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Progress Pill */}
          <div className="hidden lg:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <span className="text-xs text-inverse-text/90 font-medium">
              Hello, {profile?.displayName || profile?.username || 'Explorer'} 👋
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary-fixed text-xs font-mono font-bold">
              <Flame className="w-3.5 h-3.5 text-secondary" />
              <span>{profile?.streakDays || 1}d</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-fixed/20 text-primary-fixed text-xs font-mono">
              <span className="font-bold text-[10px] bg-primary/40 px-1 py-0.2 rounded">
                LVL {profile?.level || 1}
              </span>
              <span className="text-primary-fixed-dim">{profile?.xp || 0} XP</span>
            </div>
          </div>

          {/* Theme Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-inverse-text transition-colors flex items-center gap-1"
              title="Change Theme"
            >
              <Palette className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {themeMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-popover p-1.5 z-50 flex flex-col gap-1">
                <div className="px-2.5 py-1 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  Select Theme
                </div>
                {availableThemes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                      theme === t.id
                        ? 'bg-primary-container text-white font-bold'
                        : 'text-text-main hover:bg-surface-high'
                    }`}
                  >
                    <span>{t.name}</span>
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm"
                      style={{ backgroundColor: t.primaryHex }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <Link
            href="/settings"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-inverse-text transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>

          {/* Profile Avatar */}
          <Link
            href="/profile"
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white ring-2 ring-white/20 hover:scale-105 transition-transform"
            title="User Profile"
          >
            <User className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
