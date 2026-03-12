import {
  ResolvedTypeHierarchy,
  TypeInfo,
  MemberInfo,
  GraphData,
  GraphNode,
  GraphEdge,
  GraphNodeData,
  LEVEL_COLORS,
  KIND_ICONS,
} from './types';

// ─── Public API ──────────────────────────────────────────────────

/**
 * Convert a ResolvedTypeHierarchy into GraphData ready for React Flow.
 *
 * Layout strategy:
 * - One "type-node" per class/interface in the hierarchy
 * - Members are embedded in each type-node's data (rendered as sub-lists)
 * - Inheritance edges connect type-nodes with "extends"/"implements" labels
 *
 * Positions are placeholder (0,0) — the webview will use dagre for auto-layout.
 */
export function toGraphData(resolved: ResolvedTypeHierarchy): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Group members by their source type
  const membersByType = groupMembersByType(resolved);

  // 1. Create root type node
  nodes.push(
    createTypeNode(resolved.root, 0, membersByType.get(resolved.root.name))
  );

  // 2. Create ancestor type nodes
  for (const ancestor of resolved.ancestors) {
    const level = getAncestorLevel(ancestor.name, resolved);
    nodes.push(
      createTypeNode(ancestor, level, membersByType.get(ancestor.name))
    );
  }

  // 3. Create inheritance edges
  for (const link of resolved.inheritanceChain) {
    edges.push(createInheritanceEdge(link.source, link.target, link.kind));
  }

  return { nodes, edges };
}

// ─── Node Creation ───────────────────────────────────────────────

function createTypeNode(
  typeInfo: TypeInfo,
  level: number,
  members?: MemberInfo[]
): GraphNode {
  const color = getLevelColor(level);
  const icon = KIND_ICONS[typeInfo.kind] ?? '?';

  // Build simple shape { prop: type } for readable display
  const simpleShape: Record<string, string> = {};
  for (const m of members ?? []) {
    if (m.kind === 'constructor') { continue; }
    const key = m.kind === 'method' ? `${m.name}()` : m.name;
    simpleShape[key] = m.type;
  }

  const data: GraphNodeData = {
    label: typeInfo.name,
    kind: typeInfo.kind,
    level,
    color,
    icon,
    members: members ?? [],
    simpleShape,
    collapsed: level > 0, // Collapse ancestors by default
    typeInfo,
  };

  return {
    id: `type-${typeInfo.name}`,
    type: 'type-node',
    data,
    position: { x: 0, y: 0 }, // Will be computed by dagre in the webview
  };
}

// ─── Edge Creation ───────────────────────────────────────────────

function createInheritanceEdge(
  source: string,
  target: string,
  kind: string
): GraphEdge {
  const isImplements = kind === 'implements';

  return {
    id: `edge-${source}-${target}`,
    source: `type-${source}`,
    target: `type-${target}`,
    type: isImplements ? 'implements' : 'inheritance',
    label: kind,
    animated: isImplements, // Animated dashes for implements
    style: {
      stroke: isImplements ? '#8b5cf6' : '#3b82f6',
      strokeWidth: '2',
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Group all members by the type they originally belong to.
 * - Own members (level 0, no inheritedFrom) → root type
 * - Inherited members → their inheritedFrom type
 */
function groupMembersByType(
  resolved: ResolvedTypeHierarchy
): Map<string, MemberInfo[]> {
  const groups = new Map<string, MemberInfo[]>();

  for (const member of resolved.allMembers) {
    const ownerName = member.inheritedFrom ?? resolved.root.name;
    const group = groups.get(ownerName) ?? [];
    group.push(member);
    groups.set(ownerName, group);
  }

  return groups;
}

/**
 * Determine the inheritance level for an ancestor type
 * by looking at the inheritance chain links.
 */
function getAncestorLevel(
  ancestorName: string,
  resolved: ResolvedTypeHierarchy
): number {
  // Find the link where this ancestor is the target
  for (const link of resolved.inheritanceChain) {
    if (link.target === ancestorName) {
      return link.level + 1;
    }
  }
  return 1; // Default to level 1 if not found
}

/**
 * Get color for a given inheritance level, with fallback for deep chains.
 */
function getLevelColor(level: number): string {
  if (level in LEVEL_COLORS) {
    return LEVEL_COLORS[level];
  }
  // Cycle through colors for very deep hierarchies
  const keys = Object.keys(LEVEL_COLORS).map(Number);
  return LEVEL_COLORS[keys[level % keys.length]];
}
