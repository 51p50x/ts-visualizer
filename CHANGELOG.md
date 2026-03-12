# Change Log

All notable changes to the "TS Object Visualizer" extension will be documented in this file.

## [0.2.0] - 2026-03-12

### Added

- **Nested Object Expansion** — Properties whose types are known classes, interfaces, or type aliases are now resolved and displayed as connected composition nodes (dashed cyan border)
- **Array & Generic Support** — Handles `Order[]`, `Array<Item>`, `Map<string, User>`, unions, and intersections when resolving nested types
- **Selection-Based Visualization** — Select any type name in your code and run Visualize Type to resolve it, even if your cursor isn't on the declaration
- **Composition Edges** — Dashed cyan edges labeled with the property name (e.g. `address`, `orders []`) connect parent types to their nested types
- **Recursive Composition** — Nested types are resolved up to 3 levels deep with circular reference protection

## [0.1.0] - 2026-03-12

### Added

- **Interactive Graph Visualization** — Visualize TypeScript classes, interfaces, and type aliases as interactive node graphs using React Flow
- **Deep Inheritance Resolution** — Recursively resolves `extends` and `implements` chains across multiple files with full traceability
- **Simple Shape Display** — Each graph node shows a clean `{ property: type }` representation
- **Override Detection** — Automatically detects and marks overridden members in inheritance chains
- **Export as JSON** — Export type hierarchy in 4 formats: Simple, Hierarchy, Graph, Full
- **Status Bar Integration** — Shows the detected type under cursor with click-to-visualize
- **Context Menu** — Right-click to visualize or export any type
- **Keyboard Shortcut** — `Ctrl+Shift+V` / `Cmd+Shift+V` to visualize
- **Auto-Detection** — Finds the nearest type declaration even when cursor is outside a declaration
- **Single File Support** — Works with standalone `.ts` files without requiring a workspace folder
- **Dark/Light Theme** — Adapts to your VS Code theme
- **MiniMap & Controls** — Built-in navigation controls for the graph
- **Auto-Layout** — Automatic dagre-based graph layout (top-to-bottom)
