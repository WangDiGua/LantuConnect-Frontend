import React, { useCallback, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  NodeTypes,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Theme } from '../../types';
import { motion } from 'framer-motion';
import { Play, Save, Plus, Trash2 } from 'lucide-react';

export interface WorkflowNode extends Node {
  data: {
    label: string;
    type: 'start' | 'process' | 'decision' | 'end';
    config?: Record<string, any>;
  };
}

interface WorkflowEditorProps {
  theme: Theme;
  workflowId?: string;
  initialNodes?: WorkflowNode[];
  initialEdges?: Edge[];
  onSave?: (nodes: WorkflowNode[], edges: Edge[]) => void;
  onExecute?: () => void;
  readOnly?: boolean;
}

const nodeTypes: NodeTypes = {
  start: ({ data }) => (
    <div className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold text-sm shadow-lg">
      {data.label}
    </div>
  ),
  process: ({ data }) => (
    <div className="px-4 py-2 rounded-xl bg-blue-500 text-white font-semibold text-sm shadow-lg">
      {data.label}
    </div>
  ),
  decision: ({ data }) => (
    <div className="px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold text-sm shadow-lg transform rotate-45">
      <div className="transform -rotate-45">{data.label}</div>
    </div>
  ),
  end: ({ data }) => (
    <div className="px-4 py-2 rounded-xl bg-red-500 text-white font-semibold text-sm shadow-lg">
      {data.label}
    </div>
  ),
};

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  theme,
  workflowId,
  initialNodes = [],
  initialEdges = [],
  onSave,
  onExecute,
  readOnly = false,
}) => {
  const isDark = theme === 'dark';
  
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: isDark ? '#60a5fa' : '#3b82f6', strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges, isDark]
  );

  const addNode = useCallback(() => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: 'process',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: '新节点', type: 'process' },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const deleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  const handleSave = useCallback(() => {
    onSave?.(nodes, edges);
  }, [nodes, edges, onSave]);

  const proOptions = { hideAttribution: true };

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-[#1C1C1E]' : 'bg-white'}`}>
      {/* 工具栏 */}
      {!readOnly && (
        <div
          className={`flex items-center gap-2 p-3 border-b ${
            isDark ? 'border-white/10 bg-[#1C1C1E]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={addNode}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              isDark
                ? 'bg-white/10 text-slate-300 hover:bg-white/15'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Plus size={16} className="inline mr-1" />
            添加节点
          </button>
          {selectedNode && (
            <button
              type="button"
              onClick={deleteSelectedNode}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              }`}
            >
              <Trash2 size={16} className="inline mr-1" />
              删除节点
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onExecute}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20`}
          >
            <Play size={16} className="inline mr-1" />
            执行
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
              isDark
                ? 'bg-white/10 text-slate-300 hover:bg-white/15'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Save size={16} className="inline mr-1" />
            保存
          </button>
        </div>
      )}

      {/* 画布 */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNode(node as WorkflowNode)}
          nodeTypes={nodeTypes}
          proOptions={proOptions}
          fitView
          className={isDark ? 'bg-[#1C1C1E]' : 'bg-white'}
        >
          <Background color={isDark ? '#3f3f46' : '#e4e4e7'} gap={16} />
          <Controls
            className={isDark ? '[&_button]:bg-white/10 [&_button]:text-white [&_button]:border-white/20' : ''}
          />
          <MiniMap
            className={isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'}
            nodeColor={(node) => {
              const type = (node as WorkflowNode).data?.type;
              if (type === 'start') return '#10b981';
              if (type === 'end') return '#ef4444';
              if (type === 'decision') return '#f59e0b';
              return '#3b82f6';
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
};
