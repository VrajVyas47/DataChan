'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Workspace,
  VirtualDatabase,
  CollectionMetadata,
  DocumentItem,
  DetectedFieldInfo,
} from '@datachan/shared-types';
import {
  Database,
  Folder,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Code2,
  Terminal,
  RefreshCw,
  AlertCircle,
  X,
  Check,
  Sparkles,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Layers,
  BarChart2,
} from 'lucide-react';
import {
  Button,
  Input,
  Textarea,
  Badge,
  Card,
  Modal,
  EmptyState,
  LoadingState,
  Tabs,
  TabList,
  TabTrigger,
} from '@/components/ui';

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [databases, setDatabases] = useState<VirtualDatabase[]>([]);
  const [activeDb, setActiveDb] = useState<VirtualDatabase | null>(null);
  const [collections, setCollections] = useState<CollectionMetadata[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [collectionMeta, setCollectionMeta] = useState<CollectionMetadata | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table' | 'json' | 'schema'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);

  // Modals
  const [showCreateDbModal, setShowCreateDbModal] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [showCreateColModal, setShowCreateColModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [showInsertDocModal, setShowInsertDocModal] = useState(false);
  const [newDocJson, setNewDocJson] = useState('{\n  "name": "",\n  "status": "active"\n}');
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [editDocJson, setEditDocJson] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load initial workspaces & databases
  useEffect(() => {
    async function init() {
      try {
        const wsList = await api.listWorkspaces();
        setWorkspaces(wsList);
        if (wsList.length > 0) {
          const ws = wsList[0];
          setActiveWorkspace(ws);
          const dbs = await api.listDatabases(ws.id);
          setDatabases(dbs);
          if (dbs.length > 0) {
            setActiveDb(dbs[0]);
          }
        }
      } catch (err) {
        console.error('Failed to init workspace:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // When activeDb changes, load its collections
  useEffect(() => {
    if (!activeDb) {
      setCollections([]);
      setActiveCollection(null);
      return;
    }
    async function loadCols() {
      try {
        const cols = await api.listCollections(activeDb!.id);
        setCollections(cols);
        if (cols.length > 0) {
          setActiveCollection(cols[0].name);
        } else {
          setActiveCollection(null);
          setDocuments([]);
          setCollectionMeta(null);
        }
      } catch (err) {
        console.error('Failed to load collections:', err);
      }
    }
    loadCols();
  }, [activeDb]);

  // When activeCollection changes, load its documents & inspect schema
  useEffect(() => {
    if (!activeDb || !activeCollection) {
      setDocuments([]);
      setCollectionMeta(null);
      return;
    }
    loadCollectionData();
  }, [activeDb, activeCollection, searchQuery]);

  async function loadCollectionData() {
    if (!activeDb || !activeCollection) return;
    setDocsLoading(true);
    try {
      const [docRes, meta] = await Promise.all([
        api.getDocuments(activeDb.id, activeCollection, 1, 50, searchQuery),
        api.inspectCollection(activeDb.id, activeCollection),
      ]);
      setDocuments(docRes.documents);
      setCollectionMeta(meta);
    } catch (err) {
      console.error('Failed to load collection data:', err);
    } finally {
      setDocsLoading(false);
    }
  }

  // Create Database
  async function handleCreateDatabase() {
    if (!newDbName.trim() || !activeWorkspace) return;
    try {
      const created = await api.createDatabase(newDbName.trim(), activeWorkspace.id);
      setDatabases([...databases, created]);
      setActiveDb(created);
      setShowCreateDbModal(false);
      setNewDbName('');
      setStatusMessage(`Database '${created.name}' created successfully!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  }

  // Create Collection
  async function handleCreateCollection() {
    if (!newColName.trim() || !activeDb) return;
    try {
      const created = await api.createCollection(activeDb.id, newColName.trim());
      setCollections([...collections, created]);
      setActiveCollection(created.name);
      setShowCreateColModal(false);
      setNewColName('');
      setStatusMessage(`Collection '${created.name}' created successfully!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  }

  // Insert Document
  async function handleInsertDocument() {
    if (!activeDb || !activeCollection) return;
    try {
      const parsed = JSON.parse(newDocJson);
      await api.insertDocument(activeDb.id, activeCollection, parsed);
      setShowInsertDocModal(false);
      setNewDocJson('{\n  "name": "",\n  "status": "active"\n}');
      loadCollectionData();
      setStatusMessage('Document inserted successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(`Invalid JSON or insertion error: ${err.message}`);
    }
  }

  // Edit Document
  function openEditModal(doc: DocumentItem) {
    setEditingDoc(doc);
    const { _id, ...rest } = doc;
    setEditDocJson(JSON.stringify(rest, null, 2));
  }

  async function handleUpdateDocument() {
    if (!activeDb || !activeCollection || !editingDoc) return;
    try {
      const parsed = JSON.parse(editDocJson);
      await api.updateDocument(activeDb.id, activeCollection, editingDoc._id, parsed);
      setEditingDoc(null);
      loadCollectionData();
      setStatusMessage('Document updated successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(`Update error: ${err.message}`);
    }
  }

  // Delete Document
  async function handleDeleteDocument(docId: string) {
    if (!activeDb || !activeCollection) return;
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.deleteDocument(activeDb.id, activeCollection, docId);
      loadCollectionData();
      setStatusMessage('Document deleted successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  }

  // Drop Collection
  async function handleDeleteCollection(colName: string) {
    if (!activeDb) return;
    if (!confirm(`Are you sure you want to drop collection '${colName}'?`)) return;
    try {
      await api.deleteCollection(activeDb.id, colName);
      const remaining = collections.filter((c) => c.name !== colName);
      setCollections(remaining);
      setActiveCollection(remaining.length > 0 ? remaining[0].name : null);
      setStatusMessage(`Collection '${colName}' dropped.`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <LoadingState
        message="Loading workspace explorer..."
        fullScreen={false}
        className="min-h-[400px]"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full flex-1">
      {/* Toast Status Notice */}
      {statusMessage && (
        <div className="bg-tertiary-container text-white px-4 py-2.5 rounded-full text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{statusMessage}</span>
          </div>
          <div role="button" onClick={() => setStatusMessage(null)} className="hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* 3-Column Studio Layout */}
      <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6 items-start flex-1">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Database & Collection Explorer (Span 3 ~25%)                 */}
        {/* ========================================================================= */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          {/* Workspace Pill Card */}
          <div className="bg-surface-low rounded-2xl p-4 border border-border shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-main truncate max-w-[150px]">
                    {activeWorkspace?.name || 'Workspace'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                    <span className="text-[10px] font-mono font-bold text-tertiary uppercase">
                      Sandbox Active
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowCreateDbModal(true)}
                title="Create Database"
                className="w-8 h-8 !p-0 rounded-full"
              >
                <Plus className="w-4 h-4 text-primary" />
              </Button>
            </div>
          </div>

          {/* Hierarchical Explorer Tree */}
          <div className="bg-surface-low rounded-2xl p-4 border border-border shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Databases &amp; Collections
              </span>
              <span className="text-[11px] font-mono font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-full">
                {databases.length} DBs
              </span>
            </div>

            {databases.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-muted">
                No databases in workspace.
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateDbModal(true)}
                  className="mx-auto mt-2 text-primary hover:text-primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create Database
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {databases.map((db) => {
                  const isSelectedDb = activeDb?.id === db.id;
                  return (
                    <div key={db.id} className="flex flex-col gap-1">
                      {/* Database Header Node */}
                      <div
                        onClick={() => setActiveDb(db)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                          isSelectedDb
                            ? 'bg-primary-fixed text-primary font-bold'
                            : 'hover:bg-surface-high text-text-main'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Folder className="w-4 h-4 shrink-0" />
                          <span className="text-xs truncate">{db.name}</span>
                        </div>
                        <span className="text-[10px] font-mono bg-surface px-1.5 py-0.5 rounded-full text-text-muted">
                          {isSelectedDb ? collections.length : db.collectionsCount || 0} col
                        </span>
                      </div>

                      {/* Collections Sub-Tree (when database is selected) */}
                      {isSelectedDb && (
                        <div className="ml-4 pl-2 border-l border-primary/30 flex flex-col gap-1 my-1">
                          {collections.map((col) => {
                            const isSelectedCol = activeCollection === col.name;
                            return (
                              <div
                                key={col.name}
                                onClick={() => setActiveCollection(col.name)}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                                  isSelectedCol
                                    ? 'bg-primary text-white font-bold shadow-sm'
                                    : 'text-text-muted hover:bg-surface-high hover:text-text-main'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{col.name}</span>
                                </div>
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                                    isSelectedCol
                                      ? 'bg-white/20 text-white'
                                      : 'bg-surface-high text-text-muted'
                                  }`}
                                >
                                  {col.documentsCount}
                                </span>
                              </div>
                            );
                          })}

                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setShowCreateColModal(true)}
                            className="w-full justify-start text-primary hover:text-primary mt-1"
                            leftIcon={<Plus className="w-3 h-3" />}
                          >
                            Add Collection
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER COLUMN: Documents Viewer & Operations (Span 6 ~50%)                */}
        {/* ========================================================================= */}
        <div className="xl:col-span-6 flex flex-col gap-4">
          {/* Top Document Controls Bar */}
          <div className="bg-surface-low rounded-2xl p-4 border border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted font-mono uppercase">Collection:</span>
                  <span className="text-sm font-extrabold text-text-main">
                    {activeCollection || 'Select Collection'}
                  </span>
                  {activeCollection && (
                    <span className="text-[11px] font-mono bg-primary-fixed text-primary px-2 py-0.5 rounded-full font-bold">
                      {documents.length} docs
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Filter docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-full bg-surface border border-border text-text-main focus:outline-none focus:ring-1 focus:ring-primary w-32 sm:w-40"
                />
              </div>

              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={(val: any) => setViewMode(val)}>
                <TabList variant="pill">
                  <TabTrigger value="card" icon={<LayoutGrid className="w-3.5 h-3.5" />} title="Card View" />
                  <TabTrigger value="table" icon={<TableIcon className="w-3.5 h-3.5" />} title="Table View" />
                  <TabTrigger value="json" icon={<Code2 className="w-3.5 h-3.5" />} title="JSON View" />
                  <TabTrigger value="schema" icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />} title="MongoDB Schema Analysis & Advisor">Schema Advisor</TabTrigger>
                </TabList>
              </Tabs>

              {/* Insert Doc Button */}
              {activeCollection && (
                <Button
                  size="xs"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setShowInsertDocModal(true)}
                >
                  Insert
                </Button>
              )}
            </div>
          </div>

          {/* Document Content Container */}
          {docsLoading ? (
            <LoadingState
              message="Fetching documents from MongoDB..."
              fullScreen={false}
              className="py-20"
            />
          ) : !activeCollection ? (
            <EmptyState
              icon={Folder}
              title="No Collection Selected"
              description="Select a collection from the explorer tree on the left, or create a new collection to insert documents."
            />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Documents Found"
              description="This collection is currently empty. Insert your first BSON document or run an MQL insert in the playground."
              action={{
                label: 'Insert First Document',
                onClick: () => setShowInsertDocModal(true),
              }}
            />
          ) : viewMode === 'card' ? (
            /* Card View */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <Card
                  key={doc._id}
                  variant="interactive"
                  className="p-4 flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <span className="font-mono text-[11px] text-primary font-bold truncate max-w-[150px]">
                        _id: {doc._id}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => openEditModal(doc)}
                          title="Edit Document"
                          className="!p-1.5 h-auto text-text-muted hover:text-text-main"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDeleteDocument(doc._id)}
                          title="Delete Document"
                          className="!p-1.5 h-auto text-text-muted hover:text-error hover:bg-error/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-col gap-1.5 font-mono text-xs">
                      {Object.entries(doc)
                        .filter(([k]) => k !== '_id')
                        .slice(0, 6)
                        .map(([k, v]) => (
                          <div key={k} className="flex items-baseline justify-between gap-2">
                            <span className="text-text-muted text-[11px]">{k}:</span>
                            <span className="text-text-main truncate max-w-[160px] font-semibold text-[11px]">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="bg-surface rounded-2xl border border-border overflow-x-auto shadow-sm">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface-low border-b border-border text-text-muted uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">_id</th>
                    {collectionMeta?.detectedFields
                      ?.filter((f) => f.name !== '_id')
                      .slice(0, 5)
                      .map((f) => (
                        <th key={f.name} className="py-2.5 px-3">
                          {f.name}
                        </th>
                      ))}
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {documents.map((doc) => (
                    <tr key={doc._id} className="hover:bg-surface-high/50 transition-colors">
                      <td className="py-2 px-3 text-primary font-bold truncate max-w-[120px]">
                        {doc._id}
                      </td>
                      {collectionMeta?.detectedFields
                        ?.filter((f) => f.name !== '_id')
                        .slice(0, 5)
                        .map((f) => (
                          <td key={f.name} className="py-2 px-3 truncate max-w-[140px] text-text-main">
                            {typeof doc[f.name] === 'object'
                              ? JSON.stringify(doc[f.name])
                              : String(doc[f.name] ?? '-')}
                          </td>
                        ))}
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => openEditModal(doc)}
                            title="Edit Document"
                            className="!p-1.5 h-auto text-text-muted hover:text-text-main"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleDeleteDocument(doc._id)}
                            title="Delete Document"
                            className="!p-1.5 h-auto text-text-muted hover:text-error hover:bg-error/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'json' ? (
            /* JSON View */
            <div className="bg-inverse-surface rounded-2xl p-4 overflow-x-auto text-inverse-text font-mono text-xs shadow-md max-h-[500px]">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(documents, null, 2)}
              </pre>
            </div>
          ) : (
            /* Schema Analysis & Advisor View */
            <div className="flex flex-col gap-6">
              {/* Top KPI Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-surface border border-border flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Sampled Docs</span>
                  <span className="text-xl font-black text-text-main">{collectionMeta?.documentsCount || 0}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface border border-border flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Detected Fields</span>
                  <span className="text-xl font-black text-primary">{collectionMeta?.detectedFields?.length || 0}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface border border-border flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Active Indexes</span>
                  <span className="text-xl font-black text-emerald-500">{collectionMeta?.indexesCount || 1}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface border border-border flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Avg Doc Size</span>
                  <span className="text-xl font-black text-amber-500">{collectionMeta?.avgDocumentSizeBytes || 0} B</span>
                </div>
              </div>

              {/* Schema Advisor Recommendations */}
              {collectionMeta?.recommendations && collectionMeta.recommendations.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-text-main uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Schema Optimization Advisor</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {collectionMeta.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                          rec.type === 'warning'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : rec.type === 'optimization'
                            ? 'bg-primary/10 border-primary/30 text-text-main'
                            : 'bg-surface-high border-border text-text-muted'
                        }`}
                      >
                        {rec.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        )}
                        <span className="leading-relaxed">{rec.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected Fields Schema Matrix */}
              <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                <div className="p-3.5 border-b border-border bg-surface-low flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-text-main uppercase tracking-wider">Field Type & Presence Matrix</span>
                  </div>
                  <span className="text-[10px] text-text-muted font-mono">MongoDB Dynamic Schema Detection</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-surface-high/40 text-[10px] font-bold text-text-muted uppercase">
                        <th className="p-3">Field Name</th>
                        <th className="p-3">Data Types</th>
                        <th className="p-3">Presence</th>
                        <th className="p-3">Index Status</th>
                        <th className="p-3">Sample Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {collectionMeta?.detectedFields?.map((field) => (
                        <tr key={field.name} className="hover:bg-surface-high/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-text-main">
                            {field.name}
                            {field.isPolymorphic && (
                              <span className="ml-2 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                                Polymorphic
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {field.types.map((t) => (
                                <span
                                  key={t}
                                  className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-primary/10 text-primary border border-primary/20"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-surface-high rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    field.presencePercent === 100 ? 'bg-emerald-500' : 'bg-primary'
                                  }`}
                                  style={{ width: `${field.presencePercent}%` }}
                                />
                              </div>
                              <span className="font-mono text-[10px] font-bold text-text-muted">
                                {field.presencePercent}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            {field.isIndexed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <Zap className="w-3 h-3" />
                                <span>Indexed</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-text-muted">Unindexed</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-text-muted max-w-[200px] truncate">
                            {typeof field.exampleValue === 'object'
                              ? JSON.stringify(field.exampleValue)
                              : String(field.exampleValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Indexes Card */}
              {collectionMeta?.indexes && collectionMeta.indexes.length > 0 && (
                <div className="bg-surface rounded-2xl border border-border p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-text-main uppercase tracking-wider">Active MongoDB Indexes ({collectionMeta.indexes.length})</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {collectionMeta.indexes.map((idx) => (
                      <div key={idx.name} className="p-3 rounded-xl bg-surface-low border border-border flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-primary truncate">{idx.name}</span>
                          {idx.unique && (
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-bold">Unique</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-text-muted truncate">
                          Keys: {JSON.stringify(idx.key)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Schema Field Inspector & Playground Link (Span 3 ~25%)      */}
        {/* ========================================================================= */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          {/* Quick MQL Playground CTA */}
          <Link
            href="/playground"
            className="bg-primary text-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">Open in Playground</span>
                <span className="text-[11px] text-white/80">Query with Monaco MQL Editor</span>
              </div>
            </div>
            <span className="text-white group-hover:translate-x-1 transition-transform">&rarr;</span>
          </Link>

          {/* Detected Fields Schema Panel */}
          <div className="bg-surface-low rounded-2xl p-4 border border-border shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Detected Fields
              </span>
              <span className="text-[10px] font-mono text-text-muted bg-surface px-2 py-0.5 rounded-full">
                Flexible Schema
              </span>
            </div>

            {collectionMeta?.detectedFields && collectionMeta.detectedFields.length > 0 ? (
              <div className="flex flex-col divide-y divide-border/60">
                {collectionMeta.detectedFields.map((field) => (
                  <div key={field.name} className="py-2 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-text-main">{field.name}</span>
                      <span className="text-[10px] font-mono bg-primary-fixed text-primary px-1.5 py-0.2 rounded font-semibold">
                        {field.types.join(' | ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-text-muted">
                      <span>Presence: {field.presencePercent}%</span>
                      {field.isArray && <span className="text-secondary font-bold">Array</span>}
                      {field.isObjectId && <span className="text-tertiary font-bold">ID</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-text-muted">
                Inspect a collection to view automatically detected fields and data types.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}
      {/* Create Database Modal */}
      <Modal
        isOpen={showCreateDbModal}
        onClose={() => setShowCreateDbModal(false)}
        title="Create Virtual Database"
        description="Enter a name for your virtual database. It will be securely isolated in its own namespace."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateDbModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDatabase}>
              Create
            </Button>
          </>
        }
      >
        <Input
          placeholder="e.g. HospitalDB, ECommerceDB"
          value={newDbName}
          onChange={(e) => setNewDbName(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreateDatabase();
          }}
        />
      </Modal>

      {/* Create Collection Modal */}
      <Modal
        isOpen={showCreateColModal}
        onClose={() => setShowCreateColModal(false)}
        title="Create New Collection"
        description={`Add a collection inside ${activeDb?.name || 'the active database'}.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateColModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCollection}>
              Create Collection
            </Button>
          </>
        }
      >
        <Input
          placeholder="e.g. orders, patients, inventory"
          value={newColName}
          onChange={(e) => setNewColName(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreateCollection();
          }}
        />
      </Modal>

      {/* Insert Document Modal */}
      <Modal
        isOpen={showInsertDocModal}
        onClose={() => setShowInsertDocModal(false)}
        title={`Insert Document • ${activeCollection}`}
        description="Enter a valid JSON document to insert into the active collection."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowInsertDocModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertDocument}>
              Insert
            </Button>
          </>
        }
      >
        <Textarea
          rows={8}
          value={newDocJson}
          onChange={(e) => setNewDocJson(e.target.value)}
          className="font-mono text-xs"
        />
      </Modal>

      {/* Edit Document Modal */}
      <Modal
        isOpen={!!editingDoc}
        onClose={() => setEditingDoc(null)}
        title={`Edit Document • ${editingDoc?._id || ''}`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingDoc(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDocument}>
              Save Changes
            </Button>
          </>
        }
      >
        <Textarea
          rows={8}
          value={editDocJson}
          onChange={(e) => setEditDocJson(e.target.value)}
          className="font-mono text-xs"
        />
      </Modal>
    </div>
  );
}
