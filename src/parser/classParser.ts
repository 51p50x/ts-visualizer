import { ClassDeclaration } from 'ts-morph';
import { TypeInfo, MemberInfo, GenericParam, InheritanceLink } from '../model/types';
import { extractClassMembers } from './memberExtractor';

export interface ParsedClass {
  typeInfo: TypeInfo;
  members: MemberInfo[];
  heritageLinks: InheritanceLink[];
  genericParams: GenericParam[];
}

/**
 * Parse a ClassDeclaration into structured data:
 * type info, own members, heritage clauses (extends/implements), and generics.
 */
export function parseClass(classNode: ClassDeclaration): ParsedClass {
  const name = classNode.getName() ?? '<anonymous>';
  const sourceFile = classNode.getSourceFile();

  const typeInfo: TypeInfo = {
    id: name,
    name,
    kind: 'class',
    filePath: sourceFile.getFilePath(),
    line: classNode.getStartLineNumber(),
    column: sourceFile.getLineAndColumnAtPos(classNode.getStart()).column,
    isAbstract: classNode.isAbstract(),
    isExported: classNode.isExported(),
    typeParameters: extractGenericParams(classNode),
    jsdoc: getClassJsDoc(classNode),
  };

  const members = extractClassMembers(classNode, name);
  const heritageLinks = extractHeritageLinks(classNode, name);
  const genericParams = extractGenericParams(classNode);

  return { typeInfo, members, heritageLinks, genericParams };
}

// ─── Heritage Clauses ────────────────────────────────────────────

function extractHeritageLinks(
  classNode: ClassDeclaration,
  className: string
): InheritanceLink[] {
  const links: InheritanceLink[] = [];

  // extends (single class)
  const baseClass = classNode.getBaseClass();
  if (baseClass) {
    links.push({
      source: className,
      target: baseClass.getName() ?? '<anonymous>',
      kind: 'extends',
      level: 0,
    });
  }

  // implements (multiple interfaces)
  for (const impl of classNode.getImplements()) {
    const implName = impl.getExpression().getText();
    links.push({
      source: className,
      target: implName,
      kind: 'implements',
      level: 0,
    });
  }

  return links;
}

// ─── Generics ────────────────────────────────────────────────────

function extractGenericParams(classNode: ClassDeclaration): GenericParam[] {
  return classNode.getTypeParameters().map((tp) => ({
    name: tp.getName(),
    constraint: tp.getConstraint()?.getText(),
    default: tp.getDefault()?.getText(),
  }));
}

// ─── JSDoc ───────────────────────────────────────────────────────

function getClassJsDoc(classNode: ClassDeclaration): string | undefined {
  const jsDocs = classNode.getJsDocs();
  if (jsDocs.length > 0) {
    return jsDocs.map((doc) => doc.getDescription().trim()).join('\n');
  }
  return undefined;
}
