import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
    type: 'customOutput',
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
  // Using useRef for nodeInputHandlers to prevent state mutation
  const nodeInputHandlers = useRef(new Map());

  // Update connection state colors based on edges
  useEffect(() => {
    // Remove all existing connection state classes
    document.querySelectorAll('.react-flow__handle').forEach(handle => {
      handle.classList.remove('connected-input', 'connected-output');
    });

    // Apply connection state classes based on current edges
    edges.forEach(edge => {
      // Find target (input) handle and mark as connected
      const targetHandle = document.querySelector(`[data-nodeid="${edge.target}"] .react-flow__handle-target`);
      if (targetHandle) {
        targetHandle.classList.add('connected-input');
      }

      // Find source (output) handle and mark as connected
      const sourceHandle = document.querySelector(`[data-nodeid="${edge.source}"] .react-flow__handle-source`);
      if (sourceHandle) {
        sourceHandle.classList.add('connected-output');
      }
    });
  }, [edges]);

  // Reset function to clear all nodes and start fresh
  const resetCanvas = useCallback(() => {
    nodeInputHandlers.current.clear();
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [setNodes, setEdges]);

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

  // Use refs to access current values without causing re-renders
  const edgesRef = useRef(edges);
  const nodesRef = useRef(nodes);
  
  useEffect(() => {
    edgesRef.current = edges;
    nodesRef.current = nodes;
  }, [edges, nodes]);

  // Define custom node types
  const nodeTypes = useMemo(() => ({
    startingPrompt: StartingPromptNode,
    agentPrompt: AgentPromptNode,
    imagePrompt: ImagePromptNode,
    customOutput: OutputNode,
  }), []);

  // Handle node output events - optimized to reduce re-renders
  const handleNodeOutput = useCallback((outputData) => {
    const { nodeId, content, context, type } = outputData;
    
    // Find edges that originate from this node
    const currentEdges = edgesRef.current;
    const currentNodes = nodesRef.current;
    const outgoingEdges = currentEdges.filter(edge => edge.source === nodeId);
    
    // Send data to connected target nodes
    outgoingEdges.forEach(edge => {
      const inputHandler = nodeInputHandlers.current.get(edge.target);
      if (inputHandler) {
        inputHandler({ content, context, type });
      }
    });

    // Auto-create output node if none exists and it's not already an output node
    if (outgoingEdges.length === 0) {
      const sourceNode = currentNodes.find(n => n.id === nodeId);
      
      // Don't auto-create if the source is already an output node or if we're already creating one
      if (sourceNode && sourceNode.type !== 'customOutput') {
        // Check if there's already an auto-output for this node
        const existingAutoOutput = currentNodes.find(n => 
          n.id.startsWith(`auto-output-${nodeId}`) || 
          currentEdges.some(edge => edge.source === nodeId && edge.target === n.id && n.type === 'customOutput')
        );
        
        if (!existingAutoOutput) {
          const newOutputId = `auto-output-${nodeId}-${Date.now()}`;
          const newOutputNode = {
            id: newOutputId,
            position: { 
              x: sourceNode.position.x + 350, 
              y: sourceNode.position.y 
            },
            type: 'customOutput',
            data: { 
              content,
              context,
              type,
              onReceiveInput: (handler) => nodeInputHandlers.current.set(newOutputId, handler),
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
            const inputHandler = nodeInputHandlers.current.get(newOutputId);
            if (inputHandler) {
              inputHandler({ content, context, type });
            }
          }, 100);
        }
      }
    }
  }, [setNodes, setEdges]);

  // Register output and input handlers for nodes
  const registerNodeHandlers = useCallback((nodeId) => {
    return {
      onOutput: handleNodeOutput,
      onReceiveInput: (handler) => nodeInputHandlers.current.set(nodeId, handler)
    };
  }, [handleNodeOutput]);

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
      case 'customOutput':
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
          <div className="panel-container">
            <select
              className="nodrag panel-select"
              onChange={onChange}
              value={colorMode}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
            
            <button
              className="nodrag panel-button"
              onClick={cleanupDuplicates}
              title="Remove duplicate nodes and edges"
            >
              🧹 Cleanup
            </button>
            
            <button
              className="nodrag panel-button"
              onClick={resetCanvas}
              title="Reset to initial state"
            >
              🔄 Reset
            </button>
          </div>
        </Panel>

        {/* Node creation panel */}
        <Panel position="top-left">
          <div className="panel-container">
            <div className="panel-title">
              Add Nodes
            </div>
            <button
              className="panel-button"
              onClick={() => addNode('startingPrompt')}
            >
              🚀 Starting Prompt
            </button>
            <button
              className="panel-button"
              onClick={() => addNode('agentPrompt')}
            >
              🤖 Agent Prompt
            </button>
            <button
              className="panel-button"
              onClick={() => addNode('imagePrompt')}
            >
              🎨 Image Prompt
            </button>
            <button
              className="panel-button"
              onClick={() => addNode('customOutput')}
            >
              📄 Custom Output
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default React.memo(CreativeNodeFlow);