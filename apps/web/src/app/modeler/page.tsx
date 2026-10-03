'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
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
  ModelRelationship,
  ModelField,
  FieldDataType,
  DesignFeedbackItem,
  VirtualDatabase,
  ApplyStructureResult,
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
  Lock,
  Unlock,
  Download,
  ExternalLink,
  X,
  ShieldCheck,
  Check,
  Info,
} from 'lucide-react';
import {
  Button,
  Modal,
  Input,
  Select,
} from '@/components/ui';
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
            <div
              role="button"
              onClick={() => data.onRename?.(id)}
              className="font-black text-xs truncate tracking-tight text-left hover:text-primary transition-colors cursor-pointer"
              title="Click to rename collection node"
            >
              {data.name}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Size Switchers */}
            <div className="flex items-center gap-0.5 bg-surface-high px-1 py-0.5 rounded-lg border border-border text-[9px] font-bold text-text-muted">
              <div
                role="button"
                onClick={() => setPresetWidth(240)}
                className={`px-1 py-0.5 rounded cursor-pointer ${nodeWidth <= 260 ? 'bg-primary text-white' : 'hover:text-text'}`}
                title="Compact (240px)"
              >
                S
              </div>
              <div
                role="button"
                onClick={() => setPresetWidth(340)}
                className={`px-1 py-0.5 rounded cursor-pointer ${nodeWidth > 260 && nodeWidth <= 380 ? 'bg-primary text-white' : 'hover:text-text'}`}
                title="Standard (340px)"
              >
                M
              </div>
              <div
                role="button"
                onClick={() => setPresetWidth(460)}
                className={`px-1 py-0.5 rounded cursor-pointer ${nodeWidth > 380 ? 'bg-primary text-white' : 'hover:text-text'}`}
                title="Spacious (460px)"
              >
                L
              </div>
            </div>

            <Button
              variant="ghost"
              size="xs"
              onClick={() => data.onDelete(id)}
              className="text-text-muted hover:text-red-500 hover:bg-surface-high !p-1 !h-auto min-w-0"
              title="Delete Collection"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
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
                  <span className="text-[9px] bg-secondary/15 text-secondary px-1 py-0.2 rounded font-bold" title="Documented Required Field">
                    REQ
                  </span>
                )}
                <div
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onDeleteField?.(id, f.id);
                  }}
                  className="opacity-0 group-hover/field:opacity-100 text-text-muted hover:text-red-500 transition-opacity p-0.5 cursor-pointer"
                  title="Delete Field"
                >
                  <XCircle className="w-3 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: Add Field Button & Interactive Resize Drag Handle */}
      <div className="pt-2 border-t border-border flex items-center justify-between mt-auto">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => data.onAddField(id)}
          className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl"
        >
          <Plus className="w-3 h-3" />
          <span>Add Field</span>
        </Button>

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
      style={{ backgroundColor: 'var(--color-surface, #1e1e2d)' }}
      className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 p-1.5 rounded-2xl border border-border shadow-lg"
    >
      <Button
        variant="subtle"
        onClick={() => zoomIn({ duration: 300 })}
        className="w-8 h-8 !p-0 rounded-xl"
        title="Zoom In"
        aria-label="Zoom In"
      >
        <Plus className="w-4 h-4" />
      </Button>

      <Button
        variant="subtle"
        onClick={() => zoomOut({ duration: 300 })}
        className="w-8 h-8 !p-0 rounded-xl"
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <span className="font-bold text-base leading-none">−</span>
      </Button>

      <Button
        variant="subtle"
        onClick={() => fitView({ duration: 300, padding: 0.2 })}
        className="px-2.5 h-8 rounded-xl text-xs"
        title="Fit All Nodes in View"
        aria-label="Fit View"
      >
        Fit
      </Button>

      <div className="w-[1px] h-5 bg-border mx-0.5" />

      <Button
        variant={isLocked ? 'warning' : 'subtle'}
        onClick={() => setIsLocked(!isLocked)}
        className="px-2.5 h-8 rounded-xl"
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
      </Button>
    </div>
  );
}

const nodeTypes = {
  collectionNode: CollectionNode,
};

