import { useMemo } from 'react';
import dagre from '@dagrejs/dagre';
import type { Node, Edge } from 'reactflow';

const NODE_WIDTH = 260;
const NODE_BASE_HEIGHT = 48; // header only
const PROP_HEIGHT = 22;

/**
 * Use dagre to compute auto-layout positions for React Flow nodes.
 * Returns new nodes with updated positions.
 */
export function useAutoLayout(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): Node[] {
  return useMemo(() => {
    if (nodes.length === 0) {
      return nodes;
    }

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: direction,
      nodesep: 60,
      ranksep: 80,
      marginx: 40,
      marginy: 40,
    });

    // Add nodes with estimated dimensions
    for (const node of nodes) {
      const propCount = Object.keys(node.data?.simpleShape ?? {}).length;
      const isCollapsed = node.data?.collapsed ?? false;
      const height = isCollapsed
        ? NODE_BASE_HEIGHT
        : NODE_BASE_HEIGHT + Math.max(propCount, 1) * PROP_HEIGHT + 16;

      g.setNode(node.id, { width: NODE_WIDTH, height });
    }

    // Add edges
    for (const edge of edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    // Apply computed positions back to nodes
    return nodes.map((node) => {
      const pos = g.node(node.id);
      return {
        ...node,
        position: {
          x: pos.x - NODE_WIDTH / 2,
          y: pos.y - (pos.height ?? NODE_BASE_HEIGHT) / 2,
        },
      };
    });
  }, [nodes, edges, direction]);
}
