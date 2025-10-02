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
import FilePanel from './components/FilePanel';

const initialNodes = [
  {
    id: 'starting-1',
    position: { x: 100, y: 100 },
    type: 'startingPrompt',
    width: 320,
    height: 240,
    zIndex: 1,
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
    width: 480,
    height: 320,
    zIndex: 2,
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
  const [handleContext, setHandleContext] = useState(null); // Store handle info for auto-connection
  const [filePanelVisible, setFilePanelVisible] = useState(true); // File panel visibility
  const [selectedFileContexts, setSelectedFileContexts] = useState([]); // File contexts for prompts // eslint-disable-line no-unused-vars
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

  // Helper function to get the highest z-index from existing nodes
  const getHighestZIndex = useCallback(() => {
    const currentNodes = nodesRef.current;
    let maxZ = 0;
    currentNodes.forEach(node => {
      if (node.zIndex && node.zIndex > maxZ) {
        maxZ = node.zIndex;
      }
    });
    return maxZ + 1;
  }, []);

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
            width: 480,
            height: 320,
            zIndex: getHighestZIndex(),
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
  }, [setNodes, setEdges, getHighestZIndex]);

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
    (params) => {
      setEdges((eds) => addEdge({
        ...params,
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 }
      }, eds));
      
      // After creating the connection, check if source node has existing output data
      // and immediately transmit it to the target node
      setTimeout(() => {
        const sourceNode = nodes.find(n => n.id === params.source);
        if (sourceNode && sourceNode.data) {
          // Check if source node has existing content to transmit
          const { content, context, type } = sourceNode.data;
          if (content || context) {
            const targetHandler = nodeInputHandlers.current.get(params.target);
            if (targetHandler) {
              console.log(`[onConnect] Transmitting existing data from ${params.source} to ${params.target}:`, {
                content: content ? content.substring(0, 50) + '...' : 'No content',
                hasContext: !!context,
                type
              });
              targetHandler({ content, context, type });
            }
          }
        }
      }, 100);
    },
    [setEdges, nodes],
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
      x: event.clientX, // Screen coordinates for menu positioning
      y: event.clientY,
      flowX: event.clientX, // Will be converted to flow coordinates in createNodeFromMenu
      flowY: event.clientY,
    });
  }, []);

  // Handle file context from FilePanel
  const handleFileContext = useCallback((contexts) => {
    setSelectedFileContexts(contexts);
    
    // Optionally auto-inject context into selected prompt nodes
    const selectedPromptNodes = nodes.filter(node => 
      node.selected && 
      (node.type === 'startingPrompt' || node.type === 'agentPrompt')
    );

    if (selectedPromptNodes.length > 0) {
      // Update nodes with file context
      setNodes(currentNodes => 
        currentNodes.map(node => {
          if (selectedPromptNodes.some(selected => selected.id === node.id)) {
            return {
              ...node,
              data: {
                ...node.data,
                fileContexts: contexts
              }
            };
          }
          return node;
        })
      );
    }
  }, [nodes, setNodes]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setHandleContext(null);
  }, []);

  // Find non-overlapping position for new node
  const findNonOverlappingPosition = useCallback((baseX, baseY, direction = 'right') => {
    const nodeWidth = 250;
    const nodeHeight = 200;
    const spacing = 50;
    
    let offsetX = direction === 'right' ? nodeWidth + spacing : -(nodeWidth + spacing);
    let offsetY = 0;
    
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      const testX = baseX + offsetX;
      const testY = baseY + offsetY;
      
      // Check for overlap with existing nodes
      const hasOverlap = nodes.some(node => {
        const nodeX = node.position.x;
        const nodeY = node.position.y;
        
        return (
          testX < nodeX + nodeWidth + spacing &&
          testX + nodeWidth + spacing > nodeX &&
          testY < nodeY + nodeHeight + spacing &&
          testY + nodeHeight + spacing > nodeY
        );
      });
      
      if (!hasOverlap) {
        return { x: testX, y: testY };
      }
      
      // Try different positions
      if (attempts < 5) {
        offsetY += 100; // Try below
      } else if (attempts < 10) {
        offsetY -= 200; // Try above
      } else {
        offsetX += direction === 'right' ? 100 : -100; // Try further away
        offsetY = 0;
      }
      
      attempts++;
    }
    
    // Fallback position if no good spot found
    return { x: baseX + offsetX, y: baseY + offsetY };
  }, [nodes]);

  // Context menu node creation handlers
  const createNodeFromMenu = useCallback((nodeType, x, y) => {
    const newId = `${nodeType}-${Date.now()}`;
    
    let position;
    let autoConnect = false;
    let sourceNodeId = null;
    let isSourceHandle = false;
    
    // Check if this was triggered from a handle double-click
    if (handleContext) {
      const sourceNode = nodes.find(n => n.id === handleContext.nodeId);
      if (sourceNode) {
        sourceNodeId = handleContext.nodeId;
        isSourceHandle = handleContext.isSource;
        
        // Position new node relative to source node (next to the triggering node)
        const direction = isSourceHandle ? 'right' : 'left';
        position = findNonOverlappingPosition(
          sourceNode.position.x, 
          sourceNode.position.y, 
          direction
        );
        autoConnect = true;
      } else {
        // Fallback to menu position
        position = { x: x - 100, y: y - 50 };
      }
    } else {
      // Right-click context menu positioning - use exact click location
      // Use simple coordinate conversion for right-click positioning
      const reactFlowBounds = document.querySelector('.react-flow__viewport')?.getBoundingClientRect();
      if (reactFlowBounds) {
        const flowX = x - reactFlowBounds.left;
        const flowY = y - reactFlowBounds.top;
        position = { x: flowX - 100, y: flowY - 50 };
      } else {
        // Fallback positioning
        position = { x: x - 100, y: y - 50 };
      }
    }

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
      width: nodeType === 'customOutput' ? 480 : 320,
      height: nodeType === 'customOutput' ? 320 : 240,
      zIndex: getHighestZIndex(),
      data: nodeData
    };

    setNodes(nodes => [...nodes, newNode]);
    
    // Auto-connect if created from handle double-click
    if (autoConnect && sourceNodeId) {
      const newEdgeId = `${sourceNodeId}-${newId}`;
      let sourceId, targetId;
      
      if (isSourceHandle) {
        // Source handle was double-clicked, connect source -> new node
        sourceId = sourceNodeId;
        targetId = newId;
      } else {
        // Target handle was double-clicked, connect new node -> target
        sourceId = newId;
        targetId = sourceNodeId;
      }
      
      const newEdge = {
        id: newEdgeId,
        source: sourceId,
        target: targetId,
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 }
      };
      
      setEdges(edges => [...edges, newEdge]);
    }
    
    closeContextMenu();
    setHandleContext(null); // Clear handle context
  }, [setNodes, setEdges, registerNodeHandlers, closeContextMenu, handleContext, nodes, findNonOverlappingPosition, getHighestZIndex]);

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

  // Add double-click listeners to handles
  useEffect(() => {
    const handleDoubleClick = (event) => {
      const handle = event.target.closest('.react-flow__handle');
      if (handle) {
        event.stopPropagation();
        
        // Get handle information
        const nodeId = handle.closest('[data-id]')?.getAttribute('data-id');
        const isSource = handle.classList.contains('react-flow__handle-source');
        const isTarget = handle.classList.contains('react-flow__handle-target');
        const handleId = handle.getAttribute('data-handleid');
        
        // Check if handle is already connected
        const isConnected = edges.some(edge => {
          if (isSource) {
            return edge.source === nodeId;
          } else {
            return edge.target === nodeId;
          }
        });
        
        // Only show menu for unconnected handles
        if (!isConnected) {
          // Store handle context for auto-connection
          setHandleContext({
            nodeId,
            handleType: isSource ? 'source' : 'target',
            handleId,
            isSource
          });
          
          // Show context menu at handle position
          const rect = handle.getBoundingClientRect();
          setContextMenu({
            x: rect.right + 10,
            y: rect.top,
            nodeId,
            handleType: isSource ? 'source' : 'target',
            handleId
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
  }, [edges, setContextMenu, setHandleContext]);

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
      
      {/* File Panel */}
      <FilePanel 
        onFileContext={handleFileContext}
        isVisible={filePanelVisible}
        position="right"
      />
      
      {/* FilePanel Toggle Button */}
      <button
        style={{
          position: 'fixed',
          top: '20px',
          right: filePanelVisible ? '380px' : '20px',
          width: '40px',
          height: '40px',
          background: 'var(--node-body-background)',
          border: '1px solid var(--node-border-color)',
          borderRadius: '8px',
          color: 'var(--color-text-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          zIndex: 1001,
          transition: 'all 0.3s ease'
        }}
        onClick={() => setFilePanelVisible(!filePanelVisible)}
        title={filePanelVisible ? 'Hide Files Panel' : 'Show Files Panel'}
        onMouseEnter={(e) => {
          e.target.style.background = 'var(--color-accent-primary-alpha)';
          e.target.style.borderColor = 'var(--color-accent-primary)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'var(--node-body-background)';
          e.target.style.borderColor = 'var(--node-border-color)';
        }}
      >
        {filePanelVisible ? '📁' : '📂'}
      </button>
      
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
            Art Director
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