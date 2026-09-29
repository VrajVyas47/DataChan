'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import {
  Database,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Code2,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Users,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'developer' | 'google' | 'email'>('developer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The 3 official development testing personas
  const testPersonas = [
    {
      id: 'fresh_onboard',
      name: 'Fresh Onboard',
      email: 'fresh@data-chan.edu',
      role: 'Newly Onboarded Student',
      desc: '0 XP, fresh sandbox, empty collections. Ideal for testing initial onboarding & first challenges.',
      avatar: '🌱',
      color: 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500',
    },
    {
      id: 'prof_sharma',
      name: 'Professor Sharma',
      email: 'sharma@faculty.data-chan.edu',
      role: 'CS Faculty / Instructor',
      desc: '3,200 XP, 42-day streak. Evaluator view with curriculum inspection & challenge evaluation.',
      avatar: '🎓',
      color: 'border-secondary/40 bg-secondary/5 hover:border-secondary',
    },
    {
      id: 'vraj_dev',
      name: 'Vraj',
      email: 'vraj@data-chan.edu',
      role: 'Student / Lead Developer',
      desc: '1,850 XP, 14-day streak. Active CollegeDB workspace with AST sandboxes and verified queries.',
      avatar: '👨‍💻',
      color: 'border-primary/40 bg-primary/5 hover:border-primary',
    },
  ];

  const handleDeveloperPersonaSelect = async (persona: { id: string; name: string; email: string; role: string }) => {
    setLoading(true);
    setError(null);
    try {
      api.setDevUser(persona.id, persona.email, persona.name, persona.role);
      api.setToken(`token_${persona.id}`);
      await api.syncUser({ displayName: persona.name });
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const googleUid = `google_${Date.now()}`;
      const userEmail = 'scholar.student@gmail.com';
      const name = 'Google Scholar Explorer';
      api.setDevUser(googleUid, userEmail, name, 'Google Authenticated Explorer');
      api.setToken(`token_${googleUid}`);
      await api.syncUser({ displayName: name });
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide an email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await api.login(email, password);
      await api.syncUser({ displayName: displayName || email.split('@')[0] });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg z-10">
        {/* Header / Brand */}
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
          <h1 className="font-barlow font-black text-3xl sm:text-4xl tracking-tight text-white uppercase">
            SIGN IN TO YOUR LABORATORY
          </h1>
          <p className="text-xs sm:text-sm font-montserrat text-white/60 mt-2">
            Select a development identity or sign in to access isolated MongoDB sandboxes.
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-[#0c0d12] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/[0.04] rounded-2xl mb-6 text-xs font-bold border border-white/5">
            <button
              onClick={() => setActiveTab('developer')}
              className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'developer'
                  ? 'bg-white text-black shadow-sm font-extrabold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Select User</span>
            </button>
            <button
              onClick={() => setActiveTab('google')}
              className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'google'
                  ? 'bg-white text-black shadow-sm font-extrabold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Google</span>
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'email'
                  ? 'bg-white text-black shadow-sm font-extrabold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>
          </div>

          {error && (
            <div className="p-3 mb-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* TAB 1: 3 DEVELOPMENT / DEMO IDENTITIES */}
          {activeTab === 'developer' && (
            <div className="flex flex-col gap-3">
              <div className="text-[11px] text-white/50 uppercase tracking-wider font-semibold mb-1">
                Select an Authorized Development Persona:
              </div>

              {testPersonas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleDeveloperPersonaSelect(p)}
                  disabled={loading}
                  className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${p.color}`}
                >
                  <span className="text-2xl shrink-0 mt-0.5">{p.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white truncate">{p.name}</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">
                        {p.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/40 font-mono mt-0.5">{p.email}</div>
                    <p className="text-[11px] text-white/60 mt-1 leading-relaxed">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* TAB 2: GOOGLE SIGN-IN */}
          {activeTab === 'google' && (
            <div className="flex flex-col gap-4 text-center py-2">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Google OAuth Authentication</div>
                  <div className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                    Development Environment: Connects using simulated Google identity to test authentication without requiring external cloud project configuration.
                  </div>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-white hover:bg-white/90 rounded-2xl flex items-center justify-center gap-3 text-sm font-bold text-black shadow-md transition-all active:scale-[0.99]"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-white/40 mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero password storage in MongoDB. Firebase ID token validation compatible.</span>
              </div>
            </div>
          )}

          {/* TAB 3: EMAIL / PASSWORD WITH DEV CREDENTIALS */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-3.5">
              {/* Local Dev Demo Account Banner */}
              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Local Development Demo Credentials</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(process.env.NEXT_PUBLIC_DEMO_USER_EMAIL || 'demo@data-chan.local');
                      setPassword(process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD || 'DataChan@2026!');
                    }}
                    className="text-[10px] font-bold text-cyan-300 hover:text-cyan-200 underline"
                  >
                    Quick Fill
                  </button>
                </div>
                <div className="text-[11px] text-white/60 font-mono leading-tight">
                  Email: <span className="text-white font-bold">{process.env.NEXT_PUBLIC_DEMO_USER_EMAIL || 'demo@data-chan.local'}</span><br />
                  Password: <span className="text-white font-bold">{process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD || 'DataChan@2026!'}</span>
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className="text-[11px] font-bold text-white/50 uppercase mb-1 block">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Vraj Patel"
                      className="w-full h-11 pl-10 pr-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-white/40"
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="developer@college.edu"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-white/40"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-white/50 uppercase mb-1 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-white/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-2 bg-white hover:bg-white/90 text-black rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
              >
                <span>{loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-xs text-white/70 hover:text-white font-semibold underline"
                >
                  {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
                </button>
              </div>
            </form>
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
