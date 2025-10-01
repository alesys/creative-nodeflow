import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
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
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [contextMenu, setContextMenu] = useState(null);
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

  // Reset and cleanup functions removed - replaced by resetToInitialState in context menu

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

  // onChange function removed since theme switcher is removed

  // addNode function removed - replaced by createNodeFromMenu in context menu

  // Handle keyboard events for deletion
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Get selected nodes and edges
      const selectedNodes = nodes.filter(node => node.selected);
      const selectedEdges = edges.filter(edge => edge.selected);
      
      if (selectedNodes.length > 0) {
        // Delete selected nodes and their connections
        const nodeIdsToDelete = selectedNodes.map(node => node.id);
        
        setNodes(currentNodes => 
          currentNodes.filter(node => !nodeIdsToDelete.includes(node.id))
        );
        
        setEdges(currentEdges => 
          currentEdges.filter(edge => 
            !nodeIdsToDelete.includes(edge.source) && 
            !nodeIdsToDelete.includes(edge.target)
          )
        );
        
        // Clear input handlers for deleted nodes
        nodeIdsToDelete.forEach(id => {
          nodeInputHandlers.current.delete(id);
        });
      }
      
      if (selectedEdges.length > 0) {
        // Delete selected edges
        const edgeIdsToDelete = selectedEdges.map(edge => edge.id);
        setEdges(currentEdges => 
          currentEdges.filter(edge => !edgeIdsToDelete.includes(edge.id))
        );
      }
    }
  }, [nodes, edges, setNodes, setEdges]);

  // Right-click context menu handler
  const handlePaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Context menu node creation handlers
  const createNodeFromMenu = useCallback((nodeType, x, y) => {
    const newId = `${nodeType}-${Date.now()}`;
    const position = {
      x: x - 100, // Offset from click position
      y: y - 50
    };

    let nodeData = { 
      ...registerNodeHandlers(newId)
    };

    switch (nodeType) {
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
      type: nodeType,
      data: nodeData
    };

    setNodes(nodes => [...nodes, newNode]);
    closeContextMenu();
  }, [setNodes, registerNodeHandlers, closeContextMenu]);

  // Reset function to clear all nodes and start fresh
  const resetToInitialState = useCallback(() => {
    nodeInputHandlers.current.clear();
    setNodes(initialNodes);
    setEdges(initialEdges);
    closeContextMenu();
  }, [setNodes, setEdges, closeContextMenu]);

  // Add keyboard event listener
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      // Only handle if no input is focused
      if (!event.target.closest('input, textarea, select')) {
        handleKeyDown(event);
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('click', closeContextMenu);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('click', closeContextMenu);
    };
  }, [handleKeyDown, closeContextMenu]);

  // Add double-click listeners to unconnected handles
  useEffect(() => {
    const handleDoubleClick = (event) => {
      const handle = event.target.closest('.react-flow__handle');
      if (handle) {
        event.stopPropagation();
        
        // Check if this handle is unconnected
        const nodeId = handle.closest('[data-id]')?.getAttribute('data-id');
        const isSource = handle.classList.contains('react-flow__handle-source');
        const isTarget = handle.classList.contains('react-flow__handle-target');
        
        let isConnected = false;
        if (isSource) {
          isConnected = edges.some(edge => edge.source === nodeId);
        } else if (isTarget) {
          isConnected = edges.some(edge => edge.target === nodeId);
        }
        
        // Show context menu at handle position if not connected
        if (!isConnected) {
          const rect = handle.getBoundingClientRect();
          setContextMenu({
            x: rect.right + 10,
            y: rect.top
          });
        }
      }
    };

    // Add double-click listeners to all handles
    const addHandleListeners = () => {
      const handles = document.querySelectorAll('.react-flow__handle');
      handles.forEach(handle => {
        handle.addEventListener('dblclick', handleDoubleClick);
      });
    };

    // Remove listeners
    const removeHandleListeners = () => {
      const handles = document.querySelectorAll('.react-flow__handle');
      handles.forEach(handle => {
        handle.removeEventListener('dblclick', handleDoubleClick);
      });
    };

    // Add listeners after a small delay to ensure handles are rendered
    const timeoutId = setTimeout(addHandleListeners, 100);

    return () => {
      clearTimeout(timeoutId);
      removeHandleListeners();
    };
  }, [edges, setContextMenu]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={enhancedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneContextMenu={handlePaneContextMenu}
        nodeTypes={nodeTypes}
        colorMode="dark"
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
        


        {/* Node creation panel - hidden, will be replaced with right-click context menu */}
      </ReactFlow>
      
      {/* Right-click Context Menu */}
      {contextMenu && (
        <div 
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--node-body-background)',
            border: '1px solid var(--node-border-color)',
            borderRadius: '4px',
            padding: '8px 0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            minWidth: '180px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 'bold', borderBottom: '1px solid var(--node-border-color)' }}>
            Add Nodes
          </div>
          <button
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-primary)',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={() => createNodeFromMenu('startingPrompt', contextMenu.x, contextMenu.y)}
            onMouseEnter={(e) => e.target.style.background = 'var(--color-accent-primary-alpha)'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
          >
            Starting Prompt
          </button>
          <button
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-primary)',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={() => createNodeFromMenu('agentPrompt', contextMenu.x, contextMenu.y)}
            onMouseEnter={(e) => e.target.style.background = 'var(--color-accent-primary-alpha)'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
          >
            Agent Prompt
          </button>
          <button
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-primary)',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={() => createNodeFromMenu('imagePrompt', contextMenu.x, contextMenu.y)}
            onMouseEnter={(e) => e.target.style.background = 'var(--color-accent-primary-alpha)'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
          >
            Image Prompt
          </button>
          <button
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-primary)',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={() => createNodeFromMenu('customOutput', contextMenu.x, contextMenu.y)}
            onMouseEnter={(e) => e.target.style.background = 'var(--color-accent-primary-alpha)'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
          >
            Output
          </button>
          <div style={{ height: '1px', background: 'var(--node-border-color)', margin: '4px 0' }}></div>
          <button
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--color-accent-error)',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={resetToInitialState}
            onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

export default React.memo(CreativeNodeFlow);