import {
  Node,
  ClassDeclaration,
  InterfaceDeclaration,
  SyntaxKind,
  SourceFile,
} from 'ts-morph';
import {
  TypeInfo,
  MemberInfo,
  InheritanceLink,
  ResolvedTypeHierarchy,
} from '../model/types';
import { parseTypeDeclaration, ParsedType } from '../parser';
import { applyOverrides } from './overrideDetector';

// ─── Public API ──────────────────────────────────────────────────

/**
 * Resolve the full type hierarchy for a given AST node.
 *
 * Recursively traverses extends + implements chains, collects all members
 * with full inheritance traceability, detects overrides, and returns
 * a flat but fully traceable structure.
 */
export function resolveFullTypeHierarchy(
  node: Node
): ResolvedTypeHierarchy {
  const visited = new Set<string>();
  const ancestors: TypeInfo[] = [];
  const allInheritanceLinks: InheritanceLink[] = [];
  const rawMembers: MemberInfo[] = [];

  // Parse the root type
  const rootParsed = parseTypeDeclaration(node);
  const rootName = rootParsed.typeInfo.name;

  // Add root's own members at level 0
  for (const member of rootParsed.members) {
    rawMembers.push({
      ...member,
      inheritanceLevel: 0,
      inheritancePath: [rootName],
    });
  }

  // Mark root as visited
  visited.add(rootName);

  // Recursively resolve heritage chain
  resolveHeritage(
    node,
    rootParsed,
    rootName,
    1, // Start at level 1 for parent
    [rootName],
    visited,
    ancestors,
    allInheritanceLinks,
    rawMembers
  );

  // Apply override detection and deduplication
  const effectiveMembers = applyOverrides(rawMembers);

  // Count overrides
  const totalOverrides = effectiveMembers.filter((m) => m.isOverride).length;

  // Calculate total levels
  const maxLevel = effectiveMembers.reduce(
    (max, m) => Math.max(max, m.inheritanceLevel),
    0
  );

  return {
    root: rootParsed.typeInfo,
    ancestors,
    allMembers: effectiveMembers,
    inheritanceChain: allInheritanceLinks,
    metadata: {
      totalLevels: maxLevel + 1,
      totalMembers: effectiveMembers.length,
      totalOverrides,
      resolvedAt: new Date().toISOString(),
    },
  };
}

// ─── Recursive Heritage Resolution ──────────────────────────────

function resolveHeritage(
  currentNode: Node,
  currentParsed: ParsedType,
  rootName: string,
  currentLevel: number,
  pathFromRoot: string[],
  visited: Set<string>,
  ancestors: TypeInfo[],
  allLinks: InheritanceLink[],
  rawMembers: MemberInfo[]
): void {
  for (const link of currentParsed.heritageLinks) {
    // Add the link with corrected level
    allLinks.push({
      ...link,
      level: currentLevel - 1,
    });

    const targetName = link.target;

    // Prevent circular references
    if (visited.has(targetName)) {
      continue;
    }
    visited.add(targetName);

    // Find the target declaration in the project
    const targetNode = findDeclarationByName(currentNode, targetName);
    if (!targetNode) {
      // Could not resolve — possibly from node_modules or external
      // Add a placeholder ancestor with no members
      ancestors.push({
        id: targetName,
        name: targetName,
        kind: link.kind === 'implements' ? 'interface' : 'class',
        filePath: '<external>',
        line: 0,
        column: 0,
      });
      continue;
    }

    // Parse the target type
    const targetParsed = parseTypeDeclaration(targetNode);
    ancestors.push(targetParsed.typeInfo);

    // Build the path from root to this ancestor
    const pathToTarget = [...pathFromRoot, targetName];

    // Add target's members with updated inheritance info
    for (const member of targetParsed.members) {
      rawMembers.push({
        ...member,
        id: `${rootName}.${member.name}`,
        inheritedFrom: targetName,
        inheritanceLevel: currentLevel,
        inheritancePath: [...pathToTarget],
      });
    }

    // Recurse into the target's heritage chain
    resolveHeritage(
      targetNode,
      targetParsed,
      rootName,
      currentLevel + 1,
      pathToTarget,
      visited,
      ancestors,
      allLinks,
      rawMembers
    );
  }
}

// ─── Declaration Lookup ──────────────────────────────────────────

/**
 * Find a class/interface/type-alias declaration by name,
 * searching the current file first, then all project files.
 */
function findDeclarationByName(
  contextNode: Node,
  name: string
): Node | undefined {
  const sourceFile = contextNode.getSourceFile();
  const project = sourceFile.getProject();

  // 1. Search in current file first
  const localResult = searchInFile(sourceFile, name);
  if (localResult) {
    return localResult;
  }

  // 2. Search across all project files
  for (const sf of project.getSourceFiles()) {
    if (sf === sourceFile) {
      continue; // Already searched
    }
    const result = searchInFile(sf, name);
    if (result) {
      return result;
    }
  }

  return undefined;
}

/**
 * Search for a named declaration in a single source file.
 */
function searchInFile(
  sourceFile: SourceFile,
  name: string
): Node | undefined {
  // Check classes
  const classDecl = sourceFile.getClass(name);
  if (classDecl) {
    return classDecl;
  }

  // Check interfaces
  const ifaceDecl = sourceFile.getInterface(name);
  if (ifaceDecl) {
    return ifaceDecl;
  }

  // Check type aliases
  const typeDecl = sourceFile.getTypeAlias(name);
  if (typeDecl) {
    return typeDecl;
  }

  return undefined;
}
