'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

// Custom React Flow Node for MongoDB Collections
const CollectionNode = ({ data, id }: any) => {
  return (
    <div className="bg-surface rounded-2xl border-2 border-primary/40 shadow-soft p-3.5 min-w-[220px] max-w-[260px] text-text-main flex flex-col gap-2.5">
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="flex items-center justify-between pb-1.5 border-b border-border">
        <div className="flex items-center gap-1.5 truncate">
          <Boxes className="w-4 h-4 text-primary shrink-0" />
          <span className="font-extrabold text-xs truncate">{data.name}</span>
        </div>
        <button
          onClick={() => data.onDelete(id)}
          className="text-text-muted hover:text-error transition-colors p-0.5"
          title="Delete Collection"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-col gap-1 text-[11px] font-mono">
        {data.fields.map((f: ModelField) => (
          <div key={f.id} className="flex items-center justify-between gap-2 py-0.5">
            <span className="text-text-muted truncate max-w-[120px]">{f.name}</span>
            <span className="text-[10px] bg-primary-fixed text-primary px-1.5 py-0.2 rounded font-semibold shrink-0">
              {f.type}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => data.onAddField(id)}
        className="mt-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
      >
        <Plus className="w-3 h-3" />
        <span>Add Field</span>
      </button>

      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
};

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

  // Initial starter data model
  useEffect(() => {
    async function loadData() {
      try {
        const dbs = await api.listDatabases();
        setDatabases(dbs);
        if (dbs.length > 0) setSelectedDb(dbs[0].id);

        // Seed default starter nodes
        const initialNodes: Node[] = [
          {
            id: 'node-users',
            type: 'collectionNode',
            position: { x: 50, y: 50 },
            data: {
              name: 'customers',
              fields: [
                { id: 'f1', name: '_id', type: 'ObjectId', isRequired: true },
                { id: 'f2', name: 'name', type: 'String', isRequired: true },
                { id: 'f3', name: 'email', type: 'String', isRequired: true },
                { id: 'f4', name: 'tier', type: 'String', isRequired: false },
              ],
              onDelete: handleDeleteNode,
              onAddField: handleAddField,
            },
          },
          {
            id: 'node-orders',
            type: 'collectionNode',
            position: { x: 380, y: 120 },
            data: {
              name: 'orders',
              fields: [
                { id: 'f5', name: '_id', type: 'ObjectId', isRequired: true },
                { id: 'f6', name: 'customerId', type: 'ObjectId', isRequired: true },
                { id: 'f7', name: 'totalAmount', type: 'Number', isRequired: true },
                { id: 'f8', name: 'items', type: 'Array', isRequired: true },
              ],
              onDelete: handleDeleteNode,
              onAddField: handleAddField,
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
  }, []);

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
        fields: [
          { id: `f_${Date.now()}_id`, name: '_id', type: 'ObjectId', isRequired: true },
          { id: `f_${Date.now()}_title`, name: 'title', type: 'String', isRequired: true },
        ],
        onDelete: handleDeleteNode,
        onAddField: handleAddField,
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
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateStructure() {
    if (!selectedDb) {
      alert('Please select a target database first.');
      return;
    }
    setGenerating(true);
    try {
      // First save model to get ID
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
      alert(`Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full flex-1">
      {/* Toast Notice */}
      {statusMsg && (
        <div className="bg-tertiary-container text-white px-4 py-2.5 rounded-full text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMsg}</span>
          </div>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-main flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-primary" />
            <span>ER / Data Model Builder</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Design MongoDB document models (embedding vs referencing) and automatically generate database collections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Target DB Selector */}
          <div className="flex items-center gap-2 bg-surface-low px-3 py-1.5 rounded-full border border-border">
            <Database className="w-3.5 h-3.5 text-primary" />
            <select
              value={selectedDb}
              onChange={(e) => setSelectedDb(e.target.value)}
              className="bg-transparent text-xs font-bold text-text-main focus:outline-none cursor-pointer"
            >
              {databases.map((db) => (
                <option key={db.id} value={db.id} className="bg-surface text-text-main">
                  Target: {db.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddCollection}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-high hover:bg-surface-low border border-border text-xs font-bold text-text-main transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Collection</span>
          </button>

          <button
            onClick={handleSaveModel}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-high hover:bg-surface-low border border-border text-xs font-bold text-text-main transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Model'}</span>
          </button>

          <button
            onClick={handleGenerateStructure}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md hover:scale-105 transition-all disabled:opacity-50"
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
          <div className="h-[560px] w-full rounded-2xl border-2 border-border shadow-soft overflow-hidden bg-surface-low relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background color="var(--color-border)" gap={16} />
              <Controls className="!bg-surface !border-border !rounded-xl overflow-hidden" />
              <MiniMap
                className="!bg-surface !border-border !rounded-xl overflow-hidden"
                nodeColor="var(--color-primary)"
              />
            </ReactFlow>

            <div className="absolute top-3 left-3 bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border text-[11px] font-mono font-medium shadow-sm">
              Connect handles to declare relationships (Embedding vs Referencing)
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Design Feedback Rules Panel (~30%)                          */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                  Deterministic Design Feedback
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-primary-fixed text-primary px-2 py-0.5 rounded-full font-bold">
                {feedback.length} checks
              </span>
            </div>

            {feedback.length === 0 ? (
              <div className="text-xs text-text-muted py-4 text-center">
                Add collections and relationships on the canvas to trigger automated data modeling checks.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[480px] overflow-y-auto pr-1">
                {feedback.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs leading-relaxed ${
                      item.type === 'correct'
                        ? 'bg-tertiary-container/10 border-tertiary/30 text-tertiary'
                        : item.type === 'consideration'
                        ? 'bg-secondary-container/10 border-secondary/30 text-secondary'
                        : 'bg-error/10 border-error/30 text-error'
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
