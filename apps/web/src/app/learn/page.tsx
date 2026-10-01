'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Lesson } from '@datachan/shared-types';
import {
  BookOpen,
  CheckCircle2,
  Lock,
  Play,
  ArrowRight,
  Clock,
  Sparkles,
  Trophy,
  Terminal,
  ChevronRight,
  Award,
} from 'lucide-react';

export default function LearnPage() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [practiceCode, setPracticeCode] = useState('');
  const [practiceResult, setPracticeResult] = useState<any | null>(null);
  const [practicing, setPracticing] = useState(false);
  const [claimedXp, setClaimedXp] = useState<number | null>(null);

  useEffect(() => {
    async function loadLessons() {
      try {
        const list = await api.listLessons();
        setLessons(list);
        if (list.length > 0) {
          selectLesson(list[0]);
        }
      } catch (err) {
        console.error('Failed to load lessons:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLessons();
  }, []);

  function selectLesson(lesson: any) {
    setSelectedLesson(lesson);
    setPracticeCode(lesson.starterPracticeQuery || lesson.exampleQuery);
    setPracticeResult(null);
    setClaimedXp(null);
  }

  async function handleRunPractice() {
    if (!selectedLesson || !practiceCode.trim()) return;
    setPracticing(true);
    setPracticeResult(null);
    try {
      const res = await api.runPractical(selectedLesson.id, practiceCode.trim());
      setPracticeResult({
        data: res.result,
        documentsCount: res.documentsCount,
        executionTimeMs: res.executionTimeMs,
        targetDatabase: res.targetDatabase,
        collection: res.collection,
        syntaxBreakdown: res.syntaxBreakdown,
      });

      if (res.xpAwarded && res.xpAwarded > 0) {
        setClaimedXp(res.xpAwarded);
      }

      // Mark lesson as completed in state
      setSelectedLesson((prev: any) => (prev ? { ...prev, completed: true } : null));
      setLessons((prev) =>
        prev.map((l) => (l.id === selectedLesson.id ? { ...l, completed: true } : l))
      );
    } catch (err: any) {
      setPracticeResult({ error: err.message || 'Execution error during practical' });
    } finally {
      setPracticing(false);
    }
  }

  async function handleMarkComplete() {
    if (!selectedLesson) return;
    try {
      const res = await api.completeLesson(selectedLesson.id);
      if (res.xpAwarded > 0) {
        setClaimedXp(res.xpAwarded);
      }
      // Refresh list
      const updatedList = await api.listLessons();
      setLessons(updatedList);
      setSelectedLesson({ ...selectedLesson, completed: true });
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-text-muted">Loading curriculum...</span>
        </div>
      </div>
    );
  }

  const completedCount = lessons.filter((l) => l.completed).length;

  return (
    <div className="flex flex-col gap-6 w-full flex-1">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-main flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-primary" />
            <span>MongoDB Curriculum &bull; Learn Mode</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Master NoSQL databases with hands-on conceptual lessons, code walkthroughs, and instant practice queries.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-surface-low px-4 py-2 rounded-full border border-border">
          <Award className="w-5 h-5 text-secondary" />
          <div className="text-xs">
            <span className="font-bold text-text-main font-mono">{completedCount}</span> /{' '}
            <span className="text-text-muted font-mono">{lessons.length}</span> Lessons Completed
          </div>
        </div>
      </div>

      {/* 2-Column Master Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Lesson Roadmap Catalogue (~35%)                              */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Roadmap
            </span>
            <span className="text-[11px] font-mono font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-full">
              15 Modules
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-[680px] overflow-y-auto pr-1">
            {lessons.map((lesson) => {
              const isSelected = selectedLesson?.id === lesson.id;
              return (
                <div
                  key={lesson.id}
                  onClick={() => selectLesson(lesson)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all border flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-md scale-[1.01]'
                      : lesson.completed
                      ? 'bg-surface-low hover:bg-surface-high border-tertiary-container/30 text-text-main'
                      : 'bg-surface hover:bg-surface-high border-border text-text-main'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : lesson.completed
                          ? 'bg-tertiary-container/20 text-tertiary'
                          : 'bg-surface-high text-text-muted'
                      }`}
                    >
                      {lesson.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-tertiary" />
                      ) : (
                        lesson.order
                      )}
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold truncate leading-snug">{lesson.title}</h4>
                      <span
                        className={`text-[10px] font-mono ${
                          isSelected ? 'text-white/80' : 'text-text-muted'
                        }`}
                      >
                        {lesson.category} &bull; {lesson.estimatedMinutes}m
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-secondary-container/20 text-secondary'
                    }`}
                  >
                    +{lesson.xpReward} XP
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Active Lesson Reader & Interactive Practice (~65%)          */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {selectedLesson && (
            <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-6">
              {/* Lesson Title & Completion CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-primary-fixed text-primary px-2 py-0.5 rounded-full">
                      Module {selectedLesson.order} &bull; {selectedLesson.category}
                    </span>
                    <span className="text-xs font-mono text-text-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedLesson.estimatedMinutes} mins
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-text-main">
                    {selectedLesson.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {selectedLesson.completed ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tertiary-container/20 text-tertiary text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Lesson Completed</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleMarkComplete}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Complete (+{selectedLesson.xpReward} XP)</span>
                    </button>
                  )}
                </div>
              </div>

              {claimedXp && (
                <div className="bg-secondary-container/20 border border-secondary text-secondary p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Congratulations! You earned +{claimedXp} XP for completing this lesson!</span>
                </div>
              )}

              {/* Lesson Concept Body */}
              <div className="prose prose-sm max-w-none text-text-main text-xs sm:text-sm leading-relaxed space-y-4">
                <div className="whitespace-pre-wrap font-sans bg-surface-low/50 p-4 rounded-xl border border-border">
                  {selectedLesson.conceptMarkdown}
                </div>
              </div>

              {/* Code Example Preview */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Syntax Example
                </span>
                <pre className="p-3.5 rounded-xl bg-inverse-surface text-inverse-text font-mono text-xs overflow-x-auto border border-white/10 shadow-inner">
                  {selectedLesson.exampleQuery}
                </pre>
              </div>

              {/* Interactive Practice Sandbox */}
              <div className="bg-surface-low rounded-2xl p-5 border border-border flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                      Interactive Practice Query
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    Target: db.{selectedLesson.practiceCollection}
                  </span>
                </div>

                <p className="text-xs text-text-muted leading-relaxed">
                  {selectedLesson.practiceExplanation}
                </p>

                <textarea
                  rows={4}
                  value={practiceCode}
                  onChange={(e) => setPracticeCode(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleRunPractice();
                    }
                  }}
                  placeholder="Enter MQL query, e.g. db.students.find().limit(2)"
                  className="w-full p-3 font-mono text-xs rounded-xl bg-surface border border-border text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Link
                      href="/playground"
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Open in Playground</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <span className="text-[11px] text-text-muted hidden sm:inline">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-surface-high border border-border font-mono text-[10px]">Ctrl+Enter</kbd> to run
                    </span>
                  </div>

                  <button
                    onClick={handleRunPractice}
                    disabled={practicing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{practicing ? 'Running Practical...' : 'Run Practical'}</span>
                  </button>
                </div>

                {practiceResult && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-text-muted uppercase">
                        Practical Execution Output:
                      </span>
                      {practiceResult.executionTimeMs !== undefined && (
                        <div className="flex items-center gap-2 text-[11px] font-mono text-tertiary">
                          <span>✓ {practiceResult.executionTimeMs}ms</span>
                          <span>&bull;</span>
                          <span>{practiceResult.documentsCount} documents</span>
                          {practiceResult.targetDatabase && (
                            <>
                              <span>&bull;</span>
                              <span className="text-text-muted">db: {practiceResult.targetDatabase}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {practiceResult.syntaxBreakdown && practiceResult.syntaxBreakdown.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 py-1">
                        {practiceResult.syntaxBreakdown.map((item: any, idx: number) => (
                          <span
                            key={idx}
                            title={item.description}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface border border-border text-text-muted"
                          >
                            <span className="text-secondary font-bold">{item.category}:</span> {item.token}
                          </span>
                        ))}
                      </div>
                    )}

                    {practiceResult.error ? (
                      <div className="p-3 bg-error/10 border border-error/30 text-error rounded-xl text-xs font-mono">
                        {practiceResult.error}
                      </div>
                    ) : (
                      <pre className="p-3 bg-inverse-surface text-inverse-text rounded-xl font-mono text-xs max-h-[240px] overflow-auto whitespace-pre-wrap">
                        {JSON.stringify(practiceResult.data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
