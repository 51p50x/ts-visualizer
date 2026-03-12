import * as vscode from 'vscode';
import { Node, SyntaxKind, SourceFile } from 'ts-morph';

export interface CursorTypeResult {
  node: Node;
  name: string;
  kind: 'class' | 'interface' | 'type-alias';
  line: number;
  column: number;
}

/**
 * Supported declaration kinds that we can visualize.
 */
const VISUALIZABLE_KINDS = new Set([
  SyntaxKind.ClassDeclaration,
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeAliasDeclaration,
]);

/**
 * Given a VS Code editor position and a ts-morph SourceFile,
 * find the nearest class, interface or type alias declaration
 * at or around the cursor.
 *
 * Strategy:
 * 1. Try exact position — walk up the AST.
 * 2. If nothing found, find the closest declaration in the file by line distance.
 * 3. If multiple declarations exist at the same distance, pick the one above the cursor.
 */
export function getTypeAtCursor(
  editor: vscode.TextEditor,
  sourceFile: SourceFile
): CursorTypeResult | undefined {
  const position = editor.selection.active;
  const offset = editor.document.offsetAt(position);

  // Strategy 1: exact position — walk up the AST
  const nodeAtPos = sourceFile.getDescendantAtPos(offset);
  if (nodeAtPos) {
    const declaration = findVisualizableAncestor(nodeAtPos);
    if (declaration) {
      return nodeToResult(declaration);
    }
  }

  // Strategy 2: find the closest declaration by line distance
  return findClosestDeclaration(sourceFile, position.line + 1); // ts-morph uses 1-based lines
}

/**
 * Collect all visualizable declarations in the file and return
 * the one closest to the given line.
 */
function findClosestDeclaration(
  sourceFile: SourceFile,
  cursorLine: number
): CursorTypeResult | undefined {
  const allDeclarations: Node[] = [
    ...sourceFile.getClasses(),
    ...sourceFile.getInterfaces(),
    ...sourceFile.getTypeAliases(),
  ];

  if (allDeclarations.length === 0) {
    return undefined;
  }

  // Sort by distance to cursor line, preferring declarations above the cursor
  allDeclarations.sort((a, b) => {
    const distA = Math.abs(a.getStartLineNumber() - cursorLine);
    const distB = Math.abs(b.getStartLineNumber() - cursorLine);
    if (distA !== distB) {
      return distA - distB;
    }
    // Same distance — prefer the one above (before) the cursor
    return b.getStartLineNumber() - a.getStartLineNumber();
  });

  return nodeToResult(allDeclarations[0]);
}

/**
 * Walk up the AST from a node to find the nearest visualizable declaration.
 */
function findVisualizableAncestor(node: Node): Node | undefined {
  let current: Node | undefined = node;

  while (current) {
    if (VISUALIZABLE_KINDS.has(current.getKind())) {
      return current;
    }
    current = current.getParent();
  }

  return undefined;
}

/**
 * Convert a ts-morph declaration node into a CursorTypeResult.
 */
function nodeToResult(node: Node): CursorTypeResult | undefined {
  const kind = node.getKind();
  let name: string | undefined;
  let typeKind: CursorTypeResult['kind'];

  switch (kind) {
    case SyntaxKind.ClassDeclaration: {
      const classNode = node.asKind(SyntaxKind.ClassDeclaration);
      name = classNode?.getName();
      typeKind = 'class';
      break;
    }
    case SyntaxKind.InterfaceDeclaration: {
      const ifaceNode = node.asKind(SyntaxKind.InterfaceDeclaration);
      name = ifaceNode?.getName();
      typeKind = 'interface';
      break;
    }
    case SyntaxKind.TypeAliasDeclaration: {
      const typeNode = node.asKind(SyntaxKind.TypeAliasDeclaration);
      name = typeNode?.getName();
      typeKind = 'type-alias';
      break;
    }
    default:
      return undefined;
  }

  if (!name) {
    return undefined;
  }

  const startLine = node.getStartLineNumber();
  const startPos = node.getStart();
  const sourceFile = node.getSourceFile();
  const { column } = sourceFile.getLineAndColumnAtPos(startPos);

  return {
    node,
    name,
    kind: typeKind!,
    line: startLine,
    column,
  };
}
