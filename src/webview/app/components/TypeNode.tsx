import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { SimpleNodeData } from '../types';

interface TypeNodeProps {
  data: SimpleNodeData;
}

/**
 * Custom React Flow node that displays a type as a card
 * with its simple shape { prop: type } for readability.
 */
const TypeNode: React.FC<TypeNodeProps> = ({ data }) => {
  const [collapsed, setCollapsed] = useState(data.collapsed);
  const entries = Object.entries(data.simpleShape ?? {});
  const hasEntries = entries.length > 0;

  return (
    <div
      className="type-node"
      style={{ '--node-color': data.color } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} />

      <div
        className="type-node__header"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="type-node__badge">{data.icon}</span>
        <span className="type-node__name">{data.label}</span>
        {data.level > 0 && (
          <span className="type-node__level-badge">L{data.level}</span>
        )}
        {hasEntries && (
          <span className="type-node__toggle">
            {collapsed ? '▸' : '▾'}
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="type-node__body">
          {hasEntries ? (
            entries.map(([name, type]) => (
              <div key={name} className="type-node__prop">
                <span className="type-node__prop-name">{name}</span>
                <span className="type-node__prop-type" title={type}>
                  {type}
                </span>
              </div>
            ))
          ) : (
            <div className="type-node__empty">No members</div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(TypeNode);
