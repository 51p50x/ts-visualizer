// ─── TS Object Visualizer — Core Data Model ─────────────────────

// ─── Type Information ────────────────────────────────────────────

export type TypeKind = 'class' | 'interface' | 'type-alias';

export interface TypeInfo {
  id: string;
  name: string;
  kind: TypeKind;
  filePath: string;
  line: number;
  column: number;
  isAbstract?: boolean;
  isExported?: boolean;
  typeParameters?: GenericParam[];
  jsdoc?: string;
}

export interface GenericParam {
  name: string;
  constraint?: string;
  default?: string;
}

// ─── Members ─────────────────────────────────────────────────────

export type MemberKind =
  | 'property'
  | 'method'
  | 'constructor'
  | 'accessor'
  | 'index-signature';

export type Modifier =
  | 'public'
  | 'private'
  | 'protected'
  | 'static'
  | 'readonly'
  | 'abstract'
  | 'override'
  | 'async';

export interface ParameterInfo {
  name: string;
  type: string;
  isOptional?: boolean;
  isRest?: boolean;
  defaultValue?: string;
}

export interface MemberInfo {
  id: string;
  name: string;
  kind: MemberKind;
  type: string;
  modifiers: Modifier[];
  isOptional?: boolean;
  isStatic?: boolean;
  isAbstract?: boolean;
  jsdoc?: string;

  // Inheritance traceability
  inheritedFrom?: string;
  inheritanceLevel: number;
  inheritancePath: string[];
  isOverride?: boolean;
  overrides?: string;

  // Method-specific
  parameters?: ParameterInfo[];
  returnType?: string;
}

// ─── Inheritance Chain ───────────────────────────────────────────

export type InheritanceKind = 'extends' | 'implements';

export interface InheritanceLink {
  source: string;
  target: string;
  kind: InheritanceKind;
  level: number;
}

// ─── Full Resolved Output ────────────────────────────────────────

export interface ResolvedTypeHierarchy {
  root: TypeInfo;
  ancestors: TypeInfo[];
  allMembers: MemberInfo[];
  inheritanceChain: InheritanceLink[];
  metadata: {
    totalLevels: number;
    totalMembers: number;
    totalOverrides: number;
    resolvedAt: string;
  };
}

// ─── Graph Model (React Flow) ────────────────────────────────────

export interface GraphNodeData {
  label: string;
  kind: string;
  level: number;
  color: string;
  icon: string;
  members?: MemberInfo[];
  simpleShape?: Record<string, string>;
  collapsed?: boolean;
  typeInfo?: TypeInfo;
}

export type GraphNodeType = 'type-node' | 'member-group' | 'member-item';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  data: GraphNodeData;
  position: { x: number; y: number };
}

export type GraphEdgeType = 'inheritance' | 'implements' | 'contains';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  label?: string;
  animated?: boolean;
  style?: Record<string, string>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Color Palette by Inheritance Level ──────────────────────────

export const LEVEL_COLORS: Record<number, string> = {
  0: '#3b82f6', // blue-500   — own class
  1: '#8b5cf6', // violet-500 — parent
  2: '#f59e0b', // amber-500  — grandparent
  3: '#ef4444', // red-500    — great-grandparent
  4: '#10b981', // emerald-500
  5: '#ec4899', // pink-500
};

export const KIND_ICONS: Record<string, string> = {
  'class': 'C',
  'interface': 'I',
  'type-alias': 'T',
};
