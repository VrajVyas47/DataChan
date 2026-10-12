'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { Loader2, Play, CheckCircle2, AlertCircle, FileText, Clock, Users } from 'lucide-react';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function GameWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [game, setGame] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);

  // Editor and execution state
  const [queryCode, setQueryCode] = useState(
    '// Chapter 1: Who was in the hotel between 11:00 PM (23:00) and midnight (24:00)?\ndb.visits.find({\n  time: { $gte: "23:00", $lt: "24:00" }\n})'
  );
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Validation state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError(null);
      try {
        const gameData = await api.getGame(gameId);
        setGame(gameData);

        try {
          const prog = await api.getGameProgress(gameId);
          if (prog) {
            setProgress(prog);
          }
        } catch (e) {
          // No active progress yet; student will see briefing
        }
      } catch (err: any) {
        console.error('Error loading game:', err);
        setLoadError(err.message || 'Unable to retrieve case file.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [gameId]);

  const handleStart = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const prog = await api.startGame(gameId);
      setProgress(prog);
    } catch (err: any) {
      console.error('Error starting game:', err);
      setStartError(err.message || 'Failed to initialize case sandbox database. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleRunQuery = async () => {
    if (!queryCode.trim()) return;
    setExecuting(true);
    setError(null);
    setResult(null);
    setValidationResult(null);

    try {
      const currentChapter = game?.chapters?.find((c: any) => c.id === progress?.currentChapter) || game?.chapters?.[0];
      if (!currentChapter) {
        throw new Error('Chapter configuration not found.');
      }
      const res = await api.runGameQuery(gameId, currentChapter.challengeId, queryCode);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Error executing query');
    } finally {
      setExecuting(false);
    }
  };

  const handleValidate = async () => {
    if (!result) return;
    setValidating(true);
    try {
      const currentChapter = game?.chapters?.find((c: any) => c.id === progress?.currentChapter) || game?.chapters?.[0];
      if (!currentChapter) {
        throw new Error('Chapter configuration not found.');
      }
      const val = await api.validateGameChallenge(gameId, currentChapter.challengeId, queryCode, result);
      setValidationResult(val);

      if (val.solved) {
        // Optimistically update progress to avoid flash
        setProgress((prev: any) => prev ? {
          ...prev,
          completedChallenges: Array.from(new Set([...(prev.completedChallenges || []), currentChapter.challengeId])),
          discoveredClues: val.clue ? Array.from(new Set([...(prev.discoveredClues || []), val.clue])) : (prev.discoveredClues || []),
          currentChapter: val.nextChapter || prev.currentChapter,
        } : prev);

        // Synchronize with authoritative server state
        api.getGameProgress(gameId).then(setProgress).catch(() => {});
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Validation request failed.');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError || !game) {
    return (
      <div className="container max-w-xl py-16 text-center space-y-4">
        <div className="p-6 bg-surface border border-border rounded-xl space-y-3">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">{loadError ? 'Case Access Error' : 'Case Not Found'}</h1>
          <p className="text-sm text-text-muted">{loadError || 'The requested investigation could not be located in the catalog.'}</p>
          <div className="pt-2 flex justify-center gap-3">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-surface-high border border-border rounded-lg text-sm font-semibold hover:bg-surface-elevated transition-colors">
              Retry
            </button>
            <button onClick={() => router.push('/games')} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
              Back to Cases
            </button>
          </div>
        </div>
      </div>
    );
  }

  // BRIEFING SCREEN
  if (!progress) {
    return (
      <div className="container max-w-4xl py-12 animate-in fade-in duration-500">
        <div className="border border-border bg-surface-low rounded-xl overflow-hidden shadow-sm">
          <div className="text-center pb-8 pt-8 border-b border-border">
            <div className="mb-4 mx-auto w-fit px-3 py-1 bg-surface border border-border rounded-full text-xs font-bold text-text-muted">CASE #001</div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-2 text-text-main">{game.title}</h2>
            <p className="text-text-muted text-lg">{game.description}</p>
          </div>
          <div className="p-8 space-y-8">
            {startError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-start text-sm">
                <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unable to Start Investigation</p>
                  <p className="mt-0.5">{startError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center text-text-main"><FileText className="w-5 h-5 mr-2 text-primary" /> Case File</h3>
                <ul className="space-y-2 text-sm text-text-muted">
                  <li><strong className="text-text-main">Victim:</strong> Adrian Black (48), Hotel Manager</li>
                  <li><strong className="text-text-main">Location:</strong> Blackwood Grand Hotel, Room 204</li>
                  <li><strong className="text-text-main">Incident Time:</strong> 11:52 PM</li>
                  <li><strong className="text-text-main">Status:</strong> Open Investigation</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center text-text-main"><Clock className="w-5 h-5 mr-2 text-primary" /> Initial Timeline</h3>
                <ul className="space-y-2 text-sm text-text-muted border-l-2 pl-4 border-border">
                  <li><strong>10:30 PM</strong> — Conference ends</li>
                  <li><strong>10:45 PM</strong> — Adrian receives a phone call</li>
                  <li><strong>11:00 PM</strong> — Daniel supposedly leaves hotel</li>
                  <li><strong>11:52 PM</strong> — Adrian found dead</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-center">
              <button onClick={handleStart} disabled={starting} className="px-12 py-4 text-lg font-bold bg-primary text-white rounded-xl hover:bg-primary/90 flex items-center transition-colors disabled:opacity-50">
                {starting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {starting ? 'Initializing Sandbox...' : 'Start Investigation'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // INVESTIGATION WORKSPACE
  const currentChapter = game.chapters.find((c: any) => c.id === progress.currentChapter) || game.chapters[0];

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background text-text-main">
      {/* LEFT: Case Context */}
      <div className="w-1/4 min-w-[300px] border-r border-border bg-surface-low p-4 overflow-y-auto flex flex-col space-y-6">
        <div>
          <div className="inline-block px-2 py-1 bg-surface border border-border rounded-full text-xs font-bold text-text-muted mb-2">Chapter {currentChapter.order}</div>
          <h2 className="text-xl font-bold">{currentChapter.title}</h2>
          <p className="text-sm text-muted-foreground mt-2">{currentChapter.story}</p>
        </div>

        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <h3 className="font-semibold text-primary mb-2">Objective</h3>
          <p className="text-sm">{currentChapter.objective}</p>
        </div>

        <div className="space-y-2 flex-grow">
          <h3 className="font-semibold flex items-center"><CheckCircle2 className="w-4 h-4 mr-2" /> Progress</h3>
          <div className="text-sm text-muted-foreground">
            {progress.completedChallenges.length} / {game.chapters.length} Chapters Solved
          </div>
        </div>
      </div>

      {/* CENTER: Editor & Results */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
          <h3 className="font-semibold flex items-center"><Play className="w-4 h-4 mr-2 text-primary" /> MongoDB Terminal</h3>
          <button onClick={handleRunQuery} disabled={executing || validating} className="px-4 py-2 bg-primary text-white rounded-md flex items-center text-sm font-bold hover:bg-primary/90 disabled:opacity-50">
            {executing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Run Query
          </button>
        </div>

        <div className="h-1/2 border-b border-border relative">
          <Editor
            height="100%"
            language="javascript"
            theme="vs-dark"
            value={queryCode}
            onChange={(val) => setQueryCode(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              padding: { top: 16 },
            }}
          />
        </div>

        <div className="flex-1 flex flex-col p-4 bg-surface-low overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Query Results</h3>
            {result && (
              <button
                onClick={handleValidate}
                disabled={validating || validationResult?.solved}
                className={`px-4 py-2 rounded-md flex items-center text-sm font-bold ${
                  validationResult?.solved ? "bg-surface text-text-muted border border-border" : "bg-primary text-white hover:bg-primary/90"
                } disabled:opacity-50`}
              >
                {validating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {validationResult?.solved ? "Challenge Completed" : "Submit Investigation"}
              </button>
            )}
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-start border border-destructive/20">
              <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
              <div className="text-sm font-mono whitespace-pre-wrap">{error}</div>
            </div>
          )}

          {validationResult && (
            <div className={`p-4 mb-4 rounded-md flex items-start border ${validationResult.solved ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
              <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">{validationResult.solved ? 'Validation Passed' : 'Validation Failed'}</p>
                <p className="text-sm mt-1">{validationResult.message}</p>
                {validationResult.xpAwarded > 0 && (
                  <p className="text-sm mt-1 font-bold">+ {validationResult.xpAwarded} XP Awarded!</p>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto bg-background rounded-md border p-4">
            {!result && !error ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                Awaiting query execution...
              </div>
            ) : result ? (
              <pre className="text-xs font-mono text-muted-foreground">
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : null}
          </div>
        </div>
      </div>

      {/* RIGHT: Evidence & Timeline */}
      <div className="w-1/4 min-w-[250px] border-l border-border bg-surface-low p-4 overflow-y-auto">
        <h3 className="font-semibold flex items-center mb-4 text-text-main"><Users className="w-4 h-4 mr-2 text-primary" /> Investigation Board</h3>

        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-text-muted mb-2">Discovered Clues</h4>
            {progress.discoveredClues.length === 0 ? (
              <p className="text-xs text-text-muted italic">No clues discovered yet.</p>
            ) : (
              <ul className="space-y-2">
                {progress.discoveredClues.map((clue: string, i: number) => (
                  <li key={i} className="text-sm p-3 bg-surface border border-border rounded-md shadow-sm text-text-main">{clue}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
