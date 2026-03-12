import {
  ResolvedTypeHierarchy,
  GraphData,
} from './types';
import { toGraphData } from './graphModel';
import { Node, SourceFile, SyntaxKind } from 'ts-morph';
import { parseTypeDeclaration } from '../parser';

// ─── Public API ──────────────────────────────────────────────────

/**
 * Serialization format options for export.
 */
export type ExportFormat = 'simple' | 'hierarchy' | 'graph' | 'full';

/**
 * Full export payload containing both the resolved hierarchy
 * and the graph-ready data.
 */
export interface ExportPayload {
  version: string;
  format: ExportFormat;
  hierarchy?: ResolvedTypeHierarchy;
  graph?: GraphData;
}

/**
 * Serialize the resolved type hierarchy to a JSON string.
 *
 * Formats:
 * - 'hierarchy': Raw ResolvedTypeHierarchy (for debugging/analysis)
 * - 'graph': GraphData only (nodes + edges for React Flow)
 * - 'full': Both hierarchy and graph data
 */
export function serializeToJson(
  resolved: ResolvedTypeHierarchy,
  format: ExportFormat = 'full',
  contextNode?: Node
): string {
  // Simple format: flat object { propName: type } — the "effective shape"
  if (format === 'simple') {
    return JSON.stringify(toSimpleShapeDeep(resolved, contextNode), null, 2);
  }

  const payload: ExportPayload = {
    version: '0.1.0',
    format,
  };

  if (format === 'hierarchy' || format === 'full') {
    payload.hierarchy = sanitizeHierarchy(resolved);
  }

  if (format === 'graph' || format === 'full') {
    payload.graph = toGraphData(resolved);
  }

  return JSON.stringify(payload, null, 2);
}

/**
 * Get the graph data object (not serialized).
 * Used by the webview panel to receive structured data via postMessage.
 */
export function toExportPayload(
  resolved: ResolvedTypeHierarchy,
  format: ExportFormat = 'full'
): ExportPayload {
  const payload: ExportPayload = {
    version: '0.1.0',
    format,
  };

  if (format === 'hierarchy' || format === 'full') {
    payload.hierarchy = sanitizeHierarchy(resolved);
  }

  if (format === 'graph' || format === 'full') {
    payload.graph = toGraphData(resolved);
  }

  return payload;
}

// ─── Simple Shape ────────────────────────────────────────────────

const PRIMITIVES = new Set([
  'string', 'number', 'boolean', 'void', 'null', 'undefined',
  'any', 'unknown', 'never', 'object', 'symbol', 'bigint',
  'Date', 'RegExp', 'Error', 'Function',
  'true', 'false',
]);

/**
 * Produce a deep object representing the effective shape
 * of the type — expanding nested object types recursively.
 *
 * Example: if User has `address: Address` and Address has `street: string`,
 * output: { "address": { "__type": "Address", "street": "string" } }
 */
function toSimpleShapeDeep(
  resolved: ResolvedTypeHierarchy,
  contextNode?: Node,
  visited?: Set<string>
): Record<string, unknown> {
  const shape: Record<string, unknown> = {};
  const seen = visited ?? new Set<string>();
  seen.add(resolved.root.name);

  // Sort: own members first (level 0), then inherited by level
  const sorted = [...resolved.allMembers].sort(
    (a, b) => a.inheritanceLevel - b.inheritanceLevel
  );

  for (const member of sorted) {
    if (member.kind === 'constructor') {
      continue;
    }

    const key =
      member.kind === 'method'
        ? `${member.name}()`
        : member.name;

    // Try to expand nested types
    if (contextNode && member.kind !== 'method') {
      const expanded = tryExpandType(member.type, contextNode, seen);
      if (expanded !== null) {
        shape[key] = expanded;
        continue;
      }
    }

    shape[key] = member.type;
  }

  return shape;
}

/**
 * Try to expand a type string into a nested object.
 * Returns null if the type is primitive or cannot be resolved.
 */
function tryExpandType(
  typeStr: string,
  contextNode: Node,
  visited: Set<string>
): Record<string, unknown> | Record<string, unknown>[] | null {
  const isArray = typeStr.includes('[]') || typeStr.startsWith('Array<');
  const baseName = extractBaseTypeName(typeStr);

  if (!baseName) { return null; }
  if (PRIMITIVES.has(baseName)) { return null; }
  if (visited.has(baseName)) {
    // Circular reference — just show the type name
    return null;
  }

  // Try to find the declaration
  const decl = findDeclarationInProject(contextNode, baseName);
  if (!decl) { return null; }

  visited.add(baseName);

  const parsed = parseTypeDeclaration(decl);
  const nested: Record<string, unknown> = {};

  for (const m of parsed.members) {
    if (m.kind === 'constructor') { continue; }
    const mKey = m.kind === 'method' ? `${m.name}()` : m.name;

    // Recursively expand
    const expanded = tryExpandType(m.type, contextNode, visited);
    nested[mKey] = expanded !== null ? expanded : m.type;
  }

  // Wrap in array if the original type was an array
  if (isArray) {
    return [nested];
  }

  return nested;
}

/**
 * Extract the base type name from a type string.
 * "Address" → "Address", "Order[]" → "Order", "Array<Item>" → "Item"
 */
function extractBaseTypeName(typeStr: string): string | null {
  let cleaned = typeStr.replace(/\[\]/g, '').trim();

  // Handle function types
  if (cleaned.includes('=>')) { return null; }

  // Handle unions/intersections — skip complex ones
  if (cleaned.includes('|') || cleaned.includes('&')) { return null; }

  // Handle Array<X>
  const arrayMatch = cleaned.match(/^Array<(.+)>$/);
  if (arrayMatch) {
    cleaned = arrayMatch[1].trim();
  }

  // Must be a simple identifier
  const identMatch = cleaned.match(/^([a-zA-Z_$]\w*)$/);
  return identMatch ? identMatch[1] : null;
}

function findDeclarationInProject(contextNode: Node, name: string): Node | undefined {
  const sourceFile = contextNode.getSourceFile();
  const project = sourceFile.getProject();

  const local = searchInSourceFile(sourceFile, name);
  if (local) { return local; }

  for (const sf of project.getSourceFiles()) {
    if (sf === sourceFile) { continue; }
    const result = searchInSourceFile(sf, name);
    if (result) { return result; }
  }

  return undefined;
}

function searchInSourceFile(sourceFile: SourceFile, name: string): Node | undefined {
  return (
    sourceFile.getClass(name) ??
    sourceFile.getInterface(name) ??
    sourceFile.getTypeAlias(name) ??
    undefined
  );
}

// ─── Internal ────────────────────────────────────────────────────

/**
 * Clean up the hierarchy for safe serialization.
 * Removes circular refs, normalizes paths for cross-platform compat.
 */
function sanitizeHierarchy(
  resolved: ResolvedTypeHierarchy
): ResolvedTypeHierarchy {
  return {
    root: {
      ...resolved.root,
      filePath: normalizeFilePath(resolved.root.filePath),
    },
    ancestors: resolved.ancestors.map((a) => ({
      ...a,
      filePath: normalizeFilePath(a.filePath),
    })),
    allMembers: resolved.allMembers.map((m) => ({
      ...m,
      // Remove any non-serializable fields if present
    })),
    inheritanceChain: [...resolved.inheritanceChain],
    metadata: { ...resolved.metadata },
  };
}

/**
 * Normalize file paths to forward slashes for consistent output.
 */
function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
