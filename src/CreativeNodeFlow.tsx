import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Node,
  Edge,
  Connection,
  OnConnect,
  NodeTypes,
  EdgeTypes,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

// Import custom node components
import StartingPromptNode from './components/StartingPromptNode';
import AgentPromptNode from './components/AgentPromptNode';
import ImagePromptNode from './components/ImagePromptNode';
import VideoPromptNode from './components/VideoPromptNode';
import OutputNode from './components/OutputNode';
import ImagePanelNode from './components/ImagePanelNode';
import CustomEdge from './components/CustomEdge';
import FilePanel from './components/FilePanel';
import { alertService } from './components/Alert';
import { UI_DIMENSIONS } from './constants/app';
import logger from './utils/logger';
import fileStorageService from './services/FileStorageService';

// Import types
import type {
  StartingPromptNodeData,
  AgentPromptNodeData,
  ImagePromptNodeData,
  VideoPromptNodeData,
  OutputNodeData,
  ImagePanelNodeData
} from './types/nodes';
import type { FileContext, OutputData, ConversationContext } from './types/api';
import type { ConnectorType } from './types/nodeConfig';
import { areConnectorsCompatible } from './types/nodeConfig';

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

type CustomNodeType = 'startingPrompt' | 'agentPrompt' | 'imagePrompt' | 'videoPrompt' | 'customOutput' | 'imagePanel';

type InputHandlerCallback = (data: { content: string; context?: ConversationContext; type: 'text' | 'image' | 'video'; nodeId?: string; videoUrl?: string }) => void;

// ============================================================================
// Initial State
// ============================================================================

