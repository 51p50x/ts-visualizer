# TS Object Visualizer — Architecture (Etapa 1)

## 1. Estructura de Carpetas

```
ts-visualizer/
├── .vscode/
│   └── launch.json                      # Debug config (Extension Host)
├── src/
│   ├── extension.ts                     # activate() / deactivate()
│   ├── commands/
│   │   ├── index.ts                     # registerCommands()
│   │   ├── visualizeType.ts             # "Visualize Current Type"
│   │   └── exportJson.ts               # "Export Type as JSON"
│   ├── parser/
│   │   ├── index.ts                     # Barrel export
│   │   ├── classParser.ts              # Parse ClassDeclaration
│   │   ├── interfaceParser.ts          # Parse InterfaceDeclaration
│   │   ├── typeAliasParser.ts          # Parse TypeAliasDeclaration
│   │   └── memberExtractor.ts          # Extract props, methods, ctors
│   ├── resolver/
│   │   ├── index.ts
│   │   ├── inheritanceResolver.ts      # resolveFullTypeHierarchy()
│   │   ├── overrideDetector.ts         # Detect overridden members
│   │   └── genericResolver.ts          # Resolve generic type params
│   ├── model/
│   │   ├── types.ts                    # All data-model interfaces
│   │   ├── graphModel.ts              # ResolvedTypeHierarchy → GraphData
│   │   └── jsonSerializer.ts          # Serialize to exportable JSON
│   ├── webview/
│   │   ├── WebviewPanel.ts            # createOrShow(), message handling
│   │   └── app/                       # React app (separate webpack entry)
│   │       ├── index.tsx              # ReactDOM.createRoot
│   │       ├── App.tsx                # Main layout
│   │       ├── components/
│   │       │   ├── GraphCanvas.tsx    # <ReactFlow> wrapper
│   │       │   ├── TypeNode.tsx       # Custom node: class/interface box
│   │       │   ├── MemberNode.tsx     # Custom node: property/method row
│   │       │   ├── ContextMenu.tsx    # Right-click: hide/show/collapse
│   │       │   ├── Toolbar.tsx        # Zoom, fit, export buttons
│   │       │   └── SearchBar.tsx      # Filter nodes by name
│   │       ├── hooks/
│   │       │   ├── useGraphData.ts    # Transform JSON → React Flow nodes
│   │       │   └── useVSCodeApi.ts    # acquireVsCodeApi() wrapper
│   │       ├── utils/
│   │       │   ├── layoutEngine.ts    # dagre/elkjs auto-layout
│   │       │   ├── exportPng.ts       # html-to-image export
│   │       │   └── exportYaml.ts      # js-yaml serialization
│   │       └── styles/
│   │           └── theme.css          # CSS variables for dark/light
│   └── utils/
│       ├── cursorUtils.ts             # getTypeAtCursor()
│       ├── projectLoader.ts           # ts-morph Project singleton
│       └── cache.ts                   # LRU cache for resolved types
├── test/
│   ├── fixtures/
│   │   ├── deepInheritance.ts         # 5-level class chain
│   │   ├── multipleInterfaces.ts      # Class + N interfaces
│   │   └── generics.ts               # Generic class hierarchy
│   ├── parser.test.ts
│   ├── resolver.test.ts
│   └── model.test.ts
├── package.json
├── tsconfig.json
├── tsconfig.webview.json              # Separate config for React JSX
├── webpack.config.js                  # Extension bundle (Node target)
├── webpack.webview.config.js          # Webview bundle (web target)
├── .vscodeignore
├── .eslintrc.json
├── CHANGELOG.md
├── README.md
└── docs/
    └── ARCHITECTURE.md                # This file
```

## 2. Modelo de Datos JSON

### 2.1 Core Types

