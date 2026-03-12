import * as vscode from 'vscode';
import { getProject, getProjectForSingleFile, getSourceFile } from '../utils/projectLoader';
import { getTypeAtCursor } from '../utils/cursorUtils';
import { resolveFullTypeHierarchy } from '../resolver';
import { serializeToJson, ExportFormat } from '../model/jsonSerializer';

/**
 * Command: tsVisualizer.exportJson
 *
 * Resolves the full type hierarchy at the cursor and exports
 * the result as a formatted JSON file.
 */
export async function exportJsonCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('TS Visualizer: No active editor found.');
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

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

  try {
    const project = workspaceFolder
      ? getProject(workspaceFolder.uri.fsPath)
      : getProjectForSingleFile(document.uri.fsPath);
    const sourceFile = getSourceFile(project, document.uri.fsPath);

    if (!sourceFile) {
      vscode.window.showErrorMessage(
        'TS Visualizer: Could not load source file.'
      );
      return;
    }

    const result = getTypeAtCursor(editor, sourceFile);
    if (!result) {
      vscode.window.showInformationMessage(
        'TS Visualizer: No class, interface, or type alias found.'
      );
      return;
    }

    // Ask user which format to export
    const formatChoice = await vscode.window.showQuickPick(
      [
        { label: 'Simple shape { prop: type }', value: 'simple' as ExportFormat },
        { label: 'Full (hierarchy + graph)', value: 'full' as ExportFormat },
        { label: 'Hierarchy only', value: 'hierarchy' as ExportFormat },
        { label: 'Graph only (React Flow)', value: 'graph' as ExportFormat },
      ],
      { placeHolder: 'Select export format' }
    );

    if (!formatChoice) {
      return; // User cancelled
    }

    // Resolve hierarchy
    const resolved = resolveFullTypeHierarchy(result.node);
    const json = serializeToJson(resolved, formatChoice.value, result.node);

    // Open in a new untitled JSON document
    const doc = await vscode.workspace.openTextDocument({
      content: json,
      language: 'json',
    });
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);

    vscode.window.showInformationMessage(
      `TS Visualizer: Exported "${result.name}" as JSON (${formatChoice.label}).`
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(
      `TS Visualizer: Export error — ${message}`
    );
  }
}
