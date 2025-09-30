import React, { useCallback, useState, useMemo } from 'react';
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

// Import custom node components
import StartingPromptNode from './components/StartingPromptNode';
import AgentPromptNode from './components/AgentPromptNode';
import ImagePromptNode from './components/ImagePromptNode';
import OutputNode from './components/OutputNode';

const initialNodes = [
  {
    id: 'starting-1',
    position: { x: 100, y: 100 },
    type: 'startingPrompt',
    data: { 
      prompt: '',
      systemPrompt: 'You are a creative writing assistant.',
      onOutput: null // Will be set in component
    },
  },
  {
    id: 'output-1', 
    position: { x: 500, y: 100 },
    type: 'output',
    data: { 
      content: '',
      onReceiveInput: null, // Will be set in component
      onOutput: null
    },
  },
];

const initialEdges = [
  { 
    id: 'starting-output', 
    source: 'starting-1', 
    target: 'output-1',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 }
  },
];

function CreativeNodeFlow() {
  const [colorMode, setColorMode] = useState('dark');
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  // Removed unused nodeOutputHandlers
  const [nodeInputHandlers] = useState(new Map());

  // Define custom node types
  const nodeTypes = useMemo(() => ({
    startingPrompt: StartingPromptNode,
    agentPrompt: AgentPromptNode,
    imagePrompt: ImagePromptNode,
    output: OutputNode,
  }), []);

  // Handle node output events
  const handleNodeOutput = useCallback((outputData) => {
    const { nodeId, content, context, type } = outputData;
    
    // Find edges that originate from this node
    const outgoingEdges = edges.filter(edge => edge.source === nodeId);
    
    // Send data to connected target nodes
    outgoingEdges.forEach(edge => {
      const inputHandler = nodeInputHandlers.get(edge.target);
      if (inputHandler) {
        inputHandler({ content, context, type });
      }
    });

    // Auto-create output node if none exists
    if (outgoingEdges.length === 0) {
      const newOutputId = `auto-output-${Date.now()}`;
      const sourceNode = nodes.find(n => n.id === nodeId);
      
      if (sourceNode) {
        const newOutputNode = {
          id: newOutputId,
          position: { 
            x: sourceNode.position.x + 350, 
            y: sourceNode.position.y 
          },
          type: 'output',
          data: { 
            content,
            context,
            type,
            onReceiveInput: (handler) => nodeInputHandlers.set(newOutputId, handler),
            onOutput: handleNodeOutput
          },
        };

        const newEdge = {
          id: `${nodeId}-${newOutputId}`,
          source: nodeId,
          target: newOutputId,
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2 }
        };

        setNodes(nodes => [...nodes, newOutputNode]);
        setEdges(edges => [...edges, newEdge]);

        // Immediately send data to the new output node
        setTimeout(() => {
          const inputHandler = nodeInputHandlers.get(newOutputId);
          if (inputHandler) {
            inputHandler({ content, context, type });
          }
        }, 100);
      }
    }
  }, [edges, nodes, setNodes, setEdges, nodeInputHandlers]);

  // Register output and input handlers for nodes
  const registerNodeHandlers = useCallback((nodeId) => {
    return {
      onOutput: handleNodeOutput,
      onReceiveInput: (handler) => nodeInputHandlers.set(nodeId, handler)
    };
  }, [handleNodeOutput, nodeInputHandlers]);

  // Update node data with handlers
  const enhancedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        ...registerNodeHandlers(node.id)
      }
    }));
  }, [nodes, registerNodeHandlers]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 }
    }, eds)),
    [setEdges],
  );

  const onChange = (evt) => {
    setColorMode(evt.target.value);
  };

  // Add new node functions
  const addNode = useCallback((type) => {
    const newId = `${type}-${Date.now()}`;
    const position = {
      x: Math.random() * 300 + 100,
      y: Math.random() * 300 + 100
    };

    let nodeData = { 
      ...registerNodeHandlers(newId)
    };

    switch (type) {
      case 'startingPrompt':
        nodeData = {
          ...nodeData,
          prompt: '',
          systemPrompt: 'You are a helpful AI assistant.'
        };
        break;
      case 'agentPrompt':
        nodeData = {
          ...nodeData,
          prompt: '',
          systemPrompt: 'You are a helpful AI assistant.'
        };
        break;
      case 'imagePrompt':
        nodeData = {
          ...nodeData,
          prompt: ''
        };
        break;
      case 'output':
        nodeData = {
          ...nodeData,
          content: '',
          context: null
        };
        break;
      default:
        break;
    }

    const newNode = {
      id: newId,
      position,
      type,
      data: nodeData
    };

    setNodes(nodes => [...nodes, newNode]);
  }, [setNodes, registerNodeHandlers]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={enhancedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        colorMode={colorMode}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
        
        {/* Theme selector */}
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
              color: colorMode === 'dark' ? 'white' : 'black',
              marginBottom: '8px'
            }}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </Panel>

        {/* Node creation panel */}
        <Panel position="top-left">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            padding: '8px',
            backgroundColor: colorMode === 'dark' ? '#374151' : 'white',
            borderRadius: '8px',
            border: '1px solid #ccc'
          }}>
            <div style={{ 
              fontWeight: 'bold', 
              fontSize: '12px',
              color: colorMode === 'dark' ? 'white' : 'black'
            }}>
              Add Nodes
            </div>
            <button
              onClick={() => addNode('startingPrompt')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid #3b82f6',
                backgroundColor: '#3b82f6',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              🚀 Starting Prompt
            </button>
            <button
              onClick={() => addNode('agentPrompt')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid #ec4899',
                backgroundColor: '#ec4899',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              🤖 Agent Prompt
            </button>
            <button
              onClick={() => addNode('imagePrompt')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid #6366f1',
                backgroundColor: '#6366f1',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              🎨 Image Prompt
            </button>
            <button
              onClick={() => addNode('output')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid #10b981',
                backgroundColor: '#10b981',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              📄 Output
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default CreativeNodeFlow;