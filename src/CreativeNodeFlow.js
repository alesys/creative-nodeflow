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

  // Reset function to clear all nodes and start fresh
  const resetCanvas = useCallback(() => {
    nodeInputHandlers.clear();
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [setNodes, setEdges, nodeInputHandlers]);

  // Clean duplicate nodes function
  const cleanupDuplicates = useCallback(() => {
    setNodes(currentNodes => {
      const uniqueNodes = [];
      const seenIds = new Set();
      
      currentNodes.forEach(node => {
        if (!seenIds.has(node.id)) {
          seenIds.add(node.id);
          uniqueNodes.push(node);
        }
      });
      
      return uniqueNodes;
    });
    
    setEdges(currentEdges => {
      const uniqueEdges = [];
      const seenIds = new Set();
      
      currentEdges.forEach(edge => {
        if (!seenIds.has(edge.id)) {
          seenIds.add(edge.id);
          uniqueEdges.push(edge);
        }
      });
      
      return uniqueEdges;
    });
  }, [setNodes, setEdges]);

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

    // Auto-create output node if none exists and it's not already an output node
    if (outgoingEdges.length === 0) {
      const sourceNode = nodes.find(n => n.id === nodeId);
      
      // Don't auto-create if the source is already an output node or if we're already creating one
      if (sourceNode && sourceNode.type !== 'output') {
        // Check if there's already an auto-output for this node
        const existingAutoOutput = nodes.find(n => 
          n.id.startsWith(`auto-output-${nodeId}`) || 
          edges.some(edge => edge.source === nodeId && edge.target === n.id && n.type === 'output')
        );
        
        if (!existingAutoOutput) {
          const newOutputId = `auto-output-${nodeId}-${Date.now()}`;
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
        fitViewOptions={{
          padding: 0.1,
          includeHiddenNodes: false
        }}
        onError={(error) => {
          // Suppress ResizeObserver errors
          if (error.message && error.message.includes('ResizeObserver')) {
            return;
          }
          console.error('ReactFlow error:', error);
        }}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
        
        {/* Theme selector and controls */}
        <Panel position="top-right">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px',
            backgroundColor: colorMode === 'dark' ? '#374151' : 'white',
            borderRadius: '8px',
            border: '1px solid #ccc'
          }}>
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
            
            <button
              className="nodrag"
              onClick={cleanupDuplicates}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid #f59e0b',
                backgroundColor: '#f59e0b',
                color: 'white',
                cursor: 'pointer'
              }}
              title="Remove duplicate nodes and edges"
            >
              🧹 Cleanup
            </button>
            
            <button
              className="nodrag"
              onClick={resetCanvas}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid #dc2626',
                backgroundColor: '#dc2626',
                color: 'white',
                cursor: 'pointer'
              }}
              title="Reset to initial state"
            >
              🔄 Reset
            </button>
          </div>
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

export default React.memo(CreativeNodeFlow);