import { Node, SourceFile, SyntaxKind } from 'ts-morph';
import {
  GraphNode,
  GraphEdge,
  GraphNodeData,
  MemberInfo,
  KIND_ICONS,
} from '../model/types';
import { parseTypeDeclaration } from '../parser';

// ─── Public API ──────────────────────────────────────────────────

export interface CompositionResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Scan all nodes in the graph for property types that reference
 * known declarations (classes, interfaces, type aliases).
 * Returns additional nodes and edges for composition relationships.
 *
 * Example: if `User` has `address: Address`, this will resolve `Address`,
 * create a node for it, and add an edge from User → Address.
 */
export function resolveCompositions(
  existingNodes: GraphNode[],
  contextNode: Node,
  maxDepth: number = 3
): CompositionResult {
  const result: CompositionResult = { nodes: [], edges: [] };
  const existingIds = new Set(existingNodes.map((n) => n.id));
  const visited = new Set<string>();

  // Process each existing node's members
  for (const node of existingNodes) {
    const shape = node.data.simpleShape ?? {};
    processNodeCompositions(
      node.id,
      node.data.label,
      shape,
      contextNode,
      existingIds,
      visited,
      result,
      0,
      maxDepth
    );
  }

  return result;
}

// ─── Internal ────────────────────────────────────────────────────

const PRIMITIVES = new Set([
  'string', 'number', 'boolean', 'void', 'null', 'undefined',
  'any', 'unknown', 'never', 'object', 'symbol', 'bigint',
  'Date', 'RegExp', 'Error', 'Function',
  'true', 'false',
]);

const WRAPPER_TYPES = new Set([
  'Array', 'Promise', 'Set', 'Map', 'WeakMap', 'WeakSet',
  'ReadonlyArray', 'Readonly', 'Partial', 'Required', 'Pick',
  'Omit', 'Record', 'Exclude', 'Extract', 'NonNullable',
  'ReturnType', 'InstanceType', 'Parameters',
]);

/**
 * Extract resolvable type names from a type string.
 * Handles arrays, generics, unions, intersections.
 */
