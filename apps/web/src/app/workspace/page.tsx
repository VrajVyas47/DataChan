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
} from 'lucide-react';

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [databases, setDatabases] = useState<VirtualDatabase[]>([]);
  const [activeDb, setActiveDb] = useState<VirtualDatabase | null>(null);
  const [collections, setCollections] = useState<CollectionMetadata[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [collectionMeta, setCollectionMeta] = useState<CollectionMetadata | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table' | 'json'>('card');
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
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-text-muted">Loading workspace explorer...</span>
        </div>
      </div>
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
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4" />
          </button>
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
              <button
                onClick={() => setShowCreateDbModal(true)}
                className="w-8 h-8 rounded-full bg-surface hover:bg-surface-high border border-border flex items-center justify-center text-primary hover:scale-105 transition-all"
                title="Create Database"
              >
                <Plus className="w-4 h-4" />
              </button>
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
                <button
                  onClick={() => setShowCreateDbModal(true)}
                  className="block mx-auto mt-2 text-primary font-bold hover:underline"
                >
                  + Create Database
                </button>
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

                          <button
                            onClick={() => setShowCreateColModal(true)}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-primary font-semibold hover:underline mt-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Collection</span>
                          </button>
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
              <div className="flex items-center bg-surface p-1 rounded-full border border-border">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded-full transition-colors ${
                    viewMode === 'card' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main'
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-full transition-colors ${
                    viewMode === 'table' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main'
                  }`}
                  title="Table View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('json')}
                  className={`p-1.5 rounded-full transition-colors ${
                    viewMode === 'json' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main'
                  }`}
                  title="JSON View"
                >
                  <Code2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Insert Doc Button */}
              {activeCollection && (
                <button
                  onClick={() => setShowInsertDocModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert</span>
                </button>
              )}
            </div>
          </div>

          {/* Document Content Container */}
          {docsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-text-muted text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span>Fetching documents from MongoDB...</span>
            </div>
          ) : !activeCollection ? (
            <div className="bg-surface rounded-2xl p-12 border border-border text-center flex flex-col items-center gap-3">
              <Folder className="w-12 h-12 text-text-muted/30" />
              <h4 className="text-base font-bold text-text-main">No Collection Selected</h4>
              <p className="text-xs text-text-muted max-w-sm">
                Select a collection from the explorer tree on the left, or create a new collection to insert documents.
              </p>
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-surface rounded-2xl p-12 border border-border text-center flex flex-col items-center gap-3">
              <FileText className="w-12 h-12 text-text-muted/30" />
              <h4 className="text-base font-bold text-text-main">No Documents Found</h4>
              <p className="text-xs text-text-muted max-w-sm">
                This collection is currently empty. Insert your first BSON document or run an MQL insert in the playground.
              </p>
              <button
                onClick={() => setShowInsertDocModal(true)}
                className="mt-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
              >
                + Insert First Document
              </button>
            </div>
          ) : viewMode === 'card' ? (
            /* Card View */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc._id}
                  className="bg-surface rounded-xl p-4 border border-border hover:border-primary/40 hover:shadow-soft transition-all flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <span className="font-mono text-[11px] text-primary font-bold truncate max-w-[150px]">
                        _id: {doc._id}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(doc)}
                          className="p-1 rounded hover:bg-surface-high text-text-muted hover:text-text-main"
                          title="Edit Document"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc._id)}
                          className="p-1 rounded hover:bg-error-container text-text-muted hover:text-error"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                </div>
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
                          <button
                            onClick={() => openEditModal(doc)}
                            className="p-1 rounded hover:bg-surface-high text-text-muted hover:text-text-main"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc._id)}
                            className="p-1 rounded hover:bg-error-container text-text-muted hover:text-error"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* JSON View */
            <div className="bg-inverse-surface rounded-2xl p-4 overflow-x-auto text-inverse-text font-mono text-xs shadow-md max-h-[500px]">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(documents, null, 2)}
              </pre>
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
      {showCreateDbModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 border border-border shadow-popover flex flex-col gap-4">
            <h3 className="text-base font-bold text-text-main">Create Virtual Database</h3>
            <p className="text-xs text-text-muted">
              Enter a name for your virtual database. It will be securely isolated in its own namespace.
            </p>
            <input
              type="text"
              placeholder="e.g. HospitalDB, ECommerceDB"
              value={newDbName}
              onChange={(e) => setNewDbName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-low border border-border text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateDbModal(false)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-text-muted hover:bg-surface-high"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDatabase}
                className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Collection Modal */}
      {showCreateColModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 border border-border shadow-popover flex flex-col gap-4">
            <h3 className="text-base font-bold text-text-main">Create New Collection</h3>
            <p className="text-xs text-text-muted">
              Add a collection inside <strong>{activeDb?.name}</strong>.
            </p>
            <input
              type="text"
              placeholder="e.g. orders, patients, inventory"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-low border border-border text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateColModal(false)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-text-muted hover:bg-surface-high"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90"
              >
                Create Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Document Modal */}
      {showInsertDocModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 border border-border shadow-popover flex flex-col gap-4">
            <h3 className="text-base font-bold text-text-main">
              Insert Document &bull; {activeCollection}
            </h3>
            <p className="text-xs text-text-muted">
              Enter a valid JSON document to insert into the active collection.
            </p>
            <textarea
              rows={8}
              value={newDocJson}
              onChange={(e) => setNewDocJson(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl bg-surface-low border border-border text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowInsertDocModal(false)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-text-muted hover:bg-surface-high"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertDocument}
                className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 border border-border shadow-popover flex flex-col gap-4">
            <h3 className="text-base font-bold text-text-main">
              Edit Document &bull; <span className="font-mono text-xs">{editingDoc._id}</span>
            </h3>
            <textarea
              rows={8}
              value={editDocJson}
              onChange={(e) => setEditDocJson(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl bg-surface-low border border-border text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingDoc(null)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-text-muted hover:bg-surface-high"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDocument}
                className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
