'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme';
import { api } from '@/lib/api';
import {
  Palette,
  User,
  Terminal,
  Shield,
  CheckCircle2,
  Sliders,
  Keyboard,
  Server,
} from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme, availableThemes } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);
  const [devUser, setDevUser] = useState({ uid: '', email: '', name: '' });

  useEffect(() => {
    setDevUser(api.getDevUser());
    api
      .getMe()
      .then((me) => setDisplayName(me.displayName || me.username))
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

  function handleSwitchDevUser(name: string, email: string) {
    const uid = `usr_${name.toLowerCase()}_${Date.now()}`;
    api.setDevUser(uid, email, name);
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-6 w-full flex-1 max-w-4xl mx-auto">
      {/* Settings Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-main flex items-center gap-2.5">
          <Sliders className="w-7 h-7 text-primary" />
          <span>Laboratory Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-text-muted mt-1">
          Customize your theme, editor preferences, user profile, and virtual laboratory configuration.
        </p>
      </div>

      {savedNotice && (
        <div className="bg-tertiary-container text-white px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* 1. Multi-Theme Token Selector (Section 38 & 39) */}
      <div className="bg-surface-low rounded-2xl p-6 border border-border shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Palette className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-text-main">Visual Multi-Theme System</h3>
            <span className="text-xs text-text-muted">
              Choose from 5 accessible, contrast-validated color token palettes.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
          {availableThemes.map((t) => {
            const isSelected = theme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-primary bg-surface shadow-md scale-[1.02]'
                    : 'border-border bg-surface hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-main">{t.name}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <div
                    className="w-6 h-6 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: t.primaryHex }}
                    title="Primary Accent"
                  />
                  <div
                    className="w-6 h-6 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: t.surfaceHex }}
                    title="Surface"
                  />
                  <div
                    className="w-6 h-6 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: t.backgroundHex }}
                    title="Background"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. User Account Profile Settings */}
      <div className="bg-surface-low rounded-2xl p-6 border border-border shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <User className="w-5 h-5 text-secondary" />
          <div>
            <h3 className="text-sm font-bold text-text-main">Student Profile</h3>
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
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface border border-border text-text-main focus:outline-none focus:ring-2 focus:ring-primary max-w-md"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>

      {/* 3. Developer / Student Identity Switcher */}
      <div className="bg-surface-low rounded-2xl p-6 border border-border shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Shield className="w-5 h-5 text-tertiary" />
          <div>
            <h3 className="text-sm font-bold text-text-main">Lab Development Identity</h3>
            <span className="text-xs text-text-muted">
              Switch test personas to evaluate workspace isolation across different students.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => handleSwitchDevUser('Jay', 'jay@data-chan.edu')}
            className="px-3.5 py-1.5 rounded-full bg-surface hover:bg-surface-high border border-border text-xs font-medium text-text-main transition-all"
          >
            Switch to Jay (Default)
          </button>
          <button
            onClick={() => handleSwitchDevUser('Alice', 'alice@data-chan.edu')}
            className="px-3.5 py-1.5 rounded-full bg-surface hover:bg-surface-high border border-border text-xs font-medium text-text-main transition-all"
          >
            Switch to Alice
          </button>
          <button
            onClick={() => handleSwitchDevUser('Professor_Lee', 'lee@faculty.data-chan.edu')}
            className="px-3.5 py-1.5 rounded-full bg-surface hover:bg-surface-high border border-border text-xs font-medium text-text-main transition-all"
          >
            Switch to Professor Lee
          </button>
        </div>
      </div>

      {/* 4. Keyboard Shortcuts Cheatsheet */}
      <div className="bg-surface-low rounded-2xl p-6 border border-border shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Keyboard className="w-5 h-5 text-text-muted" />
          <div>
            <h3 className="text-sm font-bold text-text-main">Playground Keyboard Shortcuts</h3>
            <span className="text-xs text-text-muted">Speed up query execution and navigation.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-1">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-border">
            <span className="text-text-muted">Execute MQL Query</span>
            <span className="bg-surface-high px-2 py-0.5 rounded font-bold text-primary">
              Ctrl + Enter
            </span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-border">
            <span className="text-text-muted">Format Query Code</span>
            <span className="bg-surface-high px-2 py-0.5 rounded font-bold text-primary">
              Shift + Alt + F
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
