import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  OnConnect,
  NodeTypes,
  useReactFlow,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

// Import custom node components
import StartingPromptNode from './components/StartingPromptNode';
import AgentPromptNode from './components/AgentPromptNode';
import ImagePromptNode from './components/ImagePromptNode';
import OutputNode from './components/OutputNode';
import ImagePanelNode from './components/ImagePanelNode';
import FilePanel from './components/FilePanel';
import { alertService } from './components/Alert';
import logger from './utils/logger';

// Import types
import type {
  StartingPromptNodeData,
  AgentPromptNodeData,
  ImagePromptNodeData,
  OutputNodeData,
  ImagePanelNodeData
} from './types/nodes';
import type { FileContext, OutputData, ConversationContext } from './types/api';

// ============================================================================
// Type Definitions
// ============================================================================

interface ContextMenuState {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
  nodeId?: string;
  handleType?: 'source' | 'target';
  handleId?: string;
}

interface HandleContextState {
  nodeId: string;
  handleType: 'source' | 'target';
  handleId: string;
  isSource: boolean;
}

type CustomNodeType = 'startingPrompt' | 'agentPrompt' | 'imagePrompt' | 'customOutput' | 'imagePanel';

type InputHandlerCallback = (data: { content: string; context?: ConversationContext; type: 'text' | 'image'; nodeId?: string }) => void;

// ============================================================================
// Initial State
// ============================================================================

const initialNodes: Node[] = [
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
      onOutput: undefined, // Will be set in component
      onReceiveInput: undefined
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
      onReceiveInput: undefined, // Will be set in component
      onOutput: undefined
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'starting-output',
    source: 'starting-1',
    target: 'output-1',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 }
  },
];

// ============================================================================
// Main Component
// ============================================================================

function CreativeNodeFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [handleContext, setHandleContext] = useState<HandleContextState | null>(null);
  const [filePanelVisible] = useState<boolean>(true);
  const [, setSelectedFileContexts] = useState<FileContext[]>([]);

  // Using useRef for nodeInputHandlers to prevent state mutation
  const nodeInputHandlers = useRef<Map<string, InputHandlerCallback>>(new Map());

  // Get ReactFlow instance for viewport coordinates
  const { screenToFlowPosition } = useReactFlow();

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

  // Use refs to access current values without causing re-renders
  const edgesRef = useRef<Edge[]>(edges);
  const nodesRef = useRef<Node[]>(nodes);

  useEffect(() => {
    edgesRef.current = edges;
    nodesRef.current = nodes;
  }, [edges, nodes]);

  // Define custom node types
  const nodeTypes: NodeTypes = useMemo(() => ({
    startingPrompt: StartingPromptNode,
    agentPrompt: AgentPromptNode,
    imagePrompt: ImagePromptNode,
    customOutput: OutputNode,
    imagePanel: ImagePanelNode,
  }), []);

  // Helper function to get the highest z-index from existing nodes
  const getHighestZIndex = useCallback((): number => {
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
  const handleNodeOutput = useCallback((outputData: OutputData) => {
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
          const newOutputNode: any = {
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
              onReceiveInput: (handler: InputHandlerCallback) => nodeInputHandlers.current.set(newOutputId, handler),
              onOutput: handleNodeOutput
            },
          };

          const newEdge: Edge = {
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
  const registerNodeHandlers = useCallback((nodeId: string) => {
    return {
      onOutput: handleNodeOutput,
      onReceiveInput: (handler: InputHandlerCallback) => nodeInputHandlers.current.set(nodeId, handler)
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

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
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
          const { content, context, type } = sourceNode.data as any;
          if (content || context) {
            const targetHandler = nodeInputHandlers.current.get(params.target!);
            if (targetHandler) {
              logger.debug(`[onConnect] Transmitting existing data from ${params.source} to ${params.target}:`, {
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

  // Handle connection end (when user releases connection without connecting)
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      // Check if the connection was actually made
      const target = event.target as HTMLElement;
      const isHandle = target.classList.contains('react-flow__handle');

      // If not released on a handle, show the context menu to create a new node
      if (!isHandle) {
        const mouseEvent = event as MouseEvent;
        const flowPosition = screenToFlowPosition({
          x: mouseEvent.clientX,
          y: mouseEvent.clientY
        });

        setContextMenu({
          x: mouseEvent.clientX,
          y: mouseEvent.clientY,
          flowX: flowPosition.x,
          flowY: flowPosition.y,
        });
      }
    },
    [screenToFlowPosition]
  );

  // Handle double-click on pane to create node
  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowX: flowPosition.x,
        flowY: flowPosition.y,
      });
    },
    [screenToFlowPosition]
  );

  // Handle keyboard events for deletion and paste
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Handle Delete/Backspace
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

    // Handle Ctrl+V paste
    if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
      // Check if we're in a text input/textarea - if so, ignore
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Try to read image from clipboard
      navigator.clipboard.read().then(clipboardItems => {
        for (const clipboardItem of clipboardItems) {
          for (const type of clipboardItem.types) {
            if (type.startsWith('image/')) {
              clipboardItem.getType(type).then(blob => {
                // Convert blob to data URL
                const reader = new FileReader();
                reader.onload = (e) => {
                  const imageUrl = e.target?.result as string;

                  // Check if an Image Panel is selected
                  const selectedImagePanels = nodes.filter(
                    node => node.selected && node.type === 'imagePanel'
                  );

                  if (selectedImagePanels.length > 0) {
                    // Update the first selected Image Panel
                    const targetNodeId = selectedImagePanels[0].id;
                    setNodes(currentNodes =>
                      currentNodes.map(node =>
                        node.id === targetNodeId
                          ? {
                              ...node,
                              data: {
                                ...node.data,
                                imageUrl
                              }
                            }
                          : node
                      )
                    );

                    // Trigger output
                    const onOutput = (selectedImagePanels[0].data as any).onOutput;
                    if (onOutput && typeof onOutput === 'function') {
                      onOutput({
                        nodeId: targetNodeId,
                        content: imageUrl,
                        type: 'image'
                      });
                    }
                  } else {
                    // Create a new Image Panel in the center of viewport
                    const reactFlowViewport = document.querySelector('.react-flow__viewport');
                    if (reactFlowViewport) {
                      const bounds = reactFlowViewport.getBoundingClientRect();
                      const centerX = bounds.width / 2;
                      const centerY = bounds.height / 2;

                      const flowPosition = screenToFlowPosition({
                        x: bounds.left + centerX,
                        y: bounds.top + centerY
                      });

                      const newId = `imagePanel-${Date.now()}`;
                      const newNode: any = {
                        id: newId,
                        position: { x: flowPosition.x - 140, y: flowPosition.y - 100 },
                        type: 'imagePanel',
                        width: 280,
                        height: 200,
                        zIndex: getHighestZIndex(),
                        data: {
                          imageUrl,
                          ...registerNodeHandlers(newId)
                        }
                      };

                      setNodes(nodes => [...nodes, newNode]);

                      // Trigger output
                      setTimeout(() => {
                        const handler = nodeInputHandlers.current.get(newId);
                        if (handler) {
                          handler({ content: imageUrl, type: 'image', nodeId: newId });
                        }
                      }, 100);
                    }
                  }
                };
                reader.readAsDataURL(blob);
              });
              break;
            }
          }
        }
      }).catch(err => {
        logger.debug('No image in clipboard or clipboard access denied:', err);
      });
    }
  }, [nodes, edges, setNodes, setEdges, screenToFlowPosition, getHighestZIndex, registerNodeHandlers]);

  // Right-click context menu handler
  const handlePaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX, // Screen coordinates for menu positioning
      y: event.clientY,
      flowX: event.clientX, // Will be converted to flow coordinates in createNodeFromMenu
      flowY: event.clientY,
    });
  }, []);

  // Handle file context from FilePanel
  const handleFileContext = useCallback((contexts: any) => {
    logger.debug('[CreativeNodeFlow] Received file contexts from FilePanel:', contexts);
    setSelectedFileContexts(contexts);

    // Optionally auto-inject context into selected prompt nodes
    const selectedPromptNodes = nodes.filter(node =>
      node.selected &&
      (node.type === 'startingPrompt' || node.type === 'agentPrompt')
    );

    logger.debug('[CreativeNodeFlow] Selected prompt nodes:', selectedPromptNodes.length);

    if (selectedPromptNodes.length > 0) {
      logger.debug('[CreativeNodeFlow] Injecting file contexts into nodes:',
        selectedPromptNodes.map(n => n.id)
      );

      // Update nodes with file context
      setNodes(currentNodes =>
        currentNodes.map(node => {
          if (selectedPromptNodes.some(selected => selected.id === node.id)) {
            logger.debug(`[CreativeNodeFlow] Adding file contexts to node ${node.id}`);
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
    } else {
      logger.warn('[CreativeNodeFlow] No prompt nodes selected. Please select a Starting Prompt or Agent Prompt node before sending files.');
      alertService.warning('Please select a Starting Prompt or Agent Prompt node first, then click "Send to Prompt"');
    }
  }, [nodes, setNodes]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setHandleContext(null);
  }, []);

  // Find non-overlapping position for new node
  const findNonOverlappingPosition = useCallback((baseX: number, baseY: number, direction: 'right' | 'left' = 'right'): { x: number; y: number } => {
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
  const createNodeFromMenu = useCallback((nodeType: CustomNodeType) => {
    if (!contextMenu) return;

    const newId = `${nodeType}-${Date.now()}`;

    let position: { x: number; y: number };
    let autoConnect = false;
    let sourceNodeId: string | null = null;
    let isSourceHandle = false;

    // Check if this was triggered from a handle double-click
    if (handleContext) {
      const sourceNode = nodes.find(n => n.id === handleContext.nodeId);
      if (sourceNode) {
        sourceNodeId = handleContext.nodeId;
        isSourceHandle = handleContext.isSource;

        // Position new node relative to source node (next to the triggering node)
        const direction: 'right' | 'left' = isSourceHandle ? 'right' : 'left';
        position = findNonOverlappingPosition(
          sourceNode.position.x,
          sourceNode.position.y,
          direction
        );
        autoConnect = true;
      } else {
        // Fallback to menu position
        position = { x: contextMenu.flowX - 100, y: contextMenu.flowY - 50 };
      }
    } else {
      // Use flow coordinates from context menu
      position = { x: contextMenu.flowX - 100, y: contextMenu.flowY - 50 };
    }

    let nodeData: any = {
      ...registerNodeHandlers(newId)
    };

    switch (nodeType) {
      case 'startingPrompt':
        nodeData = {
          ...nodeData,
          prompt: '',
          systemPrompt: 'You are a helpful AI assistant.'
        } as StartingPromptNodeData;
        break;
      case 'agentPrompt':
        nodeData = {
          ...nodeData,
          prompt: '',
          systemPrompt: 'You are a helpful AI assistant.'
        } as AgentPromptNodeData;
        break;
      case 'imagePrompt':
        nodeData = {
          ...nodeData,
          prompt: ''
        } as ImagePromptNodeData;
        break;
      case 'customOutput':
        nodeData = {
          ...nodeData,
          content: '',
          context: undefined
        } as OutputNodeData;
        break;
      case 'imagePanel':
        nodeData = {
          ...nodeData,
          imageUrl: undefined,
          imageFile: undefined
        } as ImagePanelNodeData;
        break;
      default:
        break;
    }

    const newNode: any = {
      id: newId,
      position,
      type: nodeType,
      width: nodeType === 'customOutput' ? 480 : (nodeType === 'imagePanel' ? 280 : 320),
      height: nodeType === 'customOutput' ? 320 : (nodeType === 'imagePanel' ? 200 : 240),
      zIndex: getHighestZIndex(),
      data: nodeData
    };

    setNodes(nodes => [...nodes, newNode]);

    // Auto-connect if created from handle double-click
    if (autoConnect && sourceNodeId) {
      const newEdgeId = `${sourceNodeId}-${newId}`;
      let sourceId: string;
      let targetId: string;

      if (isSourceHandle) {
        // Source handle was double-clicked, connect source -> new node
        sourceId = sourceNodeId;
        targetId = newId;
      } else {
        // Target handle was double-clicked, connect new node -> target
        sourceId = newId;
        targetId = sourceNodeId;
      }

      const newEdge: Edge = {
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
  }, [contextMenu, setNodes, setEdges, registerNodeHandlers, closeContextMenu, handleContext, nodes, findNonOverlappingPosition, getHighestZIndex]);

  // Reset function to clear all nodes and start fresh
  const resetToInitialState = useCallback(() => {
    nodeInputHandlers.current.clear();
    setNodes(initialNodes);
    setEdges(initialEdges);
    closeContextMenu();
  }, [setNodes, setEdges, closeContextMenu]);

  // Add keyboard event listener
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only handle if no input is focused
      if (!(event.target as HTMLElement).closest('input, textarea, select')) {
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
    const handleDoubleClick = (event: MouseEvent) => {
      const handle = (event.target as HTMLElement).closest('.react-flow__handle');
      if (handle) {
        event.stopPropagation();

        // Get handle information
        const nodeId = handle.closest('[data-id]')?.getAttribute('data-id');
        const isSource = handle.classList.contains('react-flow__handle-source');
        const handleId = handle.getAttribute('data-handleid');

        if (!nodeId) return;

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
            handleId: handleId || '',
            isSource
          });

          // Show context menu at handle position
          const rect = handle.getBoundingClientRect();
          setContextMenu({
            x: rect.right + 10,
            y: rect.top,
            flowX: rect.right + 10,
            flowY: rect.top,
            nodeId,
            handleType: isSource ? 'source' : 'target',
            handleId: handleId || undefined
          });
        }
      }
    };

    // Add double-click listeners to all handles
    const addHandleListeners = () => {
      const handles = document.querySelectorAll('.react-flow__handle');
      handles.forEach(handle => {
        handle.addEventListener('dblclick', handleDoubleClick as EventListener);
      });
    };

    // Remove listeners
    const removeHandleListeners = () => {
      const handles = document.querySelectorAll('.react-flow__handle');
      handles.forEach(handle => {
        handle.removeEventListener('dblclick', handleDoubleClick as EventListener);
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
        onConnectEnd={onConnectEnd}
        onPaneContextMenu={handlePaneContextMenu}
        onDoubleClick={onPaneDoubleClick}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{
          padding: 0.1,
          includeHiddenNodes: false
        }}
        onError={(id, message) => {
          // Suppress ResizeObserver errors
          if (message && message.includes('ResizeObserver')) {
            return;
          }
          logger.error('ReactFlow error:', id, message);
        }}
      >
        <Controls />
        <MiniMap
          position="bottom-left"
          pannable={true}
          zoomable={true}
          style={{
            marginLeft: '120px',
            marginBottom: '20px'
          }}
        />
        <Background variant={'dots' as any} gap={12} size={1} />



        {/* Node creation panel - hidden, will be replaced with right-click context menu */}
      </ReactFlow>

      {/* File Panel */}
      <FilePanel
        onFileContext={handleFileContext}
        isVisible={filePanelVisible}
        position="right"
      />

      {/* FilePanel Toggle Button - Hidden, using internal collapse button instead */}
      {/* <button
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
      </button> */}

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
            onClick={() => createNodeFromMenu('startingPrompt')}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-accent-primary-alpha)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
            onClick={() => createNodeFromMenu('agentPrompt')}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-accent-primary-alpha)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
            onClick={() => createNodeFromMenu('imagePrompt')}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-accent-primary-alpha)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
            onClick={() => createNodeFromMenu('customOutput')}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-accent-primary-alpha)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Output
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
            onClick={() => createNodeFromMenu('imagePanel')}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-accent-primary-alpha)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Image Panel
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
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

export default React.memo(CreativeNodeFlow);
