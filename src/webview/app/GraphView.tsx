import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import TypeNode from './components/TypeNode';
import { useAutoLayout } from './hooks/useAutoLayout';
import type { GraphPayload } from './types';

const nodeTypes: NodeTypes = {
  'type-node': TypeNode as any,
};

interface GraphViewProps {
  graphData: GraphPayload | null;
}

const GraphView: React.FC<GraphViewProps> = ({ graphData }) => {
  // Convert payload to React Flow format
  const initialNodes: Node[] = useMemo(() => {
    if (!graphData) { return []; }
    return graphData.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      data: n.data,
      position: n.position,
    }));
  }, [graphData]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!graphData) { return []; }
    return graphData.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'default',
      label: e.label,
      animated: e.animated ?? false,
      style: e.style ? {
        stroke: e.style.stroke,
        strokeWidth: Number(e.style.strokeWidth) || 2,
      } : undefined,
      labelStyle: {
        fill: 'var(--vscode-editor-foreground, #d4d4d4)',
        fontSize: 11,
        fontFamily: 'var(--vscode-editor-font-family, monospace)',
      },
      labelBgStyle: {
        fill: 'var(--vscode-editor-background, #1e1e1e)',
        fillOpacity: 0.9,
      },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
    }));
  }, [graphData]);

  // Auto-layout with dagre
  const layoutedNodes = useAutoLayout(initialNodes, initialEdges, 'TB');

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update when layout changes
  React.useEffect(() => {
    setNodes(layoutedNodes);
  }, [layoutedNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  if (!graphData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--vscode-editor-foreground, #d4d4d4)',
        fontFamily: 'var(--vscode-font-family, sans-serif)',
        fontSize: 14,
      }}>
        <p>Place your cursor on a class, interface, or type alias and run<br />
          <strong>TS Visualizer: Visualize Type</strong></p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls position="bottom-left" />
        <MiniMap
          nodeColor={(node) => node.data?.color ?? '#3b82f6'}
          maskColor="rgba(0,0,0,0.5)"
          position="bottom-right"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--vscode-editorLineNumber-foreground, #444)"
        />
      </ReactFlow>
    </div>
  );
};

export default GraphView;
