import { Node, SyntaxKind } from 'ts-morph';
import { TypeInfo, MemberInfo, GenericParam, InheritanceLink } from '../model/types';
import { parseClass, ParsedClass } from './classParser';
import { parseInterface, ParsedInterface } from './interfaceParser';
import { parseTypeAlias, ParsedTypeAlias } from './typeAliasParser';

// Re-export individual parsers
export { parseClass, ParsedClass } from './classParser';
export { parseInterface, ParsedInterface } from './interfaceParser';
export { parseTypeAlias, ParsedTypeAlias } from './typeAliasParser';
export {
  extractClassMembers,
  extractInterfaceMembers,
  extractTypeAliasMembers,
} from './memberExtractor';

/**
 * Unified parse result for any supported type declaration.
 */
export interface ParsedType {
  typeInfo: TypeInfo;
  members: MemberInfo[];
  heritageLinks: InheritanceLink[];
  genericParams: GenericParam[];
}

/**
 * Dispatch parser based on the AST node kind.
 * Accepts a ClassDeclaration, InterfaceDeclaration, or TypeAliasDeclaration.
 */
export function parseTypeDeclaration(node: Node): ParsedType {
  const kind = node.getKind();

  switch (kind) {
    case SyntaxKind.ClassDeclaration: {
      const classNode = node.asKindOrThrow(SyntaxKind.ClassDeclaration);
      const result: ParsedClass = parseClass(classNode);
      return {
        typeInfo: result.typeInfo,
        members: result.members,
        heritageLinks: result.heritageLinks,
        genericParams: result.genericParams,
      };
    }

    case SyntaxKind.InterfaceDeclaration: {
      const ifaceNode = node.asKindOrThrow(SyntaxKind.InterfaceDeclaration);
      const result: ParsedInterface = parseInterface(ifaceNode);
      return {
        typeInfo: result.typeInfo,
        members: result.members,
        heritageLinks: result.heritageLinks,
        genericParams: result.genericParams,
      };
    }

    case SyntaxKind.TypeAliasDeclaration: {
      const typeNode = node.asKindOrThrow(SyntaxKind.TypeAliasDeclaration);
      const result: ParsedTypeAlias = parseTypeAlias(typeNode);
      return {
        typeInfo: result.typeInfo,
        members: result.members,
        heritageLinks: [], // Type aliases don't have heritage clauses
        genericParams: result.genericParams,
      };
    }

    default:
      throw new Error(
        `Unsupported node kind: ${node.getKindName()}. ` +
          'Expected ClassDeclaration, InterfaceDeclaration, or TypeAliasDeclaration.'
      );
  }
}
