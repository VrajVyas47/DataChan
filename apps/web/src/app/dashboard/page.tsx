'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  UserProfile,
  VirtualDatabase,
  QueryHistoryItem,
  Lesson,
} from '@datachan/shared-types';
import {
  Database,
  Terminal,
  BookOpen,
  Trophy,
  Boxes,
  ArrowRight,
  Folder,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [databases, setDatabases] = useState<VirtualDatabase[]>([]);
  const [recentQueries, setRecentQueries] = useState<QueryHistoryItem[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [me, dbs, history, allLessons] = await Promise.all([
          api.getMe(),
          api.listDatabases(),
          api.getQueryHistory(5),
          api.listLessons(),
        ]);
        setProfile(me);
        setDatabases(dbs);
        setRecentQueries(history);
        setLessons(allLessons);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-text-muted">Loading your virtual laboratory...</span>
        </div>
      </div>
    );
  }

  const activeDb = databases.find((d) => d.id === profile?.activeDatabaseId) || databases[0];
  const completedLessonsCount = profile?.lessonsCompletedCount || 0;
  const progressPercent = Math.min(100, Math.round((completedLessonsCount / (lessons.length || 1)) * 100));

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Welcome & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-main">
            Welcome back, {profile?.displayName || profile?.username || 'Student'}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Data-Chan Virtual Database Lab &bull; Learn By Building And Learn By Querying
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Open Workspace</span>
          </Link>
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-high hover:bg-surface-low text-text-main text-xs font-bold transition-all border border-border"
          >
            <Terminal className="w-4 h-4" />
            <span>Playground</span>
          </Link>
        </div>
      </div>

      {/* Main 12-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-start">
        {/* LEFT COLUMN: Hero Feature + Metrics (Span 4) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Hero Feature Card */}
          <div className="relative overflow-hidden bg-primary text-white rounded-2xl p-6 shadow-md flex flex-col justify-between min-h-[280px]">
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold tracking-wider uppercase mb-3">
                <Sparkles className="w-3.5 h-3.5 text-secondary" />
                <span>MongoDB MQL Lab</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight leading-tight">
                Mastering Document Queries
              </h2>
              <p className="text-xs text-white/80 mt-2 leading-relaxed">
                Execute safe queries, design flexible BSON models, and solve interactive database challenges.
              </p>
            </div>

            <div className="flex items-end justify-between mt-6 pt-2">
              <Link
                href="/learn"
                className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white text-primary hover:scale-105 transition-transform shadow-md group"
              >
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <div className="text-right">
                <span className="text-[11px] font-mono text-white/70 block uppercase">Curriculum</span>
                <span className="text-sm font-bold text-white">
                  {completedLessonsCount} of {lessons.length} Completed
                </span>
              </div>
            </div>
          </div>

          {/* Dual Metrics Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-low rounded-xl p-4 flex flex-col justify-between border border-border/60 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-full bg-secondary-container/20 text-secondary flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Databases
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-text-main font-mono">
                  {databases.length}
                </span>
                <p className="text-xs text-text-muted mt-0.5 font-medium">Virtual Databases</p>
              </div>
            </div>

            <div className="bg-surface-low rounded-xl p-4 flex flex-col justify-between border border-border/60 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-full bg-primary-fixed/20 text-primary flex items-center justify-center">
                  <Terminal className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Queries
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-text-main font-mono">
                  {profile?.queriesExecutedCount || 0}
                </span>
                <p className="text-xs text-text-muted mt-0.5 font-medium">Queries Executed</p>
              </div>
            </div>
          </div>

          {/* Active Database Card */}
          <div className="bg-inverse-surface text-inverse-text rounded-2xl p-5 shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse"></span>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-tertiary-fixed">
                  Active Sandbox DB
                </span>
              </div>
              <span className="text-[11px] font-mono text-text-muted">MongoDB 6.0</span>
            </div>

            {activeDb ? (
              <div>
                <h3 className="text-lg font-bold text-white">{activeDb.name}</h3>
                <p className="text-xs text-inverse-text/70 mt-0.5">
                  Namespace: <span className="font-mono text-[11px]">{activeDb.physicalNamespace}</span>
                </p>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="font-bold text-white font-mono">{activeDb.collectionsCount || 0}</span>{' '}
                    <span className="text-inverse-text/60">collections</span>
                  </div>
                  <div>
                    <span className="font-bold text-white font-mono">{activeDb.totalDocumentsCount || 0}</span>{' '}
                    <span className="text-inverse-text/60">documents</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-inverse-text/60">
                No active database selected. Create one in your workspace.
              </div>
            )}
          </div>
        </div>

        {/* CENTER / RIGHT: Learning Progress + Recent Queries + Quick Nav (Span 8) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* Learning Progress Banner */}
          <div className="bg-surface-low rounded-2xl p-5 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-main">MongoDB Core Curriculum</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  15 step-by-step interactive lessons from basic documents to advanced aggregation pipelines.
                </p>
                <div className="w-full sm:w-64 bg-surface-high h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <Link
              href="/learn"
              className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shrink-0"
            >
              Continue Learning
            </Link>
          </div>

          {/* Quick Laboratory Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/workspace"
              className="bg-surface rounded-xl p-4 border border-border hover:border-primary/50 hover:shadow-soft transition-all group flex flex-col justify-between"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-bold text-text-main group-hover:text-primary transition-colors">
                  Database Explorer
                </h4>
                <p className="text-xs text-text-muted mt-1">
                  Manage collections, browse documents, inspect detected schemas.
                </p>
              </div>
            </Link>

            <Link
              href="/challenges"
              className="bg-surface rounded-xl p-4 border border-border hover:border-secondary/50 hover:shadow-soft transition-all group flex flex-col justify-between"
            >
              <div className="w-10 h-10 rounded-full bg-secondary-container/20 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-bold text-text-main group-hover:text-secondary transition-colors">
                  Query Challenges
                </h4>
                <p className="text-xs text-text-muted mt-1">
                  Solve deterministic practice challenges across Easy, Medium, and Hard tiers.
                </p>
              </div>
            </Link>

            <Link
              href="/modeler"
              className="bg-surface rounded-xl p-4 border border-border hover:border-tertiary/50 hover:shadow-soft transition-all group flex flex-col justify-between"
            >
              <div className="w-10 h-10 rounded-full bg-tertiary-container/20 text-tertiary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Boxes className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-bold text-text-main group-hover:text-tertiary transition-colors">
                  ER / Data Modeler
                </h4>
                <p className="text-xs text-text-muted mt-1">
                  Visual canvas to design MongoDB models and push structure into workspace.
                </p>
              </div>
            </Link>
          </div>

          {/* Recent Query History Card */}
          <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text-main">Recent Laboratory Queries</h3>
              </div>
              <Link
                href="/playground"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Open Playground &rarr;
              </Link>
            </div>

            {recentQueries.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center gap-2">
                <Clock className="w-8 h-8 text-text-muted/40" />
                <span className="text-xs font-medium text-text-muted">
                  No queries executed yet. Open Mongo Playground to run your first MQL query!
                </span>
                <Link
                  href="/playground"
                  className="mt-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                >
                  Go to Playground
                </Link>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/60">
                {recentQueries.map((q) => (
                  <div key={q.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          q.success ? 'bg-tertiary' : 'bg-error'
                        }`}
                      ></div>
                      <code className="text-xs font-mono text-text-main truncate max-w-[280px] sm:max-w-[420px]">
                        {q.rawQuery}
                      </code>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-text-muted">
                      <span>{q.durationMs}ms</span>
                      <span className="hidden sm:inline bg-surface-high px-2 py-0.5 rounded-full">
                        {q.documentsReturned} docs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
