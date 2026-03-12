import {
  ClassDeclaration,
  InterfaceDeclaration,
  TypeAliasDeclaration,
  PropertyDeclaration,
  PropertySignature,
  MethodDeclaration,
  MethodSignature,
  ConstructorDeclaration,
  GetAccessorDeclaration,
  SetAccessorDeclaration,
  IndexSignatureDeclaration,
  ParameterDeclaration,
  SyntaxKind,
  Node,
  JSDoc,
  Type,
} from 'ts-morph';
import {
  MemberInfo,
  MemberKind,
  Modifier,
  ParameterInfo,
} from '../model/types';

// ─── Public API ──────────────────────────────────────────────────

/**
 * Extract all own members (properties, methods, constructors, accessors,
 * index signatures) from a class declaration.
 */
export function extractClassMembers(
  classNode: ClassDeclaration,
  ownerName: string
): MemberInfo[] {
  const members: MemberInfo[] = [];

  // Properties
  for (const prop of classNode.getProperties()) {
    members.push(extractPropertyDeclaration(prop, ownerName));
  }

  // Methods
  for (const method of classNode.getMethods()) {
    members.push(extractMethodDeclaration(method, ownerName));
  }

  // Constructors
  for (const ctor of classNode.getConstructors()) {
    members.push(extractConstructor(ctor, ownerName));
  }

  // Get Accessors
  for (const getter of classNode.getGetAccessors()) {
    members.push(extractGetAccessor(getter, ownerName));
  }

  // Set Accessors
  for (const setter of classNode.getSetAccessors()) {
    members.push(extractSetAccessor(setter, ownerName));
  }

  return members;
}

/**
 * Extract all own members from an interface declaration.
 */
export function extractInterfaceMembers(
  ifaceNode: InterfaceDeclaration,
  ownerName: string
): MemberInfo[] {
  const members: MemberInfo[] = [];

  // Properties
  for (const prop of ifaceNode.getProperties()) {
    members.push(extractPropertySignature(prop, ownerName));
  }

  // Methods
  for (const method of ifaceNode.getMethods()) {
    members.push(extractMethodSignature(method, ownerName));
  }

  // Index Signatures
  for (const idx of ifaceNode.getIndexSignatures()) {
    members.push(extractIndexSignature(idx, ownerName));
  }

  return members;
}

/**
 * Extract members from a type alias.
 * For object-literal types, extracts properties.
 * For other types, returns a single synthetic member representing the type.
 */
export function extractTypeAliasMembers(
  typeNode: TypeAliasDeclaration,
  ownerName: string
): MemberInfo[] {
  const members: MemberInfo[] = [];
  const type = typeNode.getType();

  // If it's an object type (type Foo = { bar: string; baz: number })
  if (type.isObject() && !type.isArray()) {
    for (const prop of type.getProperties()) {
      const propType = prop.getTypeAtLocation(typeNode);
      const declarations = prop.getDeclarations();
      const isOptional = prop.isOptional();

      members.push({
        id: `${ownerName}.${prop.getName()}`,
        name: prop.getName(),
        kind: 'property',
        type: propType.getText(typeNode),
        modifiers: [],
        isOptional,
        inheritanceLevel: 0,
        inheritancePath: [ownerName],
        jsdoc: declarations.length > 0 ? getJsDocFromNode(declarations[0]) : undefined,
      });
    }
  }

  // If no properties found (primitive, union, etc.), add a synthetic entry
  if (members.length === 0) {
    members.push({
      id: `${ownerName}.__type`,
      name: '__type',
      kind: 'property',
      type: type.getText(typeNode),
      modifiers: [],
      inheritanceLevel: 0,
      inheritancePath: [ownerName],
    });
  }

  return members;
}

// ─── Property Extractors ─────────────────────────────────────────

