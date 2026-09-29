'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/lib/theme';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import { DatabaseCylinder3D } from '@/components/ui/DatabaseCylinder3D';
import { TeamFoundersSection } from '@/components/ui/TeamFoundersSection';
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
  Lock,
} from 'lucide-react';

export default function LandingPage() {
  const { theme, setTheme, availableThemes } = useTheme();
  const [activeTab, setActiveTab] = useState<'aggregate' | 'find' | 'update'>('aggregate');

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
      {/* Cinematic Deep Space Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1300px] h-[750px] bg-gradient-to-b from-primary/20 via-cyan-500/10 to-transparent blur-3xl -z-10 pointer-events-none rounded-full"></div>
      <div className="absolute top-1/3 -left-48 w-[450px] h-[450px] bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-2/3 -right-48 w-[450px] h-[450px] bg-secondary/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Floating Glass Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between z-20 relative">
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

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-text-muted">
            <a href="#lab-overview" className="hover:text-text transition-colors">
              Manifesto
            </a>
            <a href="#curriculum" className="hover:text-text transition-colors">
              Curriculum
            </a>
            <a href="#team" className="hover:text-text transition-colors">
              Team
            </a>
            <a href="#playground" className="hover:text-text transition-colors">
              Playground
            </a>
          </nav>

          <Link
            href="/login"
            className="px-4 py-2 rounded-full bg-surface-high hover:bg-surface-elevated text-text text-xs font-bold border border-border shadow-sm transition-all"
          >
            Sign In
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

      {/* HERO SECTION with 3D Animated Database Cylinder */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Bold Headline & Narrative */}
        <div className="lg:col-span-6 text-left flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-high border border-border shadow-sm mb-6 w-fit">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-semibold text-text">
              Mandatory MongoDB Subject Core · Local Compass Ready
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-6xl font-black tracking-tight leading-[1.08] text-text">
            Unlock collective <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-primary">
              database wisdom.
            </span>
          </h1>

          <div className="mt-4 text-xs font-mono font-bold uppercase tracking-widest text-text-muted">
            STOP FRAGMENTING LEARNING. START BUILDING.
          </div>

          <p className="mt-4 text-sm sm:text-base text-text-muted font-medium leading-relaxed max-w-xl">
            Plug into your personal virtual database laboratory. Query isolated MongoDB sandboxes,
            design schemas with visual ER modeling, and test real database logic with deterministic evaluations.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="px-7 py-3.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-extrabold shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 group scale-105 active:scale-100"
            >
              <span>ENTER VIRTUAL LAB</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/login"
              className="px-6 py-3.5 rounded-full bg-surface hover:bg-surface-high border border-border text-text text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-secondary" />
              <span>1-Click Google Sign-In</span>
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-4 text-xs text-text-muted">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Zero arbitrary code execution (AST parsed)</span>
            </div>
            <div className="h-3 w-px bg-border"></div>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-primary" />
              <span>Port 27017 Connected</span>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Animated Database Cylinder */}
        <div className="lg:col-span-6 flex items-center justify-center relative">
          <DatabaseCylinder3D />
        </div>
      </section>

      {/* SECTION 2: Problem & Narrative (Directly inspired by the Video) */}
      <section id="lab-overview" className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-text leading-snug">
          This is your database learning today: <br />
          <span className="text-text-muted font-normal">
            Countless fragments of critical knowledge scattered across disparate slides, broken local installations, and disconnected challenge websites.
          </span>
        </h2>
        <p className="mt-6 text-sm sm:text-base text-text-muted max-w-2xl mx-auto leading-relaxed">
          Students lose hours just struggling with MongoDB connection URIs, CLI tools, and theoretical diagrams that never connect to live collections. Data-Chan unifies the entire lifecycle in one virtual laboratory.
        </p>

        {/* Key Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 text-left">
          <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm">
            <div className="text-3xl font-black text-primary">100%</div>
            <div className="text-xs font-bold text-text mt-1">Real MongoDB Engine</div>
            <div className="text-[11px] text-text-muted mt-1 leading-relaxed">
              Official Node.js driver underneath isolated physical namespaces (`dc_ws_..._db_...`).
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm">
            <div className="text-3xl font-black text-secondary">0 eval()</div>
            <div className="text-xs font-bold text-text mt-1">Strict AST Security</div>
            <div className="text-[11px] text-text-muted mt-1 leading-relaxed">
              Pure Acorn AST parser and operator whitelists ensure complete sandbox safety.
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm">
            <div className="text-3xl font-black text-emerald-500">15 Lessons</div>
            <div className="text-xs font-bold text-text mt-1">Structured Academic Path</div>
            <div className="text-[11px] text-text-muted mt-1 leading-relaxed">
              From CRUD and projection to deep-dive aggregation stages ($match, $group, $sort).
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Interactive Live MQL Terminal */}
      <section id="playground" className="max-w-6xl mx-auto px-4 sm:px-6 mb-24">
        <div className="bg-surface border border-border rounded-3xl p-4 sm:p-6 shadow-2xl relative">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-border gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
              <span className="text-xs font-mono text-text-muted ml-2">
                mongodb://localhost:27017/CollegeDB/students
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
                  <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                    AST Safe
                  </span>
                </div>
                <pre className="text-text leading-relaxed whitespace-pre overflow-x-auto text-[13px]">
                  <code>{codeSnippets[activeTab].code}</code>
                </pre>
              </div>

              <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-text-muted font-sans">
                  Execute Shortcut: <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px]">Enter</kbd>
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

      {/* SECTION 4: OUR TEAM / FOUNDERS SECTION (From Video) */}
      <div id="team">
        <TeamFoundersSection />
      </div>

      {/* SECTION 5: Core Laboratory Pillars */}
      <section id="curriculum" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-text">
            Engineered for Database Mastery
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
                Interactive React Flow canvas with freely resizable boxes. Teaches embedding vs referencing,
                runs deterministic rule checks, and generates live MongoDB collections.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 mt-6">
              <span>Open Modeler</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 6: Compass Native */}
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

      {/* BOTTOM CLIMAX CALL TO ACTION (From Video) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center relative">
        <div className="w-64 h-64 mx-auto bg-primary/20 rounded-full blur-3xl absolute inset-0 pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-text leading-tight">
            Your laboratory has the answer. <br />
            Enter DATA-CHAN to master it.
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-text-muted max-w-lg mx-auto">
            Designed for college faculty curriculum requirements and real-world database mastery.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-4 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-extrabold shadow-2xl transition-all scale-105 active:scale-100 flex items-center gap-2"
            >
              <span>REQUEST ACCESS / ENTER LAB</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-4">
        <div>
          <span className="font-bold text-text">DATA-CHAN</span> · Virtual Database Lab © 2026
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