// Starter demo model used ONLY when the user has no persisted models for the selected DB
function getStarterModel(): {
  name: string;
  description: string;
  entities: ModelEntity[];
  relationships: ModelRelationship[];
} {
  return {
    name: 'E-Commerce Lab Model',
    description: 'Order, Customer, and Product document model',
    entities: [
      {
        id: 'node-users',
        name: 'customers',
        position: { x: 50, y: 50 },
        width: 320,
        fields: [
          { id: 'f1', name: '_id', type: 'ObjectId', isRequired: true },
          { id: 'f2', name: 'name', type: 'String', isRequired: true },
          { id: 'f3', name: 'email', type: 'String', isRequired: true },
          { id: 'f4', name: 'tier', type: 'String', isRequired: false },
        ],
      },
      {
        id: 'node-orders',
        name: 'orders',
        position: { x: 440, y: 120 },
        width: 340,
        fields: [
          { id: 'f5', name: '_id', type: 'ObjectId', isRequired: true },
          { id: 'f6', name: 'customerId', type: 'ObjectId', isRequired: true },
          { id: 'f7', name: 'totalAmount', type: 'Number', isRequired: true },
          { id: 'f8', name: 'items', type: 'Array', isRequired: true },
        ],
      },
    ],
    relationships: [
      {
        id: 'e-customers-orders',
        sourceEntityId: 'node-users',
        targetEntityId: 'node-orders',
        cardinality: '1:N',
        strategy: 'referenced',
      },
    ],
  };
}

// Convert ModelEntity to React Flow Node with required callbacks
function entityToNode(
  entity: ModelEntity,
  callbacks: {
    onDelete: (id: string) => void;
    onAddField: (id: string) => void;
    onDeleteField: (nodeId: string, fieldId: string) => void;
    onRename: (nodeId: string) => void;
    onResize: (nodeId: string, w: number, h: number | string) => void;
  }
): Node {
  const width = (entity as any).width || 320;
  return {
    id: entity.id,
    type: 'collectionNode',
    position: entity.position || { x: 50, y: 50 },
    style: { width: `${width}px` },
    data: {
      name: entity.name,
      width,
      fields: entity.fields || [],
      onDelete: callbacks.onDelete,
      onAddField: callbacks.onAddField,
      onDeleteField: callbacks.onDeleteField,
      onRename: callbacks.onRename,
      onResize: callbacks.onResize,
    },
  };
}

// Convert ModelRelationship to React Flow Edge
function relationshipToEdge(rel: ModelRelationship): Edge {
  const strategy = rel.strategy || 'referenced';
  const cardinality = rel.cardinality || '1:N';
  return {
    id: rel.id,
    source: rel.sourceEntityId,
    target: rel.targetEntityId,
    animated: true,
    label: `${cardinality} (${strategy})`,
    style: { stroke: 'var(--color-primary)', strokeWidth: 2 },
  };
}