```typescript
// ─── Type Information ────────────────────────────────────────────

interface TypeInfo {
  id: string;                           // Fully-qualified name
  name: string;                         // Short name
  kind: 'class' | 'interface' | 'type-alias';
  filePath: string;
  line: number;
  column: number;
  isAbstract?: boolean;
  isExported?: boolean;
  typeParameters?: GenericParam[];
  jsdoc?: string;
}

interface GenericParam {
  name: string;                         // T, K, V ...
  constraint?: string;                  // "extends Record<string, any>"
  default?: string;                     // "= unknown"
}

// ─── Members ─────────────────────────────────────────────────────

interface MemberInfo {
  id: string;                           // typeId + "." + name
  name: string;
  kind: 'property' | 'method' | 'constructor' | 'accessor' | 'index-signature';
  type: string;                         // Resolved type as string
  modifiers: Modifier[];
  isOptional?: boolean;
  isStatic?: boolean;
  isAbstract?: boolean;
  jsdoc?: string;

  // ── Inheritance traceability ──
  inheritedFrom?: string;               // null/undefined = own member
  inheritanceLevel: number;             // 0 = own, 1 = parent, 2 = grandparent…
  inheritancePath: string[];            // ["MyClass", "BaseService", "AbstractEntity"]
  isOverride?: boolean;
  overrides?: string;                   // Type name whose member is overridden

  // ── Method-specific ──
  parameters?: ParameterInfo[];
  returnType?: string;
}

interface ParameterInfo {
  name: string;
  type: string;
  isOptional?: boolean;
  isRest?: boolean;
  defaultValue?: string;
}

type Modifier =
  | 'public' | 'private' | 'protected'
  | 'static' | 'readonly' | 'abstract'
  | 'override' | 'async';

// ─── Inheritance Chain ───────────────────────────────────────────

interface InheritanceLink {
  source: string;                       // Child type ID
  target: string;                       // Parent type ID
  kind: 'extends' | 'implements';
  level: number;                        // Distance from root (0-based)
}

// ─── Full Resolved Output ────────────────────────────────────────

interface ResolvedTypeHierarchy {
  root: TypeInfo;                       // The type the user selected
  ancestors: TypeInfo[];                // All types in chain, ordered by level
  allMembers: MemberInfo[];             // Flat list, full traceability
  inheritanceChain: InheritanceLink[];  // All inheritance edges
  metadata: {
    totalLevels: number;
    totalMembers: number;
    totalOverrides: number;
    resolvedAt: string;                 // ISO timestamp
  };
}
```

### 2.2 Graph Model (for React Flow)

```typescript
interface GraphNode {
  id: string;
  type: 'type-node' | 'member-group' | 'member-item';
  data: {
    label: string;
    kind: string;                       // class, interface, type-alias
    level: number;                      // Inheritance depth
    color: string;                      // Assigned by level palette
    icon: string;                       // C, I, T for class/interface/type
    members?: MemberInfo[];
    collapsed?: boolean;
    typeInfo?: TypeInfo;
  };
  position: { x: number; y: number };  // Computed by dagre
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'inheritance' | 'implements' | 'contains';
  label?: string;                       // "extends" | "implements"
  animated?: boolean;
  style?: Record<string, string>;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
```

### 2.3 Ejemplo: 4 niveles de herencia

Dado este código:
```typescript
abstract class Entity {
  id: string;
  createdAt: Date;
}

abstract class AuditableEntity extends Entity {
  updatedAt: Date;
  updatedBy: string;
}

class BaseService extends AuditableEntity {
  protected logger: Logger;
  log(msg: string): void {}
}

interface Serializable {
  serialize(): string;
}

class UserService extends BaseService implements Serializable {
  username: string;
  email: string;
  override log(msg: string): void {}  // override
  serialize(): string { return ""; }
}
```

El JSON resuelto para `UserService`:
```json
{
  "root": {
    "id": "UserService",
    "name": "UserService",
    "kind": "class",
    "filePath": "src/services/user.ts",
    "line": 18,
    "column": 1,
    "isAbstract": false,
    "isExported": true
  },
  "ancestors": [
    { "id": "BaseService", "name": "BaseService", "kind": "class", "isAbstract": false },
    { "id": "AuditableEntity", "name": "AuditableEntity", "kind": "class", "isAbstract": true },
    { "id": "Entity", "name": "Entity", "kind": "class", "isAbstract": true },
    { "id": "Serializable", "name": "Serializable", "kind": "interface" }
  ],
  "allMembers": [
    {
      "id": "UserService.username",
      "name": "username",
      "kind": "property",
      "type": "string",
      "modifiers": ["public"],
      "inheritanceLevel": 0,
      "inheritancePath": ["UserService"]
    },
    {
      "id": "UserService.email",
      "name": "email",
      "kind": "property",
      "type": "string",
      "modifiers": ["public"],
      "inheritanceLevel": 0,
      "inheritancePath": ["UserService"]
    },
    {
      "id": "UserService.log",
      "name": "log",
      "kind": "method",
      "type": "(msg: string) => void",
      "modifiers": ["public", "override"],
      "inheritanceLevel": 0,
      "inheritancePath": ["UserService"],
      "isOverride": true,
      "overrides": "BaseService",
      "parameters": [{ "name": "msg", "type": "string" }],
      "returnType": "void"
    },
    {
      "id": "UserService.serialize",
      "name": "serialize",
      "kind": "method",
      "type": "() => string",
      "modifiers": ["public"],
      "inheritanceLevel": 0,
      "inheritancePath": ["UserService"],
      "parameters": [],
      "returnType": "string"
    },
    {
      "id": "UserService.logger",
      "name": "logger",
      "kind": "property",
      "type": "Logger",
      "modifiers": ["protected"],
      "inheritedFrom": "BaseService",
      "inheritanceLevel": 1,
      "inheritancePath": ["UserService", "BaseService"]
    },
    {
      "id": "UserService.updatedAt",
      "name": "updatedAt",
      "kind": "property",
      "type": "Date",
      "modifiers": ["public"],
      "inheritedFrom": "AuditableEntity",
      "inheritanceLevel": 2,
      "inheritancePath": ["UserService", "BaseService", "AuditableEntity"]
    },
    {
      "id": "UserService.updatedBy",
      "name": "updatedBy",
      "kind": "property",
      "type": "string",
      "modifiers": ["public"],
      "inheritedFrom": "AuditableEntity",
      "inheritanceLevel": 2,
      "inheritancePath": ["UserService", "BaseService", "AuditableEntity"]
    },
    {
      "id": "UserService.id",
      "name": "id",
      "kind": "property",
      "type": "string",
      "modifiers": ["public"],
      "inheritedFrom": "Entity",
      "inheritanceLevel": 3,
      "inheritancePath": ["UserService", "BaseService", "AuditableEntity", "Entity"]
    },
    {
      "id": "UserService.createdAt",
      "name": "createdAt",
      "kind": "property",
      "type": "Date",
      "modifiers": ["public"],
      "inheritedFrom": "Entity",
      "inheritanceLevel": 3,
      "inheritancePath": ["UserService", "BaseService", "AuditableEntity", "Entity"]
    }
  ],
  "inheritanceChain": [
    { "source": "UserService", "target": "BaseService", "kind": "extends", "level": 0 },
    { "source": "UserService", "target": "Serializable", "kind": "implements", "level": 0 },
    { "source": "BaseService", "target": "AuditableEntity", "kind": "extends", "level": 1 },
    { "source": "AuditableEntity", "target": "Entity", "kind": "extends", "level": 2 }
  ],
  "metadata": {
    "totalLevels": 4,
    "totalMembers": 9,
    "totalOverrides": 1,
    "resolvedAt": "2026-03-12T05:10:00.000Z"
  }
}
```

