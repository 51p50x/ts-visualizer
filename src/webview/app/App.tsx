import React, { useState, useEffect } from 'react';
import GraphView from './GraphView';
import type { GraphPayload, WebviewMessage } from './types';
import './styles.css';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

const App: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphPayload | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<WebviewMessage>) => {
      const message = event.data;
      if (message.type === 'setGraphData') {
        setGraphData(message.payload as GraphPayload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return <GraphView graphData={graphData} />;
};

export default App;
