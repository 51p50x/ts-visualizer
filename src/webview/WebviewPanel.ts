import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Manages the TS Visualizer webview panel.
 * Placeholder — full implementation in Etapa 6.
 */
export class TSVisualizerPanel {
  public static currentPanel: TSVisualizerPanel | undefined;
  private static readonly viewType = 'tsVisualizer.graphView';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri): TSVisualizerPanel {
    const column = vscode.ViewColumn.Beside;

    if (TSVisualizerPanel.currentPanel) {
      TSVisualizerPanel.currentPanel._panel.reveal(column);
      return TSVisualizerPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      TSVisualizerPanel.viewType,
      'TS Visualizer',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist', 'webview'),
        ],
      }
    );

    TSVisualizerPanel.currentPanel = new TSVisualizerPanel(
      panel,
      extensionUri
    );
    return TSVisualizerPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this._getHtmlForWebview();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  /**
   * Send graph data to the webview.
   */
  public postMessage(data: unknown): void {
    this._panel.webview.postMessage(data);
  }

  /**
   * Send resolved graph data to the webview for rendering.
   */
  public setGraphData(graphPayload: unknown): void {
    this._panel.webview.postMessage({
      type: 'setGraphData',
      payload: graphPayload,
    });
  }

  public dispose(): void {
    TSVisualizerPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }

  private _getHtmlForWebview(): string {
    const webview = this._panel.webview;

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'webview.js')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>TS Visualizer</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
