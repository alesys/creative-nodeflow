import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

const initialNodes = [
  {
    id: '1',
    position: { x: 250, y: 25 },
    data: { label: 'Creative' },
    type: 'input',
  },
  {
    id: '2',
    position: { x: 100, y: 125 },
    data: { label: 'Node' },
  },
  {
    id: '3',
    position: { x: 400, y: 125 },
    data: { label: 'Flow' },
    type: 'output',
  },
];

const initialEdges = [
  { 
    id: 'e1-2', 
    source: '1', 
    target: '2',
    animated: true
  },
  { 
    id: 'e1-3', 
    source: '1', 
    target: '3',
    animated: true
  },
];

function CreativeNodeFlow() {
  const [colorMode, setColorMode] = useState('dark');
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onChange = (evt) => {
    setColorMode(evt.target.value);
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        colorMode={colorMode}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
        <Panel position="top-right">
          <select
            className="nodrag"
            onChange={onChange}
            value={colorMode}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              backgroundColor: colorMode === 'dark' ? '#374151' : 'white',
              color: colorMode === 'dark' ? 'white' : 'black'
            }}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default CreativeNodeFlow;