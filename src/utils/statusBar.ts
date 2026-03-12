import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Create and return the status bar item.
 * Shows the detected type under the cursor.
 */
export function createStatusBarItem(): vscode.StatusBarItem {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'tsVisualizer.visualizeType';
  statusBarItem.tooltip = 'Click to visualize this type';
  return statusBarItem;
}

/**
 * Update the status bar with the detected type info.
 */
export function updateStatusBar(
  typeName: string | undefined,
  typeKind: string | undefined
): void {
  if (!statusBarItem) {
    return;
  }

  if (!typeName) {
    statusBarItem.hide();
    return;
  }

  const icon =
    typeKind === 'class'
      ? '$(symbol-class)'
      : typeKind === 'interface'
        ? '$(symbol-interface)'
        : '$(symbol-type-parameter)';

  statusBarItem.text = `${icon} ${typeName}`;
  statusBarItem.show();
}

/**
 * Dispose the status bar item.
 */
export function disposeStatusBar(): void {
  statusBarItem?.dispose();
  statusBarItem = undefined;
}
