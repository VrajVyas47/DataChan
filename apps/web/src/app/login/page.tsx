'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  resetPassword,
  isFirebaseClientConfigured,
} from '@/lib/firebase';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import {
  Database,
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('from') || '/dashboard';

  const [mode, setMode] = useState<'signin' | 'register' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDevPanel, setShowDevPanel] = useState(false);

  const isConfigured = isFirebaseClientConfigured();
  const isDevMode = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEV_DEMO === 'true';

  // Demo accounts for local development and institutional evaluator demonstration
  const devDemoPersonas = [
    {
      label: 'Student Researcher',
      email: process.env.NEXT_PUBLIC_DEMO_STUDENT_EMAIL || 'student@datachan.org',
      password: process.env.NEXT_PUBLIC_DEMO_PASSWORD || '',
      badge: 'Student',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    {
      label: 'Faculty Instructor',
      email: process.env.NEXT_PUBLIC_DEMO_FACULTY_EMAIL || 'faculty@datachan.org',
      password: process.env.NEXT_PUBLIC_DEMO_PASSWORD || '',
      badge: 'Faculty',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    },
    {
      label: 'Platform Administrator',
      email: process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL || 'admin@datachan.org',
      password: process.env.NEXT_PUBLIC_DEMO_PASSWORD || '',
      badge: 'Admin',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
  ];

  const handlePreFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setSuccessMessage('Demo credentials prefilled. Click "Sign In" to authenticate with the server.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email) {
      setError('Please provide a valid email address.');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        await resetPassword(email);
        setSuccessMessage('Password reset instructions have been sent to your email.');
      } catch (err: any) {
        setError(err.message || 'Unable to send password reset email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 8) {
        setError('Password must contain at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        // 1. Authenticate with Firebase Client SDK
        const { token } = await loginWithEmail(email, password);
        // 2. Exchange Firebase ID Token for authoritative HttpOnly session cookie
        await api.createSession(token);
        router.push(returnTo);
      } else if (mode === 'register') {
        // 1. Register with Firebase Client SDK
        const { token } = await registerWithEmail(email, password, displayName);
        // 2. Exchange Firebase ID Token for authoritative HttpOnly session cookie
        await api.createSession(token, displayName);
        router.push(returnTo);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const { token } = await loginWithGoogle();
      await api.createSession(token);
      router.push(returnTo);
    } catch (err: any) {
      setError(err.message || 'Google authentication was not completed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* Brand / Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/10 group-hover:bg-white group-hover:text-black transition-all">
              <AnimatedIcon icon={Database} size={24} className="text-white group-hover:text-black" animation="bounce" />
            </div>
            <div className="text-left">
              <span className="font-barlow font-black text-2xl tracking-tight block text-white">DATA-CHAN</span>
              <span className="text-[11px] font-montserrat text-white/50 uppercase tracking-wider">Virtual Database Lab</span>
            </div>
          </Link>
          <h1 className="font-barlow font-black text-3xl tracking-tight text-white uppercase">
            {mode === 'signin' && 'ACCESS YOUR LABORATORY'}
            {mode === 'register' && 'CREATE RESEARCHER ACCOUNT'}
            {mode === 'forgot' && 'RESET YOUR PASSWORD'}
          </h1>
          <p className="text-xs font-montserrat text-white/60 mt-1.5">
            {mode === 'signin' && 'Sign in to access your isolated virtual MongoDB sandboxes and AST engines.'}
            {mode === 'register' && 'Join the virtual database laboratory. Accounts begin as Student Researcher.'}
            {mode === 'forgot' && 'Enter your email to receive recovery instructions.'}
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-[#0c0d12] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Mode Switcher */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.04] rounded-2xl mb-6 text-xs font-bold border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 px-3 rounded-xl transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-black shadow-sm font-extrabold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 px-3 rounded-xl transition-all ${
                  mode === 'register'
                    ? 'bg-white text-black shadow-sm font-extrabold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Feedback Banners */}
          {error && (
            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {mode === 'register' && (
              <div>
                <label className="text-[11px] font-bold text-white/50 uppercase mb-1 block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alice Johnson"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-white/50 uppercase mb-1 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@university.edu"
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-white/40 transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-white/50 uppercase block">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] text-white/40 hover:text-white transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-white/40 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="text-[11px] font-bold text-white/50 uppercase mb-1 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 bg-white hover:bg-white/90 text-black rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signin' && 'Sign In'}
                    {mode === 'register' && 'Create Account'}
                    {mode === 'forgot' && 'Send Reset Email'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-white/60 hover:text-white text-center mt-2 underline"
              >
                Back to Sign In
              </button>
            )}
          </form>

          {/* Institutional / Evaluator Personas (Dev & Hackathon Showcase) */}
          {isDevMode && (
            <div className="mt-6 pt-5 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowDevPanel(!showDevPanel)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-white/50 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lab Evaluator Personas</span>
                </span>
                {showDevPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDevPanel && (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-[10px] text-white/40 leading-relaxed mb-1">
                    Click to prefill verified institutional test accounts. Authenticates via standard session exchange:
                  </p>
                  {devDemoPersonas.map((p) => (
                    <button
                      key={p.email}
                      type="button"
                      onClick={() => handlePreFill(p.email, p.password)}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 text-left flex items-center justify-between transition-all hover:bg-white/[0.04]"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{p.label}</div>
                        <div className="text-[10px] text-white/40 font-mono">{p.email}</div>
                      </div>
                      <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border ${p.badgeColor}`}>
                        {p.badge}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-white/40 mt-6">
          <Link href="/" className="hover:text-white transition-colors">
            ← Back to Virtual Lab Overview
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050608] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
