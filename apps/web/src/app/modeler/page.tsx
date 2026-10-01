'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  NodeResizer,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '@/lib/api';
import {
  DataModel,
  ModelEntity,
  ModelField,
  FieldDataType,
  DesignFeedbackItem,
  VirtualDatabase,
} from '@datachan/shared-types';
import {
  Boxes,
  Plus,
  Minus,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Layers,
  Sparkles,
  Trash2,
  ArrowRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  GripHorizontal,
} from 'lucide-react';

// Custom Resizable React Flow Node for MongoDB Collections
const CollectionNode = ({ data, id, selected }: any) => {
  const [nodeWidth, setNodeWidth] = useState<number>(data.width || 320);
  const [nodeHeight, setNodeHeight] = useState<number | string>(data.height || 'auto');
  const isResizingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0, width: 320, height: 220 });

  const updateSize = (w: number, h: number | string) => {
    const clampedW = Math.max(240, Math.min(800, w));
    const clampedH = typeof h === 'number' ? Math.max(160, Math.min(900, h)) : h;
    setNodeWidth(clampedW);
    setNodeHeight(clampedH);
    if (data.onResize) {
      data.onResize(id, clampedW, clampedH);
    }
  };

  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isResizingRef.current = true;
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: nodeWidth,
      height: typeof nodeHeight === 'number' ? nodeHeight : 220,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const dx = moveEvent.clientX - startPosRef.current.x;
      const dy = moveEvent.clientY - startPosRef.current.y;
      updateSize(startPosRef.current.width + dx, startPosRef.current.height + dy);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const setPresetWidth = (w: number) => {
    updateSize(w, nodeHeight);
  };

  return (
    <div
      style={{
        width: `${nodeWidth}px`,
        minHeight: typeof nodeHeight === 'number' ? `${nodeHeight}px` : 'auto',
      }}
      className={`bg-surface rounded-2xl border-2 transition-shadow shadow-md p-3.5 text-text flex flex-col justify-between relative group ${
        selected ? 'border-primary shadow-lg ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
      }`}
    >
      <NodeResizer
        minWidth={240}
        minHeight={160}
        maxWidth={800}
        maxHeight={900}
        isVisible={selected}
        lineClassName="!border-primary !border-dashed"
        handleClassName="!w-3 !h-3 !bg-surface !border-2 !border-primary !rounded-md shadow-sm"
        onResize={(_, { width, height }) => {
          updateSize(width, height);
        }}
      />
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />

      {/* Header with Title, Width Presets, and Delete */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-1.5 truncate">
            <Boxes className="w-4 h-4 text-primary shrink-0" />
            <span className="font-black text-xs truncate tracking-tight">{data.name}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Size Switchers */}
            <div className="flex items-center gap-0.5 bg-surface-high px-1 py-0.5 rounded-lg border border-border text-[9px] font-bold text-text-muted">
              <button
                onClick={() => setPresetWidth(240)}
                className={`px-1 py-0.5 rounded ${nodeWidth <= 260 ? 'bg-primary text-white' : 'hover:text-text'}`}
                title="Compact (240px)"
              >
                S
              </button>
              <button
                onClick={() => setPresetWidth(340)}
                className={`px-1 py-0.5 rounded ${nodeWidth > 260 && nodeWidth <= 380 ? 'bg-primary text-white' : 'hover:text-text'}`}
                title="Standard (340px)"
              >
                M
              </button>
              <button
                onClick={() => setPresetWidth(460)}
                className={`px-1 py-0.5 rounded ${nodeWidth > 380 ? 'bg-primary text-white' : 'hover:text-text'}`}
                title="Spacious (460px)"
              >
                L
              </button>
            </div>

            <button
              onClick={() => data.onDelete(id)}
              className="text-text-muted hover:text-red-500 transition-colors p-1 rounded-md hover:bg-surface-high"
              title="Delete Collection"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Fields List */}
        <div className="flex flex-col gap-1.5 py-2.5 text-xs font-mono max-h-[280px] overflow-y-auto pr-1">
          {data.fields.map((f: ModelField) => (
            <div key={f.id} className="flex items-center justify-between gap-2 py-0.5 group/field">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0"></span>
                <span className="text-text-muted truncate font-medium">{f.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                  {f.type}
                </span>
                {f.isRequired && (
                  <span className="text-[9px] bg-secondary/15 text-secondary px-1 py-0.2 rounded font-bold">
                    REQ
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: Add Field Button & Interactive Resize Drag Handle */}
      <div className="pt-2 border-t border-border flex items-center justify-between mt-auto">
        <button
          onClick={() => data.onAddField(id)}
          className="flex items-center gap-1 py-1 px-2.5 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add Field</span>
        </button>

        {/* Diagonal Resize Grip Handle */}
        <div
          onMouseDown={startResize}
          className="w-5 h-5 flex items-center justify-center cursor-se-resize text-text-muted hover:text-primary transition-colors select-none"
          title="Drag to freely resize collection box width and height"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="13" cy="13" r="1.5" />
            <circle cx="13" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
            <circle cx="13" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="3" cy="13" r="1.5" />
          </svg>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
    </div>
  );
};

// Custom Theme-Aware Floating Canvas Toolbar
function CanvasToolbar({
  isLocked,
  setIsLocked,
}: {
  isLocked: boolean;
  setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div
      style={{ backgroundColor: 'var(--color-surface-elevated, #ffffff)' }}
      className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface-elevated border border-border shadow-lg text-text"
      role="toolbar"
      aria-label="Canvas Navigation Toolbar"
    >
      {/* Zoom In */}
      <button
        type="button"
        onClick={() => zoomIn({ duration: 250 })}
        className="w-8 h-8 rounded-xl flex items-center justify-center bg-surface hover:bg-surface-high text-text hover:text-primary border border-border transition-colors active:scale-95"
        title="Zoom In (+)"
        aria-label="Zoom In"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Zoom Out */}
      <button
        type="button"
        onClick={() => zoomOut({ duration: 250 })}
        className="w-8 h-8 rounded-xl flex items-center justify-center bg-surface hover:bg-surface-high text-text hover:text-primary border border-border transition-colors active:scale-95"
        title="Zoom Out (-)"
        aria-label="Zoom Out"
      >
        <Minus className="w-4 h-4" />
      </button>

      {/* Fit to View */}
      <button
        type="button"
        onClick={() => fitView({ padding: 0.2, duration: 400 })}
        className="w-8 h-8 rounded-xl flex items-center justify-center bg-surface hover:bg-surface-high text-text hover:text-primary border border-border transition-colors active:scale-95"
        title="Fit View"
        aria-label="Fit View"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-5 bg-border mx-0.5" />

      {/* Lock / Interactive Mode Toggle */}
      <button
        type="button"
        onClick={() => setIsLocked((prev) => !prev)}
        className={`flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold transition-all border ${
          isLocked
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
        }`}
        title={isLocked ? 'Canvas Locked (Click to allow movement)' : 'Interactive Mode (Click to lock positions)'}
        aria-label={isLocked ? 'Canvas Locked' : 'Interactive Mode'}
      >
        {isLocked ? (
          <>
            <Lock className="w-3.5 h-3.5" />
            <span className="text-[11px]">Locked</span>
          </>
        ) : (
          <>
            <Unlock className="w-3.5 h-3.5" />
            <span className="text-[11px]">Interactive</span>
          </>
        )}
      </button>
    </div>
  );
}

const nodeTypes = {
  collectionNode: CollectionNode,
};

export default function ModelerPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [modelName, setModelName] = useState('E-Commerce Lab Model');
  const [modelDescription, setModelDescription] = useState('Order, Customer, and Product document model');
  const [feedback, setFeedback] = useState<DesignFeedbackItem[]>([]);
  const [databases, setDatabases] = useState<VirtualDatabase[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const handleResizeNode = useCallback((nodeId: string, newWidth: number, newHeight: number | string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            style: {
              ...n.style,
              width: newWidth,
              height: typeof newHeight === 'number' ? newHeight : undefined,
            },
            data: {
              ...n.data,
              width: newWidth,
              height: newHeight,
            },
          };
        }
        return n;
      })
    );
  }, [setNodes]);

  // Initial starter data model
  useEffect(() => {
    async function loadData() {
      try {
        const dbs = await api.listDatabases();
        setDatabases(dbs);
        if (dbs.length > 0) setSelectedDb(dbs[0].id);

        // Seed default starter nodes with customizable dimensions
        const initialNodes: Node[] = [
          {
            id: 'node-users',
            type: 'collectionNode',
            position: { x: 50, y: 50 },
            data: {
              name: 'customers',
              width: 320,
              fields: [
                { id: 'f1', name: '_id', type: 'ObjectId', isRequired: true },
                { id: 'f2', name: 'name', type: 'String', isRequired: true },
                { id: 'f3', name: 'email', type: 'String', isRequired: true },
                { id: 'f4', name: 'tier', type: 'String', isRequired: false },
              ],
              onDelete: handleDeleteNode,
              onAddField: handleAddField,
              onResize: handleResizeNode,
            },
          },
          {
            id: 'node-orders',
            type: 'collectionNode',
            position: { x: 440, y: 120 },
            data: {
              name: 'orders',
              width: 340,
              fields: [
                { id: 'f5', name: '_id', type: 'ObjectId', isRequired: true },
                { id: 'f6', name: 'customerId', type: 'ObjectId', isRequired: true },
                { id: 'f7', name: 'totalAmount', type: 'Number', isRequired: true },
                { id: 'f8', name: 'items', type: 'Array', isRequired: true },
              ],
              onDelete: handleDeleteNode,
              onAddField: handleAddField,
              onResize: handleResizeNode,
            },
          },
        ];

        const initialEdges: Edge[] = [
          {
            id: 'e-customers-orders',
            source: 'node-users',
            target: 'node-orders',
            animated: true,
            label: '1:N (referenced)',
            style: { stroke: 'var(--color-primary)', strokeWidth: 2 },
          },
        ];

        setNodes(initialNodes);
        setEdges(initialEdges);
        runValidation(initialNodes, initialEdges);
      } catch (err) {
        console.error('Failed to init modeler:', err);
      }
    }
    loadData();
  }, [handleResizeNode]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const next = addEdge(
          {
            ...params,
            animated: true,
            label: '1:N (embedded)',
            style: { stroke: 'var(--color-primary)', strokeWidth: 2 },
          },
          eds
        );
        runValidation(nodes, next);
        return next;
      });
    },
    [nodes]
  );

  function handleDeleteNode(nodeId: string) {
    setNodes((nds) => {
      const next = nds.filter((n) => n.id !== nodeId);
      runValidation(next, edges);
      return next;
    });
  }

  function handleAddField(nodeId: string) {
    const fieldName = prompt('Enter new field name (e.g. status, createdAt, tags):');
    if (!fieldName || !fieldName.trim()) return;

    const fieldType = (prompt(
      'Enter field type: String, Number, Boolean, Date, ObjectId, Array, Object'
    ) || 'String') as FieldDataType;

    setNodes((nds) => {
      const next = nds.map((n) => {
        if (n.id === nodeId) {
          const updatedFields = [
            ...(n.data.fields as ModelField[]),
            {
              id: `f_${Date.now()}`,
              name: fieldName.trim(),
              type: fieldType,
              isRequired: false,
            },
          ];
          return {
            ...n,
            data: {
              ...n.data,
              fields: updatedFields,
            },
          };
        }
        return n;
      });
      runValidation(next, edges);
      return next;
    });
  }

  function handleAddCollection() {
    const name = prompt('Enter new collection name (e.g. products, reviews):');
    if (!name || !name.trim()) return;

    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'collectionNode',
      position: { x: Math.random() * 250 + 100, y: Math.random() * 200 + 100 },
      data: {
        name: name.trim(),
        width: 300,
        fields: [
          { id: `f_${Date.now()}_id`, name: '_id', type: 'ObjectId', isRequired: true },
          { id: `f_${Date.now()}_title`, name: 'title', type: 'String', isRequired: true },
        ],
        onDelete: handleDeleteNode,
        onAddField: handleAddField,
        onResize: handleResizeNode,
      },
    };

    setNodes((nds) => {
      const next = [...nds, newNode];
      runValidation(next, edges);
      return next;
    });
  }

  async function runValidation(currNodes: Node[], currEdges: Edge[]) {
    const entities = currNodes.map((n) => ({
      id: n.id,
      name: n.data.name as string,
      fields: n.data.fields as ModelField[],
      position: n.position,
    }));

    const relationships = currEdges.map((e) => ({
      id: e.id,
      sourceEntityId: e.source,
      targetEntityId: e.target,
      cardinality: '1:N' as const,
      strategy: e.label?.toString().includes('embedded') ? ('embedded' as const) : ('referenced' as const),
    }));

    try {
      const fb = await api.validateDataModel(entities, relationships);
      setFeedback(fb);
    } catch {}
  }

  async function handleSaveModel() {
    setSaving(true);
    try {
      const entities = nodes.map((n) => ({
        id: n.id,
        name: n.data.name as string,
        fields: n.data.fields as ModelField[],
        position: n.position,
      }));

      const relationships = edges.map((e) => ({
        id: e.id,
        sourceEntityId: e.source,
        targetEntityId: e.target,
        cardinality: '1:N' as const,
        strategy: e.label?.toString().includes('embedded') ? ('embedded' as const) : ('referenced' as const),
      }));

      await api.saveOrUpdateDataModel({
        name: modelName,
        description: modelDescription,
        entities,
        relationships,
      });

      setStatusMsg('Data model saved successfully!');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save data model');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateStructure() {
    if (!selectedDb) {
      setErrorMsg('Please select a target database first.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }
    setGenerating(true);
    try {
      const entities = nodes.map((n) => ({
        id: n.id,
        name: n.data.name as string,
        fields: n.data.fields as ModelField[],
        position: n.position,
      }));

      const relationships = edges.map((e) => ({
        id: e.id,
        sourceEntityId: e.source,
        targetEntityId: e.target,
        cardinality: '1:N' as const,
        strategy: e.label?.toString().includes('embedded') ? ('embedded' as const) : ('referenced' as const),
      }));

      const saved = await api.saveOrUpdateDataModel({
        name: modelName,
        description: modelDescription,
        entities,
        relationships,
      });

      const genRes = await api.generateMongoStructure(saved.id, selectedDb);
      setStatusMsg(
        `Generated ${genRes.collections.length} collections with sample BSON documents in your target database!`
      );
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(`Generation failed: ${err.message}`);
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full flex-1 pb-20">
      {/* Toast Notice */}
      {statusMsg && (
        <div className="bg-emerald-600 text-white px-5 py-3 rounded-full text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMsg}</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/90 text-white px-5 py-3 rounded-full text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-white/80 hover:text-white text-xs ml-3 font-mono">✕</button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-primary" />
            <span>ER / Data Model Builder</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Design MongoDB document models (embedding vs referencing) with freely resizable entity boxes.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Target DB Selector */}
          <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-full border border-border">
            <Database className="w-3.5 h-3.5 text-primary" />
            <select
              value={selectedDb}
              onChange={(e) => setSelectedDb(e.target.value)}
              className="bg-transparent text-xs font-bold text-text focus:outline-none cursor-pointer"
            >
              {databases.map((db) => (
                <option key={db.id} value={db.id} className="bg-surface text-text">
                  Target: {db.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddCollection}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface hover:bg-surface-high border border-border text-xs font-bold text-text transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Collection</span>
          </button>

          <button
            onClick={handleSaveModel}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface hover:bg-surface-high border border-border text-xs font-bold text-text transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Model'}</span>
          </button>

          <button
            onClick={handleGenerateStructure}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md hover:scale-105 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{generating ? 'Generating...' : 'Generate MongoDB Structure'}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Modeler Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        {/* ========================================================================= */}
        {/* LEFT / CENTER: React Flow Canvas (~70%)                                   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="h-[600px] w-full rounded-3xl border-2 border-border shadow-soft overflow-hidden bg-surface relative">
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                nodesDraggable={!isLocked}
                nodesConnectable={!isLocked}
                elementsSelectable={!isLocked}
                fitView
              >
                <Background color="var(--color-border)" gap={20} />
                <Controls className="!bg-surface !border-border !rounded-2xl overflow-hidden shadow-md" />
                <MiniMap
                  className="!bg-surface !border-border !rounded-2xl overflow-hidden shadow-md"
                  nodeColor="var(--color-primary)"
                />
              </ReactFlow>

              {/* Explicit Theme-Aware Floating Canvas Toolbar (Zoom, Fit, Lock/Unlock) */}
              <CanvasToolbar isLocked={isLocked} setIsLocked={setIsLocked} />
            </ReactFlowProvider>

            <div
              style={{ backgroundColor: 'var(--color-surface-elevated, #ffffff)' }}
              className="absolute top-4 left-4 z-10 bg-surface-elevated px-3.5 py-2 rounded-2xl border border-border text-[11px] font-mono shadow-sm flex items-center gap-2 text-text"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Tip: Click collection to reveal resize handles, or drag corner / use S/M/L presets.</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Design Feedback Rules Panel (~30%)                          */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-surface rounded-3xl p-5 border border-border shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                  Deterministic Design Feedback
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                {feedback.length} checks
              </span>
            </div>

            {feedback.length === 0 ? (
              <div className="text-xs text-text-muted py-6 text-center">
                Add collections and relationships on the canvas to trigger automated data modeling checks.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                {feedback.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs leading-relaxed ${
                      item.type === 'correct'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                        : item.type === 'consideration'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {item.type === 'correct' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : item.type === 'consideration' ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div>
                      {item.entityName && (
                        <span className="font-bold font-mono text-[11px] block">
                          [{item.entityName}]
                        </span>
                      )}
                      <span>{item.message}</span>
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
