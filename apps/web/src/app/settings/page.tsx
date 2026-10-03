'use client';

import React, { useState, useEffect } from 'react';
import { useTheme, NavPosition } from '@/lib/theme';
import { api } from '@/lib/api';
import { UserProfile } from '@datachan/shared-types';
import {
  Palette,
  User,
  Sliders,
  Keyboard,
  RotateCcw,
  PanelBottom,
  PanelTop,
  PanelLeft,
  PanelRight,
  Users,
  Sun,
  Moon,
  Check,
  CheckCircle2,
} from 'lucide-react';
import {
  Button,
  Input,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  PageHeader,
  Tabs,
  TabList,
  TabTrigger,
} from '@/components/ui';

export default function SettingsPage() {
  const {
    themeMode,
    setThemeMode,
    colorPalette,
    setColorPalette,
    palettes,
    theme,
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
      {/* Normalized Settings Header */}
      <PageHeader
        icon={<Sliders className="w-6 h-6 text-primary" />}
        title="Laboratory Settings"
        description="Customize your theme, mix interchangeable colors, choose dock position, and configure user identity."
      />

      {savedNotice && (
        <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* 1. Multi-Theme Token Selector & Color Mixer */}
      <Card variant="surface" className="flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-text">Visual Theme System & Color Mixer</h3>
              <span className="text-xs text-text-muted">
                Interchangeable themes with real-time accent color customization.
              </span>
            </div>
          </div>

          {(customColors.primary || customColors.secondary) && (
            <Button
              variant="outline"
              size="xs"
              onClick={resetCustomColors}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset Custom Colors
            </Button>
          )}
        </div>

        {/* Level 1: Theme Mode (Appearance) */}
        <div>
          <div className="text-xs font-bold text-text-muted uppercase mb-2">Level 1: Appearance</div>
          <Tabs value={themeMode} onValueChange={(val: any) => setThemeMode(val)}>
            <TabList variant="pill">
              <TabTrigger value="light" icon={<Sun className="w-4 h-4 text-amber-500" />}>Light Mode</TabTrigger>
              <TabTrigger value="dark" icon={<Moon className="w-4 h-4 text-indigo-400" />}>Dark Mode</TabTrigger>
            </TabList>
          </Tabs>
        </div>

        {/* Level 2: Curated Color Palettes */}
        <div>
          <div className="text-xs font-bold text-text-muted uppercase mb-2">
            Level 2: Curated Combinations ({themeMode === 'light' ? 'Light' : 'Dark'})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {palettes.map((p) => {
              const isSelected = colorPalette === p.id;
              const swatch = p.swatches[themeMode] || p.swatches.dark;
              return (
                <div
                  key={p.id}
                  onClick={() => setColorPalette(p.id)}
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--color-primary-fixed)'
                      : 'var(--color-surface, #ffffff)',
                  }}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary shadow-sm ring-1 ring-primary'
                      : 'border-border hover:border-text-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text">{p.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </div>

                  <p className="text-[11px] text-text-muted leading-tight">{p.description}</p>

                  <div className="flex items-center gap-1.5 pt-1">
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10"
                      style={{ backgroundColor: swatch.accent }}
                      title="Accent"
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10"
                      style={{ backgroundColor: swatch.surface }}
                      title="Surface"
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10"
                      style={{ backgroundColor: swatch.background }}
                      title="Background"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Level 3: Custom Color Mixer (Overrides) */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-bold text-text">Level 3: Custom Accent Mixer</div>
              <div className="text-[11px] text-text-muted">
                Override the primary brand tone with a custom hex code.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full border border-border inline-block"
                style={{ backgroundColor: customColors.primary || '#7c3aed' }}
              />
              <input
                type="color"
                value={customColors.primary || '#7c3aed'}
                onChange={(e) => setCustomColor('primary', e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border-none bg-transparent"
                title="Pick custom hex color"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {colorPresets.map((c) => (
              <Button
                key={c.hex}
                variant="outline"
                size="xs"
                onClick={() => setCustomColor('primary', c.hex)}
                className="bg-surface-low hover:bg-surface text-text font-medium"
                leftIcon={<span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />}
              >
                {c.name}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* 2. Dock Orientation Selector */}
      <Card variant="surface" className="flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Sliders className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-text">Dock Orientation</h3>
            <span className="text-xs text-text-muted">
              Choose your preferred screen position for the floating laboratory command dock.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <Card
            variant="interactive"
            onClick={() => setNavPosition('bottom')}
            className={`!p-4 !border-2 flex flex-col items-center gap-2 text-center transition-all ${
              navPosition === 'bottom'
                ? 'border-primary bg-primary/5 font-bold shadow-sm'
                : 'border-border bg-surface-low hover:border-primary/40'
            }`}
          >
            <PanelBottom className="w-6 h-6 text-primary" />
            <div>
              <div className="text-xs font-bold text-text">Bottom Dock</div>
              <div className="text-[10px] text-text-muted mt-0.5">Classic floating bar at bottom</div>
            </div>
          </Card>

          <Card
            variant="interactive"
            onClick={() => setNavPosition('top')}
            className={`!p-4 !border-2 flex flex-col items-center gap-2 text-center transition-all ${
              navPosition === 'top'
                ? 'border-primary bg-primary/5 font-bold shadow-sm'
                : 'border-border bg-surface-low hover:border-primary/40'
            }`}
          >
            <PanelTop className="w-6 h-6 text-primary" />
            <div>
              <div className="text-xs font-bold text-text">Top Command Bar</div>
              <div className="text-[10px] text-text-muted mt-0.5">Classic header navigation at top</div>
            </div>
          </Card>

          <Card
            variant="interactive"
            onClick={() => setNavPosition('right')}
            className={`!p-4 !border-2 flex flex-col items-center gap-2 text-center transition-all ${
              navPosition === 'right'
                ? 'border-primary bg-primary/5 font-bold shadow-sm'
                : 'border-border bg-surface-low hover:border-primary/40'
            }`}
          >
            <PanelRight className="w-6 h-6 text-primary" />
            <div>
              <div className="text-xs font-bold text-text">Right Side Dock</div>
              <div className="text-[10px] text-text-muted mt-0.5">Vertical dock on right edge</div>
            </div>
          </Card>

          <Card
            variant="interactive"
            onClick={() => setNavPosition('left')}
            className={`!p-4 !border-2 flex flex-col items-center gap-2 text-center transition-all ${
              navPosition === 'left'
                ? 'border-primary bg-primary/5 font-bold shadow-sm'
                : 'border-border bg-surface-low hover:border-primary/40'
            }`}
          >
            <PanelLeft className="w-6 h-6 text-primary" />
            <div>
              <div className="text-xs font-bold text-text">Left Sidebar Dock</div>
              <div className="text-[10px] text-text-muted mt-0.5">Vertical dock on left edge</div>
            </div>
          </Card>
        </div>
      </Card>

      {/* 3. User Account Profile Settings */}
      <Card variant="surface" className="flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <User className="w-5 h-5 text-secondary" />
          <div>
            <h3 className="text-sm font-bold text-text">Student Profile</h3>
            <span className="text-xs text-text-muted">
              Configure your displayed name and laboratory identity.
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveAccount} className="flex flex-col gap-3 pt-1 max-w-md">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          <div className="pt-2">
            <Button type="submit" size="md">
              Save Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* 4. Authoritative Account & Security Overview */}
      <Card variant="surface" className="flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-text">Account & Authorization Information</h3>
            <span className="text-xs text-text-muted">
              Server-enforced laboratory role, account status, and authentication security.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <Card variant="default" className="p-4 gap-1.5">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Account Role</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text capitalize">{currentUser?.role || 'student'}</span>
              <Badge role={(currentUser?.role as any) || 'student'} size="xs" />
            </div>
            <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
              Role permissions are verified cryptographically by backend session tokens.
            </p>
          </Card>

          <Card variant="default" className="p-4 gap-1.5">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Account State</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-emerald-400 capitalize">{currentUser?.status || 'active'}</span>
              <Badge variant="success" size="xs">
                Verified
              </Badge>
            </div>
            <p className="text-[10px] text-text-muted mt-1 truncate">
              {currentUser?.email || 'Authenticated User'}
            </p>
          </Card>

          <Card variant="default" className="p-4 gap-1.5">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Session Security</span>
            <span className="text-sm font-bold text-text">HttpOnly SameSite</span>
            <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
              Protected against XSS token harvesting. Authoritative Firebase ID token exchange.
            </p>
          </Card>
        </div>
      </Card>

      {/* 5. Keyboard Shortcuts Cheatsheet */}
      <Card variant="surface" className="flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Keyboard className="w-5 h-5 text-text-muted" />
          <div>
            <h3 className="text-sm font-bold text-text">Playground Keyboard Shortcuts</h3>
            <span className="text-xs text-text-muted">Speed up query execution and navigation.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-1">
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-low border border-border">
            <span className="text-text-muted">Execute MQL Query</span>
            <span className="bg-surface px-2.5 py-1 rounded-lg font-bold text-primary border border-border">
              Ctrl + Enter
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-low border border-border">
            <span className="text-text-muted">Format Query Code</span>
            <span className="bg-surface px-2.5 py-1 rounded-lg font-bold text-primary border border-border">
              Shift + Alt + F
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