export default function ModelerPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  const [savedModels, setSavedModels] = useState<DataModel[]>([]);
  const [modelName, setModelName] = useState('E-Commerce Lab Model');
  const [modelDescription, setModelDescription] = useState('Order, Customer, and Product document model');
  const [feedback, setFeedback] = useState<DesignFeedbackItem[]>([]);
  const [databases, setDatabases] = useState<VirtualDatabase[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // In-App Modal Dialog States (Replacing all window.prompt/confirm)
  const [showCreateColModal, setShowCreateColModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [colNameError, setColNameError] = useState<string | null>(null);

  const [showRenameColModal, setShowRenameColModal] = useState(false);
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [renamingColName, setRenamingColName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [addFieldNodeId, setAddFieldNodeId] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldDataType>('String');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [showConfirmImportModal, setShowConfirmImportModal] = useState(false);

  const [showApplyResultModal, setShowApplyResultModal] = useState(false);
  const [applyResultData, setApplyResultData] = useState<ApplyStructureResult | null>(null);

  // Deterministic validation helper
  const runValidation = useCallback(async (currNodes: Node[], currEdges: Edge[]) => {
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
  }, []);

  // Node dimension update
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

  // Delete an entire collection node and any connected edges
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const nextNodes = nds.filter((n) => n.id !== nodeId);
        setEdges((eds) => {
          const nextEdges = eds.filter((e) => e.source !== nodeId && e.target !== nodeId);
          runValidation(nextNodes, nextEdges);
          return nextEdges;
        });
        return nextNodes;
      });
    },
    [runValidation, setNodes, setEdges]
  );

  // Open in-app dialog to rename a collection node
  const handleRenameNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const targetNode = nds.find((n) => n.id === nodeId);
        if (targetNode) {
          setRenamingNodeId(nodeId);
          setRenamingColName((targetNode.data.name as string) || '');
          setRenameError(null);
          setShowRenameColModal(true);
        }
        return nds;
      });
    },
    [setNodes]
  );

  // Open in-app dialog to add a field
  const handleAddField = useCallback(
    (nodeId: string) => {
      setAddFieldNodeId(nodeId);
      setNewFieldName('');
      setNewFieldType('String');
      setNewFieldRequired(false);
      setFieldError(null);
      setShowAddFieldModal(true);
    },
    []
  );

  // Delete a specific field from a collection
  const handleDeleteField = useCallback(
    (nodeId: string, fieldId: string) => {
      setNodes((nds) => {
        const next = nds.map((n) => {
          if (n.id === nodeId) {
            const updatedFields = (n.data.fields as ModelField[]).filter((f) => f.id !== fieldId);
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
        setEdges((eds) => {
          runValidation(next, eds);
          return eds;
        });
        return next;
      });
    },
    [runValidation, setNodes, setEdges]
  );

  // Apply a model definition directly onto the canvas
  const applyModelToCanvas = useCallback(
    (model: {
      name: string;
      description?: string;
      entities: ModelEntity[];
      relationships: ModelRelationship[];
    }) => {
      const callbacks = {
        onDelete: handleDeleteNode,
        onAddField: handleAddField,
        onDeleteField: handleDeleteField,
        onRename: handleRenameNode,
        onResize: handleResizeNode,
      };

      const restoredNodes = (model.entities || []).map((ent) => entityToNode(ent, callbacks));
      const restoredEdges = (model.relationships || []).map(relationshipToEdge);

      setModelName(model.name || 'Untitled Model');
      setModelDescription(model.description || '');
      setNodes(restoredNodes);
      setEdges(restoredEdges);
      runValidation(restoredNodes, restoredEdges);
    },
    [
      handleDeleteNode,
      handleAddField,
      handleDeleteField,
      handleRenameNode,
      handleResizeNode,
      runValidation,
      setNodes,
      setEdges,
    ]
  );

  // Initial load: Fetch real DBs and persisted user data models from MongoDB
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch virtual databases
        const dbs = await api.listDatabases().catch(() => []);
        setDatabases(dbs);

        const initialDb = dbs.length > 0 ? dbs[0].id : '';
        setSelectedDb(initialDb);

        // 2. Fetch authenticated user's persisted data models filtered to initialDb
        const models = await api.listDataModels(initialDb || undefined).catch((err) => {
          console.error('Failed to list data models:', err);
          return [] as DataModel[];
        });

        setSavedModels(models);

        if (models && models.length > 0) {
          // A saved model exists for this database -> restore the most recently updated model
          const active = models[0];
          setCurrentModelId(active.id);
          applyModelToCanvas(active);
        } else {
          // No saved model exists -> mount the starter template
          setCurrentModelId(null);
          const starter = getStarterModel();
          if (dbs.length > 0) {
            starter.name = `${dbs[0].name} Model`;
          }
          applyModelToCanvas(starter);
        }
      } catch (err) {
        console.error('Failed to init modeler:', err);
      }
    }

    loadData();
  }, [applyModelToCanvas]);

  // Connect new edge
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
    [nodes, runValidation, setEdges]
  );

  // Click on edge to toggle relationship strategy between embedded and referenced
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setEdges((eds) => {
        const next = eds.map((e) => {
          if (e.id === edge.id) {
            const isCurrentlyEmbedded = e.label?.toString().includes('embedded');
            const nextLabel = isCurrentlyEmbedded ? '1:N (referenced)' : '1:N (embedded)';
            return {
              ...e,
              label: nextLabel,
            };
          }
          return e;
        });
        runValidation(nodes, next);
        return next;
      });
    },
    [nodes, runValidation, setEdges]
  );

  // Switch database context
  async function handleDatabaseChange(newDbId: string) {
    setSelectedDb(newDbId);
    try {
      const models = await api.listDataModels(newDbId).catch(() => []);
      setSavedModels(models);
      if (models.length > 0) {
        const active = models[0];
        setCurrentModelId(active.id);
        applyModelToCanvas(active);
      } else {
        setCurrentModelId(null);
        const starter = getStarterModel();
        const targetDb = databases.find((d) => d.id === newDbId);
        starter.name = `${targetDb?.name || 'Database'} Model`;
        applyModelToCanvas(starter);
      }
    } catch (err: any) {
      console.error('Failed to change database context:', err);
    }
  }

  // Switch between saved models or start a new one
  async function handleSelectModel(selectedId: string) {
    if (selectedId === '__new__') {
      setCurrentModelId(null);
      const starter = getStarterModel();
      const targetDb = databases.find((d) => d.id === selectedDb);
      starter.name = `${targetDb?.name || 'Database'} Model`;
      starter.description = '';
      applyModelToCanvas(starter);
      return;
    }

    const found = savedModels.find((m) => m.id === selectedId);
    if (found) {
      setCurrentModelId(found.id);
      applyModelToCanvas(found);
    } else {
      try {
        const fetched = await api.getDataModel(selectedId);
        setCurrentModelId(fetched.id);
        applyModelToCanvas(fetched);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load model');
        setTimeout(() => setErrorMsg(null), 4000);
      }
    }
  }

  // Save current canvas to MongoDB and update state with authoritative server response
  async function handleSaveModel() {
    setSaving(true);
    try {
      const entities: ModelEntity[] = nodes.map((n) => ({
        id: n.id,
        name: n.data.name as string,
        fields: n.data.fields as ModelField[],
        position: n.position,
        width: (n.data as any).width || 320,
      }));

      const relationships: ModelRelationship[] = edges.map((e) => {
        const isEmbedded = e.label?.toString().includes('embedded') ?? false;
        return {
          id: e.id,
          sourceEntityId: e.source,
          targetEntityId: e.target,
          cardinality: '1:N' as const,
          strategy: isEmbedded ? ('embedded' as const) : ('referenced' as const),
        };
      });

      const saved = await api.saveOrUpdateDataModel({
        id: currentModelId || undefined,
        databaseId: selectedDb || undefined,
        name: modelName.trim() || 'Untitled Model',
        description: modelDescription,
        entities,
        relationships,
      });

      // Update state with authoritative server response
      setCurrentModelId(saved.id);
      setModelName(saved.name);
      setModelDescription(saved.description || '');

      // Refresh saved models list from MongoDB scoped to current database
      const refreshedModels = await api.listDataModels(selectedDb || undefined).catch(() => [saved]);
      setSavedModels(refreshedModels);

      setStatusMsg(`Data model "${saved.name}" saved successfully!`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save data model');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  // In-app modal submit: Create Collection Node
  function handleCreateCollectionSubmit() {
    const trimmed = newColName.trim();
    if (!trimmed) {
      setColNameError('Collection name is required.');
      return;
    }
    if (trimmed.includes('$')) {
      setColNameError('Collection name cannot contain "$" symbol.');
      return;
    }
    if (trimmed.startsWith('system.')) {
      setColNameError('Collection name cannot start with "system." reserved prefix.');
      return;
    }

    const callbacks = {
      onDelete: handleDeleteNode,
      onAddField: handleAddField,
      onDeleteField: handleDeleteField,
      onRename: handleRenameNode,
      onResize: handleResizeNode,
    };

    const cleanName = trimmed.toLowerCase().replace(/\s+/g, '_');
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'collectionNode',
      position: { x: Math.random() * 250 + 100, y: Math.random() * 200 + 100 },
      style: { width: '320px' },
      data: {
        name: cleanName,
        width: 320,
        fields: [
          { id: `f_${Date.now()}_id`, name: '_id', type: 'ObjectId', isRequired: true },
          { id: `f_${Date.now()}_name`, name: 'name', type: 'String', isRequired: true },
        ],
        onDelete: callbacks.onDelete,
        onAddField: callbacks.onAddField,
        onDeleteField: callbacks.onDeleteField,
        onRename: callbacks.onRename,
        onResize: callbacks.onResize,
      },
    };

    setNodes((nds) => {
      const next = [...nds, newNode];
      runValidation(next, edges);
      return next;
    });

    setShowCreateColModal(false);
    setNewColName('');
    setColNameError(null);
  }

  // In-app modal submit: Rename Collection Node (Conceptual design rename only)
  function handleRenameCollectionSubmit() {
    if (!renamingNodeId) return;
    const trimmed = renamingColName.trim();
    if (!trimmed) {
      setRenameError('Collection name cannot be empty.');
      return;
    }
    if (trimmed.includes('$') || trimmed.startsWith('system.')) {
      setRenameError('Invalid collection name format.');
      return;
    }

    const cleanName = trimmed.toLowerCase().replace(/\s+/g, '_');
    setNodes((nds) => {
      const next = nds.map((n) => {
        if (n.id === renamingNodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              name: cleanName,
            },
          };
        }
        return n;
      });
      runValidation(next, edges);
      return next;
    });

    setShowRenameColModal(false);
    setRenamingNodeId(null);
    setRenamingColName('');
    setRenameError(null);
  }

  // In-app modal submit: Add Field to Collection Node
  function handleAddFieldSubmit() {
    if (!addFieldNodeId) return;
    const trimmed = newFieldName.trim();
    if (!trimmed) {
      setFieldError('Field name is required.');
      return;
    }
    if (trimmed.includes('.') || trimmed.includes('$')) {
      setFieldError('Field name cannot contain "." or "$".');
      return;
    }

    setNodes((nds) => {
      const next = nds.map((n) => {
        if (n.id === addFieldNodeId) {
          const currentFields = (n.data.fields as ModelField[]) || [];
          if (currentFields.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
            setFieldError(`Field "${trimmed}" already exists in this collection.`);
            return n;
          }

          const updatedFields: ModelField[] = [
            ...currentFields,
            {
              id: `f_${Date.now()}_${trimmed}`,
              name: trimmed,
              type: newFieldType,
              isRequired: newFieldRequired,
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

    setShowAddFieldModal(false);
    setAddFieldNodeId(null);
    setNewFieldName('');
    setFieldError(null);
  }

  // Import actual MongoDB collections & inferred fields from selected virtual database
  async function handleConfirmImport() {
    if (!selectedDb) {
      setErrorMsg('Please select a target database first.');
      setShowConfirmImportModal(false);
      return;
    }

    setImporting(true);
    try {
      const res = await api.importDatabaseStructure(selectedDb);
      const targetDb = databases.find((d) => d.id === selectedDb);

      const callbacks = {
        onDelete: handleDeleteNode,
        onAddField: handleAddField,
        onDeleteField: handleDeleteField,
        onRename: handleRenameNode,
        onResize: handleResizeNode,
      };

      const restoredNodes = res.entities.map((ent) => entityToNode(ent, callbacks));
      setNodes(restoredNodes);
      setEdges([]); // MongoDB has no rigid foreign keys; import starts with actual collections
      setModelName(`${targetDb?.name || 'Imported'} Real Schema`);
      setModelDescription(`Observed collections imported from ${targetDb?.name || 'database'}`);
      setCurrentModelId(null); // Fresh imported model ready to be saved

      runValidation(restoredNodes, []);
      setShowConfirmImportModal(false);
      setStatusMsg(`Imported ${res.collectionsCount} real collections from "${targetDb?.name || 'database'}"!`);
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(`Import failed: ${err.message}`);
      setTimeout(() => setErrorMsg(null), 4500);
    } finally {
      setImporting(false);
    }
  }

  // Apply model structure non-destructively to the real virtual database
  async function handleApplyStructure() {
    if (!selectedDb) {
      setErrorMsg('Please select a target database first.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    setApplying(true);
    try {
      const entities: ModelEntity[] = nodes.map((n) => ({
        id: n.id,
        name: n.data.name as string,
        fields: n.data.fields as ModelField[],
        position: n.position,
        width: (n.data as any).width || 320,
      }));

      const res = await api.applyStructureToDatabase(selectedDb, entities, currentModelId || undefined);
      setApplyResultData(res);
      setShowApplyResultModal(true);
      setStatusMsg(`Applied structure to "${databases.find((d) => d.id === selectedDb)?.name || 'database'}"!`);
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(`Failed to apply structure: ${err.message}`);
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setApplying(false);
    }
  }

  const selectedDbObj = databases.find((d) => d.id === selectedDb);
  const targetNodeForRename = nodes.find((n) => n.id === renamingNodeId);
  const targetNodeForField = nodes.find((n) => n.id === addFieldNodeId);

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
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setErrorMsg(null)}
            className="text-white/80 hover:text-white hover:bg-transparent ml-3 !p-1 !h-auto min-w-0"
          >
            ✕
          </Button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text flex items-center gap-2.5">
              <Boxes className="w-7 h-7 text-primary" />
              <span>Data Modeler</span>
            </h1>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              Design MongoDB document models (embedding vs referencing) linked to your real virtual databases.
            </p>
          </div>

          {/* Quick Context & Playground Link */}
          <div className="flex items-center gap-2">
            {selectedDb && (
              <Link
                href={`/playground?databaseId=${selectedDb}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface hover:bg-surface-high border border-border text-xs font-bold text-text transition-all"
                title="Open this database in Playground"
              >
                <ExternalLink className="w-3.5 h-3.5 text-primary" />
                <span>Open in Playground</span>
              </Link>
            )}

            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              leftIcon={<Plus className="w-3.5 h-3.5 text-primary" />}
              onClick={() => {
                setNewColName('');
                setColNameError(null);
                setShowCreateColModal(true);
              }}
            >
              Add Collection
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={handleSaveModel}
              disabled={saving}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              {saving ? 'Saving...' : 'Save Model'}
            </Button>
          </div>
        </div>

        {/* Toolbar: Database Selector, Saved Models, Import & Apply Structure */}
        <div className="flex items-center flex-wrap gap-2.5 bg-surface-low/50 p-2.5 rounded-2xl border border-border">
          {/* Target DB Selector */}
          <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-border">
            <Database className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-bold text-text-muted">Database:</span>
            <select
              value={selectedDb}
              onChange={(e) => handleDatabaseChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-text focus:outline-none cursor-pointer max-w-[170px] truncate"
              title="Select Linked Virtual Database"
              aria-label="Select Linked Virtual Database"
            >
              {databases.map((db) => (
                <option key={db.id} value={db.id} className="bg-surface text-text">
                  {db.name}
                </option>
              ))}
            </select>
          </div>

          {/* Saved Model Selector for this DB */}
          <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-border">
            <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-bold text-text-muted">Model:</span>
            <select
              value={currentModelId || '__new__'}
              onChange={(e) => handleSelectModel(e.target.value)}
              className="bg-transparent text-xs font-bold text-text focus:outline-none cursor-pointer max-w-[170px] truncate"
              title="Select Saved Model"
              aria-label="Select Saved Model"
            >
              {savedModels.map((m) => (
                <option key={m.id} value={m.id} className="bg-surface text-text">
                  {m.name}
                </option>
              ))}
              <option value="__new__" className="bg-surface text-text">
                + New Model
              </option>
            </select>
          </div>

          {/* Model Name Input */}
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="bg-surface hover:bg-surface-high focus:bg-surface border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-text focus:outline-none focus:ring-1 focus:ring-primary w-40 sm:w-52"
            placeholder="Model Name"
            title="Edit Model Name"
            aria-label="Model Name"
          />

          <div className="w-[1px] h-6 bg-border mx-1 hidden sm:block" />

          {/* Import from Database Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirmImportModal(true)}
            disabled={importing || !selectedDb}
            title="Inspect real MongoDB collections and infer representative document fields"
            leftIcon={<Download className="w-3.5 h-3.5 text-secondary" />}
          >
            {importing ? 'Importing...' : 'Import from Database'}
          </Button>

          {/* Apply Structure to Database Action */}
          <Button
            variant="primary"
            size="sm"
            className="hover:scale-[1.02]"
            onClick={handleApplyStructure}
            disabled={applying || !selectedDb}
            title="Safely create missing collections in your real virtual database without altering existing data"
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            {applying ? 'Applying...' : 'Apply Structure to Database'}
          </Button>
        </div>

        {/* Database Context Indicator Banner */}
        <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-1.5 bg-primary/5 rounded-xl border border-primary/20 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-text">
              Linked Database: <span className="font-mono text-primary font-black">{selectedDbObj?.name || 'None'}</span>
            </span>
            <span className="text-[11px] font-mono bg-surface px-2 py-0.5 rounded-md border border-border">
              {nodes.length} collections on canvas
            </span>
          </div>
          <span className="text-[11px] text-text-muted">
            MongoDB fields represent observed document properties, not rigid SQL columns.
          </span>
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
                onEdgeClick={onEdgeClick}
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
              <span>Tip: Click collection name to rename, click connection to toggle embed/ref, or drag corner to resize.</span>
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

      {/* ========================================================================= */}
      {/* IN-APP MODAL DIALOGS (Replacing all browser prompt/confirm/alert)          */}
      {/* ========================================================================= */}

      {/* 1. Create Collection Modal */}
      <Modal
        isOpen={showCreateColModal}
        onClose={() => setShowCreateColModal(false)}
        title="Add Collection Node"
        icon={<Boxes className="w-5 h-5 text-primary" />}
      >
        <p className="text-xs text-text-muted leading-relaxed">
          Define a new MongoDB collection node for your schema diagram. Collection names will be stored in clean lowercase with underscores.
        </p>

        <div className="flex flex-col gap-1.5 mt-2">
          <Input
            label="Collection Name"
            autoFocus
            placeholder="e.g. products, enrollments, audit_logs"
            value={newColName}
            onChange={(e) => {
              setNewColName(e.target.value);
              setColNameError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateCollectionSubmit();
            }}
            error={colNameError || undefined}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 mt-2">
          <Button
            variant="ghost"
            onClick={() => setShowCreateColModal(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateCollectionSubmit}
          >
            Create Collection Node
          </Button>
        </div>
      </Modal>

      {/* 2. Rename Collection Modal */}
      <Modal
        isOpen={showRenameColModal}
        onClose={() => setShowRenameColModal(false)}
        title="Rename Collection Node"
        icon={<Boxes className="w-5 h-5 text-primary" />}
      >
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-xs text-text-muted leading-relaxed flex items-start gap-2">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            <strong>Design-Only Action:</strong> Renaming this collection node updates your model design only. It does not rename or alter your live MongoDB database.
          </span>
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
          <Input
            label="New Collection Name"
            autoFocus
            placeholder="e.g. customers_v2"
            value={renamingColName}
            onChange={(e) => {
              setRenamingColName(e.target.value);
              setRenameError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameCollectionSubmit();
            }}
            error={renameError || undefined}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 mt-2">
          <Button
            variant="ghost"
            onClick={() => setShowRenameColModal(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenameCollectionSubmit}
          >
            Rename Node
          </Button>
        </div>
      </Modal>

      {/* 3. Add Field Modal */}
      <Modal
        isOpen={showAddFieldModal}
        onClose={() => setShowAddFieldModal(false)}
        title={`Add Field to "${String((targetNodeForField?.data as any)?.name || 'Collection')}"`}
        icon={<Plus className="w-5 h-5 text-primary" />}
      >
        <div className="flex flex-col gap-3 mt-2">
          <Input
            label="Field Name"
            autoFocus
            placeholder="e.g. status, totalAmount, tags, address"
            value={newFieldName}
            onChange={(e) => {
              setNewFieldName(e.target.value);
              setFieldError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddFieldSubmit();
            }}
            error={fieldError || undefined}
          />

          <Select
            label="BSON / Field Data Type"
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value as FieldDataType)}
            options={[
              { value: 'String', label: 'String (UTF-8 text)' },
              { value: 'Number', label: 'Number (Double / Int)' },
              { value: 'Boolean', label: 'Boolean (true / false)' },
              { value: 'Date', label: 'Date (ISODate timestamp)' },
              { value: 'ObjectId', label: 'ObjectId (MongoDB 12-byte identifier)' },
              { value: 'Array', label: 'Array (BSON list of items)' },
              { value: 'Object', label: 'Object (Embedded sub-document)' },
              { value: 'Decimal128', label: 'Decimal128 (High-precision currency)' },
            ]}
          />

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={newFieldRequired}
              onChange={(e) => setNewFieldRequired(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
            <span className="text-xs font-medium text-text">
              Mark as Intended Required Field (Design Documentation)
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 mt-2">
          <Button
            variant="ghost"
            onClick={() => setShowAddFieldModal(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddFieldSubmit}
          >
            Add Field
          </Button>
        </div>
      </Modal>

      {/* 4. Confirm Import Modal */}
      <Modal
        isOpen={showConfirmImportModal}
        onClose={() => setShowConfirmImportModal(false)}
        title="Import from Real Database"
        icon={<Download className="w-5 h-5 text-secondary" />}
      >
        <div className="flex flex-col gap-2.5 text-xs text-text-muted leading-relaxed">
          <p>
            This will inspect your real MongoDB database{' '}
            <strong className="text-text font-mono font-bold">
              &quot;{selectedDbObj?.name || 'Selected Database'}&quot;
            </strong>
            , analyze sample documents from each collection, and infer representative field names and types onto the canvas.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Notice:</strong> Importing will replace the entities currently on the canvas with the imported database structure. Any unsaved changes on the canvas will be overwritten.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 mt-2">
          <Button
            variant="ghost"
            onClick={() => setShowConfirmImportModal(false)}
            disabled={importing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmImport}
            disabled={importing}
            leftIcon={importing ? undefined : <Download className="w-3.5 h-3.5" />}
          >
            {importing ? 'Inspecting Database...' : 'Confirm Import'}
          </Button>
        </div>
      </Modal>

      {/* 5. Apply Structure Results Modal */}
      <Modal
        isOpen={showApplyResultModal && !!applyResultData}
        onClose={() => setShowApplyResultModal(false)}
        title="Database Structure Applied"
        icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />}
      >
        <div className="flex flex-col gap-3 text-xs leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
          <p className="text-text-muted">
            Applied safe, non-destructive structure changes to database{' '}
            <strong className="text-text font-mono font-bold">
              &quot;{selectedDbObj?.name || 'Target Database'}&quot;
            </strong>
            .
          </p>

          {/* Created Collections */}
          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-[11px] text-text-muted uppercase tracking-wider">
              Newly Created Collections ({applyResultData?.createdCollections.length})
            </span>
            {applyResultData?.createdCollections.length === 0 ? (
              <span className="text-[11px] text-text-muted italic bg-surface-low px-3 py-1.5 rounded-lg border border-border">
                No missing collections needed to be created.
              </span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {applyResultData?.createdCollections.map((c) => (
                  <span
                    key={c}
                    className="flex items-center gap-1 font-mono text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-lg font-bold"
                  >
                    <Check className="w-3 h-3" />
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Existing Collections */}
          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-[11px] text-text-muted uppercase tracking-wider">
              Existing Collections Preserved ({applyResultData?.existingCollections.length})
            </span>
            {applyResultData?.existingCollections.length === 0 ? (
              <span className="text-[11px] text-text-muted italic bg-surface-low px-3 py-1.5 rounded-lg border border-border">
                None
              </span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {applyResultData?.existingCollections.map((c) => (
                  <span
                    key={c}
                    className="font-mono text-[11px] bg-surface-high text-text border border-border px-2 py-0.5 rounded-lg"
                    title="Collection already existed; all documents were preserved untouched."
                  >
                    {c} <span className="text-text-muted font-sans text-[10px]">(data untouched)</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Skipped */}
          {applyResultData?.skippedEntities && applyResultData.skippedEntities.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[11px] text-amber-500 uppercase tracking-wider">
                Skipped Entities ({applyResultData.skippedEntities.length})
              </span>
              <div className="flex flex-col gap-1">
                {applyResultData.skippedEntities.map((s, idx) => (
                  <span key={idx} className="text-[11px] text-amber-600 dark:text-amber-400">
                    • {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-700 dark:text-emerald-400 text-[11px] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Safe & Non-Destructive:</strong> MongoDB collections were safely verified. No live documents were dropped, altered, or overwritten.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-2">
          <Link
            href={`/playground?databaseId=${selectedDb}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-high hover:bg-surface-elevated text-xs font-bold text-text transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
            <span>Query in Playground</span>
          </Link>

          <Button
            onClick={() => setShowApplyResultModal(false)}
          >
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
}
