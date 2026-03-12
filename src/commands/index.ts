import * as vscode from 'vscode';
import { visualizeTypeCommand } from './visualizeType';
import { exportJsonCommand } from './exportJson';

/**
 * Register all extension commands.
 * Returns disposables to be pushed into context.subscriptions.
 */
export function registerCommands(extensionUri: vscode.Uri): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(
      'tsVisualizer.visualizeType',
      () => visualizeTypeCommand(extensionUri)
    ),
    vscode.commands.registerCommand(
      'tsVisualizer.exportJson',
      exportJsonCommand
    ),
  ];
}
