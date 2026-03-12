# Change Log

All notable changes to the "TS Object Visualizer" extension will be documented in this file.

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
