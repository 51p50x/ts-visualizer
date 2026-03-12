import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { resetProject, getProject, getProjectForSingleFile, getSourceFile } from './utils/projectLoader';
import { getTypeAtCursor } from './utils/cursorUtils';
import { createStatusBarItem, updateStatusBar, disposeStatusBar } from './utils/statusBar';

export function activate(context: vscode.ExtensionContext): void {
  console.log('TS Object Visualizer is now active.');

  // Register all commands
  const disposables = registerCommands(context.extensionUri);
  disposables.forEach((d) => context.subscriptions.push(d));

  // Status bar item
  const statusBar = createStatusBarItem();
  context.subscriptions.push(statusBar);

  // Update status bar when cursor moves or active editor changes
  const cursorWatcher = vscode.window.onDidChangeTextEditorSelection(
    debounce((e: vscode.TextEditorSelectionChangeEvent) => {
      updateStatusBarFromEditor(e.textEditor);
    }, 300)
  );
  context.subscriptions.push(cursorWatcher);

  const editorWatcher = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      updateStatusBarFromEditor(editor);
    } else {
      updateStatusBar(undefined, undefined);
    }
  });
  context.subscriptions.push(editorWatcher);

  // Initial status bar update
  if (vscode.window.activeTextEditor) {
    updateStatusBarFromEditor(vscode.window.activeTextEditor);
  }

  // Reset ts-morph project cache when workspace folders change
  const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    resetProject();
  });
  context.subscriptions.push(workspaceWatcher);
}

export function deactivate(): void {
  disposeStatusBar();
  resetProject();
}

// ─── Helpers ─────────────────────────────────────────────────────

function updateStatusBarFromEditor(editor: vscode.TextEditor): void {
  const doc = editor.document;
  if (
    doc.languageId !== 'typescript' &&
    doc.languageId !== 'typescriptreact'
  ) {
    updateStatusBar(undefined, undefined);
    return;
  }

  try {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
    const project = workspaceFolder
      ? getProject(workspaceFolder.uri.fsPath)
      : getProjectForSingleFile(doc.uri.fsPath);
    const sourceFile = getSourceFile(project, doc.uri.fsPath);

    if (!sourceFile) {
      updateStatusBar(undefined, undefined);
      return;
    }

    const result = getTypeAtCursor(editor, sourceFile);
    updateStatusBar(result?.name, result?.kind);
  } catch {
    updateStatusBar(undefined, undefined);
  }
}

function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(() => fn(...args), ms);
  };
}