## 3. Elección de Librería de Grafo

### ✅ ELEGIDA: React Flow (v12+)

| Criterio                 | React Flow           | vis-network          |
|--------------------------|----------------------|----------------------|
| Custom nodes ricos       | ✅ Componentes React | ⚠️ HTML-in-canvas    |
| Integración React        | ✅ Nativo            | ❌ Requiere wrapper  |
| Zoom/Pan/Minimap         | ✅ Built-in          | ✅ Built-in          |
| Edges con labels         | ✅ Bézier/Step/Smart | ✅ Básicos           |
| Theming (dark/light)     | ✅ CSS variables     | ⚠️ Manual            |
| Layout automático        | ✅ dagre/elkjs       | ✅ Propio motor      |
| Comunidad/Mantenimiento  | ✅ Muy activo        | ⚠️ Menos activo      |
| Bundle size              | ~150KB gz            | ~80KB gz             |
| Interactividad sub-nodo  | ✅ Collapse/expand   | ❌ Limitado          |

**Justificación**: React Flow permite crear nodos custom como componentes React
completos (con collapse/expand de miembros, iconos, badges por modifier, tooltips).
Esto es exactamente lo que necesitamos para replicar la UX de JSONVisualizerForVSCode.
vis-network es canvas-only y no permite ese nivel de interactividad dentro de los nodos.

**Layout**: dagre (vía @dagrejs/dagre) para disposición jerárquica top-down.
elkjs como alternativa si necesitamos layout más sofisticado.

## 4. Comandos y Triggers

| Command ID                       | Título en Palette                    | Trigger                                |
|----------------------------------|--------------------------------------|----------------------------------------|
| `tsVisualizer.visualizeType`     | TS Visualizer: Visualize Type        | Palette + Editor context menu (cursor) |
| `tsVisualizer.exportJson`        | TS Visualizer: Export as JSON        | Palette + Webview toolbar              |
| `tsVisualizer.exportPng`         | TS Visualizer: Export as PNG         | Webview toolbar button                 |
| `tsVisualizer.exportYaml`        | TS Visualizer: Export as YAML        | Webview toolbar button                 |

### Activation Events
```json
{
  "activationEvents": [
    "onLanguage:typescript",
    "onLanguage:typescriptreact"
  ]
}
```

### Editor Context Menu
Right-click en cualquier nombre de class/interface/type → **"Visualize This Type"**
Se registra en `contributes.menus.editor/context` con `when: editorLangId == typescript`.

### Flujo de Datos

```
[User clicks "Visualize Type"]
        │
        ▼
  cursorUtils.ts → getTypeAtCursor(editor)
        │
        ▼
  parser/ → parseTypeDeclaration(node)
        │
        ▼
  resolver/ → resolveFullTypeHierarchy(typeInfo)
        │
        ▼
  model/graphModel.ts → toGraphData(resolved)
        │
        ▼
  webview/WebviewPanel.ts → postMessage(graphData)
        │
        ▼
  React Flow → render interactive graph
```
