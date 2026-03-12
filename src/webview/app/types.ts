/**
 * Message protocol between extension host and webview.
 */
export interface WebviewMessage {
  type: 'setGraphData' | 'themeChanged';
  payload: unknown;
}

/**
 * Simple node data passed from extension to webview.
 * Mirrors GraphNodeData but without ts-morph types.
 */
export interface SimpleNodeData {
  label: string;
  kind: string;
  level: number;
  color: string;
  icon: string;
  simpleShape: Record<string, string>;
  collapsed: boolean;
}

/**
 * Simple edge data passed from extension to webview.
 */
export interface SimpleEdgeData {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, string>;
}

/**
 * Graph payload sent from extension to webview.
 */
export interface GraphPayload {
  nodes: Array<{
    id: string;
    type: string;
    data: SimpleNodeData;
    position: { x: number; y: number };
  }>;
  edges: SimpleEdgeData[];
  rootName: string;
}
