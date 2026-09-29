'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/lib/theme';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import {
  Database,
  Terminal,
  BookOpen,
  Trophy,
  Boxes,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Code2,
  Cpu,
  Layers,
  Zap,
  Play,
  Palette,
  ExternalLink,
} from 'lucide-react';

export default function LandingPage() {
  const { theme, setTheme, availableThemes } = useTheme();
  const [activeTab, setActiveTab] = useState<'find' | 'aggregate' | 'update'>('aggregate');

  const codeSnippets = {
    aggregate: {
      title: 'MQL Aggregation Pipeline',
      code: `db.students.aggregate([
  { $match: { "department": "CS", "gpa": { "$gte": 3.5 } } },
  { $group: { 
      "_id": "$year", 
      "honorRoll": { "$sum": 1 }, 
      "avgGpa": { "$avg": "$gpa" } 
    } 
  },
  { $sort: { "avgGpa": -1 } }
])`,
      output: `[
  { "_id": "Senior", "honorRoll": 14, "avgGpa": 3.88 },
  { "_id": "Junior", "honorRoll": 21, "avgGpa": 3.74 },
  { "_id": "Sophomore", "honorRoll": 18, "avgGpa": 3.65 }
]`,
      stats: '3 docs returned in 1.4ms (COLLSCAN)',
    },
    find: {
      title: 'MQL Filtering with Query Operators',
      code: `db.students.find(
  { 
    "department": "CS", 
    "age": { "$gt": 20 },
    "skills": { "$in": ["MongoDB", "TypeScript"] }
  },
  { "name": 1, "department": 1, "gpa": 1, "_id": 0 }
).sort({ "gpa": -1 }).limit(3)`,
      output: `[
  { "name": "Jay Patel", "department": "CS", "gpa": 3.92 },
  { "name": "Ananya Roy", "department": "CS", "gpa": 3.85 },
  { "name": "Rohit Verma", "department": "CS", "gpa": 3.71 }
]`,
      stats: '3 docs matched in 0.8ms',
    },
    update: {
      title: 'MQL Document Mutations',
      code: `db.students.updateMany(
  { "gpa": { "$gte": 3.8 } },
  { 
    "$set": { "academicStanding": "Dean's List" },
    "$inc": { "creditsEarned": 3 }
  }
)`,
      output: `{
  "acknowledged": true,
  "matchedCount": 8,
  "modifiedCount": 8
}`,
      stats: '8 docs updated atomically',
    },
  };

  return (
    <div className="min-h-screen bg-background text-text selection:bg-primary selection:text-white relative overflow-hidden pb-24">
      {/* Dynamic Background Ambient Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-primary/15 via-secondary/10 to-transparent blur-3xl -z-10 pointer-events-none rounded-full"></div>
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-2/3 -right-48 w-96 h-96 bg-secondary/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Floating Glass Bar */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">
            <AnimatedIcon icon={Database} size={22} className="text-white" animation="bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-tight text-text">DATA-CHAN</span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                v1.0 LAB
              </span>
            </div>
            <span className="text-[11px] text-text-muted">Virtual Database Lab</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Quick Switcher */}
          <div className="hidden sm:flex items-center gap-1 bg-surface border border-border rounded-full p-1 shadow-sm">
            {availableThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`w-5 h-5 rounded-full border transition-transform ${
                  theme === t.id ? 'ring-2 ring-primary scale-110' : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: t.primaryHex }}
                title={`Switch to ${t.name}`}
              />
            ))}
          </div>

          <Link
            href="/login"
            className="px-4 py-2 rounded-full bg-surface-high hover:bg-surface-elevated text-text text-xs font-bold border border-border shadow-sm transition-all"
          >
            Sign In / Personas
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
          >
            <span>Enter Lab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        {/* Academic Faculty Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-high border border-border shadow-sm mb-6">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs font-semibold text-text">
            Mandatory MongoDB Curriculum Core · Real Engine Sandboxing
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight max-w-5xl mx-auto leading-[1.1] text-text">
          Learn By Building. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary">
            Learn By Querying.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg md:text-xl text-text-muted max-w-3xl mx-auto font-medium leading-relaxed">
          The all-in-one Virtual Database Laboratory. Stop fragmenting your learning between slides,
          terminals, and challenge websites. Model MongoDB schemas, query isolated sandboxes, and receive
          deterministic evaluations.
        </p>

        {/* CTA Group */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-extrabold shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 group scale-105 active:scale-100"
          >
            <span>Launch Virtual Lab</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/playground"
            className="px-6 py-4 rounded-2xl bg-surface hover:bg-surface-high border border-border text-text text-sm font-bold shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <Terminal className="w-4 h-4 text-primary" />
            <span>Open Mongo Playground</span>
          </Link>

          <Link
            href="/login"
            className="px-6 py-4 rounded-2xl bg-surface hover:bg-surface-high border border-border text-text text-sm font-bold shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-secondary" />
            <span>1-Click Google Login</span>
          </Link>
        </div>

        {/* Security Pillars Bar */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-text-muted font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Pure AST Parser (Zero eval/vm execution)</span>
          </div>
          <div className="h-3 w-px bg-border hidden sm:block"></div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-primary" />
            <span>Physical Namespace Isolation (dc_ws_..._db_...)</span>
          </div>
          <div className="h-3 w-px bg-border hidden sm:block"></div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-secondary" />
            <span>Official MongoDB Node.js Driver & Compass Ready</span>
          </div>
        </div>
      </section>

      {/* Interactive Live Playground Showcase */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-24">
        <div className="bg-surface border border-border rounded-3xl p-4 sm:p-6 shadow-2xl relative">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-border gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
              <span className="text-xs font-mono text-text-muted ml-2">
                sandbox://datachan.local/CollegeDB/students
              </span>
            </div>

            {/* Pipeline Tabs */}
            <div className="flex items-center gap-1 bg-surface-high p-1 rounded-xl text-xs font-bold">
              {(['aggregate', 'find', 'update'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg transition-all capitalize ${
                    activeTab === tab
                      ? 'bg-surface text-primary shadow-sm font-extrabold'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  {tab === 'aggregate' ? 'Aggregation Pipeline' : tab === 'find' ? 'MQL Filtering' : 'Atomic Mutation'}
                </button>
              ))}
            </div>
          </div>

          {/* Code & Result Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 font-mono text-xs">
            {/* Editor Pane */}
            <div className="bg-surface-high/60 rounded-2xl p-4 border border-border/80 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-text-muted uppercase mb-2 flex items-center justify-between">
                  <span>MQL Input ({codeSnippets[activeTab].title})</span>
                  <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    AST Safe
                  </span>
                </div>
                <pre className="text-text leading-relaxed whitespace-pre overflow-x-auto text-[13px]">
                  <code>{codeSnippets[activeTab].code}</code>
                </pre>
              </div>

              <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-text-muted font-sans">
                  Shortcut: <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px]">Enter</kbd>
                </span>
                <Link
                  href="/playground"
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-sans font-bold flex items-center gap-1 hover:bg-primary-hover shadow-sm"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run Live in Playground</span>
                </Link>
              </div>
            </div>

            {/* Structured Result Pane */}
            <div className="bg-surface-high/60 rounded-2xl p-4 border border-border/80 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-text-muted uppercase mb-2 flex items-center justify-between">
                  <span>Normalized Execution Output</span>
                  <span className="text-[10px] text-text-muted font-mono">
                    {codeSnippets[activeTab].stats}
                  </span>
                </div>
                <pre className="text-emerald-600 dark:text-emerald-400 leading-relaxed whitespace-pre overflow-x-auto text-[13px]">
                  <code>{codeSnippets[activeTab].output}</code>
                </pre>
              </div>

              <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-[11px] text-text-muted font-sans">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Deterministic Execution Validated</span>
                </span>
                <span className="font-mono">HTTP 200 OK</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Core Laboratory Modules */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-text">
            The Complete Database Laboratory
          </h2>
          <p className="text-text-muted text-sm sm:text-base mt-2 max-w-2xl mx-auto">
            Everything students and developers need to learn, design, query, and evaluate MongoDB systems.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Virtual Workspace */}
          <Link
            href="/workspace"
            className="group bg-surface hover:bg-surface-elevated border border-border rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <AnimatedIcon icon={Database} size={24} animation="bounce" />
              </div>
              <h3 className="text-lg font-extrabold text-text group-hover:text-primary transition-colors">
                Virtual Database Workspace
              </h3>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                Create user-owned virtual databases and collections. Manage documents via high-density
                Card, Table, and JSON views with automatic field schema detection.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-primary mt-6">
              <span>Open Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Monaco Playground */}
          <Link
            href="/playground"
            className="group bg-surface hover:bg-surface-elevated border border-border rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <AnimatedIcon icon={Terminal} size={24} animation="scale" />
              </div>
              <h3 className="text-lg font-extrabold text-text group-hover:text-secondary transition-colors">
                MongoDB Playground
              </h3>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                Developer-grade Monaco Editor with real MQL syntax highlighting, query history audit,
                real latency execution stats, and beginner syntax breakdowns.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-secondary mt-6">
              <span>Launch Playground</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Interactive Curriculum */}
          <Link
            href="/learn"
            className="group bg-surface hover:bg-surface-elevated border border-border rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <AnimatedIcon icon={BookOpen} size={24} animation="pulse" />
              </div>
              <h3 className="text-lg font-extrabold text-text group-hover:text-emerald-600 transition-colors">
                15-Lesson Curriculum
              </h3>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                Structured academic path covering MongoDB Basics, Documents, CRUD, Comparison Operators,
                Projections, and deep-dive Aggregation stages ($match, $group, $sort).
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-6">
              <span>Start Learning</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Deterministic Challenges */}
          <Link
            href="/challenges"
            className="group bg-surface hover:bg-surface-elevated border border-border rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <AnimatedIcon icon={Trophy} size={24} animation="wiggle" />
              </div>
              <h3 className="text-lg font-extrabold text-text group-hover:text-amber-600 transition-colors">
                Challenge System & XP
              </h3>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                Solve real database practice tasks. Automated deterministic test-runner compares results
                against controlled datasets with instant feedback and student XP level-ups.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 mt-6">
              <span>Attempt Challenges</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 5: React Flow ER Modeler */}
          <Link
            href="/modeler"
            className="group bg-surface hover:bg-surface-elevated border border-border rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <AnimatedIcon icon={Boxes} size={24} animation="spin" />
              </div>
              <h3 className="text-lg font-extrabold text-text group-hover:text-cyan-600 transition-colors">
                Visual ER & Data Modeler
              </h3>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                Interactive React Flow canvas designed specifically for document modeling. Teaches embedding
                vs referencing, runs deterministic rule checks, and generates live MongoDB collections.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 mt-6">
              <span>Open Modeler</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 6: Compass & Local Tooling */}
          <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <AnimatedIcon icon={Cpu} size={24} animation="bounce" />
              </div>
              <h3 className="text-lg font-extrabold text-text">
                MongoDB Compass Native
              </h3>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                Connect your local MongoDB Compass directly to <code className="font-mono text-primary font-bold">mongodb://localhost:27017</code>.
                All collections and documents update simultaneously in real time.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Port 27017 Listening</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-4">
        <div>
          <span className="font-bold text-text">DATA-CHAN</span> · Virtual Database Lab
        </div>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="hover:text-text transition-colors">
            Dashboard
          </Link>
          <Link href="/workspace" className="hover:text-text transition-colors">
            Workspace
          </Link>
          <Link href="/playground" className="hover:text-text transition-colors">
            Playground
          </Link>
          <Link href="/learn" className="hover:text-text transition-colors">
            Curriculum
          </Link>
          <Link href="/settings" className="hover:text-text transition-colors">
            Theme Mixer
          </Link>
        </div>
      </footer>
    </div>
  );
}
