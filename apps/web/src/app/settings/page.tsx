'use client';

import React, { useState, useEffect } from 'react';
import { useTheme, NavPosition } from '@/lib/theme';
import { api } from '@/lib/api';
import { UserProfile } from '@datachan/shared-types';
import {
  Palette,
  User,
  Terminal,
  Shield,
  CheckCircle2,
  Sliders,
  Keyboard,
  Server,
  Sparkles,
  RotateCcw,
  PanelBottom,
  PanelTop,
  PanelLeft,
  PanelRight,
  Users,
  Sun,
  Moon,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
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

  const [displayName, setDisplayName] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    api
      .getMe()
      .then((me) => {
        setCurrentUser(me);
        setDisplayName(me.displayName || me.username);
      })
      .catch(() => {});
  }, []);

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.syncUser({ displayName, themePreference: theme });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  }

  const colorPresets = [
    { name: 'Royal Violet', hex: '#7c3aed' },
    { name: 'Cyber Emerald', hex: '#059669' },
    { name: 'Electric Azure', hex: '#2563eb' },
    { name: 'Sunset Tangerine', hex: '#ea580c' },
    { name: 'Neon Rose', hex: '#e11d48' },
    { name: 'Golden Amber', hex: '#d97706' },
    { name: 'Teal Lagoon', hex: '#0d9488' },
    { name: 'Midnight Charcoal', hex: '#374151' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full flex-1 max-w-4xl mx-auto pb-24">
      {/* Settings Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text flex items-center gap-2.5">
          <Sliders className="w-7 h-7 text-primary" />
          <span>Laboratory Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-text-muted mt-1">
          Customize your theme, mix interchangeable colors, choose dock position, and configure user identity.
        </p>
      </div>

      {savedNotice && (
        <div className="bg-emerald-600 text-white px-5 py-3 rounded-full text-xs font-bold flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* 1. Multi-Theme Token Selector & Color Mixer */}
      <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-text">Visual Theme System & Color Mixer</h3>
              <span className="text-xs text-text-muted">
                Interchangeable themes with real-time accent color customization.
              </span>
            </div>
          </div>

          {(customColors.primary || customColors.secondary) && (
            <button
              onClick={resetCustomColors}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-high hover:bg-surface text-text text-xs font-semibold border border-border transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Custom Colors</span>
            </button>
          )}
        </div>

        {/* Level 1: Theme Mode (Appearance) */}
        <div>
          <div className="text-xs font-bold text-text-muted uppercase mb-2">Level 1: Appearance</div>
          <div className="grid grid-cols-2 gap-2 max-w-xs p-1 bg-surface-high rounded-xl">
            <button
              onClick={() => setThemeMode('light')}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                themeMode === 'light'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light Mode</span>
            </button>
            <button
              onClick={() => setThemeMode('dark')}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                themeMode === 'dark'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Moon className="w-4 h-4 text-violet-400" />
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

        {/* Level 2: Curated Color Combinations */}
        <div>
          <div className="text-xs font-bold text-text-muted uppercase mb-2 flex items-center justify-between">
            <span>Level 2: Color Combination</span>
            <span className="text-xs font-mono text-primary font-bold capitalize">
              Active: {themeMode} · {colorPalette}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {palettes.map((p) => {
              const isSelected = colorPalette === p.id;
              const sw = p.swatches[themeMode];
              return (
                <div
                  key={p.id}
                  onClick={() => setColorPalette(p.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md scale-[1.01]'
                      : 'border-border bg-surface-high/50 hover:border-primary/40 hover:bg-surface-high'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-text">{p.name}</span>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{p.description}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </div>

                  {/* 4-Swatch Miniature Preview */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full h-5 rounded-md border border-black/10 shadow-xs"
                        style={{ backgroundColor: sw.background }}
                        title="Background"
                      />
                      <span className="text-[9px] font-mono text-text-muted">BG</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full h-5 rounded-md border border-black/10 shadow-xs"
                        style={{ backgroundColor: sw.surface }}
                        title="Surface"
                      />
                      <span className="text-[9px] font-mono text-text-muted">Surface</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full h-5 rounded-md border border-black/10 shadow-xs"
                        style={{ backgroundColor: sw.accent }}
                        title="Accent"
                      />
                      <span className="text-[9px] font-mono text-text-muted">Accent</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full h-5 rounded-md border border-black/10 shadow-xs"
                        style={{ backgroundColor: sw.text }}
                        title="Text"
                      />
                      <span className="text-[9px] font-mono text-text-muted">Text</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* Dynamic Color Mixer Section */}
        <div className="p-4 rounded-2xl bg-surface-high/60 border border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-text">Mix Accent Colors (Custom Overrides)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-muted">Custom Hex:</span>
              <input
                type="color"
                value={customColors.primary || '#7c3aed'}
                onChange={(e) => setCustomColor('primary', e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                title="Custom color picker"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {colorPresets.map((c) => (
              <button
                key={c.hex}
                onClick={() => setCustomColor('primary', c.hex)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  customColors.primary === c.hex
                    ? 'border-primary ring-2 ring-primary ring-offset-1 bg-surface font-bold'
                    : 'border-border bg-surface hover:scale-105'
                }`}
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>

          <div className="pt-2 text-[11px] text-text-muted">
            Colors dynamically update in real time across buttons, tabs, accents, and code editors.
          </div>
        </div>
      </div>

      {/* 2. Navigation Dock Position Settings */}
      <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <PanelBottom className="w-5 h-5 text-secondary" />
          <div>
            <h3 className="text-sm font-bold text-text">Navigation Bar Docking Position</h3>
            <span className="text-xs text-text-muted">
              Choose where the command navigation sits on your screen.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <button
            onClick={() => setNavPosition('bottom')}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
              navPosition === 'bottom'
                ? 'border-primary bg-primary/5 font-bold shadow-sm'
                : 'border-border bg-surface-high hover:border-primary/40'
            }`}
          >
            <PanelBottom className="w-6 h-6 text-primary" />
            <div>
              <div className="text-xs font-bold text-text">Bottom Dock (Recommended)</div>
              <div className="text-[10px] text-text-muted mt-0.5">
                Modern dock floating at bottom center
              </div>
            </div>
          </button>

          <button
            onClick={() => setNavPosition('top')}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
              navPosition === 'top'
                ? 'border-primary bg-primary/5 font-bold shadow-sm'
                : 'border-border bg-surface-high hover:border-primary/40'
            }`}
          >
            <PanelTop className="w-6 h-6 text-primary" />
            <div>
              <div className="text-xs font-bold text-text">Top Command Bar</div>
              <div className="text-[10px] text-text-muted mt-0.5">
                Classic header navigation at the top
              </div>
            </div>
          </button>

          <button
            onClick={() => setNavPosition('right')}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
              navPosition === 'right'
                ? 'border-primary bg-primary/5 font-bold shadow-sm'
                : 'border-border bg-surface-high hover:border-primary/40'
            }`}
          >
            <PanelRight className="w-6 h-6 text-primary" />
            <div>
              <div className="text-xs font-bold text-text">Right Side Dock</div>
              <div className="text-[10px] text-text-muted mt-0.5">
                Vertical command dock on right viewport edge
              </div>
            </div>
          </button>

          <button
            onClick={() => setNavPosition('left')}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
              navPosition === 'left'
                ? 'border-primary bg-primary/5 font-bold shadow-sm'
                : 'border-border bg-surface-high hover:border-primary/40'
            }`}
          >
            <PanelLeft className="w-6 h-6 text-primary" />
            <div>
              <div className="text-xs font-bold text-text">Left Sidebar Dock</div>
              <div className="text-[10px] text-text-muted mt-0.5">
                Vertical command dock on left viewport edge
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 3. User Account Profile Settings */}
      <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <User className="w-5 h-5 text-secondary" />
          <div>
            <h3 className="text-sm font-bold text-text">Student Profile</h3>
            <span className="text-xs text-text-muted">
              Configure your displayed name and laboratory identity.
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveAccount} className="flex flex-col gap-3 pt-2">
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-high border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary max-w-md"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all shadow-md"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>

      {/* 4. Authoritative Account & Security Overview */}
      <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-text">Account & Authorization Information</h3>
            <span className="text-xs text-text-muted">
              Server-enforced laboratory role, account status, and authentication security.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-2xl border border-border bg-surface-high flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Account Role</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text capitalize">{currentUser?.role || 'student'}</span>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  currentUser?.role === 'admin'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : currentUser?.role === 'faculty'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {currentUser?.role || 'student'}
              </span>
            </div>
            <p className="text-[10px] text-text-muted mt-1">
              Role permissions are verified cryptographically by backend session tokens.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-surface-high flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Account State</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-emerald-400 capitalize">{currentUser?.status || 'active'}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Verified
              </span>
            </div>
            <p className="text-[10px] text-text-muted mt-1 truncate">
              {currentUser?.email || 'Authenticated User'}
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-surface-high flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Session Security</span>
            <span className="text-sm font-bold text-text">HttpOnly SameSite</span>
            <p className="text-[10px] text-text-muted mt-1">
              Protected against XSS token harvesting. Authoritative Firebase ID token exchange.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Keyboard Shortcuts Cheatsheet */}
      <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Keyboard className="w-5 h-5 text-text-muted" />
          <div>
            <h3 className="text-sm font-bold text-text">Playground Keyboard Shortcuts</h3>
            <span className="text-xs text-text-muted">Speed up query execution and navigation.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-1">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-high border border-border">
            <span className="text-text-muted">Execute MQL Query</span>
            <span className="bg-surface px-2.5 py-1 rounded-lg font-bold text-primary border border-border">
              Ctrl + Enter
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-high border border-border">
            <span className="text-text-muted">Format Query Code</span>
            <span className="bg-surface px-2.5 py-1 rounded-lg font-bold text-primary border border-border">
              Shift + Alt + F
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
