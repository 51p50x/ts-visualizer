import {
  ResolvedTypeHierarchy,
  GraphData,
} from './types';
import { toGraphData } from './graphModel';

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
  format: ExportFormat = 'full'
): string {
  // Simple format: flat object { propName: type } — the "effective shape"
  if (format === 'simple') {
    return JSON.stringify(toSimpleShape(resolved), null, 2);
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

/**
 * Produce a clean, flat object representing the effective shape
 * of the type — all properties and methods (own + inherited)
 * as { name: type }.
 *
 * Example output for a class with inherited `id: string` and own `email: string`:
 * {
 *   "id": "string",
 *   "email": "string",
 *   "save()": "() => Promise<void>"
 * }
 */
function toSimpleShape(
  resolved: ResolvedTypeHierarchy
): Record<string, string> {
  const shape: Record<string, string> = {};

  // Sort: own members first (level 0), then inherited by level
  const sorted = [...resolved.allMembers].sort(
    (a, b) => a.inheritanceLevel - b.inheritanceLevel
  );

  for (const member of sorted) {
    // Skip constructors — they're not part of the "shape"
    if (member.kind === 'constructor') {
      continue;
    }

    const key =
      member.kind === 'method'
        ? `${member.name}()`
        : member.name;

    shape[key] = member.kind === 'method'
      ? member.type
      : member.type;
  }

  return shape;
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
