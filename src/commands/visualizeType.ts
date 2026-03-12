import * as vscode from 'vscode';
import { getProject, getProjectForSingleFile, getSourceFile } from '../utils/projectLoader';
import { getTypeAtCursor } from '../utils/cursorUtils';
import { resolveFullTypeHierarchy, resolveCompositions } from '../resolver';
import { toGraphData } from '../model/graphModel';
import { TSVisualizerPanel } from '../webview/WebviewPanel';

/**
 * Command: tsVisualizer.visualizeType
 *
 * Detects the class/interface/type alias under the cursor,
 * resolves the full inheritance hierarchy, and opens
 * the interactive graph visualizer webview.
 */
export async function visualizeTypeCommand(
  extensionUri: vscode.Uri
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(
      'TS Visualizer: No active editor found.'
    );
    return;
  }

  const document = editor.document;
  if (
    document.languageId !== 'typescript' &&
    document.languageId !== 'typescriptreact'
  ) {
    vscode.window.showWarningMessage(
      'TS Visualizer: This command only works with TypeScript files.'
    );
    return;
  }

  // Get workspace root — fallback to single-file mode if no folder is open
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

  try {
    const project = workspaceFolder
      ? getProject(workspaceFolder.uri.fsPath)
      : getProjectForSingleFile(document.uri.fsPath);
    const sourceFile = getSourceFile(project, document.uri.fsPath);

    if (!sourceFile) {
      vscode.window.showErrorMessage(
        'TS Visualizer: Could not load source file in ts-morph.'
      );
      return;
    }

    const result = getTypeAtCursor(editor, sourceFile);

    if (!result) {
      vscode.window.showInformationMessage(
        'TS Visualizer: No class, interface, or type alias found at cursor position. ' +
          'Place your cursor on or inside a type declaration.'
      );
      return;
    }

    // Resolve the full type hierarchy (deep inheritance)
    const resolved = resolveFullTypeHierarchy(result.node);
    const graphData = toGraphData(resolved);

    // Resolve composition relationships (nested object types)
    const compositions = resolveCompositions(graphData.nodes, result.node);
    const allNodes = [...graphData.nodes, ...compositions.nodes];
    const allEdges = [...graphData.edges, ...compositions.edges];

    // Open / reuse the webview panel
    const panel = TSVisualizerPanel.createOrShow(extensionUri);

    // Send graph data to the webview (small delay to ensure webview is ready)
    setTimeout(() => {
      panel.setGraphData({
        nodes: allNodes,
        edges: allEdges,
        rootName: result.name,
      });
    }, 300);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(
      `TS Visualizer: Error analyzing type — ${message}`
    );
  }
}
