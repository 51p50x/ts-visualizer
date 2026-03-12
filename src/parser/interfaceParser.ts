import { InterfaceDeclaration } from 'ts-morph';
import { TypeInfo, MemberInfo, GenericParam, InheritanceLink } from '../model/types';
import { extractInterfaceMembers } from './memberExtractor';

export interface ParsedInterface {
  typeInfo: TypeInfo;
  members: MemberInfo[];
  heritageLinks: InheritanceLink[];
  genericParams: GenericParam[];
}

/**
 * Parse an InterfaceDeclaration into structured data:
 * type info, own members, heritage clauses (extends), and generics.
 */
export function parseInterface(ifaceNode: InterfaceDeclaration): ParsedInterface {
  const name = ifaceNode.getName();
  const sourceFile = ifaceNode.getSourceFile();

  const typeInfo: TypeInfo = {
    id: name,
    name,
    kind: 'interface',
    filePath: sourceFile.getFilePath(),
    line: ifaceNode.getStartLineNumber(),
    column: sourceFile.getLineAndColumnAtPos(ifaceNode.getStart()).column,
    isAbstract: false,
    isExported: ifaceNode.isExported(),
    typeParameters: extractGenericParams(ifaceNode),
    jsdoc: getInterfaceJsDoc(ifaceNode),
  };

  const members = extractInterfaceMembers(ifaceNode, name);
  const heritageLinks = extractHeritageLinks(ifaceNode, name);
  const genericParams = extractGenericParams(ifaceNode);

  return { typeInfo, members, heritageLinks, genericParams };
}

// ─── Heritage Clauses ────────────────────────────────────────────

function extractHeritageLinks(
  ifaceNode: InterfaceDeclaration,
  ifaceName: string
): InheritanceLink[] {
  const links: InheritanceLink[] = [];

  // Interfaces can extend multiple interfaces
  for (const ext of ifaceNode.getExtends()) {
    const extName = ext.getExpression().getText();
    links.push({
      source: ifaceName,
      target: extName,
      kind: 'extends',
      level: 0,
    });
  }

  return links;
}

// ─── Generics ────────────────────────────────────────────────────

function extractGenericParams(ifaceNode: InterfaceDeclaration): GenericParam[] {
  return ifaceNode.getTypeParameters().map((tp) => ({
    name: tp.getName(),
    constraint: tp.getConstraint()?.getText(),
    default: tp.getDefault()?.getText(),
  }));
}

// ─── JSDoc ───────────────────────────────────────────────────────

function getInterfaceJsDoc(ifaceNode: InterfaceDeclaration): string | undefined {
  const jsDocs = ifaceNode.getJsDocs();
  if (jsDocs.length > 0) {
    return jsDocs.map((doc) => doc.getDescription().trim()).join('\n');
  }
  return undefined;
}