function extractPropertyDeclaration(
  prop: PropertyDeclaration,
  ownerName: string
): MemberInfo {
  return {
    id: `${ownerName}.${prop.getName()}`,
    name: prop.getName(),
    kind: 'property',
    type: getTypeText(prop.getType(), prop),
    modifiers: getModifiers(prop),
    isOptional: prop.hasQuestionToken(),
    isStatic: prop.isStatic(),
    isAbstract: prop.isAbstract(),
    inheritanceLevel: 0,
    inheritancePath: [ownerName],
    jsdoc: getJsDocFromNode(prop),
  };
}

function extractPropertySignature(
  prop: PropertySignature,
  ownerName: string
): MemberInfo {
  return {
    id: `${ownerName}.${prop.getName()}`,
    name: prop.getName(),
    kind: 'property',
    type: getTypeText(prop.getType(), prop),
    modifiers: getModifiers(prop),
    isOptional: prop.hasQuestionToken(),
    inheritanceLevel: 0,
    inheritancePath: [ownerName],
    jsdoc: getJsDocFromNode(prop),
  };
}

// ─── Method Extractors ───────────────────────────────────────────

function extractMethodDeclaration(
  method: MethodDeclaration,
  ownerName: string
): MemberInfo {
  return {
    id: `${ownerName}.${method.getName()}`,
    name: method.getName(),
    kind: 'method',
    type: getMethodSignatureText(method),
    modifiers: getModifiers(method),
    isStatic: method.isStatic(),
    isAbstract: method.isAbstract(),
    inheritanceLevel: 0,
    inheritancePath: [ownerName],
    parameters: extractParameters(method.getParameters()),
    returnType: getTypeText(method.getReturnType(), method),
    jsdoc: getJsDocFromNode(method),
  };
}

function extractMethodSignature(
  method: MethodSignature,
  ownerName: string
): MemberInfo {
  return {
    id: `${ownerName}.${method.getName()}`,
    name: method.getName(),
    kind: 'method',
    type: getMethodSignatureText(method),
    modifiers: [],
    inheritanceLevel: 0,
    inheritancePath: [ownerName],
    parameters: extractParameters(method.getParameters()),
    returnType: getTypeText(method.getReturnType(), method),
    jsdoc: getJsDocFromNode(method),
  };
}

// ─── Constructor Extractor ───────────────────────────────────────

function extractConstructor(
  ctor: ConstructorDeclaration,
  ownerName: string
): MemberInfo {
  return {
    id: `${ownerName}.constructor`,
    name: 'constructor',
    kind: 'constructor',
    type: `(${ctor.getParameters().map((p) => `${p.getName()}: ${getTypeText(p.getType(), p)}`).join(', ')})`,
    modifiers: getModifiers(ctor),
    inheritanceLevel: 0,
    inheritancePath: [ownerName],
    parameters: extractParameters(ctor.getParameters()),
    returnType: ownerName,
    jsdoc: getJsDocFromNode(ctor),
  };
}

// ─── Accessor Extractors ─────────────────────────────────────────

function extractGetAccessor(
  getter: GetAccessorDeclaration,
  ownerName: string
): MemberInfo {
  return {
    id: `${ownerName}.get_${getter.getName()}`,
    name: getter.getName(),
    kind: 'accessor',
    type: getTypeText(getter.getReturnType(), getter),
    modifiers: [...getModifiers(getter), 'readonly' as Modifier],
    isStatic: getter.isStatic(),
    inheritanceLevel: 0,
    inheritancePath: [ownerName],
    returnType: getTypeText(getter.getReturnType(), getter),
    jsdoc: getJsDocFromNode(getter),
  };
}

function extractSetAccessor(
  setter: SetAccessorDeclaration,
  ownerName: string
): MemberInfo {
  return {
    id: `${ownerName}.set_${setter.getName()}`,
    name: setter.getName(),
    kind: 'accessor',
    type: `(value: ${setter.getParameters()[0]?.getType().getText(setter) ?? 'unknown'}) => void`,
    modifiers: getModifiers(setter),
    isStatic: setter.isStatic(),
    inheritanceLevel: 0,
    inheritancePath: [ownerName],
    parameters: extractParameters(setter.getParameters()),
    returnType: 'void',
    jsdoc: getJsDocFromNode(setter),
  };
}