function extractTypeNames(typeStr: string): string[] {
  const names: string[] = [];

  // Remove array suffix
  let cleaned = typeStr.replace(/\[\]/g, '');

  // Remove parentheses from function types like () => void
  if (cleaned.includes('=>')) {
    return names;
  }

  // Split by union/intersection
  const parts = cleaned.split(/\s*[|&]\s*/);

  for (let part of parts) {
    part = part.trim();

    // Handle generic wrappers: Array<X>, Promise<X>, Map<K, V>
    const genericMatch = part.match(/^(\w+)<(.+)>$/);
    if (genericMatch) {
      const wrapper = genericMatch[1];
      const inner = genericMatch[2];

      if (WRAPPER_TYPES.has(wrapper)) {
        // Recursively extract from inner type args
        // Split by comma (respecting nested generics)
        const innerTypes = splitGenericArgs(inner);
        for (const t of innerTypes) {
          names.push(...extractTypeNames(t.trim()));
        }
        continue;
      } else {
        // The wrapper itself might be a resolvable type
        if (!PRIMITIVES.has(wrapper)) {
          names.push(wrapper);
        }
        continue;
      }
    }

    // Skip primitives, literals, and inline objects
    if (PRIMITIVES.has(part)) { continue; }
    if (/^\d+$/.test(part)) { continue; }
    if (/^["']/.test(part)) { continue; }
    if (part.startsWith('{')) { continue; }
    if (part === '') { continue; }

    // Clean identifier — any valid TS identifier that isn't a primitive
    const identMatch = part.match(/^([a-zA-Z_$]\w*)$/);
    if (identMatch) {
      names.push(identMatch[1]);
    }
  }

  return [...new Set(names)];
}

/**
 * Split generic type arguments respecting nesting depth.
 * e.g. "Map<string, Array<User>>" → ["string", "Array<User>"]
 */
function splitGenericArgs(inner: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let current = '';

  for (const ch of inner) {
    if (ch === '<') { depth++; }
    if (ch === '>') { depth--; }
    if (ch === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}

/**
 * Try to find a declaration by name in the project.
 */
function findDeclaration(
  contextNode: Node,
  name: string
): Node | undefined {
  const sourceFile = contextNode.getSourceFile();
  const project = sourceFile.getProject();

  // Search current file first
  const local = searchInFile(sourceFile, name);
  if (local) { return local; }

  // Search all project files
  for (const sf of project.getSourceFiles()) {
    if (sf === sourceFile) { continue; }
    const result = searchInFile(sf, name);
    if (result) { return result; }
  }

  return undefined;
}

function searchInFile(sourceFile: SourceFile, name: string): Node | undefined {
  return (
    sourceFile.getClass(name) ??
    sourceFile.getInterface(name) ??
    sourceFile.getTypeAlias(name) ??
    undefined
  );
}

const COMPOSITION_COLOR = '#06b6d4'; // cyan-500

function processNodeCompositions(
  parentNodeId: string,
  parentLabel: string,
  shape: Record<string, string>,
  contextNode: Node,
  existingIds: Set<string>,
  visited: Set<string>,
  result: CompositionResult,
  depth: number,
  maxDepth: number
): void {
  if (depth >= maxDepth) { return; }

  for (const [propName, typeStr] of Object.entries(shape)) {
    const typeNames = extractTypeNames(typeStr);

    for (const typeName of typeNames) {
      const nodeId = `type-${typeName}`;

      // Skip if already in graph (inheritance nodes or already added)
      if (existingIds.has(nodeId)) {
        // Still add a composition edge if it doesn't exist yet
        const edgeId = `comp-${parentLabel}-${propName}-${typeName}`;
        if (!result.edges.some((e) => e.id === edgeId)) {
          result.edges.push(createCompositionEdge(
            parentNodeId, nodeId, propName, typeStr
          ));
        }
        continue;
      }

      // Skip if already visited (prevent circular composition)
      if (visited.has(typeName)) {
        // Add edge to existing composition node
        const edgeId = `comp-${parentLabel}-${propName}-${typeName}`;
        if (!result.edges.some((e) => e.id === edgeId)) {
          result.edges.push(createCompositionEdge(
            parentNodeId, nodeId, propName, typeStr
          ));
        }
        continue;
      }

      // Try to resolve the type
      const declaration = findDeclaration(contextNode, typeName);
      if (!declaration) { continue; }

      visited.add(typeName);

      // Parse the resolved type
      const parsed = parseTypeDeclaration(declaration);

      // Build simple shape for the composition node
      const simpleShape: Record<string, string> = {};
      for (const m of parsed.members) {
        if (m.kind === 'constructor') { continue; }
        const key = m.kind === 'method' ? `${m.name}()` : m.name;
        simpleShape[key] = m.type;
      }

      const icon = KIND_ICONS[parsed.typeInfo.kind] ?? '?';

      const compNode: GraphNode = {
        id: nodeId,
        type: 'type-node',
        data: {
          label: typeName,
          kind: parsed.typeInfo.kind,
          level: -1, // Special level for composition nodes
          color: COMPOSITION_COLOR,
          icon,
          members: parsed.members,
          simpleShape,
          collapsed: false,
          typeInfo: parsed.typeInfo,
        },
        position: { x: 0, y: 0 },
      };

      result.nodes.push(compNode);
      existingIds.add(nodeId);

      // Add composition edge
      result.edges.push(createCompositionEdge(
        parentNodeId, nodeId, propName, typeStr
      ));

      // Recursively resolve compositions of this new node
      processNodeCompositions(
        nodeId,
        typeName,
        simpleShape,
        contextNode,
        existingIds,
        visited,
        result,
        depth + 1,
        maxDepth
      );
    }
  }
}

function createCompositionEdge(
  sourceId: string,
  targetId: string,
  propName: string,
  typeStr: string
): GraphEdge {
  const isArray = typeStr.includes('[]') || typeStr.includes('Array<');
  const label = isArray ? `${propName} []` : propName;

  return {
    id: `comp-${sourceId}-${propName}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: 'contains',
    label,
    animated: false,
    style: {
      stroke: COMPOSITION_COLOR,
      strokeWidth: '2',
      strokeDasharray: '6 3',
    },
  };
}
