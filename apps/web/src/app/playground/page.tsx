'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import {
  VirtualDatabase,
  CollectionMetadata,
  QueryResult,
  QueryHistoryItem,
  QuerySyntaxBreakdownItem,
} from '@datachan/shared-types';
import {
  Terminal,
  Play,
  RotateCcw,
  Sparkles,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Copy,
  Table as TableIcon,
  Code2,
  Trash2,
  Check,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  EmptyState,
  PageHeader,
  Tabs,
  TabList,
  TabTrigger,
} from '@/components/ui';

// Dynamically import Monaco Editor to avoid SSR mismatch
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function PlaygroundPage() {
  const [databases, setDatabases] = useState<VirtualDatabase[]>([]);
  const [selectedDb, setSelectedDb] = useState<VirtualDatabase | null>(null);
  const [collections, setCollections] = useState<CollectionMetadata[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('students');
  const [serverVersion, setServerVersion] = useState<string>('8.2.5');
  const [liveBreakdown, setLiveBreakdown] = useState<QuerySyntaxBreakdownItem[]>([]);
  const [syntaxHint, setSyntaxHint] = useState<string | null>(null);
  const [queryCode, setQueryCode] = useState<string>(
    '// Query: Find students older than 18, sort by GPA descending\n' +
      'db.students.find(\n' +
      '  { age: { $gt: 18 } },\n' +
      '  { name: 1, age: 1, major: 1, gpa: 1 }\n' +
      ').sort({ gpa: -1 }).limit(10)'
  );
  const [executing, setExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [viewTab, setViewTab] = useState<'json' | 'table'>('json');
  const [copySuccess, setCopySuccess] = useState(false);

  // Load databases and server status on mount
  useEffect(() => {
    async function loadDbs() {
      try {
        const [dbs, status] = await Promise.all([
          api.listDatabases(),
          api.getPlaygroundStatus().catch(() => null),
        ]);
        setDatabases(dbs);
        if (dbs.length > 0) {
          setSelectedDb(dbs[0]);
        }
        if (status?.serverVersion) {
          setServerVersion(status.serverVersion);
        }
        loadHistory();
      } catch (err) {
        console.error('Failed to load playground dbs:', err);
      }
    }
    loadDbs();
  }, []);

  // Debounced live syntax breakdown on query editor input
  useEffect(() => {
    const timer = setTimeout(async () => {
      const code = queryCode.trim();
      if (!code) {
        setLiveBreakdown([]);
        setSyntaxHint(null);
        return;
      }
      try {
        const res = await api.analyzePlaygroundQuery(
          code,
          selectedDb?.id || 'default',
          selectedCollection
        );
        if (res.breakdown && res.breakdown.length > 0) {
          setLiveBreakdown(res.breakdown);
          setSyntaxHint(null);
        } else if (res.error) {
          setSyntaxHint(res.error);
        }
      } catch {}
    }, 200);

    return () => clearTimeout(timer);
  }, [queryCode, selectedDb?.id, selectedCollection]);

  // When selected database changes, fetch its collections
  useEffect(() => {
    if (!selectedDb) return;
    async function loadCols() {
      try {
        const cols = await api.listCollections(selectedDb!.id);
        setCollections(cols);
        if (cols.length > 0) {
          setSelectedCollection(cols[0].name);
        }
      } catch (err) {
        console.error('Failed to load collections:', err);
      }
    }
    loadCols();
  }, [selectedDb]);

  async function loadHistory() {
    try {
      const history = await api.getQueryHistory(10);
      setQueryHistory(history);
    } catch {}
  }

  // Presets
  const presets = [
    {
      name: '⚡ All Students',
      code: 'db.students.find().limit(20)',
    },
    {
      name: '🎯 Age > 18',
      code: 'db.students.find({ age: { $gt: 18 } }).sort({ age: -1 })',
    },
    {
      name: '📊 Group by Major',
      code:
        'db.students.aggregate([\n' +
        '  {\n' +
        '    $group: {\n' +
        '      _id: "$major",\n' +
        '      studentCount: { $sum: 1 },\n' +
        '      avgGpa: { $avg: "$gpa" }\n' +
        '    }\n' +
        '  },\n' +
        '  { $sort: { avgGpa: -1 } }\n' +
        '])',
    },
    {
      name: '🔍 Projected Fields',
      code: 'db.students.find({}, { name: 1, major: 1, gpa: 1, _id: 0 })',
    },
    {
      name: '➕ insertOne()',
      code:
        'db.students.insertOne({\n' +
        '  name: "Marcus Vance",\n' +
        '  age: 22,\n' +
        '  major: "Computer Science",\n' +
        '  gpa: 3.91\n' +
        '})',
    },
  ];

  async function handleRunQuery() {
    if (!selectedDb || !queryCode.trim()) return;
    setExecuting(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      const res = await api.executePlaygroundQuery(
        selectedDb.id,
        selectedCollection,
        queryCode.trim()
      );
      setQueryResult(res);
      if (res.historyItem) {
        setQueryHistory((prev) => [
          res.historyItem!,
          ...prev.filter((item) => item.id !== res.historyItem!.id),
        ]);
      }
      loadHistory();
    } catch (err: any) {
      setQueryError(err.message || 'Query execution failed');
      loadHistory();
    } finally {
      setExecuting(false);
    }
  }

  function handleFormatCode() {
    try {
      const trimmed = queryCode.trim();
      setQueryCode(trimmed);
    } catch {}
  }

  function handleClear() {
    setQueryCode(`db.${selectedCollection}.find()`);
    setQueryResult(null);
    setQueryError(null);
  }

  function handleCopyJson() {
    if (!queryResult) return;
    navigator.clipboard.writeText(JSON.stringify(queryResult.data, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6 w-full flex-1">
      {/* Top Command & Presets Sub-Bar */}
      <div className="w-full flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-surface-low p-3.5 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* DB Selector */}
          <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-border shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
            <span className="text-xs text-text-muted font-bold font-mono">DB:</span>
            <select
              value={selectedDb?.id || ''}
              onChange={(e) => {
                const db = databases.find((d) => d.id === e.target.value);
                if (db) setSelectedDb(db);
              }}
              className="bg-transparent text-xs font-bold text-text focus:outline-none cursor-pointer"
            >
              {databases.map((db) => (
                <option key={db.id} value={db.id} className="bg-surface text-text">
                  {db.name}
                </option>
              ))}
            </select>
          </div>

          {/* Collection Selector */}
          <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-border shadow-sm">
            <span className="text-xs text-text-muted font-bold font-mono">Col:</span>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="bg-transparent text-xs font-bold text-text focus:outline-none cursor-pointer"
            >
              {collections.map((col) => (
                <option key={col.name} value={col.name} className="bg-surface text-text">
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-5 w-px bg-border hidden md:block mx-1" />

          {/* Live Connection Capsule */}
          <Badge variant="success" size="sm" dot>
            Sandbox &bull; MongoDB {serverVersion}
          </Badge>
        </div>

        {/* Quick Query Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mr-1 hidden sm:inline-block">
            Presets:
          </span>
          {presets.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="xs"
              onClick={() => setQueryCode(preset.code)}
              className="whitespace-nowrap font-mono font-medium"
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Playground Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        {/* ========================================================================= */}
        {/* LEFT PANEL: Monaco IDE & Syntax Breakdown (~55%)                          */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Interactive IDE Card */}
          <div className="w-full bg-[#0d0e14] rounded-2xl shadow-xl overflow-hidden flex flex-col border border-border">
            {/* Window Chrome / Tab Bar */}
            <div className="px-4 py-2.5 bg-[#141620] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-error inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary inline-block" />
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 text-white px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
                  <span>query.mql.js</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
              </div>

              {/* Controls Toolbar */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="xs" onClick={handleFormatCode}>
                  Format
                </Button>
                <Button variant="ghost" size="xs" onClick={handleClear} className="hover:text-error">
                  Clear
                </Button>
                <Button
                  variant="primary"
                  size="xs"
                  onClick={handleRunQuery}
                  isLoading={executing}
                  leftIcon={<Play className="w-3 h-3 fill-current" />}
                >
                  {executing ? 'Executing...' : 'Run Query'}
                </Button>
              </div>
            </div>

            {/* Monaco Editor Container */}
            <div className="h-[320px] w-full bg-[#0d0e14]">
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
                  roundedSelection: true,
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>
          </div>

          {/* Beginner's Syntax Breakdown Panel */}
          <Card variant="default" className="flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                Beginner&apos;s Syntax Breakdown
              </h3>
            </div>

            {(() => {
              const activeBreakdown = liveBreakdown.length > 0 ? liveBreakdown : (queryResult?.breakdown || []);
              if (activeBreakdown.length > 0) {
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeBreakdown.map((item, idx) => (
                      <div
                        key={`${item.token}-${idx}`}
                        className="bg-surface rounded-xl p-2.5 border border-border flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <code className="font-mono font-bold text-primary text-[11px]">{item.token}</code>
                          <Badge variant="primary" size="xs">
                            {item.category}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-text-muted leading-relaxed">{item.description}</span>
                      </div>
                    ))}
                  </div>
                );
              }
              if (syntaxHint) {
                return (
                  <div className="p-3 rounded-xl bg-surface border border-border text-xs text-text-muted font-mono">
                    <span className="text-primary font-semibold">Parser Note: </span>
                    {syntaxHint}
                  </div>
                );
              }
              return (
                <div className="text-xs text-text-muted py-2 leading-relaxed">
                  Type or run an MQL operation to view an automated pedagogical breakdown of your targets, filters, projection masks, and aggregation pipeline stages.
                </div>
              );
            })()}
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: Query Output & Execution Stats (~45%)                        */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Result Card */}
          <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[380px]">
            {/* Result Header & Stats */}
            <div className="p-3.5 bg-surface-low border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-text">Query Results</span>
                {queryResult?.stats && (
                  <Badge variant="success" size="xs">
                    {queryResult.stats.durationMs}ms &bull; {queryResult.stats.documentsReturned} docs
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Tabs value={viewTab} onValueChange={(val: any) => setViewTab(val)}>
                  <TabList variant="pill">
                    <TabTrigger value="json">JSON</TabTrigger>
                    <TabTrigger value="table">Table</TabTrigger>
                  </TabList>
                </Tabs>

                {queryResult && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleCopyJson}
                    title="Copy JSON"
                    leftIcon={copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  />
                )}
              </div>
            </div>

            {/* Result Body */}
            <div className="p-4 flex-1 flex flex-col overflow-auto">
              {queryError ? (
                <div className="bg-error/10 border border-error/30 text-error rounded-xl p-4 flex items-start gap-3 text-xs leading-relaxed">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-error" />
                  <div>
                    <h4 className="font-bold">Query Error</h4>
                    <p className="mt-1 font-mono text-[11px]">{queryError}</p>
                  </div>
                </div>
              ) : !queryResult ? (
                <EmptyState
                  icon={<Terminal className="w-6 h-6 text-primary" />}
                  title="No query executed yet"
                  description="Press 'Run Query' or Ctrl+Enter to execute."
                  className="py-12 border-none bg-transparent"
                />
              ) : viewTab === 'json' ? (
                <pre className="text-xs font-mono leading-relaxed text-text overflow-auto max-h-[360px] whitespace-pre-wrap">
                  {JSON.stringify(queryResult.data, null, 2)}
                </pre>
              ) : (
                /* Table View */
                <div className="overflow-x-auto">
                  {Array.isArray(queryResult.data) && queryResult.data.length > 0 ? (
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-surface-low border-b border-border text-text-muted text-[10px] uppercase">
                        <tr>
                          {Object.keys(queryResult.data[0]).map((k) => (
                            <th key={k} className="py-2 px-3">
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {queryResult.data.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-surface-high/50">
                            {Object.keys(queryResult.data[0]).map((k) => (
                              <td key={k} className="py-1.5 px-3 truncate max-w-[120px]">
                                {typeof row[k] === 'object'
                                  ? JSON.stringify(row[k])
                                  : String(row[k] ?? '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-xs text-text-muted p-4 text-center">
                      Result is not an array of documents to display as a table.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Query History Drawer */}
          <Card variant="default" className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-text uppercase tracking-wider">
                  Query History
                </span>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => api.clearQueryHistory().then(loadHistory)}
                className="text-text-muted hover:text-error"
                leftIcon={<Trash2 className="w-3 h-3" />}
              >
                Clear
              </Button>
            </div>

            {queryHistory.length === 0 ? (
              <span className="text-xs text-text-muted text-center py-3">No queries in history.</span>
            ) : (
              <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto">
                {queryHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setQueryCode(item.rawQuery)}
                    className="p-2 rounded-xl bg-surface hover:bg-surface-high border border-border cursor-pointer transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          item.success ? 'bg-tertiary' : 'bg-error'
                        }`}
                      />
                      <code className="font-mono text-[11px] text-text truncate max-w-[200px]">
                        {item.rawQuery}
                      </code>
                    </div>
                    <span className="font-mono text-[10px] text-text-muted shrink-0">
                      {item.durationMs}ms
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