const initialNodes: Node[] = [
  {
    id: 'starting-1',
    position: { x: 100, y: 100 },
    type: 'startingPrompt',
    width: UI_DIMENSIONS.NODE_MIN_WIDTH,
    height: UI_DIMENSIONS.NODE_MIN_HEIGHT,
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

function CreativeNodeFlowInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [handleContext, setHandleContext] = useState<HandleContextState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [filePanelVisible] = useState<boolean>(true);
  const [, setSelectedFileContexts] = useState<FileContext[]>([]);

  // ReactFlow instance for proper coordinate transformations
  const { screenToFlowPosition: reactFlowScreenToFlowPosition } = useReactFlow();

  // Using useRef for nodeInputHandlers to prevent state mutation
  const nodeInputHandlers = useRef<Map<string, InputHandlerCallback>>(new Map());

  // Ref for ReactFlow wrapper to access viewport conversion
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null);

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
    videoPrompt: VideoPromptNode,
    customOutput: OutputNode,
    imagePanel: ImagePanelNode,
  }), []);

  // Define custom edge types
  const edgeTypes: EdgeTypes = useMemo(() => ({
    default: CustomEdge,
  }), []);

  // Helper function to get connector type from node
  const getConnectorType = useCallback((node: Node, handleId: string | null, handleType: 'source' | 'target'): ConnectorType => {
    const nodeType = node.type || 'unknown';
    
    // Special handling for nodes with multiple inputs of different types
    if (handleType === 'target' && handleId) {
      // Creative Director (agentPrompt): text input (top) + image input (bottom)
      if (nodeType === 'agentPrompt') {
        if (handleId === 'input-text') return 'text';
        if (handleId === 'input-image') return 'image';
      }
      
      // Art Director (imagePrompt): text input (top) + image input (bottom)
      if (nodeType === 'imagePrompt') {
        if (handleId === 'input-text') return 'text';
        if (handleId === 'input-image') return 'image';
      }
      
      // Motion Director (videoPrompt): text input (top) + single image input (bottom)
      if (nodeType === 'videoPrompt') {
        if (handleId === 'input-text') return 'text';
        if (handleId === 'input-image') return 'image';
      }
    }
    
    // Default mapping based on node type
    const nodeTypeMapping: Record<string, { source: ConnectorType; target: ConnectorType }> = {
      startingPrompt: { source: 'text', target: 'text' },
      agentPrompt: { source: 'text', target: 'text' }, // Default to text if handleId not specified
      imagePrompt: { source: 'image', target: 'text' }, // Default to text if handleId not specified
      videoPrompt: { source: 'video', target: 'text' }, // Default to text if handleId not specified
      customOutput: { source: 'any', target: 'any' },
      imagePanel: { source: 'image', target: 'image' }
    };

    const mapping = nodeTypeMapping[nodeType];
    
    if (!mapping) {
      return 'any'; // Default to 'any' for unknown nodes
    }
    
    return handleType === 'source' ? mapping.source : mapping.target;
  }, []);

  // Helper function to validate connection between two connectors
  const validateConnection = useCallback((sourceNode: Node, targetNode: Node, connection: Connection): boolean => {
    const sourceType = getConnectorType(sourceNode, connection.sourceHandle, 'source');
    const targetType = getConnectorType(targetNode, connection.targetHandle, 'target');
    
    logger.debug('[validateConnection]', {
      source: sourceNode.type,
      sourceType,
      target: targetNode.type,
      targetType,
      compatible: areConnectorsCompatible(sourceType, targetType)
    });
    
    return areConnectorsCompatible(sourceType, targetType);
  }, [getConnectorType]);

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
      console.log('[CreativeNodeFlow] Connection attempt:', params);
      
      // Validate connection types
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (!sourceNode || !targetNode) {
        console.warn('[CreativeNodeFlow] Source or target node not found');
        alertService.error('Connection failed: Node not found');
        return;
      }
      
      // Check if connection is compatible
      if (!validateConnection(sourceNode, targetNode, params)) {
        const sourceType = getConnectorType(sourceNode, params.sourceHandle, 'source');
        const targetType = getConnectorType(targetNode, params.targetHandle, 'target');
        console.warn('[CreativeNodeFlow] Incompatible connection:', { sourceType, targetType });
        alertService.warning(`Cannot connect ${sourceType} output to ${targetType} input`);
        setIsConnecting(false);
        return;
      }
      
      // Get edge type and color based on source connector type
      const edgeType = getConnectorType(sourceNode, params.sourceHandle, 'source');
      const edgeColorMap: Record<ConnectorType, string> = {
        text: 'var(--color-type-text)',
        image: 'var(--color-type-image)',
        video: 'var(--color-type-video)',
        any: 'var(--color-type-any)'
      };
      
      console.log('[CreativeNodeFlow] Connection successful:', params);
      setIsConnecting(false); // Connection was successful
      setEdges((eds) => addEdge({
        ...params,
        type: edgeType, // Store the edge type in data
        animated: true,
        style: { stroke: edgeColorMap[edgeType], strokeWidth: 2 }
      }, eds));

      // After creating the connection, check if source node has existing output data
      // and immediately transmit it to the target node
      setTimeout(() => {
        const sourceNode = nodes.find(n => n.id === params.source);
        if (sourceNode && sourceNode.data) {
          // Check if source node has existing content to transmit
          let { content, context, type } = sourceNode.data as any;
          
          // Special handling for Image Panel nodes
          if (sourceNode.type === 'imagePanel' && (sourceNode.data as any).imageUrl) {
            const imageUrl = (sourceNode.data as any).imageUrl;
            content = imageUrl;
            type = 'image';
            // Build context if not already present
            if (!context) {
              const mimeType = typeof imageUrl === 'string' && imageUrl.startsWith('data:')
                ? imageUrl.split(';')[0].split(':')[1] || 'image/png'
                : 'image/png';
              context = {
                messages: [
                  {
                    role: 'user' as const,
                    content: [
                      { type: 'text' as const, text: 'Image from Image Panel' },
                      { type: 'image' as const, imageUrl, mimeType }
                    ]
                  }
                ]
              };
            }
          }
          
          if (content || context) {
            const targetHandler = nodeInputHandlers.current.get(params.target!);
            if (targetHandler) {
              logger.debug(`[onConnect] Transmitting existing data from ${params.source} to ${params.target}:`, {
                content: content ? (typeof content === 'string' ? content.substring(0, 50) + '...' : 'Non-string content') : 'No content',
                hasContext: !!context,
                type
              });
              targetHandler({ content, context, type, nodeId: params.source });
            }
          }
        }
      }, 100);
    },
    [setEdges, nodes, validateConnection, getConnectorType],
  );

  // Use ReactFlow's built-in coordinate transformation (more reliable)
  const screenToFlowPosition = useCallback((screenX: number, screenY: number): { x: number; y: number } => {
    return reactFlowScreenToFlowPosition({ x: screenX, y: screenY });
  }, [reactFlowScreenToFlowPosition]);

  // Handle connection start (when user starts dragging from a handle)
  const onConnectStart = useCallback(
    (event: MouseEvent | TouchEvent, { nodeId, handleId, handleType }: any) => {
      console.log('[CreativeNodeFlow] onConnectStart', {
        nodeId,
        handleId,
        handleType,
        eventType: event.type
      });
      setIsConnecting(true);
    },
    []
  );

  // Handle connection end (when user releases connection without connecting)
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState?: any) => {
      console.log('[CreativeNodeFlow] onConnectEnd triggered', {
        target: event.target,
        connectionState,
        eventType: event.type,
        isConnecting
      });

      // Handle both mouse and touch events
      let clientX: number, clientY: number;
      if (event instanceof MouseEvent) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        // TouchEvent
        const touch = event.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      }

      // Use a small delay to check if a connection was actually made
      setTimeout(() => {
        if (isConnecting) {
          // Connection was started but not completed - show menu
          console.log('[CreativeNodeFlow] Connection failed, showing context menu');
          
          const flowPosition = screenToFlowPosition(clientX, clientY);

          setContextMenu({
            x: clientX,
            y: clientY,
            flowX: flowPosition.x,
            flowY: flowPosition.y,
          });
          
          setIsConnecting(false); // Reset the state
        }
      }, 50); // Small delay to allow onConnect to fire first if connection is successful
    },
    [screenToFlowPosition, isConnecting]
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
                reader.onload = async (e) => {
                  const imageUrl = e.target?.result as string;

                  // Save pasted image to reference files
                  try {
                    await fileStorageService.init();
                    // Convert blob to File object with a timestamped name
                    const fileName = `pasted-image-${Date.now()}.${type.split('/')[1] || 'png'}`;
                    const file = new File([blob], fileName, { type: type });
                    await fileStorageService.uploadFile(file);
                    logger.info(`Pasted image saved to reference files: ${fileName}`);
                  } catch (error) {
                    logger.error('Failed to save pasted image to reference files:', error);
                  }

                  // Check if an Image Panel is selected
                  const selectedImagePanels = nodes.filter(
                    node => node.selected && node.type === 'imagePanel'
                  );

                  if (selectedImagePanels.length > 0) {
                    // Update the first selected Image Panel
                    const targetNodeId = selectedImagePanels[0].id;

                    // Build context for the image
                    const imageContext = {
                      messages: [
                        {
                          role: 'user' as const,
                          content: [
                            {
                              type: 'text' as const,
                              text: 'User uploaded an image'
                            },
                            {
                              type: 'image' as const,
                              imageUrl: imageUrl,
                              mimeType: imageUrl.split(';')[0].split(':')[1] || 'image/png'
                            }
                          ]
                        }
                      ]
                    };

                    setNodes(currentNodes =>
                      currentNodes.map(node =>
                        node.id === targetNodeId
                          ? {
                              ...node,
                              data: {
                                ...node.data,
                                imageUrl,
                                content: imageUrl,
                                type: 'image',
                                context: imageContext
                              }
                            }
                          : node
                      )
                    );

                    // Trigger output only if the Image Panel has outgoing connections
                    const hasConnections = edgesRef.current.some(edge => edge.source === targetNodeId);
                    if (hasConnections) {
                      const onOutput = (selectedImagePanels[0].data as any).onOutput;
                      if (onOutput && typeof onOutput === 'function') {
                        onOutput({
                          nodeId: targetNodeId,
                          content: imageUrl,
                          type: 'image',
                          context: imageContext
                        });
                      }
                    }
                  } else {
                    // Create a new Image Panel in the center of viewport
                    const reactFlowWrapper = reactFlowWrapperRef.current;
                    if (reactFlowWrapper) {
                      const bounds = reactFlowWrapper.getBoundingClientRect();
                      const centerX = bounds.width / 2;
                      const centerY = bounds.height / 2;

                      // Use ReactFlow's screenToFlowPosition for accurate positioning
                      const flowPosition = reactFlowScreenToFlowPosition({
                        x: bounds.left + centerX,
                        y: bounds.top + centerY
                      });

                      const newId = `imagePanel-${Date.now()}`;

                      // Build context for the image
                      const imageContext = {
                        messages: [
                          {
                            role: 'user' as const,
                            content: [
                              {
                                type: 'text' as const,
                                text: 'User uploaded an image'
                              },
                              {
                                type: 'image' as const,
                                imageUrl: imageUrl,
                                mimeType: imageUrl.split(';')[0].split(':')[1] || 'image/png'
                              }
                            ]
                          }
                        ]
                      };

                      const newNode: any = {
                        id: newId,
                        position: { x: flowPosition.x - 200, y: flowPosition.y - 100 },
                        type: 'imagePanel',
                        width: 440,
                        height: 200,
                        zIndex: getHighestZIndex(),
                        data: {
                          imageUrl,
                          content: imageUrl,
                          type: 'image',
                          context: imageContext,
                          ...registerNodeHandlers(newId)
                        }
                      };

                      setNodes(nodes => [...nodes, newNode]);

                      // Don't trigger output for newly created panels -
                      // they won't have connections yet, so no need to auto-create output nodes
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
  }, [nodes, edges, setNodes, setEdges, reactFlowScreenToFlowPosition, getHighestZIndex, registerNodeHandlers]);

  // Right-click context menu handler
  const handlePaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    const flowPosition = screenToFlowPosition(event.clientX, event.clientY);
    setContextMenu({
      x: event.clientX, // Screen coordinates for menu positioning
      y: event.clientY,
      flowX: flowPosition.x, // Flow coordinates for node creation
      flowY: flowPosition.y,
    });
  }, [screenToFlowPosition]);

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
  logger.warn('[CreativeNodeFlow] No prompt nodes selected. Please select a Starting Prompt or Creative Director node before sending files.');
  alertService.warning('Please select a Starting Prompt or Creative Director node first, then click "Send to Prompt"');
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
        // Fallback to menu position - center the node at cursor
        position = { x: contextMenu.flowX - 160, y: contextMenu.flowY - 120 };
      }
    } else {
      // Use flow coordinates from context menu - center the node at cursor
      position = { x: contextMenu.flowX - 160, y: contextMenu.flowY - 120 };
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
      case 'videoPrompt':
        nodeData = {
          ...nodeData,
          prompt: ''
        } as VideoPromptNodeData;
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
      width: nodeType === 'customOutput' ? 480 : (nodeType === 'imagePanel' ? 440 : UI_DIMENSIONS.NODE_MIN_WIDTH),
      height: nodeType === 'customOutput' ? 320 : (nodeType === 'imagePanel' ? 200 : UI_DIMENSIONS.NODE_MIN_HEIGHT),
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

  // Handle edge deletion (delete key or backspace)
  const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
    console.log('[CreativeNodeFlow] Edges deleted:', edgesToDelete);
    // Note: No alert needed - edge deletion is obvious from visual feedback
  }, []);

  // Handle drop on canvas for creating image nodes
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    try {
      const dragData = JSON.parse(event.dataTransfer.getData('application/json'));
      
      // Only handle image files dropped on canvas (not on nodes)
      if (dragData.isImage && dragData.fileUrl) {
        const reactFlowBounds = reactFlowWrapperRef.current?.getBoundingClientRect();
        if (!reactFlowBounds) return;

        // Convert screen coordinates to flow coordinates
        const position = reactFlowScreenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // Create a new ImagePanel node at the drop position
        const newNode = {
          id: `imagePanel-${Date.now()}`,
          type: 'imagePanel',
          position,
          data: {
            imageUrl: dragData.fileUrl,
            fileName: dragData.fileName,
            label: `Image: ${dragData.fileName}`
          }
        };

        setNodes((nds) => nds.concat(newNode));
        // Note: No alert needed - node creation is obvious from visual feedback
      }
    } catch (error) {
      console.error('[CreativeNodeFlow] Error handling drop:', error);
    }
  }, [setNodes, reactFlowScreenToFlowPosition]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  return (
    <div ref={reactFlowWrapperRef} style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={enhancedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onEdgesDelete={onEdgesDelete}
        onPaneContextMenu={handlePaneContextMenu}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          interactionWidth: 20,
        }}
        colorMode="dark"
        deleteKeyCode="Delete"
        fitView
        fitViewOptions={{
          padding: 0.3,
          includeHiddenNodes: false,
          maxZoom: 1.0,
          minZoom: 1.0
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
            Creative Director
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
            onClick={() => createNodeFromMenu('videoPrompt')}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-accent-primary-alpha)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Motion Director
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

// Wrapper component that provides ReactFlow context
function CreativeNodeFlow() {
  return (
    <ReactFlowProvider>
      <CreativeNodeFlowInner />
    </ReactFlowProvider>
  );
}

export default React.memo(CreativeNodeFlow);
