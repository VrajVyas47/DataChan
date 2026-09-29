'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { Challenge, ChallengeEvaluationResult } from '@datachan/shared-types';
import {
  Trophy,
  CheckCircle2,
  AlertCircle,
  Play,
  Clock,
  Sparkles,
  HelpCircle,
  Database,
  ArrowRight,
} from 'lucide-react';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);
  const [queryCode, setQueryCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<ChallengeEvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    async function loadChallenges() {
      try {
        const list = await api.listChallenges();
        setChallenges(list);
        if (list.length > 0) {
          selectChallenge(list[0]);
        }
      } catch (err) {
        console.error('Failed to load challenges:', err);
      } finally {
        setLoading(false);
      }
    }
    loadChallenges();
  }, []);

  function selectChallenge(ch: any) {
    setSelectedChallenge(ch);
    setQueryCode(ch.starterQuery);
    setEvaluation(null);
    setShowHints(false);
  }

  async function handleSubmit() {
    if (!selectedChallenge || !queryCode.trim()) return;
    setSubmitting(true);
    setEvaluation(null);

    try {
      const res = await api.submitChallengeAttempt(selectedChallenge.id, queryCode.trim());
      setEvaluation(res);
      if (res.passed) {
        const updatedList = await api.listChallenges();
        setChallenges(updatedList);
        setSelectedChallenge({ ...selectedChallenge, isSolved: true });
      }
    } catch (err: any) {
      setEvaluation({
        passed: false,
        score: 0,
        feedback: err.message || 'Challenge attempt failed',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-text-muted">Loading practice challenges...</span>
        </div>
      </div>
    );
  }

  const solvedCount = challenges.filter((c) => c.isSolved).length;

  return (
    <div className="flex flex-col gap-6 w-full flex-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-main flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-secondary" />
            <span>Database Challenges &bull; Practice Arena</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Solve real-world database queries and receive instant, deterministic test case evaluation and XP.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-surface-low px-4 py-2 rounded-full border border-border">
          <CheckCircle2 className="w-5 h-5 text-tertiary" />
          <div className="text-xs">
            <span className="font-bold text-text-main font-mono">{solvedCount}</span> /{' '}
            <span className="text-text-muted font-mono">{challenges.length}</span> Challenges Solved
          </div>
        </div>
      </div>

      {/* 2-Column Master Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Challenge Catalogue (~35%)                                   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Challenge Catalog
            </span>
            <span className="text-[11px] font-mono font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-full">
              {challenges.length} Tasks
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-[680px] overflow-y-auto pr-1">
            {challenges.map((ch) => {
              const isSelected = selectedChallenge?.id === ch.id;
              const difficultyBadgeClass =
                ch.difficulty === 'Easy'
                  ? 'bg-tertiary-container/20 text-tertiary border-tertiary/30'
                  : ch.difficulty === 'Medium'
                  ? 'bg-secondary-container/20 text-secondary border-secondary/30'
                  : 'bg-primary-fixed text-primary border-primary/30';

              return (
                <div
                  key={ch.id}
                  onClick={() => selectChallenge(ch)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-md scale-[1.01]'
                      : ch.isSolved
                      ? 'bg-surface-low hover:bg-surface-high border-tertiary/30 text-text-main'
                      : 'bg-surface hover:bg-surface-high border-border text-text-main'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        isSelected ? 'bg-white/20 text-white border-white/20' : difficultyBadgeClass
                      }`}
                    >
                      {ch.difficulty}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        isSelected ? 'text-white' : 'text-secondary'
                      }`}
                    >
                      +{ch.xpReward} XP
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold leading-snug">{ch.title}</h4>
                    {ch.isSolved && <CheckCircle2 className="w-4 h-4 text-tertiary shrink-0" />}
                  </div>

                  <span
                    className={`text-[10px] font-mono ${
                      isSelected ? 'text-white/80' : 'text-text-muted'
                    }`}
                  >
                    Target: db.{ch.targetCollection} &bull; ~{ch.estimatedMinutes}m
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Problem Statement, Monaco Editor, Evaluation (~65%)         */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {selectedChallenge && (
            <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-5">
              {/* Challenge Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase bg-surface-high text-text-muted px-2 py-0.5 rounded-full">
                      {selectedChallenge.category}
                    </span>
                    <span className="text-xs font-mono text-text-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedChallenge.estimatedMinutes} mins
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-text-main">
                    {selectedChallenge.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {selectedChallenge.isSolved && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tertiary-container/20 text-tertiary text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Solved</span>
                    </div>
                  )}
                  <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-full bg-secondary-container/20 text-secondary">
                    +{selectedChallenge.xpReward} XP
                  </span>
                </div>
              </div>

              {/* Problem Description & Dataset Context */}
              <div className="bg-surface-low rounded-xl p-4 border border-border flex flex-col gap-2">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  Problem Statement:
                </span>
                <p className="text-xs sm:text-sm text-text-main leading-relaxed font-medium">
                  {selectedChallenge.problemStatement}
                </p>
                <div className="mt-2 pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text-muted font-mono">
                  <span>Context: {selectedChallenge.contextDescription}</span>
                  <span className="text-primary font-bold">
                    Target: db.{selectedChallenge.targetCollection}
                  </span>
                </div>
              </div>

              {/* Hints Drawer */}
              {selectedChallenge.hints && selectedChallenge.hints.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowHints(!showHints)}
                    className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showHints ? 'Hide Hints' : 'Need a hint?'}</span>
                  </button>

                  {showHints && (
                    <div className="mt-2 p-3 bg-surface-high rounded-xl text-xs text-text-main flex flex-col gap-1.5 border border-border">
                      {selectedChallenge.hints.map((hint: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-primary font-bold">&bull;</span>
                          <span>{hint}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Monaco Query Editor */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    Your Solution Query:
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">MQL / JavaScript</span>
                </div>

                <div className="h-[220px] rounded-xl overflow-hidden border border-white/10 shadow-inner bg-[#13141b]">
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme="vs-dark"
                    value={queryCode}
                    onChange={(val) => setQueryCode(val || '')}
                    options={{
                      fontSize: 13,
                      fontFamily: '"JetBrains Mono", monospace',
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      lineNumbers: 'on',
                    }}
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-text-muted">
                  Runs against active sandbox dataset with deterministic evaluation.
                </span>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{submitting ? 'Evaluating...' : 'Submit Attempt'}</span>
                </button>
              </div>

              {/* Evaluation Result Feedback */}
              {evaluation && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
                    evaluation.passed
                      ? 'bg-tertiary-container/15 border-tertiary text-tertiary'
                      : 'bg-error/10 border-error/30 text-error'
                  }`}
                >
                  {evaluation.passed ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-tertiary" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-error" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">
                      {evaluation.passed ? 'Challenge Passed!' : 'Evaluation Incomplete'}
                    </h4>
                    <p className="mt-1">{evaluation.feedback}</p>
                    {evaluation.xpEarned && evaluation.xpEarned > 0 ? (
                      <div className="mt-2 font-bold text-secondary flex items-center gap-1 font-mono">
                        <Sparkles className="w-4 h-4" />
                        <span>+{evaluation.xpEarned} XP added to your profile!</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
