import { TypeAliasDeclaration } from 'ts-morph';
import { TypeInfo, MemberInfo, GenericParam } from '../model/types';
import { extractTypeAliasMembers } from './memberExtractor';

export interface ParsedTypeAlias {
  typeInfo: TypeInfo;
  members: MemberInfo[];
  genericParams: GenericParam[];
}

/**
 * Parse a TypeAliasDeclaration into structured data:
 * type info, extracted members (for object types), and generics.
 */
export function parseTypeAlias(typeNode: TypeAliasDeclaration): ParsedTypeAlias {
  const name = typeNode.getName();
  const sourceFile = typeNode.getSourceFile();

  const typeInfo: TypeInfo = {
    id: name,
    name,
    kind: 'type-alias',
    filePath: sourceFile.getFilePath(),
    line: typeNode.getStartLineNumber(),
    column: sourceFile.getLineAndColumnAtPos(typeNode.getStart()).column,
    isAbstract: false,
    isExported: typeNode.isExported(),
    typeParameters: extractGenericParams(typeNode),
    jsdoc: getTypeAliasJsDoc(typeNode),
  };

  const members = extractTypeAliasMembers(typeNode, name);
  const genericParams = extractGenericParams(typeNode);

  return { typeInfo, members, genericParams };
}

// ─── Generics ────────────────────────────────────────────────────

function extractGenericParams(typeNode: TypeAliasDeclaration): GenericParam[] {
  return typeNode.getTypeParameters().map((tp) => ({
    name: tp.getName(),
    constraint: tp.getConstraint()?.getText(),
    default: tp.getDefault()?.getText(),
  }));
}

// ─── JSDoc ───────────────────────────────────────────────────────

function getTypeAliasJsDoc(typeNode: TypeAliasDeclaration): string | undefined {
  const jsDocs = typeNode.getJsDocs();
  if (jsDocs.length > 0) {
    return jsDocs.map((doc) => doc.getDescription().trim()).join('\n');
  }
  return undefined;
}
