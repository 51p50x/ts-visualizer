# TS Object Visualizer

**Visualize TypeScript classes, interfaces, and type aliases as interactive node graphs — with full deep inheritance resolution.**

## Features

- **Interactive Graph** — Visualize any class, interface, or type alias as a node graph powered by React Flow
- **Deep Inheritance Resolution** — Recursively resolves `extends` and `implements` chains across multiple files
- **Simple Shape View** — Each node displays a clean `{ property: type }` representation for readability
- **Override Detection** — Automatically detects and marks overridden members in the hierarchy
- **Export as JSON** — Export the resolved type hierarchy in multiple formats (simple, hierarchy, graph, full)
- **Status Bar Integration** — Shows the detected type under your cursor in the status bar
- **Auto-Detection** — Automatically detects the nearest type declaration as you move your cursor
- **Dark/Light Theme** — Respects your VS Code theme with CSS variables
- **Single File Support** — Works with standalone `.ts` files, no workspace folder required

## Usage

### Visualize a Type

1. Open a TypeScript file
2. Place your cursor on or inside a class, interface, or type alias
3. Use one of these methods:
   - **Command Palette**: `Ctrl+Shift+P` → `TS Visualizer: Visualize Type`
   - **Keyboard Shortcut**: `Ctrl+Shift+V` (`Cmd+Shift+V` on Mac)
   - **Right-click** → `TS Visualizer: Visualize Type`
   - **Click the type name** in the status bar (bottom-right)

A panel will open showing the type hierarchy as an interactive graph.

### Export as JSON

1. Place your cursor on a type declaration
2. `Ctrl+Shift+P` → `TS Visualizer: Export as JSON`
3. Choose a format:
   - **Simple shape** — Clean `{ prop: type }` object
   - **Hierarchy** — Full resolved type data with inheritance traceability
   - **Graph** — React Flow nodes and edges
   - **Full** — Both hierarchy and graph data

### Graph Interaction

- **Drag** nodes to rearrange
- **Scroll** to zoom in/out
- **Click** a node header to collapse/expand members
- Use the **Controls** (bottom-left) for zoom and fit view
- Use the **MiniMap** (bottom-right) for navigation

## Example

Given this TypeScript code:

```typescript
class Entity {
  id: string;
  createdAt: Date;
}

class User extends Entity {
  username: string;
  email: string;
}
```

Running **Visualize Type** on `User` will show:

```
┌─ C  User ──────────────────┐
│ username      string       │
│ email         string       │
└────────────────────────────┘
         │ extends
┌─ C  Entity ────────────────┐
│ id            string       │
│ createdAt     Date         │
└────────────────────────────┘
```

## Supported Types

| Type | Inheritance | Members |
|------|------------|---------|
| **Classes** | `extends` + `implements` | properties, methods, constructors, accessors |
| **Interfaces** | `extends` (multiple) | properties, method signatures, index signatures |
| **Type Aliases** | — | object-type properties |

## Requirements

- VS Code 1.85 or later
- TypeScript files (`.ts`, `.tsx`)

## Extension Settings

This extension does not add any VS Code settings (yet). All features work out of the box.

## Known Issues

- Very large type hierarchies (10+ levels) may take a moment to resolve
- Types from `node_modules` are shown as placeholder nodes without members

## Release Notes

### 0.1.0

- Initial release
- Interactive graph visualization with React Flow
- Deep inheritance resolution with override detection
- Export as JSON (4 formats)
- Status bar integration
- Context menu support
- Single file and workspace support

---

**Enjoy!**