// ─── Index Signature Extractor ───────────────────────────────────

function extractIndexSignature(
  idx: IndexSignatureDeclaration,
  ownerName: string
): MemberInfo {
  const keyType = idx.getKeyType().getText(idx);
  const keyName = idx.getKeyName();
  const returnType = idx.getReturnType().getText(idx);

  return {
    id: `${ownerName}.[${keyName}: ${keyType}]`,
    name: `[${keyName}: ${keyType}]`,
    kind: 'index-signature',
    type: returnType,
    modifiers: getModifiers(idx),
    inheritanceLevel: 0,
    inheritancePath: [ownerName],
    returnType,
  };
}

// ─── Parameter Extraction ────────────────────────────────────────

function extractParameters(params: ParameterDeclaration[]): ParameterInfo[] {
  return params.map((param) => ({
    name: param.getName(),
    type: getTypeText(param.getType(), param),
    isOptional: param.isOptional(),
    isRest: param.isRestParameter(),
    defaultValue: param.getInitializer()?.getText(),
  }));
}

// ─── Modifier Extraction ─────────────────────────────────────────

function getModifiers(node: Node): Modifier[] {
  const modifiers: Modifier[] = [];
  const nodeWithModifiers = node as unknown as { getModifiers?(): Node[] };
  const modifierNodes = nodeWithModifiers.getModifiers?.() ?? [];

  for (const mod of modifierNodes) {
    switch (mod.getKind()) {
      case SyntaxKind.PublicKeyword:
        modifiers.push('public');
        break;
      case SyntaxKind.PrivateKeyword:
        modifiers.push('private');
        break;
      case SyntaxKind.ProtectedKeyword:
        modifiers.push('protected');
        break;
      case SyntaxKind.StaticKeyword:
        modifiers.push('static');
        break;
      case SyntaxKind.ReadonlyKeyword:
        modifiers.push('readonly');
        break;
      case SyntaxKind.AbstractKeyword:
        modifiers.push('abstract');
        break;
      case SyntaxKind.OverrideKeyword:
        modifiers.push('override');
        break;
      case SyntaxKind.AsyncKeyword:
        modifiers.push('async');
        break;
    }
  }

  // Default to public if no access modifier is specified (for class members)
  if (
    !modifiers.includes('public') &&
    !modifiers.includes('private') &&
    !modifiers.includes('protected')
  ) {
    const parent = node.getParent();
    if (parent && Node.isClassDeclaration(parent)) {
      modifiers.unshift('public');
    }
  }

  return modifiers;
}

// ─── Type Text Helpers ───────────────────────────────────────────

function getTypeText(type: Type, enclosingNode: Node): string {
  try {
    return type.getText(enclosingNode);
  } catch {
    return type.getText();
  }
}

function getMethodSignatureText(
  method: MethodDeclaration | MethodSignature
): string {
  const params = method
    .getParameters()
    .map((p) => {
      const rest = p.isRestParameter() ? '...' : '';
      const opt = p.isOptional() ? '?' : '';
      return `${rest}${p.getName()}${opt}: ${getTypeText(p.getType(), p)}`;
    })
    .join(', ');

  const returnType = getTypeText(method.getReturnType(), method);
  return `(${params}) => ${returnType}`;
}

// ─── JSDoc Helper ────────────────────────────────────────────────

function getJsDocFromNode(node: Node): string | undefined {
  try {
    const jsDocs = (node as any).getJsDocs?.() as JSDoc[] | undefined;
    if (jsDocs && jsDocs.length > 0) {
      return jsDocs.map((doc) => doc.getDescription().trim()).join('\n');
    }
  } catch {
    // Not all nodes support getJsDocs
  }
  return undefined;
}
